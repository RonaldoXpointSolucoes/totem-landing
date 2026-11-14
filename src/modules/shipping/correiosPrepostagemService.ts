import fs from "fs";
import path from "path";
import { CORREIOS_CONTRACT_METADATA } from "./receiptGroundTruth";
import { calculateCorreiosInsuranceCents } from "./correiosService";
import {
  getCachedPersistentCorreiosConfig,
  loadPersistentCorreiosConfig,
  savePersistentCorreiosConfig,
} from "./correiosSettingsPersistence";

const CWS_BASE_URL = "https://api.correios.com.br";
const SETTINGS_FILE = path.join(process.cwd(), "src", "data", "correios_contract_settings.json");
const ENV_FILE = path.join(process.cwd(), ".env");

export interface CorreiosPickupAddress {
  id: string;
  label: string; // Ex: "Matriz X-Point (Parque Assunção)" ou "Fábrica CNC / Expedição"
  senderName: string;
  cnpj: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export interface CorreiosApiBreadcrumb {
  step: number;
  totalSteps: number;
  code:
    | "CONTRACT_CREDENTIALS"
    | "SENDER_DNE_VALIDATION"
    | "RECIPIENT_DNE_VALIDATION"
    | "VOLUMES_PAYLOAD_VALIDATION"
    | "CWS_TOKEN_AUTH"
    | "CWS_PREPOSTAGEM_CREATE"
    | "CWS_LABEL_PDF";
  title: string;
  status: "success" | "warning" | "error" | "skipped";
  summary: string;
  durationMs: number;
  timestamp: string;
  endpoint?: string;
  httpStatus?: number;
  details: string[];
  requestPayload?: any;
  responsePayload?: any;
  remediation?: string;
}

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
  pickupAddresses: CorreiosPickupAddress[];
  selectedPickupAddressId: string;
  cwsUser: string;
  cwsCanonicalIdCorreios?: string;
  cwsPassword: string;
  cwsLastVerifiedAt?: string;
  cwsIsVerified?: boolean;
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
  serviceCode: string;
  serviceName: string;
  contractNumber: string;
  postcardNumber: string;
  agency: string;
  mode: "cws_live" | "simplified";
  pickupAddressId?: string;
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
  lastBreadcrumbs?: CorreiosApiBreadcrumb[];
  createdAt: string;
  updatedAt: string;
}

const REAL_XPOINT_SENDER_ADDRESS = {
  cep: "06754160",
  street: "Praça Miguel Ortega",
  number: "340",
  complement: "Loja 5",
  neighborhood: "Parque Assunção",
  city: "Taboão da Serra",
  state: "SP",
};

const DEFAULT_PICKUP_ADDRESSES: CorreiosPickupAddress[] = [
  {
    id: "pickup_xpoint_matriz",
    label: "Matriz X-Point — Praça Miguel Ortega, 340 (Parque Assunção)",
    senderName: "X-Point Soluções Tecnológicas Ltda",
    cnpj: "11040282000177",
    phone: "11991649959",
    email: "contato@xpointsolucoes.com.br",
    cep: "06754160",
    street: "Praça Miguel Ortega",
    number: "340",
    complement: "Loja 5",
    neighborhood: "Parque Assunção",
    city: "Taboão da Serra",
    state: "SP",
    isDefault: true,
  },
  {
    id: "pickup_xpoint_fabrica",
    label: "Expedição / Fábrica CNC — Taboão da Serra/SP",
    senderName: "X-Point Soluções Tecnológicas Ltda",
    cnpj: "11040282000177",
    phone: "11975960999",
    email: "contato@xpointsolucoes.com.br",
    cep: "06754160",
    street: "Praça Miguel Ortega",
    number: "340",
    complement: "Galpão / Expedição CNC",
    neighborhood: "Parque Assunção",
    city: "Taboão da Serra",
    state: "SP",
    isDefault: false,
  },
];

function sanitizeCwsString(val: string | undefined | null, maxLen: number): string {
  if (!val) return "";
  return String(val)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function parseBrazilianPhoneForCws(rawPhone: string | undefined | null): {
  ddd: string;
  number: string;
  isMobile: boolean;
  formatted: string;
  wasAdjusted: boolean;
} {
  let digits = String(rawPhone || "").replace(/\D/g, "");
  let wasAdjusted = false;

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
    wasAdjusted = true;
  }
  if (digits.startsWith("0") && digits.length >= 11) {
    digits = digits.slice(1);
    wasAdjusted = true;
  }

  if (digits.length === 11) {
    return {
      ddd: digits.slice(0, 2),
      number: digits.slice(2),
      isMobile: true,
      formatted: `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`,
      wasAdjusted,
    };
  }

  if (digits.length === 10) {
    const sub = digits.slice(2);
    if (["9", "8", "7"].includes(sub[0])) {
      const mobileNum = `9${sub}`;
      return {
        ddd: digits.slice(0, 2),
        number: mobileNum,
        isMobile: true,
        formatted: `(${digits.slice(0, 2)}) ${mobileNum.slice(0, 5)}-${mobileNum.slice(5)}`,
        wasAdjusted: true,
      };
    }
    return {
      ddd: digits.slice(0, 2),
      number: sub,
      isMobile: false,
      formatted: `(${digits.slice(0, 2)}) ${sub.slice(0, 4)}-${sub.slice(4)}`,
      wasAdjusted,
    };
  }

  return {
    ddd: "11",
    number: "991649959",
    isMobile: true,
    formatted: "(11) 99164-9959 (Fallback Contato)",
    wasAdjusted: true,
  };
}

export function validateCpfOrCnpj(rawDoc: string | undefined | null): {
  valid: boolean;
  type: "CPF" | "CNPJ" | "EMPTY" | "INVALID";
  clean: string;
  reason?: string;
} {
  const clean = String(rawDoc || "").replace(/\D/g, "");
  if (!clean) {
    return { valid: false, type: "EMPTY", clean: "", reason: "CPF/CNPJ não informado." };
  }

  if (clean.length === 11) {
    if (/^(\d)\1{10}$/.test(clean)) {
      return { valid: false, type: "CPF", clean, reason: "CPF com dígitos repetidos inválido." };
    }
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean[9], 10)) {
      return { valid: false, type: "CPF", clean, reason: "Primeiro dígito verificador do CPF inválido." };
    }
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean[10], 10)) {
      return { valid: false, type: "CPF", clean, reason: "Segundo dígito verificador do CPF inválido." };
    }
    return { valid: true, type: "CPF", clean };
  }

  if (clean.length === 14) {
    if (/^(\d)\1{13}$/.test(clean)) {
      return { valid: false, type: "CNPJ", clean, reason: "CNPJ com dígitos repetidos inválido." };
    }
    const calcDigit = (base: string, weights: number[]) => {
      let s = 0;
      for (let i = 0; i < weights.length; i++) s += parseInt(base[i], 10) * weights[i];
      const rem = s % 11;
      return rem < 2 ? 0 : 11 - rem;
    };
    const d1 = calcDigit(clean.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calcDigit(clean.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (d1 !== parseInt(clean[12], 10) || d2 !== parseInt(clean[13], 10)) {
      return { valid: false, type: "CNPJ", clean, reason: "Dígitos verificadores do CNPJ inválidos." };
    }
    return { valid: true, type: "CNPJ", clean };
  }

  return {
    valid: false,
    type: "INVALID",
    clean,
    reason: `Documento possui ${clean.length} dígitos (esperado 11 para CPF ou 14 para CNPJ).`,
  };
}

export async function lookupDneCep(cepRaw: string): Promise<{
  ok: boolean;
  cep: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  error?: string;
}> {
  const clean = String(cepRaw || "").replace(/\D/g, "");
  if (clean.length !== 8) {
    return { ok: false, cep: clean, error: `CEP "${cepRaw}" inválido (deve conter exatamente 8 dígitos).` };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && !data.erro) {
        return {
          ok: true,
          cep: clean,
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          localidade: data.localidade || "",
          uf: data.uf || "",
          ibge: data.ibge || "",
        };
      }
      return {
        ok: false,
        cep: clean,
        error: `O CEP ${clean} não foi encontrado na base DNE dos Correios / ViaCEP.`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      cep: clean,
      error: `Não foi possível validar o CEP ${clean} online (${err?.message || "timeout"}).`,
    };
  }

  return { ok: false, cep: clean, error: `Falha ao consultar CEP ${clean}.` };
}

