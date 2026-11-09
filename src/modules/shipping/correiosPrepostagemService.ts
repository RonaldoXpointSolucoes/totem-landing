import fs from "fs";
import path from "path";
import { CORREIOS_CONTRACT_METADATA } from "./receiptGroundTruth";
import { calculateCorreiosInsuranceCents } from "./correiosService";

const CWS_BASE_URL = "https://api.correios.com.br";
const SETTINGS_FILE = path.join(process.cwd(), "src", "data", "correios_contract_settings.json");
const ENV_FILE = path.join(process.cwd(), ".env");

export interface CorreiosContractConfig {
  senderName: string;
  senderTradeName: string;
  cnpj: string;
  contractNumber: string;
  postcardNumber: string;
  agency: string;
  sedexServiceCode: string;
  pacServiceCode: string;
  senderPhone: string;
  senderEmail: string;
  senderAddress: {
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  cwsUser: string;
  cwsPassword: string;
  updatedAt?: string;
}

export interface CorreiosContentItem {
  conteudo: string;
  quantidade: number;
  valorReais: number;
}

export interface CorreiosVolumeSpec {
  volumeIndex: number;
  totalVolumes: number;
  label: string;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  weightGrams: number;
  declaredValueReais: number;
  trackingCode?: string;
  prepostagemId?: string;
  plpNumber?: string;
  status?: "draft" | "cws_registered" | "simplified_ready" | "posted";
  cwsMessage?: string;
  contentItems: CorreiosContentItem[];
}

export interface CorreiosShipmentRecord {
  orderId: string;
  orderNumber: string;
  serviceCode: string; // "03220" (SEDEX) | "03298" (PAC)
  serviceName: string; // "SEDEX CONTRATO AG" | "PAC CONTRATO AG"
  contractNumber: string;
  postcardNumber: string;
  agency: string;
  mode: "cws_live" | "simplified";
  invoiceNumber?: string;
  invoiceKey?: string;
  observations?: string;
  sender: {
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  recipient: {
    name: string;
    document: string;
    phone: string;
    email: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  volumes: CorreiosVolumeSpec[];
  officialLabelPdfBase64?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getCorreiosContractConfig(): CorreiosContractConfig {
  const defaultConfig: CorreiosContractConfig = {
    senderName: "X-Point Soluções Tecnológicas Ltda",
    senderTradeName: "Totem Pro — X-Point Engenharia",
    cnpj: process.env.CORREIOS_CNPJ || CORREIOS_CONTRACT_METADATA.cnpj,
    contractNumber: process.env.CORREIOS_CONTRATO || CORREIOS_CONTRACT_METADATA.contractNumber,
    postcardNumber: process.env.CORREIOS_CARTAO_POSTAGEM || CORREIOS_CONTRACT_METADATA.postcardNumber,
    agency: CORREIOS_CONTRACT_METADATA.agency,
    sedexServiceCode: process.env.CORREIOS_COD_SERVICO_SEDEX || CORREIOS_CONTRACT_METADATA.sedexServiceCode,
    pacServiceCode: process.env.CORREIOS_COD_SERVICO_PAC || CORREIOS_CONTRACT_METADATA.pacServiceCode,
    senderPhone: "11991649959",
    senderEmail: "contato@xpointsolucoes.com.br",
    senderAddress: {
      cep: (process.env.SHIPPING_ORIGIN_CEP || CORREIOS_CONTRACT_METADATA.originCep).replace(/\D/g, ""),
      street: "Av. Industrial",
      number: "04",
      complement: "Galpão 04 - X-Point Engenharia",
      neighborhood: "Parque Industrial",
      city: "Taboão da Serra",
      state: "SP",
    },
    cwsUser: process.env.CORREIOS_USUARIO || process.env.CORREIOS_CNPJ || CORREIOS_CONTRACT_METADATA.cnpj,
    cwsPassword: process.env.CORREIOS_SENHA_API || process.env.CORREIOS_TOKEN || "",
  };

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...defaultConfig,
        ...parsed,
        senderAddress: {
          ...defaultConfig.senderAddress,
          ...(parsed.senderAddress || {}),
        },
        cwsUser: parsed.cwsUser || defaultConfig.cwsUser,
        cwsPassword: parsed.cwsPassword || defaultConfig.cwsPassword,
      };
    }
  } catch (err) {
    console.warn("[Correios Prepostagem] Aviso ao ler correios_contract_settings.json:", err);
  }

