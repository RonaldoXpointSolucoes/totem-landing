/**
 * Tracker Client-Side de Analytics & Telemetria do Funil com Bridge de Tráfego Pago
 * Dispara simultaneamente para:
 * 1. Google Tag Manager (GTM) - dataLayer oficial com schema GA4 E-commerce & Enhanced Conversions
 * 2. Google Analytics 4 (GA4) & Google Ads Conversion Tracking (gtag.js com Conversões Otimizadas)
 * 3. Meta Ads / Facebook Pixel (fbq)
 * 4. TikTok Ads Pixel (ttq)
 * 5. Telemetria Interna X-Point (/api/analytics/track)
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
 * Normaliza número de telefone para o padrão internacional E.164 (+5511999999999)
 */
function formatE164Phone(phoneRaw?: string): string | undefined {
  if (!phoneRaw) return undefined;
  const digits = phoneRaw.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10) return `+55${digits}`;
  return `+${digits}`;
}

/**
 * Extrai e estrutura dados do comprador para o Google Ads Enhanced Conversions
 */
function extractUserData(data: Record<string, unknown>) {
  const email = (data.email as string)?.trim().toLowerCase() || undefined;
  const rawPhone = (data.whatsapp || data.phone || data.telephone) as string | undefined;
  const phone_number = formatE164Phone(rawPhone);

  const fullName = (data.name as string)?.trim() || "";
  let first_name: string | undefined;
  let last_name: string | undefined;
  if (fullName) {
    const parts = fullName.split(/\s+/);
    first_name = parts[0];
    last_name = parts.slice(1).join(" ") || undefined;
  }

  const postal_code = (data.cep as string)?.replace(/\D/g, "") || undefined;

  if (!email && !phone_number && !first_name) return null;

  return {
    email,
    phone_number,
    address: {
      first_name,
      last_name,
      postal_code,
      country: "BR",
    },
  };
}

/**
 * Disparo padronizado para o dataLayer do Google Tag Manager
 */
function pushToGtmDataLayer(gtmEvent: string, eventData: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];

  // Se houver objeto e-commerce, limpa o anterior conforme padrão oficial GA4/GTM
  if (eventData.ecommerce) {
    window.dataLayer.push({ ecommerce: null });
  }

  window.dataLayer.push({
    event: gtmEvent,
    ...eventData,
  });
}

