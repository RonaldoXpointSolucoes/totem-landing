/**
 * Store e Persistência de Telemetria de Falhas e Erros
 * Totem Pro — X-Point Soluções
 */

import fs from "fs";
import path from "path";
import {
  TelemetryErrorPayload,
  TelemetryStats,
  TelemetryErrorType,
  TelemetryErrorSeverity,
} from "./types";
import { logEcosystemEvent } from "@/lib/logging/ecosystemLogger";

const DATA_DIR = path.join(process.cwd(), "src", "data");
const TELEMETRY_FILE = path.join(DATA_DIR, "telemetry_errors.json");
const MAX_STORED_ERRORS = 1000;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Lê os erros armazenados no disco
 */
export function getAllTelemetryErrors(): TelemetryErrorPayload[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(TELEMETRY_FILE)) {
      fs.writeFileSync(TELEMETRY_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const content = fs.readFileSync(TELEMETRY_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Erro ao ler telemetry_errors.json:", error);
    return [];
  }
}

/**
 * Persiste os erros no disco mantendo até MAX_STORED_ERRORS
 */
function persistErrors(errors: TelemetryErrorPayload[]): void {
  try {
    ensureDataDir();
    const truncated = errors.slice(0, MAX_STORED_ERRORS);
    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(truncated, null, 2), "utf-8");
  } catch (error) {
    console.error("Erro ao persistir telemetry_errors.json:", error);
  }
}

/**
 * Registra um novo erro de telemetria com deduplicação inteligente
 */
export function recordTelemetryError(
  rawError: Omit<
    TelemetryErrorPayload,
    "id" | "occurrences" | "firstSeen" | "lastSeen" | "resolved" | "timestamp"
  >
): TelemetryErrorPayload {
  const errors = getAllTelemetryErrors();
  const now = new Date().toISOString();

  // Deduplicação inteligente: se o mesmo erro (mesmo tipo, mensagem e rota) ocorreu nos últimos 30 minutos
  const fifteenMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const existingIndex = errors.findIndex(
    (e) =>
      e.type === rawError.type &&
      e.pathname === rawError.pathname &&
      e.message.trim() === rawError.message.trim() &&
      !e.resolved &&
      e.lastSeen > fifteenMinutesAgo
  );

  if (existingIndex !== -1) {
    const existing = errors[existingIndex];
    existing.occurrences += 1;
    existing.lastSeen = now;
    existing.breadcrumbs = rawError.breadcrumbs || existing.breadcrumbs;
    existing.device = rawError.device || existing.device;
    existing.network = rawError.network || existing.network;
    existing.user = rawError.user || existing.user;

    // Move para o topo da lista
    errors.splice(existingIndex, 1);
    errors.unshift(existing);
    persistErrors(errors);
    return existing;
  }

  // Novo erro
  const newId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newPayload: TelemetryErrorPayload = {
    ...rawError,
    id: newId,
    timestamp: now,
    firstSeen: now,
    lastSeen: now,
    occurrences: 1,
    resolved: false,
  };

  errors.unshift(newPayload);
  persistErrors(errors);

  // Também integra com o log de auditoria do ecossistema se for de alta severidade
  if (rawError.severity === "critical" || rawError.type === "api_network_failure") {
    try {
      logEcosystemEvent({
        category: "system",
        level: rawError.severity === "critical" ? "error" : "warn",
        action: `Telemetria: ${rawError.type}`,
        target: rawError.pathname || rawError.url,
        details: `${rawError.message.substring(0, 160)}${rawError.message.length > 160 ? "..." : ""}`,
        actor: rawError.user?.email || "Cliente Web",
        metadata: {
          errorId: newId,
          type: rawError.type,
          device: rawError.device?.type,
        },
      });
    } catch {}
  }

  return newPayload;
}

/**
 * Consulta erros de telemetria com filtros avançados
 */
