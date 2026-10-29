/**
 * Agente de Telemetria e Monitoramento de Falhas no Cliente (Browser)
 * Totem Pro — X-Point Soluções
 */

import {
  TelemetryErrorType,
  TelemetryErrorSeverity,
  TelemetryBreadcrumb,
  TelemetryDeviceInfo,
  TelemetryNetworkInfo,
} from "./types";

const MAX_BREADCRUMBS = 8;
const breadcrumbs: TelemetryBreadcrumb[] = [];
let isInitialized = false;

// Controle de Rate-Limit no cliente (máx 10 envios por minuto)
const recentErrorTimestamps: number[] = [];
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Deduplicação em memória para evitar envios duplicados em loop (1 erro idêntico a cada 15s)
const recentlySentSignatures = new Map<string, number>();

/**
 * Adiciona um rastro (breadcrumb) de interação do usuário
 */
export function recordClientBreadcrumb(
  category: "navigation" | "interaction" | "api" | "state",
  message: string,
  data?: Record<string, any>
): void {
  try {
    const item: TelemetryBreadcrumb = {
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      category,
      message,
      data,
    };
    breadcrumbs.push(item);
    if (breadcrumbs.length > MAX_BREADCRUMBS) {
      breadcrumbs.shift();
    }
  } catch {}
}

/**
 * Coleta informações do dispositivo e viewport
 */
function getDeviceInfo(): TelemetryDeviceInfo {
  if (typeof window === "undefined") {
    return {
      type: "desktop",
      screen: "0x0",
      viewport: "0x0",
      userAgent: "unknown",
    };
  }

  const w = window.innerWidth;
  let type: "mobile" | "tablet" | "desktop" = "desktop";
  if (w < 768) type = "mobile";
  else if (w < 1024) type = "tablet";

  return {
    type,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}

/**
 * Coleta informações de rede se disponíveis
 */
function getNetworkInfo(): TelemetryNetworkInfo {
  if (typeof window === "undefined") return { online: true };

  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  return {
    online: navigator.onLine,
    effectiveType: conn?.effectiveType,
    rtt: conn?.rtt,
    downlink: conn?.downlink,
  };
}

/**
 * Verifica se o erro pode ser enviado respeitando rate limits e deduplicação
 */
function shouldSendError(signature: string): boolean {
  const now = Date.now();

  // Deduplicação de erro idêntico em menos de 15 segundos
  const lastSent = recentlySentSignatures.get(signature);
  if (lastSent && now - lastSent < 15000) {
    return false;
  }

  // Rate limit por janela de tempo
  while (recentErrorTimestamps.length > 0 && now - recentErrorTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    recentErrorTimestamps.shift();
  }

  if (recentErrorTimestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentErrorTimestamps.push(now);
  recentlySentSignatures.set(signature, now);
  return true;
}

/**
 * Envia o relatório de erro para a API de telemetria
 */
export function sendTelemetryReport(params: {
  type: TelemetryErrorType;
  severity: TelemetryErrorSeverity;
  message: string;
  stack?: string;
  componentName?: string;
  customData?: Record<string, any>;
}): void {
  if (typeof window === "undefined") return;

  try {
    const pathname = window.location.pathname || "/";
    const url = window.location.href;
    const signature = `${params.type}:${pathname}:${params.message.trim()}`;

    if (!shouldSendError(signature)) {
      return;
    }

    // Identificação de usuário se disponível
    let user: any = undefined;
    try {
      const storedUser = localStorage.getItem("totem_customer_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        user = {
          email: parsed.email,
          name: parsed.name,
          role: "customer",
        };
      }
    } catch {}

    const payload = {
      type: params.type,
      severity: params.severity,
      message: params.message,
      stack: params.stack,
      pathname,
      url,
      referrer: document.referrer || undefined,
      componentName: params.componentName,
      breadcrumbs: [...breadcrumbs],
      device: getDeviceInfo(),
      network: getNetworkInfo(),
      user,
      customData: params.customData,
    };

    const endpoint = "/api/telemetry/errors";
    const bodyString = JSON.stringify(payload);

    // Tenta primeiro navigator.sendBeacon (mais confiável em navegação/unload)
    let sent = false;
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([bodyString], { type: "application/json" });
      sent = navigator.sendBeacon(endpoint, blob);
    }

    if (!sent) {
      // Fallback para fetch assíncrono com keepalive
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyString,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    // Falha silenciosa para nunca quebrar a interface do usuário
  }
}

/**
 * Captura manual de erros para blocos try/catch críticos
 */
export function captureManualError(
  error: unknown,
  context?: {
    type?: TelemetryErrorType;
    severity?: TelemetryErrorSeverity;
    componentName?: string;
    message?: string;
    extra?: Record<string, any>;
  }
): void {
  let message = "Erro desconhecido";
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    message = JSON.stringify(error);
  }

  if (context?.message) {
    message = `${context.message}: ${message}`;
  }

  sendTelemetryReport({
    type: context?.type || "js_runtime_error",
    severity: context?.severity || "error",
    message,
    stack,
    componentName: context?.componentName,
    customData: context?.extra,
  });
}