/**
 * Encaminha o evento para as plataformas de tráfego pago (Google, Meta, TikTok)
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
  const userData = extractUserData(data);

  // Aplica Conversões Otimizadas (Enhanced Conversions) se houver dados do comprador
  if (userData && typeof window.gtag === "function") {
    try {
      window.gtag("set", "user_data", userData);
    } catch (e) {
      console.debug("[Analytics] Failed to set user_data:", e);
    }
  }

  // --- 1. GOOGLE TAG MANAGER (dataLayer) & GOOGLE ADS / GA4 (gtag.js) ---
  switch (eventName) {
    case ANALYTICS_EVENTS.VIEW_HOME:
      pushToGtmDataLayer("page_view", {
        page_title: document.title,
        page_location: window.location.href,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "page_view", {
          page_title: document.title,
          page_location: window.location.href,
        });
      }
      break;

    case ANALYTICS_EVENTS.START_CONFIGURATOR:
      pushToGtmDataLayer("select_content", {
        content_type: "configurator",
        item_id: data.modelId,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "select_content", {
          content_type: "configurator",
          item_id: data.modelId,
        });
      }
      break;

    case ANALYTICS_EVENTS.SELECT_CABINET_MODEL: {
      const items = [
        {
          item_id: String(data.modelId || data.id || "cabinet"),
          item_name: String(data.modelName || data.name || "Gabinete para Totem"),
          item_category: "Gabinete Totem",
          price: valueNumber,
          quantity: 1,
        },
      ];
      pushToGtmDataLayer("view_item", {
        ecommerce: { currency, value: valueNumber, items },
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "view_item", { currency, value: valueNumber, items });
      }
      break;
    }

    case ANALYTICS_EVENTS.VIEW_3D_MODEL:
    case ANALYTICS_EVENTS.INTERACT_3D:
      pushToGtmDataLayer("interact_3d", {
        video_title: `Totem 3D - ${data.modelName || data.modelId || "Gabinete"}`,
        video_provider: "ThreeJS WebGL",
        action: data.action || "interaction",
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "video_view", {
          video_title: `Totem 3D - ${data.modelName || data.modelId || "Gabinete"}`,
          video_provider: "ThreeJS WebGL",
          action: data.action || "interaction",
        });
      }
      break;

    case ANALYTICS_EVENTS.VIEW_CART:
      pushToGtmDataLayer("view_cart", {
        ecommerce: {
          currency,
          value: valueNumber,
          items_count: data.itemsCount,
        },
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "view_cart", {
          currency,
          value: valueNumber,
          items_count: data.itemsCount,
        });
      }
      break;

    case ANALYTICS_EVENTS.ADD_TO_CART: {
      const cartItems = [
        {
          item_id: String(data.modelId || data.itemId || "totem"),
          item_name: String(data.modelName || "Gabinete Totem"),
          item_category: "Gabinete Totem",
          price: valueNumber,
          quantity: (data.quantity as number) || 1,
        },
      ];
      pushToGtmDataLayer("add_to_cart", {
        ecommerce: { currency, value: valueNumber, items: cartItems },
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "add_to_cart", { currency, value: valueNumber, items: cartItems });

        const atcLabel = pixelConfig.googleAdsAddToCartLabel || "xAc_CPHtqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && atcLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${atcLabel}`,
            value: valueNumber || 1.0,
            currency,
          });
        }
      }
      break;
    }

    case ANALYTICS_EVENTS.REMOVE_FROM_CART:
      pushToGtmDataLayer("remove_from_cart", {
        ecommerce: {
          currency,
          value: valueNumber,
          items: [{ item_id: String(data.itemId || "totem") }],
        },
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "remove_from_cart", {
          currency,
          value: valueNumber,
          items: [{ item_id: String(data.itemId || "totem") }],
        });
      }
      break;

    case ANALYTICS_EVENTS.BEGIN_CHECKOUT:
      pushToGtmDataLayer("begin_checkout", {
        ecommerce: {
          currency,
          value: valueNumber,
          items_count: data.totalItems || data.numItems,
        },
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "begin_checkout", {
          currency,
          value: valueNumber,
          items_count: data.totalItems || data.numItems,
        });

        const bcLabel = pixelConfig.googleAdsBeginCheckoutLabel || "JjgUCKfrqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && bcLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${bcLabel}`,
            value: valueNumber || 1.0,
            currency,
          });
        }
      }
      break;

    case ANALYTICS_EVENTS.LEAD_SUBMITTED:
      pushToGtmDataLayer("generate_lead", {
        currency,
        value: valueNumber,
        lead_type: "checkout_registration",
        user_data: userData,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", {
          currency,
          value: valueNumber,
          lead_type: "checkout_registration",
        });

        // Google Ads Conversion Oficial para Lead
        const leadLabel = pixelConfig.googleAdsLeadLabel || "VumdCIjzqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && leadLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${leadLabel}`,
            value: valueNumber || 1.0,
            currency,
          });
        }
      }
      break;

    case ANALYTICS_EVENTS.PIX_GENERATED:
      pushToGtmDataLayer("add_payment_info", {
        ecommerce: {
          payment_type: "PIX",
          currency,
          value: valueNumber,
          order_id: data.orderId || data.orderNumber,
        },
        user_data: userData,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "add_payment_info", {
          payment_type: "PIX",
          currency,
          value: valueNumber,
        });
      }
      break;

    case ANALYTICS_EVENTS.PURCHASE: {
      const orderId = String(data.orderId || data.transactionId || data.orderNumber || Date.now());
      pushToGtmDataLayer("purchase", {
        ecommerce: {
          transaction_id: orderId,
          value: valueNumber,
          currency,
          items_count: data.itemCount,
        },
        user_data: userData,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "purchase", {
          transaction_id: orderId,
          value: valueNumber,
          currency,
          items_count: data.itemCount,
        });

        // Google Ads Conversion Oficial para Venda
        const purchaseLabel = pixelConfig.googleAdsPurchaseLabel || "IR8ZCPThqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && purchaseLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${purchaseLabel}`,
            value: valueNumber,
            currency,
            transaction_id: orderId,
          });
        }
      }
      break;
    }

    case ANALYTICS_EVENTS.WHATSAPP_CLICK: {
      pushToGtmDataLayer("contact_whatsapp", {
        method: "WhatsApp",
        source: data.source || "button",
        value: 1.0,
        currency: "BRL",
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "contact", {
          method: "WhatsApp",
          source: data.source || "button",
        });

        // Google Ads Conversion Oficial para WhatsApp (ConvWhatsApp)
        const waLabel = pixelConfig.googleAdsWhatsappLabel || "2vTuCKyvo6kdEJ2cmMID";
        if (pixelConfig.googleAdsId && waLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${waLabel}`,
            value: 1.0,
            currency: "BRL",
          });
        }
      }
      break;
    }

    default:
      pushToGtmDataLayer(eventName, data);
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, data);
      }
      break;
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

      case ANALYTICS_EVENTS.VIEW_CART:
        window.fbq("trackCustom", "ViewCart", {
          items_count: data.itemsCount,
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

      case ANALYTICS_EVENTS.VIEW_CART:
        window.ttq.track("ViewContent", {
          content_type: "cart",
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
    console.debug(`[Marketing Pixels & GTM dataLayer] [${eventName}]`, {
      metadata: data,
      value: valueNumber,
      currency,
      userDataPresent: !!userData,
      gtagReady: typeof window.gtag === "function",
      dataLayerLength: window.dataLayer?.length || 0,
      fbqReady: typeof window.fbq === "function",
      ttqReady: !!window.ttq,
    });
  }
}

/**
 * Disparador central de eventos de Analytics, Pixels e GTM dataLayer
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

  // 1. Dispara para as plataformas de tráfego pago (GTM dataLayer, Google Ads, GA4, Meta, TikTok)
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
