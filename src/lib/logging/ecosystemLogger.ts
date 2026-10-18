import fs from "fs";
import path from "path";

export type LogCategory =
  | "orders"
  | "payments"
  | "customers"
  | "vouchers"
  | "shipping"
  | "catalog"
  | "auth"
  | "system";

export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEvent {
  id: string;
  timestamp: string;
  category: LogCategory;
  level: LogLevel;
  action: string;
  target: string;
  details: string;
  actor: string;
  metadata?: Record<string, any>;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const LOGS_FILE = path.join(DATA_DIR, "ecosystem_logs.json");
const MAX_LOGS = 1000;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Lê os logs existentes ou inicializa com seed inteligente caso o arquivo não exista
 */
export function getAllEcosystemLogs(): LogEvent[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(LOGS_FILE)) {
      const initialSeed = generateInitialSeedLogs();
      fs.writeFileSync(LOGS_FILE, JSON.stringify(initialSeed, null, 2), "utf-8");
      return initialSeed;
    }
    const content = fs.readFileSync(LOGS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Erro ao ler ecosystem_logs.json:", error);
    return [];
  }
}

/**
 * Salva a lista de logs persistindo no disco com rotação para manter no máximo MAX_LOGS
 */
function persistLogs(logs: LogEvent[]): void {
  try {
    ensureDataDir();
    const truncated = logs.slice(0, MAX_LOGS);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(truncated, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao persistir ecosystem_logs.json:", error);
  }
}

/**
 * Registra um novo evento de auditoria no ecossistema
 */
export function logEcosystemEvent(params: {
  category: LogCategory;
  level?: LogLevel;
  action: string;
  target: string;
  details: string;
  actor?: string;
  metadata?: Record<string, any>;
}): LogEvent {
  const logs = getAllEcosystemLogs();

  const newLog: LogEvent = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    category: params.category,
    level: params.level || "info",
    action: params.action,
    target: params.target,
    details: params.details,
    actor: params.actor || "Sistema",
    metadata: params.metadata || {},
  };

  logs.unshift(newLog);
  persistLogs(logs);

  return newLog;
}

/**
 * Consulta de logs com filtros flexíveis
 */
export function queryEcosystemLogs(filters: {
  category?: string;
  level?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): { logs: LogEvent[]; total: number } {
  let list = getAllEcosystemLogs();

  if (filters.category && filters.category !== "all") {
    list = list.filter((l) => l.category === filters.category);
  }

  if (filters.level && filters.level !== "all") {
    list = list.filter((l) => l.level === filters.level);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.actor.toLowerCase().includes(q) ||
        (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(q))
    );
  }

  const total = list.length;
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;

  return {
    logs: list.slice(offset, offset + limit),
    total,
  };
}

/**
 * Limpa todos os logs do ecossistema
 */
export function clearAllEcosystemLogs(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao limpar logs:", err);
  }
}

/**
 * Seed inicial rico em dados para que a plataforma inicie com histórico realista
 */
function generateInitialSeedLogs(): LogEvent[] {
  const now = Date.now();
  return [
    {
      id: `log_seed_1`,
      timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
      category: "orders",
      level: "success",
      action: "Pedido em Produção CNC",
      target: "Pedido #TP-TEST99",
      details: "Ordem de fabricação enviada para o operador da Router CNC. Gabinete Parede Branco TX.",
      actor: "Admin (Ronaldo Clemente)",
      metadata: {
        orderNumber: "TP-TEST99",
        customer: "Ana Compradora",
        total: "R$ 4.503,00",
        itemsCount: 1,
      },
    },
    {
      id: `log_seed_2`,
      timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
      category: "payments",
      level: "success",
      action: "Pagamento PIX Aprovado",
      target: "Pedido #TP-TEST99",
      details: "Liquidação confirmada pelo Banco Central / Mercado Pago no valor de R$ 4.503,00.",
      actor: "Webhook Mercado Pago",
      metadata: {
        paymentMethod: "pix",
        amountCents: 450300,
        status: "approved",
      },
    },
    {
      id: `log_seed_3`,
      timestamp: new Date(now - 1000 * 60 * 42).toISOString(),
      category: "shipping",
      level: "info",
      action: "Cotação de Frete Correios CWS",
      target: "CEP 01310-100 (São Paulo/SP)",
      details: "Cálculo unitário individual por gabinete aplicado com sucesso (Proteção Anti-Prejuízo Ativa).",
      actor: "Checkout Cliente",
      metadata: {
        carrier: "Correios Sedex",
        freightCents: 50300,
        packageWeightKg: 40,
      },
    },
    {
      id: `log_seed_4`,
      timestamp: new Date(now - 1000 * 60 * 50).toISOString(),
      category: "customers",
      level: "info",
      action: "Novo Cliente Cadastrado",
      target: "Ana Compradora (12.345.678/0001-90)",
      details: "Cadastro gerado automaticamente durante a finalização do pedido #TP-TEST99.",
      actor: "Checkout",
      metadata: {
        email: "ana.compradora@empresa.com.br",
        phone: "(11) 97777-6666",
        loginMethod: "checkout",
      },
    },
    {
      id: `log_seed_5`,
      timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
      category: "catalog",
      level: "info",
      action: "Precificação Reversa Atualizada",
      target: "Gabinete Parede MaDeFibra BP",
      details: "Meta de bolso fixada em R$ 990,00 no PIX e R$ 1.200,00 no Cartão 10x sem juros.",
      actor: "Admin (Ronaldo Clemente)",
      metadata: {
        targetNetCents: 99000,
        card10xCents: 120000,
        pixPriceCents: 99000,
      },
    },
    {
      id: `log_seed_6`,
      timestamp: new Date(now - 1000 * 60 * 240).toISOString(),
      category: "auth",
      level: "info",
      action: "Login Administrativo",
      target: "Painel Admin",
      details: "Sessão iniciada via credenciais master autorizadas.",
      actor: "ronaldo.xpointsolucoes@gmail.com",
      metadata: {
        ip: "187.19.12.44",
        browser: "Chrome Desktop",
      },
    },
  ];
}
