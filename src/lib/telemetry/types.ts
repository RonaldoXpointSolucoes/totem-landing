/**
 * Tipos e Definições da Telemetria de Falhas e Navegação
 * Totem Pro — X-Point Soluções
 */

export type TelemetryErrorType =
  | "navigation_error"      // Erros de rotas, páginas não encontradas, ChunkLoadError
  | "js_runtime_error"     // Erros não capturados em window.onerror
  | "unhandled_rejection"  // Promises rejeitadas sem .catch()
  | "react_error_boundary" // Erros de renderização de componentes React
  | "api_network_failure"  // Falhas em chamadas /api/* (status >= 400, timeout, offline)
  | "asset_load_failure";  // Falha ao carregar imagens, 3D gltf, scripts externos

export type TelemetryErrorSeverity = "critical" | "error" | "warning";

export interface TelemetryBreadcrumb {
  timestamp: string;
  category: "navigation" | "interaction" | "api" | "state";
  message: string;
  data?: Record<string, any>;
}

export interface TelemetryDeviceInfo {
  type: "mobile" | "tablet" | "desktop";
  screen: string;
  viewport: string;
  userAgent: string;
  platform?: string;
  language?: string;
}

export interface TelemetryNetworkInfo {
  online: boolean;
  effectiveType?: string; // "4g" | "3g" | "2g" | "slow-2g"
  rtt?: number;
  downlink?: number;
}

export interface TelemetryUserInfo {
  email?: string;
  name?: string;
  sessionId?: string;
  role?: string;
}

export interface TelemetryErrorPayload {
  id: string;
  timestamp: string;
  type: TelemetryErrorType;
  severity: TelemetryErrorSeverity;
  message: string;
  stack?: string;
  pathname: string;
  url: string;
  referrer?: string;
  componentName?: string;
  breadcrumbs: TelemetryBreadcrumb[];
  device: TelemetryDeviceInfo;
  network?: TelemetryNetworkInfo;
  user?: TelemetryUserInfo;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedNotes?: string;
}

export interface TelemetryStats {
  totalErrors: number;
  unresolvedCount: number;
  criticalCount: number;
  apiFailureCount: number;
  navigationErrorCount: number;
  runtimeErrorCount: number;
  errorsLast24h: number;
  stabilityScore: number; // 0 - 100%
  topPaths: { pathname: string; count: number }[];
  topErrors: { message: string; count: number; type: TelemetryErrorType }[];
}