  return defaultConfig;
}

export function saveCorreiosContractConfig(partial: Partial<CorreiosContractConfig>): CorreiosContractConfig {
  const current = getCorreiosContractConfig();
  const next: CorreiosContractConfig = {
    ...current,
    ...partial,
    senderAddress: {
      ...current.senderAddress,
      ...(partial.senderAddress || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Correios Prepostagem] Aviso ao salvar correios_contract_settings.json:", err);
  }

  // Atualiza variáveis em memória e no .env se existir
  process.env.CORREIOS_CONTRATO = next.contractNumber;
  process.env.CORREIOS_CARTAO_POSTAGEM = next.postcardNumber;
  process.env.CORREIOS_CNPJ = next.cnpj;
  process.env.CORREIOS_COD_SERVICO_SEDEX = next.sedexServiceCode;
  process.env.CORREIOS_COD_SERVICO_PAC = next.pacServiceCode;
  process.env.CORREIOS_USUARIO = next.cwsUser;
  if (next.cwsPassword) {
    process.env.CORREIOS_SENHA_API = next.cwsPassword;
  }

  try {
    if (fs.existsSync(ENV_FILE)) {
      let content = fs.readFileSync(ENV_FILE, "utf-8");
      const mapping: Record<string, string> = {
        CORREIOS_CONTRATO: next.contractNumber,
        CORREIOS_CARTAO_POSTAGEM: next.postcardNumber,
        CORREIOS_CNPJ: next.cnpj,
        CORREIOS_COD_SERVICO_SEDEX: next.sedexServiceCode,
        CORREIOS_COD_SERVICO_PAC: next.pacServiceCode,
        CORREIOS_USUARIO: next.cwsUser,
        CORREIOS_SENHA_API: next.cwsPassword,
      };
      for (const [k, v] of Object.entries(mapping)) {
        const regex = new RegExp(`^${k}=.*$`, "m");
        if (regex.test(content)) {
          content = content.replace(regex, `${k}=${v}`);
        } else {
          content += `\n${k}=${v}`;
        }
      }
      fs.writeFileSync(ENV_FILE, content, "utf-8");
    }
  } catch {}

  return next;
}

/**
 * Autentica no CWS dos Correios usando Cartão de Postagem e retorna o token JWT + diagnóstico.
 */
export async function authenticateCorreiosCws(customConfig?: Partial<CorreiosContractConfig>): Promise<{
  ok: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
  statusCode?: number;
}> {
  const cfg = { ...getCorreiosContractConfig(), ...(customConfig || {}) };
  const usuario = (cfg.cwsUser || cfg.cnpj || "").trim();
  const senhaApi = (cfg.cwsPassword || "").trim();
  const cartao = (cfg.postcardNumber || "").replace(/\D/g, "");

  if (!usuario || !senhaApi) {
    return {
      ok: false,
      error:
        "Credenciais da API Correios CWS (Usuário Meu Correios e Código de Acesso à API / Token) ainda não foram preenchidas.",
    };
  }

  const basicAuth = Buffer.from(`${usuario}:${senhaApi}`).toString("base64");

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${CWS_BASE_URL}/token/v1/autentica/cartaopostagem`, {
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

      if (!res.ok) {
        let errDetail = "";
        try {
          const errJson = await res.json();
          errDetail = errJson?.msgs?.[0] || errJson?.mensagem || errJson?.message || "";
        } catch {}

        if (res.status === 401 || res.status === 403) {
          return {
            ok: false,
            statusCode: res.status,
            error:
              errDetail ||
              `Falha de autenticação CWS Correios (HTTP ${res.status}). Verifique o Usuário Meu Correios e o Código de Acesso à API gerado em cws.correios.com.br.`,
          };
        }

        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
          continue;
        }

        return {
          ok: false,
          statusCode: res.status,
          error: errDetail || `Servidor dos Correios CWS respondeu com HTTP ${res.status}.`,
        };
      }

      const data = await res.json();
      if (data && data.token) {
        return {
          ok: true,
          token: data.token,
          expiresAt: data.expiraEm,
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (attempt === 3) {
        return {
          ok: false,
          error: `Erro de conexão com a API CWS dos Correios: ${err?.message || "Timeout"}`,
        };
      }
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }

  return {
    ok: false,
    error: "Não foi possível obter resposta da API CWS dos Correios após 3 tentativas.",
  };
}

/**
 * Calcula automaticamente os volumes (caixas) de envio com base nos itens do pedido,
 * respeitando a regra de 1 volume individual por gabinete e as medidas reais homologadas.
 */
export function buildDefaultVolumesFromOrder(order: any): {
  serviceCode: string;
  serviceName: string;
  volumes: CorreiosVolumeSpec[];
} {
  const cfg = getCorreiosContractConfig();
  const shippingId = String(
    order?.shipping_method?.id ||
      order?.delivery_address?.shippingMethod?.id ||
      ""
  ).toLowerCase();
  const shippingName = String(
    order?.shipping_method?.name ||
      order?.delivery_address?.shippingMethod?.name ||
      ""
  ).toLowerCase();

  const isPac = shippingId.includes("pac") || shippingName.includes("pac");
  const serviceCode = isPac ? cfg.pacServiceCode : cfg.sedexServiceCode;
  const serviceName = isPac ? "PAC CONTRATO AG" : "SEDEX CONTRATO AG";

  const rawItems: any[] = Array.isArray(order?.items) && order.items.length > 0 ? order.items : [];
  const expandedUnits: {
    title: string;
    heightCm: number;
    widthCm: number;
    lengthCm: number;
    weightGrams: number;
    unitValueReais: number;
  }[] = [];

  for (const item of rawItems) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const cabName = String(item.cabinet_name || "Gabinete Autoatendimento Totem Pro");
    const colorName = item.color_name ? ` (${item.color_name})` : "";
    const monitorName = item.monitor_name && item.monitor_name !== "Nenhum" ? ` + ${item.monitor_name}` : "";
    const fullLabel = `${cabName}${colorName}${monitorName}`;

    const nameLower = cabName.toLowerCase();
    const isWall = nameLower.includes("parede");
    const isFloor = nameLower.includes("piso");
    const isKit =
      nameLower.includes("kit") ||
      (item.monitor_name && !String(item.monitor_name).toLowerCase().includes("nenhum"));

    // Dimensões e pesos calibrados pelos comprovantes reais auditados da X-Point
    let dims: [number, number, number] = [68, 65, 23]; // Balcão padrão: 68 x 65 x 23 cm (16kg)
    let weightGrams = 16000;

    if (isWall) {
      dims = isKit ? [96, 45, 42] : [90, 45, 20];
      weightGrams = isKit ? 24000 : 16000;
    } else if (isFloor) {
      dims = [96, 45, 42];
      weightGrams = 26000;
    } else if (isKit) {
      dims = [68, 65, 23];
      weightGrams = 22000;
    }

    const subtotalCents = Number(item.subtotal_cents) || Number(item.unit_price_cents) * qty || Number(order?.subtotal_cents) || 124000;
    const unitValueReais = Math.max(100, Math.round(subtotalCents / qty) / 100);

    for (let u = 0; u < qty; u++) {
      expandedUnits.push({
        title: fullLabel,
        lengthCm: dims[0],
        widthCm: dims[1],
        heightCm: dims[2],
        weightGrams,
        unitValueReais,
      });
    }
  }

  if (expandedUnits.length === 0) {
    const fallbackReais = Math.max(100, Math.round((Number(order?.subtotal_cents) || Number(order?.total_cents) || 124000) / 100));
    expandedUnits.push({
      title: "Gabinete de Autoatendimento Totem Pro",
      lengthCm: 68,
      widthCm: 65,
      heightCm: 23,
      weightGrams: 16000,
      unitValueReais: fallbackReais,
    });
  }

  const totalVolumes = expandedUnits.length;
  const volumes: CorreiosVolumeSpec[] = expandedUnits.map((unit, idx) => ({
    volumeIndex: idx + 1,
    totalVolumes,
    label: unit.title,
    heightCm: unit.heightCm,
    widthCm: unit.widthCm,
    lengthCm: unit.lengthCm,
    weightGrams: unit.weightGrams,
    declaredValueReais: Number(unit.unitValueReais.toFixed(2)),
    status: "draft",
    contentItems: [
      {
        conteudo: unit.title.substring(0, 60),
        quantidade: 1,
        valorReais: Number(unit.unitValueReais.toFixed(2)),
      },
    ],
  }));

  return { serviceCode, serviceName, volumes };
}

/**
 * Gera um identificador visual de Pré-Postagem / Etiqueta de Contrato para modo simplificado
 * quando a etiqueta ainda não recebeu código de rastreio da API CWS.
 */
function generateSimplifiedPrepostagemCode(serviceCode: string, orderNumber: string, volumeIndex: number): string {
  const prefix = serviceCode === "03298" ? "AP" : "AD";
  const digits = (
    orderNumber.replace(/\D/g, "") +
    String(Date.now()).slice(-7) +
    String(volumeIndex)
  )
    .slice(-9)
    .padStart(9, "8");
  return `${prefix}${digits}BR`;
}

/**
 * Lança a Pré-Postagem na API Oficial CWS dos Correios (/prepostagem/v1/prepostagens)
 * ou gera o registro simplificado para impressão imediata.
 */
export async function launchOrderCorreiosPrepostagem(params: {
  orderId: string;
  orderNumber: string;
  mode: "cws_live" | "simplified";
  serviceCode: string;
  invoiceNumber?: string;
  invoiceKey?: string;
  observations?: string;
  recipient: CorreiosShipmentRecord["recipient"];
  volumes: CorreiosVolumeSpec[];
}): Promise<{
  ok: boolean;
  modeUsed: "cws_live" | "simplified";
  fallbackReason?: string;
  shipment: CorreiosShipmentRecord;
  message: string;
}> {
  const cfg = getCorreiosContractConfig();
  const isPac = params.serviceCode === cfg.pacServiceCode || params.serviceCode === "03298";
  const serviceCode = isPac ? cfg.pacServiceCode : cfg.sedexServiceCode;
  const serviceName = isPac ? "PAC CONTRATO AG" : "SEDEX CONTRATO AG";
  const insuranceServiceCode = isPac ? "064" : "019";

  const senderObj: CorreiosShipmentRecord["sender"] = {
    name: cfg.senderName,
    cnpj: cfg.cnpj.replace(/\D/g, ""),
    phone: cfg.senderPhone.replace(/\D/g, ""),
    email: cfg.senderEmail,
    cep: cfg.senderAddress.cep.replace(/\D/g, ""),
    street: cfg.senderAddress.street,
    number: cfg.senderAddress.number,
    complement: cfg.senderAddress.complement,
    neighborhood: cfg.senderAddress.neighborhood,
    city: cfg.senderAddress.city,
    state: cfg.senderAddress.state,
  };

  const cleanRecipient: CorreiosShipmentRecord["recipient"] = {
    name: (params.recipient.name || "Cliente Totem Pro").trim(),
    document: (params.recipient.document || "").replace(/\D/g, ""),
    phone: (params.recipient.phone || "").replace(/\D/g, ""),
    email: (params.recipient.email || "").trim(),
    cep: (params.recipient.cep || "").replace(/\D/g, ""),
    street: (params.recipient.street || "").trim(),
    number: (params.recipient.number || "S/N").trim(),
    complement: (params.recipient.complement || "").trim(),
    neighborhood: (params.recipient.neighborhood || "Centro").trim(),
    city: (params.recipient.city || "").trim(),
    state: (params.recipient.state || "SP").trim().toUpperCase(),
  };

  const totalVolumes = params.volumes.length || 1;
  const processedVolumes: CorreiosVolumeSpec[] = [];
  let modeUsed: "cws_live" | "simplified" = params.mode;
  let fallbackReason: string | undefined;
  let officialLabelPdfBase64: string | null = null;

  if (params.mode === "cws_live") {
    const authRes = await authenticateCorreiosCws();
    if (!authRes.ok || !authRes.token) {
      modeUsed = "simplified";
      fallbackReason = authRes.error;
    } else {
      const token = authRes.token;
      const createdPrepostagemIds: string[] = [];

      for (let i = 0; i < params.volumes.length; i++) {
        const vol = params.volumes[i];
        const weightGrams = Math.max(300, Math.round(Number(vol.weightGrams) || 16000));
        const heightCm = Math.max(2, Math.min(100, Math.round(Number(vol.heightCm) || 23)));
        const widthCm = Math.max(11, Math.min(100, Math.round(Number(vol.widthCm) || 45)));
        const lengthCm = Math.max(16, Math.min(100, Math.round(Number(vol.lengthCm) || 68)));
        const declaredReais = Math.max(0, Number(vol.declaredValueReais) || 0);

        const listaServicoAdicional: any[] = [];
        if (declaredReais > 0) {
          listaServicoAdicional.push({
            codigoServicoAdicional: insuranceServiceCode,
            valorDeclarado: declaredReais.toFixed(2),
          });
        }

        const itensDeclaracaoConteudo = (
          Array.isArray(vol.contentItems) && vol.contentItems.length > 0
            ? vol.contentItems
            : [
                {
                  conteudo: vol.label || "Gabinete Autoatendimento Totem Pro",
                  quantidade: 1,
                  valorReais: declaredReais > 0 ? declaredReais : 1240,
                },
              ]
        ).map((ci) => ({
          conteudo: String(ci.conteudo || "Gabinete Autoatendimento").substring(0, 60),
          quantidade: String(Math.max(1, Number(ci.quantidade) || 1)),
          valor: Number(ci.valorReais || declaredReais || 100).toFixed(2),
        }));

        const cwsPayload: Record<string, any> = {
          idCorreios: cfg.cwsUser || cfg.cnpj.replace(/\D/g, ""),
          remetente: {
            nome: senderObj.name.substring(0, 50),
            cpfCnpj: senderObj.cnpj,
            dddCelular: senderObj.phone.slice(0, 2) || "11",
            celular: senderObj.phone.slice(2) || "991649959",
            email: senderObj.email,
            endereco: {
              cep: senderObj.cep,
              logradouro: senderObj.street,
              numero: senderObj.number,
              complemento: (senderObj.complement || "").substring(0, 30),
              bairro: senderObj.neighborhood,
              cidade: senderObj.city,
              uf: senderObj.state,
            },
          },
          destinatario: {
            nome: cleanRecipient.name.substring(0, 50),
            ...(cleanRecipient.document ? { cpfCnpj: cleanRecipient.document } : {}),
            ...(cleanRecipient.phone.length >= 10
              ? {
                  dddCelular: cleanRecipient.phone.slice(0, 2),
                  celular: cleanRecipient.phone.slice(2),
                }
              : {}),
            ...(cleanRecipient.email ? { email: cleanRecipient.email } : {}),
            endereco: {
              cep: cleanRecipient.cep,
              logradouro: cleanRecipient.street,
              numero: cleanRecipient.number,
              complemento: (cleanRecipient.complement || "").substring(0, 30),
              bairro: cleanRecipient.neighborhood,
              cidade: cleanRecipient.city,
              uf: cleanRecipient.state,
            },
          },
          codigoServico: serviceCode,
          pesoInformado: String(weightGrams),
          codigoFormatoObjetoInformado: "2", // 2 = Caixa/Pacote
          alturaInformada: String(heightCm),
          larguraInformada: String(widthCm),
          comprimentoInformado: String(lengthCm),
          cienteObjetoNaoProibido: 1,
          solicitarColeta: "N",
          observacao: `Pedido ${params.orderNumber} - Vol ${i + 1}/${totalVolumes}`,
          ...(listaServicoAdicional.length > 0 ? { listaServicoAdicional } : {}),
          ...(params.invoiceKey && params.invoiceKey.replace(/\D/g, "").length === 44
            ? {
                chaveNFe: params.invoiceKey.replace(/\D/g, ""),
                ...(params.invoiceNumber ? { numeroNotaFiscal: params.invoiceNumber } : {}),
              }
            : {
                itensDeclaracaoConteudo,
              }),
        };

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(`${CWS_BASE_URL}/prepostagem/v1/prepostagens`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(cwsPayload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const resJson = await res.json().catch(() => ({}));

          if (res.ok && (resJson.codigoObjeto || resJson.id)) {
            if (resJson.id) createdPrepostagemIds.push(String(resJson.id));
            processedVolumes.push({
              ...vol,
              volumeIndex: i + 1,
              totalVolumes,
              heightCm,
              widthCm,
              lengthCm,
              weightGrams,
              declaredValueReais: declaredReais,
              trackingCode: resJson.codigoObjeto || vol.trackingCode || generateSimplifiedPrepostagemCode(serviceCode, params.orderNumber, i + 1),
              prepostagemId: resJson.id ? String(resJson.id) : undefined,
              plpNumber: resJson.numeroPlp ? String(resJson.numeroPlp) : undefined,
              status: "cws_registered",
              cwsMessage: "Pré-postagem registrada online na API Oficial CWS dos Correios.",
            });
          } else {
            const apiErrMsg =
              resJson?.msgs?.[0] ||
              resJson?.mensagem ||
              resJson?.message ||
              `HTTP ${res.status} ao registrar pré-postagem CWS`;
            modeUsed = "simplified";
            fallbackReason = apiErrMsg;
            processedVolumes.push({
              ...vol,
              volumeIndex: i + 1,
              totalVolumes,
              heightCm,
              widthCm,
              lengthCm,
              weightGrams,
              declaredValueReais: declaredReais,
              trackingCode:
                vol.trackingCode && vol.trackingCode.trim()
                  ? vol.trackingCode.trim().toUpperCase()
                  : generateSimplifiedPrepostagemCode(serviceCode, params.orderNumber, i + 1),
              status: "simplified_ready",
              cwsMessage: `Modo Simplificado (${apiErrMsg})`,
            });
          }
        } catch (err: any) {
          modeUsed = "simplified";
          fallbackReason = err?.message || "Falha de comunicação com endpoint de pré-postagem CWS";
          processedVolumes.push({
            ...vol,
            volumeIndex: i + 1,
            totalVolumes,
            heightCm,
            widthCm,
            lengthCm,
            weightGrams,
            declaredValueReais: declaredReais,
            trackingCode:
              vol.trackingCode && vol.trackingCode.trim()
                ? vol.trackingCode.trim().toUpperCase()
                : generateSimplifiedPrepostagemCode(serviceCode, params.orderNumber, i + 1),
            status: "simplified_ready",
            cwsMessage: "Etiqueta gerada em modo simplificado de contingência.",
          });
        }
      }

      // Se criou pré-postagens oficiais na CWS, tenta solicitar o PDF nativo do rótulo
      if (createdPrepostagemIds.length > 0) {
        try {
          const rotuloRes = await fetch(`${CWS_BASE_URL}/prepostagem/v1/prepostagens/rotulo/assincrono/pdf`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idsPrePostagem: createdPrepostagemIds,
              tipoRotulo: "P",
              formatoRotulo: "ET",
              imprimeRemetente: "S",
            }),
          });
          if (rotuloRes.ok) {
            const rotuloJson = await rotuloRes.json().catch(() => ({}));
            if (rotuloJson?.idRecibo) {
              await new Promise((r) => setTimeout(r, 1200));
              const downloadRes = await fetch(
                `${CWS_BASE_URL}/prepostagem/v1/prepostagens/rotulo/download/assincrono/${rotuloJson.idRecibo}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (downloadRes.ok) {
                const dlJson = await downloadRes.json().catch(() => ({}));
                if (dlJson?.dados) {
                  officialLabelPdfBase64 = dlJson.dados;
                }
              }
            }
          }
        } catch {}
      }
    }
  }

  // Caso seja modo simplificado direto ou fallback sem volumes processados ainda
  if (processedVolumes.length === 0) {
    for (let i = 0; i < params.volumes.length; i++) {
      const vol = params.volumes[i];
      const weightGrams = Math.max(300, Math.round(Number(vol.weightGrams) || 16000));
      const heightCm = Math.max(2, Math.min(100, Math.round(Number(vol.heightCm) || 23)));
      const widthCm = Math.max(11, Math.min(100, Math.round(Number(vol.widthCm) || 45)));
      const lengthCm = Math.max(16, Math.min(100, Math.round(Number(vol.lengthCm) || 68)));
      const declaredReais = Math.max(0, Number(vol.declaredValueReais) || 0);

      processedVolumes.push({
        ...vol,
        volumeIndex: i + 1,
        totalVolumes,
        heightCm,
        widthCm,
        lengthCm,
        weightGrams,
        declaredValueReais: declaredReais,
        trackingCode:
          vol.trackingCode && vol.trackingCode.trim()
            ? vol.trackingCode.trim().toUpperCase()
            : generateSimplifiedPrepostagemCode(serviceCode, params.orderNumber, i + 1),
        status: "simplified_ready",
        cwsMessage: fallbackReason
          ? `Gerada via Etiqueta Simplificada do Contrato (${fallbackReason})`
          : "Etiqueta Simplificada gerada com os dados do Contrato AG 9912722993.",
      });
    }
  }

  const nowIso = new Date().toISOString();
  const shipment: CorreiosShipmentRecord = {
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    serviceCode,
    serviceName,
    contractNumber: cfg.contractNumber,
    postcardNumber: cfg.postcardNumber,
    agency: cfg.agency,
    mode: modeUsed,
    invoiceNumber: params.invoiceNumber || "",
    invoiceKey: params.invoiceKey || "",
    observations: params.observations || "",
    sender: senderObj,
    recipient: cleanRecipient,
    volumes: processedVolumes,
    officialLabelPdfBase64,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    ok: true,
    modeUsed,
    fallbackReason,
    shipment,
    message:
      modeUsed === "cws_live"
        ? `Pré-postagem lançada com sucesso na API Oficial dos Correios (Contrato ${cfg.contractNumber})! Etiqueta pronta para impressão.`
        : fallbackReason
        ? `Etiqueta Simplificada do Contrato ${cfg.contractNumber} gerada e pronta para impressão! (Nota API CWS: ${fallbackReason})`
        : `Etiqueta Simplificada do Contrato ${cfg.contractNumber} (Cartão ${cfg.postcardNumber}) gerada com sucesso e pronta para impressão!`,
  };
}

export { calculateCorreiosInsuranceCents };
