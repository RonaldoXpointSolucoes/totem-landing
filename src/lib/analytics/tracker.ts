/**
 * Tracker Client-Side de Analytics & Telemetria do Funil
 * Totem Landing Page — X-Point Soluções
 */

import { ANALYTICS_EVENTS, AnalyticsEventType } from "./events";

const SESSION_STORAGE_KEY = "totem_analytics_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  try {
    let sid = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = "ses_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return "anonymous-fallback";
  }
}

export function trackEvent(
  eventName: AnalyticsEventType,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  const payload = {
    eventName,
    sessionId,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
      pathname: window.location.pathname,
      referrer: document.referrer || null,
      screenWidth: window.innerWidth,
    },
  };

  // Disparo assíncrono não-bloqueante
  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // Silencioso em caso de falha de conexão do cliente
      });
    }
  } catch (err) {
    console.debug("[Analytics Tracker] Event dispatch bypassed:", err);
  }
}

export { ANALYTICS_EVENTS };