export function sanitizeExistingShipment(
  shipment: CorreiosShipmentRecord | null | undefined
): CorreiosShipmentRecord | null {
  if (!shipment) return null;
  const cleanedVolumes = (shipment.volumes || []).map((v) => {
    const isSyntheticOldCode =
      v.status !== "cws_registered" &&
      !v.prepostagemId &&
      Boolean(v.trackingCode) &&
      (String(v.cwsMessage || "").includes("Simplificado") ||
        String(v.cwsMessage || "").includes("contingência") ||
        shipment.mode === "simplified");

    if (isSyntheticOldCode) {
      return {
        ...v,
        trackingCode: "",
      };
    }
    return v;
  });

  return {
    ...shipment,
    volumes: cleanedVolumes,
  };
}

function buildDefaultCorreiosContractConfig(): CorreiosContractConfig {
  const envOriginCep = (process.env.SHIPPING_ORIGIN_CEP || "").replace(/\D/g, "");
  const effectiveSenderCep =
    !envOriginCep || envOriginCep === "06754000" ? REAL_XPOINT_SENDER_ADDRESS.cep : envOriginCep;

  return {
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
      ...REAL_XPOINT_SENDER_ADDRESS,
      cep: effectiveSenderCep,
    },
    pickupAddresses: DEFAULT_PICKUP_ADDRESSES,
    selectedPickupAddressId: DEFAULT_PICKUP_ADDRESSES[0].id,
    cwsUser: process.env.CORREIOS_USUARIO || process.env.CORREIOS_CNPJ || CORREIOS_CONTRACT_METADATA.cnpj,
    cwsCanonicalIdCorreios: "",
    cwsPassword: process.env.CORREIOS_SENHA_API || process.env.CORREIOS_TOKEN || "",
    cwsIsVerified: false,
  };
}

function mergeParsedCorreiosConfig(
  defaultConfig: CorreiosContractConfig,
  parsed: Record<string, any> | null | undefined
): CorreiosContractConfig {
  if (!parsed || typeof parsed !== "object") {
    return defaultConfig;
  }

  const savedAddr = parsed.senderAddress || {};
  const isOldPlaceholderAddr =
    savedAddr.cep === "06754000" ||
    savedAddr.cep === "06754-000" ||
    savedAddr.street === "Av. Industrial";

  const pickupAddresses: CorreiosPickupAddress[] =
    Array.isArray(parsed.pickupAddresses) && parsed.pickupAddresses.length > 0
      ? parsed.pickupAddresses
      : DEFAULT_PICKUP_ADDRESSES;

  const selectedId =
    parsed.selectedPickupAddressId &&
    pickupAddresses.some((p) => p.id === parsed.selectedPickupAddressId)
      ? parsed.selectedPickupAddressId
      : pickupAddresses[0].id;

  const selectedPickup = pickupAddresses.find((p) => p.id === selectedId) || pickupAddresses[0];

  const envPassword = (process.env.CORREIOS_SENHA_API || process.env.CORREIOS_TOKEN || "").trim();
  const savedPassword = typeof parsed.cwsPassword === "string" ? parsed.cwsPassword.trim() : "";

  return {
    ...defaultConfig,
    ...parsed,
    pickupAddresses,
    selectedPickupAddressId: selectedId,
    senderName: selectedPickup?.senderName || parsed.senderName || defaultConfig.senderName,
    cnpj: selectedPickup?.cnpj || parsed.cnpj || defaultConfig.cnpj,
    senderPhone: selectedPickup?.phone || parsed.senderPhone || defaultConfig.senderPhone,
    senderEmail: selectedPickup?.email || parsed.senderEmail || defaultConfig.senderEmail,
    senderAddress: selectedPickup
      ? {
          cep: selectedPickup.cep,
          street: selectedPickup.street,
          number: selectedPickup.number,
          complement: selectedPickup.complement,
          neighborhood: selectedPickup.neighborhood,
          city: selectedPickup.city,
          state: selectedPickup.state,
        }
      : isOldPlaceholderAddr
      ? REAL_XPOINT_SENDER_ADDRESS
      : {
          ...defaultConfig.senderAddress,
          ...savedAddr,
        },
    cwsUser: (parsed.cwsUser && String(parsed.cwsUser).trim()) || defaultConfig.cwsUser,
    cwsCanonicalIdCorreios:
      (parsed.cwsCanonicalIdCorreios && String(parsed.cwsCanonicalIdCorreios).trim()) ||
      defaultConfig.cwsCanonicalIdCorreios,
    cwsPassword: savedPassword || envPassword || "",
  };
}

function applyConfigToProcessEnv(cfg: CorreiosContractConfig): void {
  process.env.CORREIOS_CONTRATO = cfg.contractNumber;
  process.env.CORREIOS_CARTAO_POSTAGEM = cfg.postcardNumber;
  process.env.CORREIOS_CNPJ = cfg.cnpj;
  process.env.CORREIOS_COD_SERVICO_SEDEX = cfg.sedexServiceCode;
  process.env.CORREIOS_COD_SERVICO_PAC = cfg.pacServiceCode;
  if (cfg.cwsUser && cfg.cwsUser.trim()) {
    process.env.CORREIOS_USUARIO = cfg.cwsUser.trim();
  }
  if (cfg.cwsPassword && cfg.cwsPassword.trim()) {
    process.env.CORREIOS_SENHA_API = cfg.cwsPassword.trim();
  }
}

export function getCorreiosContractConfig(): CorreiosContractConfig {
  const defaultConfig = buildDefaultCorreiosContractConfig();
  const cachedPersistent = getCachedPersistentCorreiosConfig();
  if (cachedPersistent) {
    return mergeParsedCorreiosConfig(defaultConfig, cachedPersistent);
  }

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return mergeParsedCorreiosConfig(defaultConfig, parsed);
    }
  } catch (err) {
    console.warn("[Correios Prepostagem] Aviso ao ler correios_contract_settings.json:", err);
  }

  return defaultConfig;
}

/**
 * Carrega as configurações persistentes do Appwrite (`totem_db.app_settings`) para memória e `process.env`,
 * garantindo que credenciais CWS e endereços de coleta sobrevivam a qualquer redeploy no Coolify.
 */
export async function hydrateCorreiosContractConfig(forceRefresh = false): Promise<CorreiosContractConfig> {
  const defaultConfig = buildDefaultCorreiosContractConfig();
  const persistent = await loadPersistentCorreiosConfig({ forceRefresh });
  if (persistent) {
    const merged = mergeParsedCorreiosConfig(defaultConfig, persistent);
    applyConfigToProcessEnv(merged);
    try {
      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
    } catch {}
    return merged;
  }
  const localCfg = getCorreiosContractConfig();
  applyConfigToProcessEnv(localCfg);
  return localCfg;
}

function buildNextConfigForSave(
  current: CorreiosContractConfig,
  partial: Partial<CorreiosContractConfig> & { clearCwsPassword?: boolean }
): CorreiosContractConfig {
  const pickupAddresses =
    Array.isArray(partial.pickupAddresses) && partial.pickupAddresses.length > 0
      ? partial.pickupAddresses
      : current.pickupAddresses;

  const selectedPickupAddressId =
    partial.selectedPickupAddressId &&
    pickupAddresses.some((p) => p.id === partial.selectedPickupAddressId)
      ? partial.selectedPickupAddressId
      : current.selectedPickupAddressId || pickupAddresses[0].id;

  const activePickup =
    pickupAddresses.find((p) => p.id === selectedPickupAddressId) || pickupAddresses[0];

  const rawIncomingPassword = typeof partial.cwsPassword === "string" ? partial.cwsPassword.trim() : undefined;
  const shouldKeepExistingPassword =
    !partial.clearCwsPassword && (!rawIncomingPassword || rawIncomingPassword.startsWith("***"));

  const resolvedPassword = partial.clearCwsPassword
    ? ""
    : shouldKeepExistingPassword
    ? current.cwsPassword
    : rawIncomingPassword!;

  const { clearCwsPassword: _ignored, ...restPartial } = partial;

  const next: CorreiosContractConfig = {
    ...current,
    ...restPartial,
    cwsPassword: resolvedPassword,
    pickupAddresses,
    selectedPickupAddressId,
    senderName: activePickup?.senderName || partial.senderName || current.senderName,
    cnpj: activePickup?.cnpj || partial.cnpj || current.cnpj,
    senderPhone: activePickup?.phone || partial.senderPhone || current.senderPhone,
    senderEmail: activePickup?.email || partial.senderEmail || current.senderEmail,
    senderAddress: activePickup
      ? {
          cep: activePickup.cep,
          street: activePickup.street,
          number: activePickup.number,
          complement: activePickup.complement,
          neighborhood: activePickup.neighborhood,
          city: activePickup.city,
          state: activePickup.state,
        }
      : {
          ...current.senderAddress,
          ...(partial.senderAddress || {}),
        },
    updatedAt: new Date().toISOString(),
  };

  if (next.senderAddress.cep.replace(/\D/g, "") === "06754000") {
    next.senderAddress = { ...REAL_XPOINT_SENDER_ADDRESS };
  }

  return next;
}

