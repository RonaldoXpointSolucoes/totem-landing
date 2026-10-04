/**
 * Tracker Client-Side de Analytics & Telemetria do Funil com Bridge de Tráfego Pago
 * Dispara simultaneamente para:
 * 1. Google Analytics 4 (GA4) & Google Ads Conversion Tracking (gtag.js)
 * 2. Meta Ads / Facebook Pixel (fbq)
 * 3. TikTok Ads Pixel (ttq)
 * 4. Banco de Dados Interno X-Point (/api/analytics/track)
 */

import { ANALYTICS_EVENTS, AnalyticsEventType } from "./events";
import { pixelConfig } from "@/config/pixels";

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

/**
 * Encaminha o evento para os Pixels de Marketing (Google, Meta, TikTok)
 */
function dispatchToAdPlatforms(
  eventName: AnalyticsEventType,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  const data = metadata || {};
  const valueNumber =
    typeof data.totalPriceCents === "number"
      ? data.totalPriceCents / 100
      : typeof data.priceCents === "number"
      ? data.priceCents / 100
      : typeof data.value === "number"
      ? data.value
      : undefined;

  const currency = (data.currency as string) || "BRL";

  // --- 1. GOOGLE ANALYTICS 4 & GOOGLE ADS ---
  if (typeof window.gtag === "function") {
    switch (eventName) {
      case ANALYTICS_EVENTS.VIEW_HOME:
        window.gtag("event", "page_view", {
          page_title: document.title,
          page_location: window.location.href,
        });
        break;

      case ANALYTICS_EVENTS.START_CONFIGURATOR:
        window.gtag("event", "select_content", {
          content_type: "configurator",
          item_id: data.modelId,
        });
        break;

      case ANALYTICS_EVENTS.SELECT_CABINET_MODEL:
        window.gtag("event", "view_item", {
          currency,
          value: valueNumber,
          items: [
            {
              item_id: data.modelId || data.id,
              item_name: data.modelName || data.name || "Gabinete para Totem",
              item_category: "Gabinete Totem",
              price: valueNumber,
            },
          ],
        });
        break;

      case ANALYTICS_EVENTS.VIEW_3D_MODEL:
      case ANALYTICS_EVENTS.INTERACT_3D:
        window.gtag("event", "video_view", {
          video_title: `Totem 3D - ${data.modelName || data.modelId || "Gabinete"}`,
          video_provider: "ThreeJS WebGL",
          action: data.action || "interaction",
        });
        break;

      case ANALYTICS_EVENTS.ADD_TO_CART:
        window.gtag("event", "add_to_cart", {
          currency,
          value: valueNumber,
          items: [
            {
              item_id: data.modelId || data.itemId,
              item_name: data.modelName || "Gabinete para Totem",
              item_category: "Gabinete Totem",
              price: valueNumber,
              quantity: (data.quantity as number) || 1,
            },
          ],
        });
        break;

      case ANALYTICS_EVENTS.REMOVE_FROM_CART:
        window.gtag("event", "remove_from_cart", {
          currency,
          value: valueNumber,
          items: [{ item_id: data.itemId }],
        });
        break;

      case ANALYTICS_EVENTS.BEGIN_CHECKOUT:
        window.gtag("event", "begin_checkout", {
          currency,
          value: valueNumber,
          items_count: data.totalItems || data.numItems,
        });
        break;

      case ANALYTICS_EVENTS.LEAD_SUBMITTED:
        window.gtag("event", "generate_lead", {
          currency,
          value: valueNumber,
          lead_type: "checkout_registration",
        });
        // Google Ads Conversion para Lead
        if (pixelConfig.googleAdsId && pixelConfig.googleAdsLeadLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${pixelConfig.googleAdsLeadLabel}`,
            value: valueNumber,
            currency,
          });
        }
        break;

      case ANALYTICS_EVENTS.PIX_GENERATED:
        window.gtag("event", "add_payment_info", {
          payment_type: "PIX",
          currency,
          value: valueNumber,
        });
        break;

      case ANALYTICS_EVENTS.PURCHASE:
        window.gtag("event", "purchase", {
          transaction_id: data.orderId || data.transactionId,
          value: valueNumber,
          currency,
          items_count: data.itemCount,
        });
        // Google Ads Conversion para Venda
        if (pixelConfig.googleAdsId && pixelConfig.googleAdsPurchaseLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${pixelConfig.googleAdsPurchaseLabel}`,
            value: valueNumber,
            currency,
            transaction_id: data.orderId || data.transactionId,
          });
        }
        break;

      case ANALYTICS_EVENTS.WHATSAPP_CLICK:
        window.gtag("event", "contact", {
          method: "WhatsApp",
          source: data.source || "button",
        });
        break;

      default:
        window.gtag("event", eventName, data);
        break;
    }
  }

  // --- 2. META PIXEL (FACEBOOK & INSTAGRAM) ---
  if (typeof window.fbq === "function") {
    switch (eventName) {
      case ANALYTICS_EVENTS.VIEW_HOME:
        window.fbq("track", "PageView");
        break;

      case ANALYTICS_EVENTS.START_CONFIGURATOR:
        window.fbq("trackCustom", "StartConfigurator", {
          modelId: data.modelId,
          source: data.source,
        });
        break;

      case ANALYTICS_EVENTS.SELECT_CABINET_MODEL:
        window.fbq("track", "ViewContent", {
          content_name: (data.modelName as string) || "Gabinete para Totem",
          content_category: "Gabinete Totem",
          content_ids: [String(data.modelId || data.id)],
          content_type: "product",
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.VIEW_3D_MODEL:
      case ANALYTICS_EVENTS.INTERACT_3D:
        window.fbq("trackCustom", "View3DModel", {
          model_name: data.modelName,
          model_id: data.modelId,
          action: data.action,
        });
        break;

      case ANALYTICS_EVENTS.ADD_TO_CART:
        window.fbq("track", "AddToCart", {
          content_name: (data.modelName as string) || "Gabinete Totem",
          content_ids: [String(data.modelId || data.itemId)],
          content_type: "product",
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.BEGIN_CHECKOUT:
        window.fbq("track", "InitiateCheckout", {
          num_items: data.totalItems || data.numItems,
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.LEAD_SUBMITTED:
        window.fbq("track", "Lead", {
          content_name: "Cadastro Checkout Totem",
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.PIX_GENERATED:
        window.fbq("track", "AddPaymentInfo", {
          payment_type: "PIX",
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.PURCHASE:
        window.fbq("track", "Purchase", {
          value: valueNumber,
          currency,
          order_id: data.orderId || data.transactionId,
          content_type: "product",
        });
        break;

      case ANALYTICS_EVENTS.WHATSAPP_CLICK:
        window.fbq("track", "Contact", {
          channel: "WhatsApp",
          source: data.source,
        });
        break;

      default:
        window.fbq("trackCustom", eventName, data);
        break;
    }
  }

  // --- 3. TIKTOK PIXEL ---
  if (window.ttq && typeof window.ttq.track === "function") {
    switch (eventName) {
      case ANALYTICS_EVENTS.VIEW_HOME:
        window.ttq.track("ViewContent", {
          content_type: "page",
          content_name: "Landing Page Totem Pro",
        });
        break;

      case ANALYTICS_EVENTS.SELECT_CABINET_MODEL:
        window.ttq.track("ViewContent", {
          content_id: String(data.modelId || data.id),
          content_name: String(data.modelName || "Gabinete para Totem"),
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.VIEW_3D_MODEL:
        window.ttq.track("ViewContent", {
          content_type: "product_3d",
          content_name: String(data.modelName || "Totem 3D Viewer"),
        });
        break;

      case ANALYTICS_EVENTS.ADD_TO_CART:
        window.ttq.track("AddToCart", {
          content_id: String(data.modelId || data.itemId),
          content_name: String(data.modelName || "Gabinete para Totem"),
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.BEGIN_CHECKOUT:
        window.ttq.track("InitiateCheckout", {
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.LEAD_SUBMITTED:
        window.ttq.track("CompleteRegistration", {
          content_name: "Checkout Registration",
        });
        break;

      case ANALYTICS_EVENTS.PIX_GENERATED:
        window.ttq.track("AddPaymentInfo", {
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.PURCHASE:
        window.ttq.track("CompletePayment", {
          value: valueNumber,
          currency,
        });
        break;

      case ANALYTICS_EVENTS.WHATSAPP_CLICK:
        window.ttq.track("ClickButton", {
          button_name: "WhatsApp Click",
        });
        break;

      default:
        window.ttq.track(eventName, data);
        break;
    }
  }

  // Debug local em desenvolvimento
  if (pixelConfig.debug) {
    console.debug(`[Marketing Pixels] [${eventName}]`, {
      metadata: data,
      value: valueNumber,
      currency,
      gtagReady: typeof window.gtag === "function",
      fbqReady: typeof window.fbq === "function",
      ttqReady: !!window.ttq,
    });
  }
}

/**
 * Disparador central de eventos de Analytics e Pixels
 */
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

  // 1. Dispara para as plataformas de tráfego pago (Google, Meta, TikTok)
  try {
    dispatchToAdPlatforms(eventName, metadata);
  } catch (adErr) {
    console.debug("[Analytics Tracker] Marketing pixel dispatch error:", adErr);
  }

  // 2. Disparo assíncrono não-bloqueante para a telemetria interna
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
    console.debug("[Analytics Tracker] Internal event dispatch bypassed:", err);
  }
}

export { ANALYTICS_EVENTS };
