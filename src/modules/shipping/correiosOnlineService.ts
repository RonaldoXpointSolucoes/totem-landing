import { ShippingQuote } from "@/types/shipping";
import { CorreiosPackageInput } from "./correiosService";
import { CORREIOS_CONTRACT_METADATA } from "./receiptGroundTruth";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let inMemoryToken: CachedToken | null = null;

const CWS_BASE_URL = "https://api.correios.com.br";
const REQUEST_TIMEOUT_MS = 2500; // 2.5s timeout para não travar o checkout

/**
 * Autentica no Cws Correios via Cartão de Postagem e obtém JWT.
 * Utiliza cache em memória para reaproveitamento do token durante o período de validade.
 */
async function getCorreiosJwtToken(): Promise<string | null> {
  const usuario = process.env.CORREIOS_USUARIO || process.env.CORREIOS_CNPJ;
  const senhaApi = process.env.CORREIOS_SENHA_API || process.env.CORREIOS_TOKEN;
  const cartao = process.env.CORREIOS_CARTAO_POSTAGEM || CORREIOS_CONTRACT_METADATA.postcardNumber;

  if (!usuario || !senhaApi) {
    return null;
  }

  // Verifica validade do token em cache (com margem de 10 minutos)
  if (inMemoryToken && inMemoryToken.expiresAt > Date.now() + 10 * 60 * 1000) {
    return inMemoryToken.token;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const basicAuth = Buffer.from(`${usuario}:${senhaApi}`).toString("base64");
    const response = await fetch(`${CWS_BASE_URL}/token/v1/autentica/cartaopostagem`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ numero: cartao }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[CORREIOS CWS] Falha ao autenticar token (HTTP ${response.status})`);
      return null;
    }

    const data = await response.json();
    if (data && data.token) {
      // Duração padrão Cws: 24 horas
      const expMillis = data.expiraEm ? new Date(data.expiraEm).getTime() : Date.now() + 23 * 3600 * 1000;
      inMemoryToken = {
        token: data.token,
        expiresAt: expMillis,
      };
      return data.token;
    }
    return null;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[CORREIOS CWS] Erro de conexão com autenticação Cws: ${err.message}`);
    return null;
  }
}

/**
 * Tenta cotar preço e prazo na API Oficial Online dos Correios (Cws REST).
 * Se a API estiver offline, sem chave ou instável, retorna null para
 * que o Sistema Antifalha ative imediatamente a Matriz de Contrato Auditada.
 */
export async function fetchLiveCorreiosQuotes(
  input: CorreiosPackageInput
): Promise<ShippingQuote[] | null> {
  const token = await getCorreiosJwtToken();
  if (!token) {
    return null; // Prossegue para fallback sem atrasar o cliente
  }

  const {
    destinationCep,
    totalGrossWeightKg,
    totalCubicWeightKg,
    maxDimensionCm,
    declaredValueCents = 0,
  } = input;

  const originCep = (process.env.SHIPPING_ORIGIN_CEP || CORREIOS_CONTRACT_METADATA.originCep).replace(/\D/g, "");
  const destCep = destinationCep.replace(/\D/g, "");
  const effectiveWeightGrams = Math.round(Math.max(totalGrossWeightKg, totalCubicWeightKg || 0) * 1000);

  const sedexCode = process.env.CORREIOS_COD_SERVICO_SEDEX || CORREIOS_CONTRACT_METADATA.sedexServiceCode;
  const pacCode = process.env.CORREIOS_COD_SERVICO_PAC || CORREIOS_CONTRACT_METADATA.pacServiceCode;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const payload = {
      idLote: "1",
      parametrosProduto: [
        {
          coProduto: sedexCode,
          nuRequisicao: "1",
          cepOrigem: originCep,
          cepDestino: destCep,
          psObjeto: String(effectiveWeightGrams),
          tpObjeto: "2",
          comprimento: String(Math.round(maxDimensionCm)),
          largura: "45",
          altura: "30",
          vlDeclarado: (declaredValueCents / 100).toFixed(2),
          servicosAdicionais: declaredValueCents > 0 ? ["019"] : [],
        },
        {
          coProduto: pacCode,
          nuRequisicao: "2",
          cepOrigem: originCep,
          cepDestino: destCep,
          psObjeto: String(effectiveWeightGrams),
          tpObjeto: "2",
          comprimento: String(Math.round(maxDimensionCm)),
          largura: "45",
          altura: "30",
          vlDeclarado: (declaredValueCents / 100).toFixed(2),
          servicosAdicionais: declaredValueCents > 0 ? ["064"] : [],
        },
      ],
    };

    const res = await fetch(`${CWS_BASE_URL}/preco/v1/nacional`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[CORREIOS CWS] Consulta de preço retornou HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const sedexRes = data.find((p: any) => p.coProduto === sedexCode);
    const pacRes = data.find((p: any) => p.coProduto === pacCode);

    if (!sedexRes && !pacRes) return null;

    const parsePriceCents = (p: any) => {
      const valStr = p?.pcFinal || p?.vlPrecoFrete || p?.valor || "0";
      const valNum = parseFloat(String(valStr).replace(",", "."));
      return Math.round(valNum * 100);
    };

    const sedexPrice = sedexRes ? parsePriceCents(sedexRes) : 0;
    const pacPrice = pacRes ? parsePriceCents(pacRes) : 0;

    const quotes: ShippingQuote[] = [];

    if (sedexRes && sedexPrice > 0) {
      const prazo = parseInt(sedexRes.prazoEntrega || "2", 10);
      quotes.push({
        id: "correios_sedex",
        name: "SEDEX Contrato AG (Correios)",
        carrier: "Correios",
        priceCents: sedexPrice,
        deliveryDaysMin: Math.max(1, prazo - 1),
        deliveryDaysMax: Math.max(1, prazo),
        description: "Entrega expressa prioritária oficial online Cws com seguro de carga incluso",
        isAvailable: true,
        badge: "Mais Rápido",
      });
    }

    if (pacRes && pacPrice > 0) {
      const prazo = parseInt(pacRes.prazoEntrega || "6", 10);
      quotes.push({
        id: "correios_pac",
        name: "PAC Contrato AG (Correios)",
        carrier: "Correios",
        priceCents: pacPrice,
        deliveryDaysMin: Math.max(3, prazo - 2),
        deliveryDaysMax: Math.max(4, prazo),
        description: "Entrega econômica oficial online Cws com seguro de carga incluso",
        isAvailable: true,
        badge: "Econômico",
      });
    }

    return quotes.length > 0 ? quotes : null;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[CORREIOS CWS] Falha ao consultar endpoint Cws: ${err.message}`);
    return null;
  }
}