function writeLocalConfigFiles(next: CorreiosContractConfig): void {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Correios Prepostagem] Aviso ao salvar correios_contract_settings.json:", err);
  }

  applyConfigToProcessEnv(next);

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
}

export function saveCorreiosContractConfig(
  partial: Partial<CorreiosContractConfig> & { clearCwsPassword?: boolean }
): CorreiosContractConfig {
  const current = getCorreiosContractConfig();
  const next = buildNextConfigForSave(current, partial);
  writeLocalConfigFiles(next);
  void savePersistentCorreiosConfig(next);
  return next;
}

export async function saveCorreiosContractConfigAsync(
  partial: Partial<CorreiosContractConfig> & { clearCwsPassword?: boolean }
): Promise<{ config: CorreiosContractConfig; persistedToAppwrite: boolean }> {
  const current = await hydrateCorreiosContractConfig();
  const next = buildNextConfigForSave(current, partial);
  writeLocalConfigFiles(next);
  const persistedToAppwrite = await savePersistentCorreiosConfig(next);
  return { config: next, persistedToAppwrite };
}

export async function authenticateCorreiosCws(customConfig?: Partial<CorreiosContractConfig>): Promise<{
  ok: boolean;
  token?: string;
  canonicalIdCorreios?: string;
  authorizedApis?: number[];
  expiresAt?: string;
  error?: string;
  statusCode?: number;
  endpoint: string;
  durationMs: number;
  requestPayload: any;
  responsePayload?: any;
}> {
  const startMs = Date.now();
  const endpoint = `${CWS_BASE_URL}/token/v1/autentica/cartaopostagem`;
  const hydrated = await hydrateCorreiosContractConfig();
  const incomingCustom = customConfig ? { ...customConfig } : {};
  if (
    typeof incomingCustom.cwsPassword === "string" &&
    (!incomingCustom.cwsPassword.trim() || incomingCustom.cwsPassword.trim().startsWith("***"))
  ) {
    delete incomingCustom.cwsPassword;
  }
  const cfg = { ...hydrated, ...incomingCustom };
  const usuario = (cfg.cwsUser || cfg.cnpj || "").trim();
  const senhaApi = (cfg.cwsPassword || "").trim();
  const cartao = (cfg.postcardNumber || "").replace(/\D/g, "");

  const requestPayload = {
    authHeader: usuario ? `Basic base64(${usuario}:***)` : "Ausente",
    body: { numero: cartao },
  };

  if (!usuario || !senhaApi) {
    return {
      ok: false,
      endpoint,
      durationMs: Date.now() - startMs,
      requestPayload,
      error:
        "O Código de Acesso à API (Token CWS) não está configurado. Siga o Assistente Passo a Passo no painel da API para gerar seu Token em cws.correios.com.br e ativar o módulo.",
    };
  }

  const basicAuth = Buffer.from(`${usuario}:${senhaApi}`).toString("base64");
  let lastStatusCode: number | undefined;
  let lastResponsePayload: any = null;
  let lastErrorMsg = "";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(endpoint, {
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
      lastStatusCode = res.status;

      const rawText = await res.text();
      let parsedBody: any = rawText;
      try {
        parsedBody = rawText ? JSON.parse(rawText) : {};
      } catch {}
      lastResponsePayload = parsedBody;

      if (!res.ok) {
        const errDetail =
          parsedBody?.msgs?.[0] ||
          parsedBody?.mensagem ||
          parsedBody?.message ||
          parsedBody?.causa ||
          (typeof parsedBody === "string" && parsedBody.slice(0, 200)) ||
          `HTTP ${res.status}`;

        if (res.status === 401 || res.status === 403) {
          return {
            ok: false,
            statusCode: res.status,
            endpoint,
            durationMs: Date.now() - startMs,
            requestPayload,
            responsePayload: parsedBody,
            error: `Credenciais recusadas pelo portal CWS Correios (HTTP ${res.status}): ${errDetail}. Confirme se o 'Usuário Meu Correios' (${usuario}) e o 'Código de Acesso à API' estão ativos em cws.correios.com.br para o Cartão ${cartao}.`,
          };
        }

        lastErrorMsg = `HTTP ${res.status}: ${errDetail}`;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 450 * attempt));
          continue;
        }
      } else if (parsedBody && parsedBody.token) {
        const canonicalIdCorreios = String(
          parsedBody.id || parsedBody.idCorreios || parsedBody.usuario || usuario
        ).trim();
        const authorizedApis: number[] = Array.isArray(parsedBody.cartaoPostagem?.api)
          ? parsedBody.cartaoPostagem.api
          : Array.isArray(parsedBody.api)
          ? parsedBody.api
          : [];
        await saveCorreiosContractConfigAsync({
          ...incomingCustom,
          cwsCanonicalIdCorreios: canonicalIdCorreios,
          cwsIsVerified: true,
          cwsLastVerifiedAt: new Date().toISOString(),
        });
        return {
          ok: true,
          token: parsedBody.token,
          canonicalIdCorreios,
          authorizedApis,
          expiresAt: parsedBody.expiraEm,
          statusCode: res.status,
          endpoint,
          durationMs: Date.now() - startMs,
          requestPayload,
          responsePayload: {
            ambiente: parsedBody.ambiente,
            id: canonicalIdCorreios,
            cnpj: parsedBody.cnpj,
            contrato: parsedBody.cartaoPostagem?.contrato || cfg.contractNumber,
            cartao: parsedBody.cartaoPostagem?.numero || cartao,
            dr: parsedBody.cartaoPostagem?.dr,
            api: authorizedApis,
            expiraEm: parsedBody.expiraEm,
            tokenPreview: `${String(parsedBody.token).slice(0, 18)}...`,
          },
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastErrorMsg = `Falha de rede na tentativa ${attempt}/3: ${err?.message || "Timeout"}`;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 450 * attempt));
      }
    }
  }

  return {
    ok: false,
    statusCode: lastStatusCode,
    endpoint,
    durationMs: Date.now() - startMs,
    requestPayload,
    responsePayload: lastResponsePayload,
    error: lastErrorMsg || "Não foi possível obter resposta da API CWS dos Correios após 3 tentativas.",
  };
}

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

    let dims: [number, number, number] = [68, 65, 23];
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

    const subtotalCents =
      Number(item.subtotal_cents) ||
      Number(item.unit_price_cents) * qty ||
      Number(order?.subtotal_cents) ||
      124000;
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
    const fallbackReais = Math.max(
      100,
      Math.round((Number(order?.subtotal_cents) || Number(order?.total_cents) || 124000) / 100)
    );
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
    trackingCode: "",
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