export function queryTelemetryErrors(params?: {
  type?: string;
  severity?: string;
  pathname?: string;
  resolved?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): {
  total: number;
  unresolvedCount: number;
  errors: TelemetryErrorPayload[];
  stats: TelemetryStats;
} {
  const allErrors = getAllTelemetryErrors();
  let filtered = [...allErrors];

  if (params?.type && params.type !== "all") {
    filtered = filtered.filter((e) => e.type === params.type);
  }

  if (params?.severity && params.severity !== "all") {
    filtered = filtered.filter((e) => e.severity === params.severity);
  }

  if (params?.pathname) {
    filtered = filtered.filter((e) =>
      e.pathname.toLowerCase().includes(params.pathname!.toLowerCase())
    );
  }

  if (typeof params?.resolved === "boolean") {
    filtered = filtered.filter((e) => e.resolved === params.resolved);
  }

  if (params?.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.message.toLowerCase().includes(s) ||
        e.pathname.toLowerCase().includes(s) ||
        e.type.toLowerCase().includes(s) ||
        (e.stack && e.stack.toLowerCase().includes(s)) ||
        (e.user?.email && e.user.email.toLowerCase().includes(s))
    );
  }

  const total = filtered.length;
  const unresolvedCount = allErrors.filter((e) => !e.resolved).length;
  const limit = params?.limit || 100;
  const offset = params?.offset || 0;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    total,
    unresolvedCount,
    errors: paginated,
    stats: calculateTelemetryStats(allErrors),
  };
}

/**
 * Marca um erro de telemetria como resolvido
 */
export function resolveTelemetryError(
  id: string,
  notes?: string
): TelemetryErrorPayload | null {
  const errors = getAllTelemetryErrors();
  const target = errors.find((e) => e.id === id);
  if (!target) return null;

  target.resolved = true;
  target.resolvedAt = new Date().toISOString();
  if (notes) target.resolvedNotes = notes;

  persistErrors(errors);
  return target;
}

/**
 * Marca todos os erros como resolvidos
 */
export function resolveAllTelemetryErrors(notes?: string): number {
  const errors = getAllTelemetryErrors();
  const now = new Date().toISOString();
  let count = 0;

  errors.forEach((e) => {
    if (!e.resolved) {
      e.resolved = true;
      e.resolvedAt = now;
      if (notes) e.resolvedNotes = notes;
      count++;
    }
  });

  persistErrors(errors);
  return count;
}

/**
 * Limpa todo o histórico de telemetria
 */
export function clearAllTelemetryErrors(): void {
  persistErrors([]);
}

/**
 * Calcula estatísticas agregadas e índice de estabilidade do site
 */
export function calculateTelemetryStats(
  errors: TelemetryErrorPayload[]
): TelemetryStats {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const errors24h = errors.filter((e) => e.lastSeen >= oneDayAgo);

  let criticalCount = 0;
  let apiFailureCount = 0;
  let navigationErrorCount = 0;
  let runtimeErrorCount = 0;
  let unresolvedCount = 0;

  const pathCounts: Record<string, number> = {};
  const errorCounts: Record<
    string,
    { count: number; type: TelemetryErrorType; message: string }
  > = {};

  errors.forEach((e) => {
    if (!e.resolved) unresolvedCount++;
    if (e.severity === "critical") criticalCount++;

    if (e.type === "api_network_failure") apiFailureCount++;
    if (e.type === "navigation_error") navigationErrorCount++;
    if (e.type === "js_runtime_error" || e.type === "unhandled_rejection")
      runtimeErrorCount++;

    // Agrupamento por rota
    const p = e.pathname || "/";
    pathCounts[p] = (pathCounts[p] || 0) + e.occurrences;

    // Agrupamento por mensagem
    const key = `${e.type}:${e.message.trim().substring(0, 80)}`;
    if (!errorCounts[key]) {
      errorCounts[key] = {
        count: 0,
        type: e.type,
        message: e.message,
      };
    }
    errorCounts[key].count += e.occurrences;
  });

  const topPaths = Object.entries(pathCounts)
    .map(([pathname, count]) => ({ pathname, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topErrors = Object.values(errorCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Score de estabilidade simples: se houver 0 erros críticos nas últimas 24h, 100%. Cada crítico reduz 15%, cada erro reduz 3%.
  const crit24h = errors24h.filter(
    (e) => e.severity === "critical" && !e.resolved
  ).length;
  const nonCrit24h = errors24h.filter(
    (e) => e.severity !== "critical" && !e.resolved
  ).length;
  let stabilityScore = 100 - crit24h * 15 - nonCrit24h * 3;
  if (stabilityScore < 0) stabilityScore = 0;

  return {
    totalErrors: errors.length,
    unresolvedCount,
    criticalCount,
    apiFailureCount,
    navigationErrorCount,
    runtimeErrorCount,
    errorsLast24h: errors24h.length,
    stabilityScore,
    topPaths,
    topErrors,
  };
}
