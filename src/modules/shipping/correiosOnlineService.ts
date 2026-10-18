import { ShippingQuote } from "@/types/shipping";
import { CorreiosPackageInput } from "./correiosService";
import { CORREIOS_CONTRACT_METADATA } from "./receiptGroundTruth";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let inMemoryToken: CachedToken | null = null;

const CWS_BASE_URL = "https://api.correios.com.br";
const REQUEST_TIMEOUT_MS = 2800; // 2.8s timeout por tentativa
export const MAX_CORREIOS_RETRY_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Autentica no Cws Correios via Cartão de Postagem e obtém JWT.
 * Tenta até 3 vezes antes de desistir em caso de oscilação de rede/timeout.
 */
async function getCorreiosJwtToken(forceRefresh = false): Promise<string | null> {
  const usuario = process.env.CORREIOS_USUARIO || process.env.CORREIOS_CNPJ;
  const senhaApi = process.env.CORREIOS_SENHA_API || process.env.CORREIOS_TOKEN;
  const cartao = process.env.CORREIOS_CARTAO_POSTAGEM || CORREIOS_CONTRACT_METADATA.postcardNumber;

  if (!usuario || !senhaApi) {
    return null;
  }

  if (forceRefresh) {
    inMemoryToken = null;
  }

  // Verifica validade do token em cache (com margem de 10 minutos)
  if (inMemoryToken && inMemoryToken.expiresAt > Date.now() + 10 * 60 * 1000) {
    return inMemoryToken.token;
  }

  const basicAuth = Buffer.from(`${usuario}:${senhaApi}`).toString("base64");

  for (let attempt = 1; attempt <= MAX_CORREIOS_RETRY_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
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
        console.warn(
          `[CORREIOS CWS] Tentativa ${attempt}/${MAX_CORREIOS_RETRY_ATTEMPTS} falhou ao autenticar token (HTTP ${response.status})`
        );
        // Credenciais inválidas (401/403) não precisam repetir
        if (response.status === 401 || response.status === 403) {
          return null;
        }
        if (attempt < MAX_CORREIOS_RETRY_ATTEMPTS) {
          await sleep(350 * attempt);
          continue;
        }
        return null;
      }

      const data = await response.json();
      if (data && data.token) {
        const expMillis = data.expiraEm
          ? new Date(data.expiraEm).getTime()
          : Date.now() + 23 * 3600 * 1000;
        inMemoryToken = {
          token: data.token,
          expiresAt: expMillis,
        };
        return data.token;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(
        `[CORREIOS CWS] Tentativa ${attempt}/${MAX_CORREIOS_RETRY_ATTEMPTS} erro de conexão na autenticação Cws: ${err.message}`
      );
      if (attempt < MAX_CORREIOS_RETRY_ATTEMPTS) {
        await sleep(350 * attempt);
      }
    }
  }

  return null;
}

/**
 * Tenta cotar preço e prazo na API Oficial Online dos Correios (Cws REST)
 * com até 3 tentativas automáticas antes de desistir e acionar a Matriz Contratual Auditada.
 */
export async function fetchLiveCorreiosQuotes(
  input: CorreiosPackageInput
): Promise<ShippingQuote[] | null> {
  let token = await getCorreiosJwtToken();
  if (!token) {
    return null; // Prossegue para Matriz Contratual Auditada sem atrasar o cliente
  }

  const {
    destinationCep,
    totalGrossWeightKg,
    totalCubicWeightKg,
    maxDimensionCm,
    declaredValueCents = 0,
    packageDimensionsCm,
  } = input;

  const originCep = (process.env.SHIPPING_ORIGIN_CEP || CORREIOS_CONTRACT_METADATA.originCep).replace(/\D/g, "");
  const destCep = destinationCep.replace(/\D/g, "");
  const effectiveWeightGrams = Math.max(
    300,
    Math.round(Math.max(totalGrossWeightKg, totalCubicWeightKg || 0) * 1000)
  );

  const rawDims = packageDimensionsCm
    ? [...packageDimensionsCm].sort((a, b) => b - a)
    : [Math.round(maxDimensionCm || 68), 45, 25];

  const comprimento = String(Math.min(100, Math.max(16, Math.round(rawDims[0] || 68))));
  const largura = String(Math.min(100, Math.max(11, Math.round(rawDims[1] || 45))));
  const altura = String(Math.min(100, Math.max(2, Math.round(rawDims[2] || 25))));

  const sedexCode = process.env.CORREIOS_COD_SERVICO_SEDEX || CORREIOS_CONTRACT_METADATA.sedexServiceCode;
  const pacCode = process.env.CORREIOS_COD_SERVICO_PAC || CORREIOS_CONTRACT_METADATA.pacServiceCode;

  for (let attempt = 1; attempt <= MAX_CORREIOS_RETRY_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const payload = {
        idLote: String(attempt),
        parametrosProduto: [
          {
            coProduto: sedexCode,
            nuRequisicao: "1",
            cepOrigem: originCep,
            cepDestino: destCep,
            psObjeto: String(effectiveWeightGrams),
            tpObjeto: "2",
            comprimento,
            largura,
            altura,
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
            comprimento,
            largura,
            altura,
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

      // Se o token expirou, renova e tenta novamente
      if ((res.status === 401 || res.status === 403) && attempt < MAX_CORREIOS_RETRY_ATTEMPTS) {
        const refreshed = await getCorreiosJwtToken(true);
        if (refreshed) {
          token = refreshed;
          continue;
        }
        return null;
      }

      if (!res.ok) {
        console.warn(
          `[CORREIOS CWS] Tentativa ${attempt}/${MAX_CORREIOS_RETRY_ATTEMPTS} de preço retornou HTTP ${res.status}`
        );
        if (attempt < MAX_CORREIOS_RETRY_ATTEMPTS) {
          await sleep(400 * attempt);
          continue;
        }
        return null;
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        if (attempt < MAX_CORREIOS_RETRY_ATTEMPTS) {
          await sleep(400 * attempt);
          continue;
        }
        return null;
      }

      const sedexRes = data.find((p: any) => p.coProduto === sedexCode);
      const pacRes = data.find((p: any) => p.coProduto === pacCode);

      if (!sedexRes && !pacRes) {
        if (attempt < MAX_CORREIOS_RETRY_ATTEMPTS) {
          await sleep(400 * attempt);
          continue;
        }
        return null;
      }

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
          unitPriceCents: sedexPrice,
          packageCount: 1,
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
          unitPriceCents: pacPrice,
          packageCount: 1,
          deliveryDaysMin: Math.max(3, prazo - 2),
          deliveryDaysMax: Math.max(4, prazo),
          description: "Entrega econômica oficial online Cws com seguro de carga incluso",
          isAvailable: true,
          badge: "Econômico",
        });
      }

      if (quotes.length > 0) {
        return quotes;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(
        `[CORREIOS CWS] Tentativa ${attempt}/${MAX_CORREIOS_RETRY_ATTEMPTS} falhou ao consultar endpoint Cws: ${err.message}`
      );
      if (attempt < MAX_CORREIOS_RETRY_ATTEMPTS) {
        await sleep(400 * attempt);
      }
    }
  }

  return null;
}