export async function launchOrderCorreiosPrepostagem(params: {
  orderId: string;
  orderNumber: string;
  mode: "cws_live" | "simplified";
  serviceCode: string;
  pickupAddressId?: string;
  customSender?: CorreiosShipmentRecord["sender"];
  invoiceNumber?: string;
  invoiceKey?: string;
  observations?: string;
  recipient: CorreiosShipmentRecord["recipient"];
  volumes: CorreiosVolumeSpec[];
}): Promise<{
  ok: boolean;
  modeUsed: "cws_live" | "simplified";
  shipment: CorreiosShipmentRecord;
  breadcrumbs: CorreiosApiBreadcrumb[];
  message: string;
  error?: string;
}> {
  const totalSteps = 7;
  const breadcrumbs: CorreiosApiBreadcrumb[] = [];

  // Se o usuário selecionou um endereço de coleta específico, persiste-o como último selecionado
  if (params.pickupAddressId) {
    await saveCorreiosContractConfigAsync({ selectedPickupAddressId: params.pickupAddressId });
  }

  const cfg = await hydrateCorreiosContractConfig();
  const isPac = params.serviceCode === cfg.pacServiceCode || params.serviceCode === "03298";
  const serviceCode = isPac ? cfg.pacServiceCode : cfg.sedexServiceCode;
  const serviceName = isPac ? "PAC CONTRATO AG" : "SEDEX CONTRATO AG";
  const insuranceServiceCode = isPac ? "064" : "019";

  // ============================================================================
  // MIGALHA 1/7: Validação do Contrato & Credenciais CWS
  // ============================================================================
  const step1Start = Date.now();
  const hasCwsToken = Boolean(cfg.cwsPassword && cfg.cwsPassword.trim());
  const hasCwsUser = Boolean(cfg.cwsUser && cfg.cwsUser.trim());

  if (params.mode === "cws_live" && (!hasCwsToken || !hasCwsUser)) {
    breadcrumbs.push({
      step: 1,
      totalSteps,
      code: "CONTRACT_CREDENTIALS",
      title: "1. Verificação das Credenciais do Contrato & Token CWS",
      status: "error",
      summary: "Código de Acesso à API (Token CWS) ainda não configurado no sistema.",
      durationMs: Date.now() - step1Start,
      timestamp: new Date().toISOString(),
      details: [
        `Contrato AG: ${cfg.contractNumber} (OK)`,
        `Cartão de Postagem: ${cfg.postcardNumber} (OK)`,
        `CNPJ Remetente: ${cfg.cnpj} (OK)`,
        `Usuário Meu Correios (idCorreios): ${cfg.cwsUser || "NÃO PREENCHIDO"}`,
        `Código de Acesso à API (Token CWS): NÃO PREENCHIDO (Obrigatório para lançamento real na API dos Correios)`,
      ],
      remediation:
        "Siga o Assistente de Ativação Passo a Passo aberto acima: gere o seu 'Código de Acesso à API (Token CWS)' em cws.correios.com.br, cole no Passo 2 e clique em 'Salvar e Ativar Módulo CWS'.",
    });
  } else {
    breadcrumbs.push({
      step: 1,
      totalSteps,
      code: "CONTRACT_CREDENTIALS",
      title: "1. Verificação das Credenciais do Contrato & Token CWS",
      status: "success",
      summary:
        params.mode === "cws_live"
          ? `Contrato ${cfg.contractNumber}, Cartão ${cfg.postcardNumber} e Credenciais CWS carregados.`
          : `Contrato ${cfg.contractNumber} e Cartão ${cfg.postcardNumber} carregados para Etiqueta Simplificada.`,
      durationMs: Date.now() - step1Start,
      timestamp: new Date().toISOString(),
      details: [
        `Contrato AG: ${cfg.contractNumber}`,
        `Cartão de Postagem: ${cfg.postcardNumber}`,
        `Serviço Selecionado: ${serviceName} (Cód. ${serviceCode})`,
        `Usuário CWS (idCorreios): ${cfg.cwsUser}`,
        `Token CWS: ${hasCwsToken ? "Configurado (***)" : "Modo Simplificado Direto"}`,
      ],
    });
  }

  // ============================================================================
  // MIGALHA 2/7: Higienização & Validação DNE do Endereço de Coleta / Remetente
  // ============================================================================
  const step2Start = Date.now();
  const senderDetails: string[] = [];
  const rawSender = params.customSender || {
    name: cfg.senderName,
    cnpj: cfg.cnpj,
    phone: cfg.senderPhone,
    email: cfg.senderEmail,
    cep: cfg.senderAddress.cep,
    street: cfg.senderAddress.street,
    number: cfg.senderAddress.number,
    complement: cfg.senderAddress.complement,
    neighborhood: cfg.senderAddress.neighborhood,
    city: cfg.senderAddress.city,
    state: cfg.senderAddress.state,
  };

  let senderCepClean = (rawSender.cep || "").replace(/\D/g, "");
  let senderStreet = rawSender.street;
  let senderNumber = rawSender.number;
  let senderComplement = rawSender.complement || "";
  let senderNeighborhood = rawSender.neighborhood;
  let senderCity = rawSender.city;
  let senderState = rawSender.state;
  let step2Status: "success" | "warning" = "success";

  if (!senderCepClean || senderCepClean === "06754000") {
    senderCepClean = REAL_XPOINT_SENDER_ADDRESS.cep;
    senderStreet = REAL_XPOINT_SENDER_ADDRESS.street;
    senderNumber = REAL_XPOINT_SENDER_ADDRESS.number;
    senderComplement = REAL_XPOINT_SENDER_ADDRESS.complement;
    senderNeighborhood = REAL_XPOINT_SENDER_ADDRESS.neighborhood;
    senderCity = REAL_XPOINT_SENDER_ADDRESS.city;
    senderState = REAL_XPOINT_SENDER_ADDRESS.state;
    step2Status = "warning";
    senderDetails.push(
      "Auto-correção DNE: CEP genérico 06754-000 substituído pelo CEP oficial DNE da X-Point (06754-160 — Praça Miguel Ortega, 340, Loja 5, Parque Assunção, Taboão da Serra/SP)."
    );
  }

  const senderPhoneParsed = parseBrazilianPhoneForCws(rawSender.phone || cfg.senderPhone);
  const senderDocCheck = validateCpfOrCnpj(rawSender.cnpj || cfg.cnpj);

  const senderObj: CorreiosShipmentRecord["sender"] = {
    name: sanitizeCwsString(rawSender.name || cfg.senderName, 50),
    cnpj: senderDocCheck.clean || "11040282000177",
    phone: `${senderPhoneParsed.ddd}${senderPhoneParsed.number}`,
    email: sanitizeCwsString(rawSender.email || cfg.senderEmail, 50),
    cep: senderCepClean,
    street: sanitizeCwsString(senderStreet, 50),
    number: sanitizeCwsString(senderNumber || "340", 6),
    complement: sanitizeCwsString(senderComplement, 30),
    neighborhood: sanitizeCwsString(senderNeighborhood, 30),
    city: sanitizeCwsString(senderCity, 30),
    state: sanitizeCwsString(senderState, 2).toUpperCase(),
  };

  senderDetails.push(
    `Remetente / Coleta: ${senderObj.name} (CNPJ: ${senderObj.cnpj})`,
    `Endereço Coleta Ativo: ${senderObj.street}, ${senderObj.number} (${senderObj.complement}) - ${senderObj.neighborhood}, ${senderObj.city}/${senderObj.state} • CEP ${senderObj.cep}`,
    `Telefone Coleta: (${senderPhoneParsed.ddd}) ${senderPhoneParsed.number}`
  );

  breadcrumbs.push({
    step: 2,
    totalSteps,
    code: "SENDER_DNE_VALIDATION",
    title: "2. Validação do Endereço de Coleta / Remetente",
    status: step2Status,
    summary: `Coleta em ${senderObj.street}, ${senderObj.number} - ${senderObj.city}/${senderObj.state} (CEP ${senderObj.cep}).`,
    durationMs: Date.now() - step2Start,
    timestamp: new Date().toISOString(),
    details: senderDetails,
  });

  // ============================================================================
  // MIGALHA 3/7: Higienização, CPF/CNPJ & Consulta DNE/ViaCEP do Destinatário
  // ============================================================================
  const step3Start = Date.now();
  const recipientDetails: string[] = [];
  let step3Status: "success" | "warning" | "error" = "success";
  let step3ErrorMsg = "";

  const recCepClean = String(params.recipient.cep || "").replace(/\D/g, "");
  const dneLookup = await lookupDneCep(recCepClean);

  let recStreet = params.recipient.street || "";
  let recNeighborhood = params.recipient.neighborhood || "";
  let recCity = params.recipient.city || "";
  let recState = (params.recipient.state || "").toUpperCase();

  if (dneLookup.ok) {
    recipientDetails.push(
      `CEP Destino ${recCepClean} confirmado na base DNE/ViaCEP: ${dneLookup.localidade}/${dneLookup.uf} (IBGE ${dneLookup.ibge || "OK"}).`
    );
    if (!recStreet.trim() && dneLookup.logradouro) {
      recStreet = dneLookup.logradouro;
      step3Status = "warning";
      recipientDetails.push(`Logradouro preenchido automaticamente via DNE: "${recStreet}".`);
    }
    if (
      dneLookup.bairro &&
      (!recNeighborhood.trim() ||
        (dneLookup.bairro.length > recNeighborhood.trim().length &&
          dneLookup.bairro.toLowerCase().startsWith(recNeighborhood.trim().toLowerCase().slice(0, 12))))
    ) {
      recipientDetails.push(
        `Bairro enriquecido pelo DNE: de "${recNeighborhood}" para "${dneLookup.bairro}".`
      );
      recNeighborhood = dneLookup.bairro;
      step3Status = "warning";
    }
    if (!recCity.trim() && dneLookup.localidade) {
      recCity = dneLookup.localidade;
    }
    if (!recState.trim() && dneLookup.uf) {
      recState = dneLookup.uf;
    }
  } else {
    if (recCepClean.length !== 8) {
      step3Status = "error";
      step3ErrorMsg = `CEP do destinatário "${params.recipient.cep}" é inválido (deve ter 8 números).`;
      recipientDetails.push(`❌ ${step3ErrorMsg}`);
    } else {
      step3Status = "warning";
      recipientDetails.push(`⚠️ Aviso DNE/ViaCEP: ${dneLookup.error} Usando endereço informado no pedido.`);
    }
  }

  const recDocCheck = validateCpfOrCnpj(params.recipient.document);
  if (recDocCheck.valid) {
    recipientDetails.push(
      `${recDocCheck.type} do destinatário (${recDocCheck.clean}) matematicamente válido.`
    );
  } else if (params.mode === "cws_live") {
    step3Status = "error";
    step3ErrorMsg = `O CPF/CNPJ do destinatário é obrigatório e deve ser válido na API dos Correios (${recDocCheck.reason}).`;
    recipientDetails.push(`❌ ${step3ErrorMsg}`);
  } else {
    step3Status = "warning";
    recipientDetails.push(`⚠️ CPF/CNPJ do destinatário: ${recDocCheck.reason}`);
  }

  const recPhoneParsed = parseBrazilianPhoneForCws(params.recipient.phone);
  if (recPhoneParsed.wasAdjusted) {
    recipientDetails.push(`Telefone destinatário normalizado para padrão CWS: ${recPhoneParsed.formatted}.`);
  } else {
    recipientDetails.push(`Telefone destinatário: ${recPhoneParsed.formatted}.`);
  }

  const cleanRecipient: CorreiosShipmentRecord["recipient"] = {
    name: sanitizeCwsString(params.recipient.name || "Cliente Totem Pro", 50),
    document: recDocCheck.clean,
    phone: `${recPhoneParsed.ddd}${recPhoneParsed.number}`,
    email: sanitizeCwsString(params.recipient.email, 50),
    cep: recCepClean,
    street: sanitizeCwsString(recStreet, 50),
    number: sanitizeCwsString(params.recipient.number || "SN", 6) || "SN",
    complement: sanitizeCwsString(params.recipient.complement, 30),
    neighborhood: sanitizeCwsString(recNeighborhood || "Centro", 30),
    city: sanitizeCwsString(recCity, 30),
    state: sanitizeCwsString(recState || "SP", 2).toUpperCase(),
  };

  if (!cleanRecipient.street || !cleanRecipient.city) {
    step3Status = "error";
    step3ErrorMsg = "Logradouro e Cidade do destinatário são obrigatórios.";
    recipientDetails.push(`❌ ${step3ErrorMsg}`);
  }

  breadcrumbs.push({
    step: 3,
    totalSteps,
    code: "RECIPIENT_DNE_VALIDATION",
    title: "3. Validação DNE/ViaCEP, CPF/CNPJ & Endereço do Destinatário",
    status: step3Status,
    summary:
      step3Status === "error"
        ? step3ErrorMsg
        : `Destinatário ${cleanRecipient.name} (${cleanRecipient.city}/${cleanRecipient.state} • CEP ${cleanRecipient.cep}) validado.`,
    durationMs: Date.now() - step3Start,
    timestamp: new Date().toISOString(),
    details: recipientDetails,
    remediation:
      step3Status === "error"
        ? "Corrija o CPF/CNPJ ou CEP do destinatário no formulário à esquerda e tente novamente."
        : undefined,
  });

  // ============================================================================
  // MIGALHA 4/7: Validação Técnica de Volumes, Cubagem, Seguro & Declaração
  // ============================================================================
  const step4Start = Date.now();
  const volDetails: string[] = [];
  let step4Status: "success" | "warning" | "error" = "success";
  let step4ErrorMsg = "";
  const totalVolumes = params.volumes.length || 1;

  for (let i = 0; i < params.volumes.length; i++) {
    const v = params.volumes[i];
    const weightG = Math.round(Number(v.weightGrams) || 16000);
    const l = Math.round(Number(v.lengthCm) || 68);
    const w = Math.round(Number(v.widthCm) || 65);
    const h = Math.round(Number(v.heightCm) || 23);
    const sumDims = l + w + h;
    const vd = Number(v.declaredValueReais) || 0;

    if (weightG > 30000) {
      step4Status = "error";
      step4ErrorMsg = `Volume ${i + 1} possui ${(weightG / 1000).toFixed(1)}kg (limite máximo dos Correios é 30kg por volume).`;
      volDetails.push(`❌ ${step4ErrorMsg}`);
    } else if (l > 100 || w > 100 || h > 100 || sumDims > 200) {
      step4Status = "error";
      step4ErrorMsg = `Volume ${i + 1} (${l}x${w}x${h}cm, soma=${sumDims}cm) excede os limites físicos dos Correios (máx 100cm por lado e soma <= 200cm).`;
      volDetails.push(`❌ ${step4ErrorMsg}`);
    } else {
      volDetails.push(
        `Vol ${i + 1}/${totalVolumes} ("${sanitizeCwsString(v.label, 40)}"): ${l}x${w}x${h}cm (soma ${sumDims}cm <= 200cm) • Peso ${(weightG / 1000).toFixed(1)}kg (${weightG}g) • Valor Declarado R$ ${vd.toFixed(2)} (Seguro Cód. ${insuranceServiceCode}).`
      );
    }
  }

  breadcrumbs.push({
    step: 4,
    totalSteps,
    code: "VOLUMES_PAYLOAD_VALIDATION",
    title: "4. Auditoria de Dimensões, Peso, Seguro & Declaração de Conteúdo",
    status: step4Status,
    summary:
      step4Status === "error"
        ? step4ErrorMsg
        : `${totalVolumes} volume(s) dentro dos limites operacionais dos Correios (<= 30kg e <= 200cm).`,
    durationMs: Date.now() - step4Start,
    timestamp: new Date().toISOString(),
    details: volDetails,
    remediation:
      step4Status === "error"
        ? "Ajuste as medidas (máx 100cm por lado e soma C+L+A <= 200cm) e peso (máx 30kg) na seção '2. Volumes / Embalagens'."
        : undefined,
  });

  if (params.mode === "simplified") {
    const simplifiedVolumes: CorreiosVolumeSpec[] = params.volumes.map((vol, idx) => ({
      ...vol,
      volumeIndex: idx + 1,
      totalVolumes,
      heightCm: Math.max(2, Math.min(100, Math.round(Number(vol.heightCm) || 23))),
      widthCm: Math.max(11, Math.min(100, Math.round(Number(vol.widthCm) || 45))),
      lengthCm: Math.max(16, Math.min(100, Math.round(Number(vol.lengthCm) || 68))),
      weightGrams: Math.max(300, Math.round(Number(vol.weightGrams) || 16000)),
      declaredValueReais: Math.max(0, Number(vol.declaredValueReais) || 0),
      trackingCode:
        vol.prepostagemId && vol.trackingCode
          ? vol.trackingCode.trim().toUpperCase()
          : vol.trackingCode && /^[A-Z]{2}\d{9}BR$/i.test(vol.trackingCode.trim()) && vol.status === "cws_registered"
          ? vol.trackingCode.trim().toUpperCase()
          : "",
      status: vol.prepostagemId ? "cws_registered" : "simplified_ready",
      cwsMessage: "Etiqueta de Endereçamento & Declaração de Conteúdo gerada com dados reais do pedido.",
    }));

    const nowIso = new Date().toISOString();
    const shipment: CorreiosShipmentRecord = {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      serviceCode,
      serviceName,
      contractNumber: cfg.contractNumber,
      postcardNumber: cfg.postcardNumber,
      agency: cfg.agency,
      mode: "simplified",
      pickupAddressId: params.pickupAddressId || cfg.selectedPickupAddressId,
      invoiceNumber: params.invoiceNumber || "",
      invoiceKey: params.invoiceKey || "",
      observations: params.observations || "",
      sender: senderObj,
      recipient: cleanRecipient,
      volumes: simplifiedVolumes,
      officialLabelPdfBase64: null,
      lastBreadcrumbs: breadcrumbs,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return {
      ok: true,
      modeUsed: "simplified",
      shipment,
      breadcrumbs,
      message: `Etiqueta de Endereçamento com QR Code e Declaração de Conteúdo (Contrato ${cfg.contractNumber}) pronta para impressão!`,
    };
  }

  const firstBlockingError = breadcrumbs.find((b) => b.status === "error");
  if (firstBlockingError) {
    breadcrumbs.push(
      {
        step: 5,
        totalSteps,
        code: "CWS_TOKEN_AUTH",
        title: "5. Autenticação JWT no Portal CWS Correios (/token/v1/autentica/cartaopostagem)",
        status: "skipped",
        summary: `Aguardando correção da Etapa ${firstBlockingError.step} (${firstBlockingError.title}).`,
        durationMs: 0,
        timestamp: new Date().toISOString(),
        details: ["Etapa não executada porque uma validação prévia obrigatória falhou."],
      },
      {
        step: 6,
        totalSteps,
        code: "CWS_PREPOSTAGEM_CREATE",
        title: "6. Registro da Pré-Postagem Oficial (/prepostagem/v1/prepostagens)",
        status: "skipped",
        summary: `Aguardando correção da Etapa ${firstBlockingError.step}.`,
        durationMs: 0,
        timestamp: new Date().toISOString(),
        details: ["Nenhum código falso foi gerado. O sistema aguarda o envio real para a API dos Correios."],
      },
      {
        step: 7,
        totalSteps,
        code: "CWS_LABEL_PDF",
        title: "7. Emissão do Rótulo Oficial PDF (/prepostagem/v1/prepostagens/rotulo/assincrono/pdf)",
        status: "skipped",
        summary: "Aguardando registro da pré-postagem.",
        durationMs: 0,
        timestamp: new Date().toISOString(),
        details: [],
      }
    );

    const nowIso = new Date().toISOString();
    return {
      ok: false,
      modeUsed: "cws_live",
      breadcrumbs,
      error: firstBlockingError.summary,
      message: `Falha na Etapa ${firstBlockingError.step}/${totalSteps}: ${firstBlockingError.summary}`,
      shipment: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        serviceCode,
        serviceName,
        contractNumber: cfg.contractNumber,
        postcardNumber: cfg.postcardNumber,
        agency: cfg.agency,
        mode: "cws_live",
        pickupAddressId: params.pickupAddressId || cfg.selectedPickupAddressId,
        invoiceNumber: params.invoiceNumber || "",
        invoiceKey: params.invoiceKey || "",
        observations: params.observations || "",
        sender: senderObj,
        recipient: cleanRecipient,
        volumes: params.volumes,
        lastBreadcrumbs: breadcrumbs,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    };
  }

  // ============================================================================
  // MIGALHA 5/7: Autenticação JWT no Portal CWS Correios
  // ============================================================================
  const authRes = await authenticateCorreiosCws(cfg);
  if (!authRes.ok || !authRes.token) {
    breadcrumbs.push(
      {
        step: 5,
        totalSteps,
        code: "CWS_TOKEN_AUTH",
        title: "5. Autenticação JWT no Portal CWS Correios (/token/v1/autentica/cartaopostagem)",
        status: "error",
        summary: authRes.error || "Falha ao autenticar Cartão de Postagem na API CWS.",
        durationMs: authRes.durationMs,
        timestamp: new Date().toISOString(),
        endpoint: authRes.endpoint,
        httpStatus: authRes.statusCode,
        details: [
          `Endpoint: POST ${authRes.endpoint}`,
          `Cartão de Postagem: ${cfg.postcardNumber}`,
          `Usuário (idCorreios): ${cfg.cwsUser}`,
          `Status HTTP: ${authRes.statusCode || "Sem resposta"}`,
        ],
        requestPayload: authRes.requestPayload,
        responsePayload: authRes.responsePayload,
        remediation:
          "Acesse cws.correios.com.br com seu login Meu Correios -> Gestão de Acesso a API's -> Regenerar Código de Acesso, e cole o novo token no Assistente de Ativação.",
      },
      {
        step: 6,
        totalSteps,
        code: "CWS_PREPOSTAGEM_CREATE",
        title: "6. Registro da Pré-Postagem Oficial (/prepostagem/v1/prepostagens)",
        status: "skipped",
        summary: "Não executado pois a autenticação JWT na Etapa 5 falhou.",
        durationMs: 0,
        timestamp: new Date().toISOString(),
        details: [],
      },
      {
        step: 7,
        totalSteps,
        code: "CWS_LABEL_PDF",
        title: "7. Emissão do Rótulo Oficial PDF (/prepostagem/v1/prepostagens/rotulo/assincrono/pdf)",
        status: "skipped",
        summary: "Não executado pois a Etapa 5 falhou.",
        durationMs: 0,
        timestamp: new Date().toISOString(),
        details: [],
      }
    );

    const nowIso = new Date().toISOString();
    return {
      ok: false,
      modeUsed: "cws_live",
      breadcrumbs,
      error: authRes.error,
      message: `Falha na Etapa 5/7 (Autenticação CWS): ${authRes.error}`,
      shipment: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        serviceCode,
        serviceName,
        contractNumber: cfg.contractNumber,
        postcardNumber: cfg.postcardNumber,
        agency: cfg.agency,
        mode: "cws_live",
        pickupAddressId: params.pickupAddressId || cfg.selectedPickupAddressId,
        invoiceNumber: params.invoiceNumber || "",
        invoiceKey: params.invoiceKey || "",
        observations: params.observations || "",
        sender: senderObj,
        recipient: cleanRecipient,
        volumes: params.volumes,
        lastBreadcrumbs: breadcrumbs,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    };
  }

  breadcrumbs.push({
    step: 5,
    totalSteps,
    code: "CWS_TOKEN_AUTH",
    title: "5. Autenticação JWT no Portal CWS Correios (/token/v1/autentica/cartaopostagem)",
    status: "success",
    summary: `Token JWT CWS emitido com sucesso para o Cartão ${cfg.postcardNumber} (HTTP ${authRes.statusCode || 201}).`,
    durationMs: authRes.durationMs,
    timestamp: new Date().toISOString(),
    endpoint: authRes.endpoint,
    httpStatus: authRes.statusCode || 201,
    details: [
      `Token JWT obtido com sucesso (expira em: ${authRes.expiresAt || "24h"})`,
      `idCorreios Autenticado: ${authRes.canonicalIdCorreios || cfg.cwsUser || cfg.cnpj}`,
      `Contrato vinculado: ${authRes.responsePayload?.contrato || cfg.contractNumber}`,
      `Cartão de Postagem: ${authRes.responsePayload?.cartao || cfg.postcardNumber}`,
      ...(Array.isArray(authRes.authorizedApis) && authRes.authorizedApis.length > 0
        ? [`APIs autorizadas no cartão: [${authRes.authorizedApis.join(", ")}]`]
        : []),
    ],
    requestPayload: authRes.requestPayload,
    responsePayload: authRes.responsePayload,
  });

  // ============================================================================
  // MIGALHA 6/7: Registro da Pré-Postagem Oficial (/prepostagem/v1/prepostagens)
  // ============================================================================
  const step6Start = Date.now();
  const prepostagemEndpoint = `${CWS_BASE_URL}/prepostagem/v1/prepostagens`;
  const token = authRes.token!;
  const resolvedIdCorreios = (
    authRes.canonicalIdCorreios ||
    cfg.cwsCanonicalIdCorreios ||
    cfg.cwsUser ||
    cfg.cnpj
  ).replace(/\s+/g, "");
  const cleanSenderDoc = (senderObj.cnpj || cfg.cnpj || "").replace(/\D/g, "");
  const cleanSenderCep = (senderObj.cep || "").replace(/\D/g, "");
  const cleanRecipientDoc = (cleanRecipient.document || "").replace(/\D/g, "");
  const cleanRecipientCep = (cleanRecipient.cep || "").replace(/\D/g, "");
  const normalizedInvoiceKey = (params.invoiceKey || "").replace(/\D/g, "");
  const hasValidNfeKey = normalizedInvoiceKey.length === 44;

  const processedVolumes: CorreiosVolumeSpec[] = [];
  const createdPrepostagemIds: string[] = [];
  const step6Details: string[] = [];
  const step6Requests: any[] = [];
  const step6Responses: any[] = [];
  let step6HttpStatus: number | undefined;
  let step6Failed = false;
  let step6ErrorSummary = "";

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
    ).map((ci) => {
      const sanitizedDesc = sanitizeCwsString(ci.conteudo || "Gabinete Autoatendimento Totem Pro", 60);
      const finalDesc =
        sanitizedDesc.length >= 5
          ? sanitizedDesc
          : `${sanitizedDesc} Totem Pro`.trim().slice(0, 60);
      return {
        conteudo: finalDesc,
        quantidade: String(Math.max(1, Math.round(Number(ci.quantidade) || 1))),
        valor: Math.max(1, Number(ci.valorReais || declaredReais || 100)).toFixed(2),
      };
    });

    const cwsPayload: Record<string, any> = {
      idCorreios: resolvedIdCorreios,
      remetente: {
        nome: senderObj.name,
        cpfCnpj: cleanSenderDoc,
        dddCelular: senderPhoneParsed.ddd,
        celular: senderPhoneParsed.number,
        email: senderObj.email,
        endereco: {
          cep: cleanSenderCep,
          logradouro: senderObj.street,
          numero: senderObj.number || "S/N",
          ...(senderObj.complement ? { complemento: senderObj.complement } : {}),
          bairro: senderObj.neighborhood,
          cidade: senderObj.city,
          uf: senderObj.state,
        },
      },
      destinatario: {
        nome: cleanRecipient.name,
        cpfCnpj: cleanRecipientDoc,
        ...(recPhoneParsed.isMobile
          ? { dddCelular: recPhoneParsed.ddd, celular: recPhoneParsed.number }
          : { dddTelefone: recPhoneParsed.ddd, telefone: recPhoneParsed.number }),
        ...(cleanRecipient.email ? { email: cleanRecipient.email } : {}),
        endereco: {
          cep: cleanRecipientCep,
          logradouro: cleanRecipient.street,
          numero: cleanRecipient.number || "S/N",
          ...(cleanRecipient.complement ? { complemento: cleanRecipient.complement } : {}),
          bairro: cleanRecipient.neighborhood,
          cidade: cleanRecipient.city,
          uf: cleanRecipient.state,
        },
      },
      codigoServico: serviceCode,
      pesoInformado: String(weightGrams),
      codigoFormatoObjetoInformado: "2",
      alturaInformada: String(heightCm),
      larguraInformada: String(widthCm),
      comprimentoInformado: String(lengthCm),
      cienteObjetoNaoProibido: "1",
      solicitarColeta: "N",
      observacao: sanitizeCwsString(
        params.observations || `Pedido ${params.orderNumber} Vol ${i + 1}/${totalVolumes}`,
        50
      ),
      ...(listaServicoAdicional.length > 0 ? { listaServicoAdicional } : {}),
      // Regra vigente Correios PPN: itensDeclaracaoConteudo é obrigatório mesmo quando chaveNFe é informada
      itensDeclaracaoConteudo,
      ...(hasValidNfeKey
        ? {
            chaveNFe: normalizedInvoiceKey,
            ...(params.invoiceNumber ? { numeroNotaFiscal: params.invoiceNumber } : {}),
          }
        : {}),
    };

    step6Requests.push({ volume: i + 1, payload: cwsPayload });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      let res = await fetch(prepostagemEndpoint, {
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

      step6HttpStatus = res.status;
      let resJson = await res.json().catch(() => ({}));

      if (
        !res.ok &&
        JSON.stringify(resJson).toLowerCase().includes("cienteobjetonaoproibido")
      ) {
        step6Details.push(
          `⚠️ Volume ${i + 1}: Reenviando com formato alternativo cienteObjetoNaoProibido="S"...`
        );
        const retryCientePayload = { ...cwsPayload, cienteObjetoNaoProibido: "S" };
        const retryRes = await fetch(prepostagemEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(retryCientePayload),
        });
        step6HttpStatus = retryRes.status;
        res = retryRes;
        resJson = await retryRes.json().catch(() => ({}));
      }

      if (
        !res.ok &&
        listaServicoAdicional.length > 0 &&
        JSON.stringify(resJson).toLowerCase().includes("adicional")
      ) {
        step6Details.push(
          `⚠️ Volume ${i + 1}: A API CWS reportou restrição no serviço adicional (${insuranceServiceCode}). Reenviando automaticamente sem serviço adicional...`
        );
        const retryPayload = { ...cwsPayload };
        delete retryPayload.listaServicoAdicional;
        const retryRes = await fetch(prepostagemEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(retryPayload),
        });
        step6HttpStatus = retryRes.status;
        res = retryRes;
        resJson = await retryRes.json().catch(() => ({}));
      }

      step6Responses.push({ volume: i + 1, status: res.status, response: resJson });

      const returnedTrackingCode = String(
        resJson?.codigoObjeto || resJson?.objetoPostal?.codigoObjeto || ""
      ).trim();
      const returnedPrepostagemId = resJson?.id ? String(resJson.id).trim() : "";

      if (res.ok && returnedTrackingCode && returnedPrepostagemId) {
        createdPrepostagemIds.push(returnedPrepostagemId);
        step6Details.push(
          `✅ Volume ${i + 1}/${totalVolumes} registrado nos Correios! Rastreio Oficial: ${returnedTrackingCode} (ID Pré-Postagem: ${returnedPrepostagemId} • idCorreios: ${resolvedIdCorreios}).`
        );
        processedVolumes.push({
          ...vol,
          volumeIndex: i + 1,
          totalVolumes,
          heightCm,
          widthCm,
          lengthCm,
          weightGrams,
          declaredValueReais: declaredReais,
          trackingCode: returnedTrackingCode,
          prepostagemId: returnedPrepostagemId,
          plpNumber: resJson.numeroPlp ? String(resJson.numeroPlp) : undefined,
          status: "cws_registered",
          cwsMessage: `Pré-postagem oficial registrada na API CWS dos Correios (ID: ${returnedPrepostagemId}, idCorreios: ${resolvedIdCorreios}).`,
        });
      } else {
        step6Failed = true;
        const msgsList = Array.isArray(resJson?.msgs)
          ? resJson.msgs.join(" | ")
          : resJson?.mensagem || resJson?.message || resJson?.causa || JSON.stringify(resJson);
        step6ErrorSummary = res.ok
          ? `Correios CWS retornou HTTP ${res.status} sem codigoObjeto/id válidos para aparecer no painel: ${JSON.stringify(resJson)}`
          : `Correios CWS recusou o Volume ${i + 1} (HTTP ${res.status}): ${msgsList}`;
        step6Details.push(`❌ ${step6ErrorSummary}`);
      }
    } catch (err: any) {
      step6Failed = true;
      step6ErrorSummary = `Erro de conexão ao enviar Volume ${i + 1} para ${prepostagemEndpoint}: ${err?.message || "Timeout"}`;
      step6Details.push(`❌ ${step6ErrorSummary}`);
    }
  }

  breadcrumbs.push({
    step: 6,
    totalSteps,
    code: "CWS_PREPOSTAGEM_CREATE",
    title: "6. Registro da Pré-Postagem Oficial (/prepostagem/v1/prepostagens)",
    status: step6Failed ? "error" : "success",
    summary: step6Failed
      ? step6ErrorSummary
      : `${processedVolumes.length} volume(s) lançado(s) com sucesso no sistema dos Correios! Rastreio: ${processedVolumes
          .map((v) => v.trackingCode)
          .join(", ")}`,
    durationMs: Date.now() - step6Start,
    timestamp: new Date().toISOString(),
    endpoint: prepostagemEndpoint,
    httpStatus: step6HttpStatus,
    details: step6Details,
    requestPayload: step6Requests,
    responsePayload: step6Responses,
    remediation: step6Failed
      ? "Verifique a mensagem de retorno oficial dos Correios no bloco 'Resposta da API' desta migalha para corrigir o campo apontado."
      : undefined,
  });

  if (step6Failed) {
    breadcrumbs.push({
      step: 7,
      totalSteps,
      code: "CWS_LABEL_PDF",
      title: "7. Emissão do Rótulo Oficial PDF (/prepostagem/v1/prepostagens/rotulo/assincrono/pdf)",
      status: "skipped",
      summary: "Não executado pois o registro da pré-postagem na Etapa 6 retornou erro.",
      durationMs: 0,
      timestamp: new Date().toISOString(),
      details: [],
    });

    const nowIso = new Date().toISOString();
    return {
      ok: false,
      modeUsed: "cws_live",
      breadcrumbs,
      error: step6ErrorSummary,
      message: `Falha na Etapa 6/7 (Pré-Postagem CWS): ${step6ErrorSummary}`,
      shipment: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        serviceCode,
        serviceName,
        contractNumber: cfg.contractNumber,
        postcardNumber: cfg.postcardNumber,
        agency: cfg.agency,
        mode: "cws_live",
        pickupAddressId: params.pickupAddressId || cfg.selectedPickupAddressId,
        invoiceNumber: params.invoiceNumber || "",
        invoiceKey: params.invoiceKey || "",
        observations: params.observations || "",
        sender: senderObj,
        recipient: cleanRecipient,
        volumes: params.volumes,
        lastBreadcrumbs: breadcrumbs,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    };
  }

  // ============================================================================
  // MIGALHA 7/7: Emissão do Rótulo Oficial PDF na CWS
  // ============================================================================
  const step7Start = Date.now();
  const rotuloEndpoint = `${CWS_BASE_URL}/prepostagem/v1/prepostagens/rotulo/assincrono/pdf`;
  let officialLabelPdfBase64: string | null = null;
  const step7Details: string[] = [];
  let step7Status: "success" | "warning" = "success";

  if (createdPrepostagemIds.length > 0) {
    try {
      const rotuloReqBody = {
        idsPrePostagem: createdPrepostagemIds,
        tipoRotulo: "P",
        formatoRotulo: "ET",
        imprimeRemetente: "S",
      };
      const rotuloRes = await fetch(rotuloEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rotuloReqBody),
      });

      if (rotuloRes.ok) {
        const rotuloJson = await rotuloRes.json().catch(() => ({}));
        if (rotuloJson?.idRecibo) {
          step7Details.push(`Recibo de rótulo assíncrono gerado na CWS: ${rotuloJson.idRecibo}.`);
          const pollDelaysMs = [1200, 1500, 2000, 2500, 3000];
          for (let attempt = 0; attempt < pollDelaysMs.length; attempt++) {
            await new Promise((r) => setTimeout(r, pollDelaysMs[attempt]));
            const downloadRes = await fetch(
              `${CWS_BASE_URL}/prepostagem/v1/prepostagens/rotulo/download/assincrono/${rotuloJson.idRecibo}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                },
              }
            );
            if (downloadRes.status === 202) {
              continue;
            }
            if (downloadRes.ok) {
              const dlJson = await downloadRes.json().catch(() => ({}));
              if (dlJson?.dados) {
                officialLabelPdfBase64 = dlJson.dados;
                step7Details.push(
                  `PDF oficial nativo da CWS baixado com sucesso na tentativa ${attempt + 1}/${pollDelaysMs.length} e pronto para impressão.`
                );
                break;
              }
            } else {
              break;
            }
          }
        }
      }
      if (!officialLabelPdfBase64) {
        step7Status = "warning";
        step7Details.push(
          "Pré-postagem registrada nos Correios! O PDF assíncrono da CWS ainda não finalizou o processamento; o rótulo vetorial com QR Code e código de rastreio oficial já está pronto para impressão imediata."
        );
      }
    } catch (err: any) {
      step7Status = "warning";
      step7Details.push(
        `Pré-postagem concluída! Rótulo vetorial com QR Code gerado localmente com o código oficial dos Correios (${err?.message || ""}).`
      );
    }
  }

  breadcrumbs.push({
    step: 7,
    totalSteps,
    code: "CWS_LABEL_PDF",
    title: "7. Geração do Rótulo Oficial & Gravação no Pedido",
    status: step7Status,
    summary: officialLabelPdfBase64
      ? "Rótulo PDF Oficial CWS + Etiqueta Térmica com QR Code gerados e salvos no pedido!"
      : "Etiqueta Térmica com QR Code e Código de Rastreio Oficial CWS gerada e salva no pedido!",
    durationMs: Date.now() - step7Start,
    timestamp: new Date().toISOString(),
    endpoint: rotuloEndpoint,
    details: step7Details,
  });

  const nowIso = new Date().toISOString();
  const shipment: CorreiosShipmentRecord = {
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    serviceCode,
    serviceName,
    contractNumber: cfg.contractNumber,
    postcardNumber: cfg.postcardNumber,
    agency: cfg.agency,
    mode: "cws_live",
    pickupAddressId: params.pickupAddressId || cfg.selectedPickupAddressId,
    invoiceNumber: params.invoiceNumber || "",
    invoiceKey: params.invoiceKey || "",
    observations: params.observations || "",
    sender: senderObj,
    recipient: cleanRecipient,
    volumes: processedVolumes,
    officialLabelPdfBase64,
    lastBreadcrumbs: breadcrumbs,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    ok: true,
    modeUsed: "cws_live",
    shipment,
    breadcrumbs,
    message: `Pré-postagem lançada com sucesso na API Oficial dos Correios! Rastreio: ${processedVolumes
      .map((v) => v.trackingCode)
      .join(", ")}`,
  };
}

export interface CorreiosPanelPrepostagemSummary {
  id: string;
  codigoObjeto: string;
  status: string;
  codigoServico: string;
  destinatarioNome: string;
  destinatarioCep: string;
  dataPrePostagem: string;
}

/**
 * Consulta ao vivo a API CWS v2 (`GET /prepostagem/v2/prepostagens`) para listar as pré-postagens
 * atualmente visíveis no painel oficial do cliente em prepostagem.correios.com.br.
 */
export async function listCorreiosPanelPrepostagens(options?: {
  status?: string;
  size?: number;
}): Promise<{
  ok: boolean;
  items: CorreiosPanelPrepostagemSummary[];
  totalElements: number;
  endpoint: string;
  httpStatus?: number;
  authIdCorreios?: string;
  contractNumber?: string;
  postcardNumber?: string;
  error?: string;
}> {
  const cfg = await hydrateCorreiosContractConfig();
  const size = Math.min(50, Math.max(1, options?.size ?? 25));
  const queryParams = new URLSearchParams({
    page: "0",
    size: String(size),
  });
  if (options?.status) {
    queryParams.set("status", options.status);
  }
  const endpoint = `${CWS_BASE_URL}/prepostagem/v2/prepostagens?${queryParams.toString()}`;

  const authRes = await authenticateCorreiosCws();
  if (!authRes.ok || !authRes.token) {
    return {
      ok: false,
      items: [],
      totalElements: 0,
      endpoint,
      httpStatus: authRes.statusCode,
      contractNumber: cfg.contractNumber,
      postcardNumber: cfg.postcardNumber,
      error: authRes.error || "Não foi possível autenticar na CWS para consultar o painel dos Correios.",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authRes.token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        json?.msgs?.[0] || json?.mensagem || json?.message || `HTTP ${res.status} ao consultar /v2/prepostagens`;
      return {
        ok: false,
        items: [],
        totalElements: 0,
        endpoint,
        httpStatus: res.status,
        authIdCorreios: authRes.canonicalIdCorreios,
        contractNumber: cfg.contractNumber,
        postcardNumber: cfg.postcardNumber,
        error: msg,
      };
    }

    const rawItens = Array.isArray(json?.itens)
      ? json.itens
      : Array.isArray(json?.content)
      ? json.content
      : [];

    const items: CorreiosPanelPrepostagemSummary[] = rawItens.map((it: any) => ({
      id: String(it?.id || ""),
      codigoObjeto: String(it?.codigoObjeto || ""),
      status: String(it?.status || it?.situacao || "PREPOSTADO"),
      codigoServico: String(it?.codigoServico || ""),
      destinatarioNome: String(it?.destinatario?.nome || ""),
      destinatarioCep: String(it?.destinatario?.endereco?.cep || ""),
      dataPrePostagem: String(it?.dataHoraPrePostagem || it?.dataCadastro || it?.dataPrePostagem || ""),
    }));

    return {
      ok: true,
      items,
      totalElements: Number(json?.page?.totalElements ?? json?.totalElements ?? items.length),
      endpoint,
      httpStatus: res.status,
      authIdCorreios: authRes.canonicalIdCorreios,
      contractNumber: cfg.contractNumber,
      postcardNumber: cfg.postcardNumber,
    };
  } catch (err: any) {
    return {
      ok: false,
      items: [],
      totalElements: 0,
      endpoint,
      authIdCorreios: authRes.canonicalIdCorreios,
      contractNumber: cfg.contractNumber,
      postcardNumber: cfg.postcardNumber,
      error: `Erro de conexão ao consultar pré-postagens no painel Correios: ${err?.message || "Timeout"}`,
    };
  }
}

export { calculateCorreiosInsuranceCents };