/**
 * Inicializa a escuta global de erros de runtime, rejeições de promises e interceptação de API
 */
export function initClientTelemetry(): void {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  recordClientBreadcrumb("navigation", `Início da sessão em ${window.location.pathname}`);

  // 1. Escuta erros de JavaScript não capturados (window.onerror)
  window.addEventListener("error", (event: ErrorEvent) => {
    // Ignora erros de extensões do Chrome/navegador
    const filename = event.filename || "";
    if (filename.includes("chrome-extension://") || filename.includes("moz-extension://")) {
      return;
    }

    const isChunkLoadError =
      event.message?.includes("Loading chunk") ||
      event.message?.includes("ChunkLoadError") ||
      event.message?.includes("Failed to fetch dynamically imported module");

    sendTelemetryReport({
      type: isChunkLoadError ? "navigation_error" : "js_runtime_error",
      severity: isChunkLoadError ? "critical" : "error",
      message: event.message || "Erro de script não identificado",
      stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
    });
  });

  // 2. Escuta Promises rejeitadas sem .catch()
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    let reasonMsg = "Promise rejeitada sem tratamento";
    let stack: string | undefined;

    if (event.reason instanceof Error) {
      reasonMsg = event.reason.message;
      stack = event.reason.stack;
    } else if (typeof event.reason === "string") {
      reasonMsg = event.reason;
    } else if (event.reason && typeof event.reason === "object") {
      try {
        reasonMsg = JSON.stringify(event.reason);
      } catch {}
    }

    sendTelemetryReport({
      type: "unhandled_rejection",
      severity: "error",
      message: reasonMsg,
      stack,
    });
  });

  // 3. Interceptador de chamadas de API (fetch) para capturar falhas de requisição e tempos anômalos
  try {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
      const isInternalApi = url.startsWith("/api/") || url.includes("/api/");
      const isTelemetryItself = url.includes("/api/telemetry/errors");

      if (isTelemetryItself) {
        return originalFetch.apply(this, args);
      }

      const startTime = performance.now();
      try {
        const response = await originalFetch.apply(this, args);
        const duration = Math.round(performance.now() - startTime);

        if (isInternalApi) {
          // Se a API retornou erro HTTP (4xx ou 5xx)
          if (!response.ok) {
            recordClientBreadcrumb("api", `Falha ${response.status} em ${url} (${duration}ms)`);

            // Para erros de servidor (5xx) ou falhas críticas de checkout/frete, reporta
            const isCriticalApi =
              url.includes("/shipping/quote") ||
              url.includes("/checkout/") ||
              url.includes("/webhooks/");

            sendTelemetryReport({
              type: "api_network_failure",
              severity: response.status >= 500 || isCriticalApi ? "critical" : "warning",
              message: `API HTTP ${response.status} (${response.statusText || "Erro"}) em ${url}`,
              customData: {
                status: response.status,
                url,
                durationMs: duration,
              },
            });
          } else {
            // Sucesso na API - apenas breadcrumb
            recordClientBreadcrumb("api", `Sucesso 200 em ${url} (${duration}ms)`);
          }
        }

        return response;
      } catch (networkError: any) {
        const duration = Math.round(performance.now() - startTime);
        if (isInternalApi) {
          const errMessage = String(networkError?.message || "Sem resposta");
          const isAbortedOrBackground =
            networkError?.name === "AbortError" ||
            document.visibilityState === "hidden" ||
            !navigator.onLine ||
            (url.includes("/api/catalog") &&
              /load failed|failed to fetch|networkerror/i.test(errMessage));

          recordClientBreadcrumb(
            "api",
            isAbortedOrBackground
              ? `Requisição cancelada em transição/background em ${url} (${duration}ms)`
              : `Falha de Rede/Timeout em ${url} (${duration}ms)`
          );

          if (!isAbortedOrBackground) {
            sendTelemetryReport({
              type: "api_network_failure",
              severity: "critical",
              message: `Falha de rede/conexão ao acessar ${url}: ${errMessage}`,
              stack: networkError?.stack,
              customData: {
                url,
                durationMs: duration,
                offline: !navigator.onLine,
              },
            });
          }
        }
        throw networkError;
      }
    };
  } catch {}

  // 4. Mudanças de status de conexão (Online / Offline) — registrado como breadcrumb de contexto
  window.addEventListener("online", () => {
    recordClientBreadcrumb("state", "Dispositivo voltou a ficar ONLINE");
  });
  window.addEventListener("offline", () => {
    recordClientBreadcrumb("state", "Dispositivo ficou OFFLINE");
  });
}
