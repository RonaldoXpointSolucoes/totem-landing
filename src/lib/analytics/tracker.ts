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
 * Lê um cookie específico do navegador (ex: _gcl_aw do Conversion Linker do Google Ads)
 */
function readBrowserCookie(name: string): string {
  if (typeof document === "undefined" || !document.cookie) return "";
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

/**
 * Extrai o GCLID real de dentro do cookie _gcl_aw / _gcl_gb do Google Conversion Linker
 * Formato oficial do Google: GCL.<timestamp>.<gclid_token>
 */
function extractGclidFromGoogleCookie(): string {
  const rawAw = readBrowserCookie("_gcl_aw") || readBrowserCookie("_gcl_gb") || readBrowserCookie("_gcl_dc");
  if (!rawAw) return readBrowserCookie("totem_gclid") || "";
  const parts = rawAw.split(".");
  if (parts.length >= 3 && parts[2]) {
    return parts.slice(2).join(".");
  }
  return readBrowserCookie("totem_gclid") || "";
}

/**
 * Grava cookie first-party de 90 dias (janela oficial de atribuição do Google Ads)
 */
function writeFirstPartyCookie(name: string, value: string, maxAgeDays = 90): void {
  if (typeof document === "undefined" || !value) return;
  try {
    const maxAgeSec = maxAgeDays * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
  } catch {
    // ignora restrições de cookie
  }
}

/**
 * Captura e persiste imediatamente (antes de qualquer transição SPA do Next.js)
 * os parâmetros de clique do Google Ads (gclid, gbraid, wbraid, gad_source, utm_*),
 * preservando First-Touch e Last-Touch por 90 dias em localStorage e Cookie first-party.
 */
export function captureAndPersistAdsAttribution(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const storedAttrRaw = window.localStorage.getItem("totem_ads_attribution_v1");
    const storedAttr = storedAttrRaw ? JSON.parse(storedAttrRaw) : {};

    const urlGclid = urlParams.get("gclid") || "";
    const urlGbraid = urlParams.get("gbraid") || "";
    const urlWbraid = urlParams.get("wbraid") || "";
    const urlGadSource = urlParams.get("gad_source") || "";
    const urlGadCampaignId = urlParams.get("gad_campaignid") || "";
    const cookieGclid = extractGclidFromGoogleCookie();

    const gclid = urlGclid || storedAttr.gclid || cookieGclid || "";
    const gbraid = urlGbraid || storedAttr.gbraid || "";
    const wbraid = urlWbraid || storedAttr.wbraid || "";
    const gadSource = urlGadSource || storedAttr.gadSource || "";
    const gadCampaignId = urlGadCampaignId || storedAttr.gadCampaignId || "";

    const isGoogleAdsHitNow = Boolean(
      urlGclid || urlGadSource === "1" || urlGadCampaignId || urlGbraid || urlWbraid
    );
    const isGoogleAdsHistorical = Boolean(
      isGoogleAdsHitNow ||
        gclid ||
        gadSource === "1" ||
        gadCampaignId ||
        gbraid ||
        wbraid ||
        storedAttr.isGoogleAdsOrigin === true
    );

    const utmSource =
      urlParams.get("utm_source") ||
      storedAttr.utmSource ||
      (isGoogleAdsHistorical ? "google" : "");
    const utmMedium =
      urlParams.get("utm_medium") ||
      storedAttr.utmMedium ||
      (isGoogleAdsHistorical ? "cpc" : "");
    const utmCampaign =
      urlParams.get("utm_campaign") ||
      storedAttr.utmCampaign ||
      gadCampaignId ||
      (isGoogleAdsHistorical ? "24395671655" : "");
    const utmTerm = urlParams.get("utm_term") || storedAttr.utmTerm || "";
    const utmContent = urlParams.get("utm_content") || storedAttr.utmContent || "";
    const adGroupId = urlParams.get("adgroupid") || urlParams.get("gad_adgroupid") || storedAttr.adGroupId || "";

    const nowIso = new Date().toISOString();
    const landingUrl =
      (isGoogleAdsHitNow && window.location.search ? window.location.href : "") ||
      storedAttr.landingUrl ||
      window.location.href;
    const referrer = storedAttr.referrer || document.referrer || "";

    const campaignAttribution = {
      gclid: gclid || gbraid || wbraid || "",
      gadSource,
      gadCampaignId,
      gbraid,
      wbraid,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      adGroupId,
      landingUrl,
      referrer,
      isGoogleAdsOrigin: isGoogleAdsHistorical,
      firstTouchAt: storedAttr.firstTouchAt || nowIso,
      firstTouchSource:
        storedAttr.firstTouchSource || (isGoogleAdsHistorical ? "google_ads" : "organic_or_direct"),
      lastTouchAt: nowIso,
    };

    if (isGoogleAdsHitNow || isGoogleAdsHistorical || utmSource || !storedAttrRaw) {
      window.localStorage.setItem(
        "totem_ads_attribution_v1",
        JSON.stringify(campaignAttribution)
      );
    }

    if (campaignAttribution.gclid) {
      writeFirstPartyCookie("totem_gclid", String(campaignAttribution.gclid), 90);
    }
    if (isGoogleAdsHistorical) {
      writeFirstPartyCookie("totem_ads_source", "google_ads", 90);
    }

    return campaignAttribution;
  } catch {
    return {};
  }
}

/**
 * Extrai e estrutura dados completos do comprador para o Google Ads Enhanced Conversions (Conversões Otimizadas)
 * Inclui e-mail normalizado, telefone E.164, nome, sobrenome, rua, cidade, estado (UF), CEP e país (BR).
 */
function extractUserData(data: Record<string, unknown>) {
  let cachedDraft: Record<string, any> = {};
  let savedProfile: Record<string, any> = {};
  let sessionCep = "";
  if (typeof window !== "undefined") {
    try {
      const rawDraft = window.localStorage.getItem("totem_checkout_draft_v2");
      if (rawDraft) cachedDraft = JSON.parse(rawDraft) || {};
    } catch {}
    try {
      const rawProf = window.localStorage.getItem("totem_saved_buyer_profile");
      if (rawProf) savedProfile = JSON.parse(rawProf) || {};
    } catch {}
    try {
      sessionCep = window.sessionStorage.getItem("totem_shipping_cep") || "";
    } catch {}
  }

  const customerObj = (data.customer as Record<string, any>) || {};
  const addrObj = (data.address as Record<string, any>) || customerObj.address || cachedDraft.address || {};

  const email =
    (
      (data.email as string) ||
      ( data.customerEmail as string) ||
      customerObj.email ||
      cachedDraft.email ||
      savedProfile.email ||
      ""
    )
      ?.trim()
      .toLowerCase() || undefined;

  const rawPhone =
    ((data.whatsapp ||
      data.customerWhatsapp ||
      data.phone ||
      data.telephone ||
      customerObj.whatsapp ||
      customerObj.phone ||
      cachedDraft.whatsapp ||
      savedProfile.whatsapp) as string | undefined) || undefined;
  const phone_number = formatE164Phone(rawPhone);

  const fullName =
    (
      (data.name as string) ||
      (data.customerName as string) ||
      customerObj.name ||
      cachedDraft.name ||
      savedProfile.name ||
      ""
    )?.trim() || "";
  let first_name: string | undefined;
  let last_name: string | undefined;
  if (fullName && !fullName.startsWith("Visitante")) {
    const parts = fullName.split(/\s+/);
    first_name = parts[0];
    last_name = parts.slice(1).join(" ") || undefined;
  }

  const postal_code =
    (
      (data.cep as string) ||
      addrObj.cep ||
      customerObj.cep ||
      cachedDraft.cep ||
      savedProfile.cep ||
      sessionCep ||
      ""
    )?.replace(/\D/g, "") || undefined;

  const city =
    ((data.city as string) || addrObj.city || customerObj.city || cachedDraft.city || savedProfile.city || "")?.trim() ||
    undefined;
  const region =
    ((data.state as string) || addrObj.state || customerObj.state || cachedDraft.state || savedProfile.state || "")
      ?.trim()
      .toUpperCase() || undefined;
  const streetRaw =
    ((data.street as string) || addrObj.street || customerObj.street || cachedDraft.street || savedProfile.street || "")?.trim() ||
    "";
  const numberRaw =
    ((data.number as string) || addrObj.number || customerObj.number || cachedDraft.number || "")?.trim() || "";
  const street = streetRaw ? (numberRaw ? `${streetRaw}, ${numberRaw}` : streetRaw) : undefined;

  if (!email && !phone_number && !first_name && !postal_code) return null;

  return {
    ...(email ? { email } : {}),
    ...(phone_number ? { phone_number } : {}),
    address: {
      ...(first_name ? { first_name } : {}),
      ...(last_name ? { last_name } : {}),
      ...(street ? { street } : {}),
      ...(city ? { city } : {}),
      ...(region ? { region } : {}),
      ...(postal_code ? { postal_code } : {}),
      country: "BR",
    },
  };
}

/**
 * Constrói array rico de itens de e-commerce no padrão GA4 / Google Ads Merchant
 * com fallback automático para os itens reais salvos no carrinho (localStorage)
 */
function buildEnhancedEcommerceItems(
  data: Record<string, unknown>,
  fallbackValue?: number
): Record<string, unknown>[] {
  if (Array.isArray(data.items) && data.items.length > 0) {
    return data.items.map((it: any, idx: number) => ({
      item_id: String(it.item_id || it.cabinetModelId || it.modelId || it.id || `totem_${idx + 1}`),
      item_name: String(it.item_name || it.cabinetName || it.modelName || "Gabinete Totem de Autoatendimento"),
      item_brand: "Totem Pro X-Point",
      item_category: "Totem de Autoatendimento",
      item_category2: String(it.colorName || "MaDeFibra BP 15mm CNC"),
      item_variant: String(it.purchaseMode || (it.isKitSelected ? "complete_kit" : "cabinet_only")),
      price:
        typeof it.price === "number"
          ? it.price
          : typeof it.unitPriceCents === "number"
          ? it.unitPriceCents / 100
          : fallbackValue || 1590,
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));
  }

  if (typeof window !== "undefined") {
    try {
      const rawCart = window.localStorage.getItem("totem_pro_cart_items_v1");
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it: any, idx: number) => {
            const cfg = it?.configuration || {};
            const model = cfg.model || {};
            const color = cfg.color || {};
            const monitor = cfg.monitor || null;
            const qty = Math.max(1, Number(it?.quantity || 1));
            const unitCents = Number(
              it?.unitPriceCents || cfg?.calculatedPriceCents || model?.pixPriceCents || 159000
            );
            const isKit = Boolean(
              it?.isKitSelected ||
                monitor?.isKit ||
                String(monitor?.displayName || monitor?.model || "").toLowerCase().includes("kit")
            );
            return {
              item_id: String(it?.cabinetModelId || model?.id || `totem_${idx + 1}`),
              item_name: String(it?.cabinetName || model?.name || "Gabinete Totem de Autoatendimento"),
              item_brand: "Totem Pro X-Point",
              item_category: "Totem de Autoatendimento",
              item_category2: String(color?.name || it?.colorName || "MaDeFibra BP 15mm CNC"),
              item_variant: isKit ? "complete_kit" : "cabinet_only",
              price: unitCents / 100,
              quantity: qty,
            };
          });
        }
      }
    } catch {}
  }

  return [
    {
      item_id: String(data.modelId || data.itemId || "totem_pro_cabinet"),
      item_name: String(data.modelName || data.cabinetName || "Gabinete Totem de Autoatendimento"),
      item_brand: "Totem Pro X-Point",
      item_category: "Totem de Autoatendimento",
      item_variant: data.isKitSelected ? "complete_kit" : "cabinet_only",
      price: fallbackValue || 1590,
      quantity: Math.max(1, Number(data.quantity || 1)),
    },
  ];
}

/**
 * Extrai sinais avançados de negócio e atribuição para alimentar o Smart Bidding do Google Ads
 */
function buildGoogleAdsCustomSignals(
  data: Record<string, unknown>,
  items: Record<string, unknown>[],
  userData: ReturnType<typeof extractUserData>
): Record<string, unknown> {
  const attr = captureAndPersistAdsAttribution();
  const firstItem = (items[0] || {}) as Record<string, any>;
  let docDigits = String(data.document || data.customerDocument || "").replace(/\D/g, "");
  if (!docDigits && typeof window !== "undefined") {
    try {
      const rawDraft = window.localStorage.getItem("totem_checkout_draft_v2");
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        docDigits = String(parsed?.document || "").replace(/\D/g, "");
      }
    } catch {}
  }

  const customerType =
    docDigits.length === 14 ? "b2b_cnpj" : docDigits.length === 11 ? "b2c_cpf" : " commercial_visitor";

  return {
    ...(attr.gclid ? { gclid: attr.gclid } : {}),
    ...(attr.wbraid ? { wbraid: attr.wbraid } : {}),
    ...(attr.gbraid ? { gbraid: attr.gbraid } : {}),
    traffic_origin: attr.isGoogleAdsOrigin ? "google_ads" : "organic_or_direct",
    utm_campaign: attr.utmCampaign || undefined,
    utm_term: attr.utmTerm || undefined,
    cabinet_model: firstItem.item_name || data.modelName || undefined,
    purchase_mode: firstItem.item_variant || (data.isKitSelected ? "complete_kit" : "cabinet_only"),
    payment_method: data.paymentMethod || data.method || "pix",
    customer_type: customerType.trim(),
    shipping_state: userData?.address?.region || data.state || undefined,
    shipping_city: userData?.address?.city || data.city || undefined,
    shipping_cep: userData?.address?.postal_code || data.cep || undefined,
    new_customer: true,
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
      const cartItems = buildEnhancedEcommerceItems(data, valueNumber);
      const computedVal =
        valueNumber ||
        cartItems.reduce((acc, it) => acc + Number(it.price || 1590) * Number(it.quantity || 1), 0) ||
        1590;
      const customSignals = buildGoogleAdsCustomSignals(data, cartItems, userData);

      pushToGtmDataLayer("add_to_cart", {
        ecommerce: { currency, value: computedVal, items: cartItems },
        ...(userData ? { user_data: userData } : {}),
        ...customSignals,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "add_to_cart", {
          currency,
          value: computedVal,
          items: cartItems,
          ...customSignals,
        });

        const atcLabel = pixelConfig.googleAdsAddToCartLabel || "xAc_CPHtqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && atcLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${atcLabel}`,
            value: computedVal,
            currency,
            items: cartItems,
            ...(userData ? { user_data: userData } : {}),
            ...customSignals,
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

    case ANALYTICS_EVENTS.BEGIN_CHECKOUT: {
      const checkoutItems = buildEnhancedEcommerceItems(data, valueNumber);
      const computedVal =
        valueNumber ||
        checkoutItems.reduce((acc, it) => acc + Number(it.price || 1590) * Number(it.quantity || 1), 0) ||
        1590;
      const customSignals = buildGoogleAdsCustomSignals(data, checkoutItems, userData);

      pushToGtmDataLayer("begin_checkout", {
        ecommerce: {
          currency,
          value: computedVal,
          items_count: data.totalItems || data.numItems || checkoutItems.length,
          items: checkoutItems,
        },
        ...(userData ? { user_data: userData } : {}),
        ...customSignals,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "begin_checkout", {
          currency,
          value: computedVal,
          items_count: data.totalItems || data.numItems || checkoutItems.length,
          items: checkoutItems,
          ...customSignals,
        });

        const bcLabel = pixelConfig.googleAdsBeginCheckoutLabel || "JjgUCKfrqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && bcLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${bcLabel}`,
            value: computedVal,
            currency,
            items: checkoutItems,
            ...(userData ? { user_data: userData } : {}),
            ...customSignals,
          });
        }
      }
      break;
    }

    case ANALYTICS_EVENTS.LEAD_SUBMITTED: {
      const leadItems = buildEnhancedEcommerceItems(data, valueNumber);
      const computedVal =
        valueNumber ||
        leadItems.reduce((acc, it) => acc + Number(it.price || 1590) * Number(it.quantity || 1), 0) ||
        1590;
      const customSignals = buildGoogleAdsCustomSignals(data, leadItems, userData);

      pushToGtmDataLayer("generate_lead", {
        currency,
        value: computedVal,
        lead_type: data.quotePdfRequested ? "formal_pdf_quote" : "checkout_registration",
        ecommerce: {
          currency,
          value: computedVal,
          items: leadItems,
        },
        user_data: userData,
        ...customSignals,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", {
          currency,
          value: computedVal,
          lead_type: data.quotePdfRequested ? "formal_pdf_quote" : "checkout_registration",
          items: leadItems,
          ...customSignals,
        });

        // Google Ads Conversion Oficial para Lead com Enhanced Conversions + Valor Real do Carrinho
        const leadLabel = pixelConfig.googleAdsLeadLabel || "VumdCIjzqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && leadLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${leadLabel}`,
            value: computedVal,
            currency,
            items: leadItems,
            ...(userData ? { user_data: userData } : {}),
            ...customSignals,
          });
        }
      }
      break;
    }

    case ANALYTICS_EVENTS.PIX_GENERATED: {
      const pixItems = buildEnhancedEcommerceItems(data, valueNumber);
      const computedVal =
        valueNumber ||
        pixItems.reduce((acc, it) => acc + Number(it.price || 1590) * Number(it.quantity || 1), 0) ||
        1590;
      const customSignals = buildGoogleAdsCustomSignals(data, pixItems, userData);

      pushToGtmDataLayer("add_payment_info", {
        ecommerce: {
          payment_type: "PIX",
          currency,
          value: computedVal,
          order_id: data.orderId || data.orderNumber,
          items: pixItems,
        },
        user_data: userData,
        ...customSignals,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "add_payment_info", {
          payment_type: "PIX",
          currency,
          value: computedVal,
          items: pixItems,
          ...customSignals,
        });
      }
      break;
    }

    case ANALYTICS_EVENTS.PURCHASE: {
      const orderId = String(data.orderNumber || data.orderId || data.transactionId || Date.now());
      const purchaseItems = buildEnhancedEcommerceItems(data, valueNumber);
      const computedVal =
        valueNumber ||
        purchaseItems.reduce((acc, it) => acc + Number(it.price || 1590) * Number(it.quantity || 1), 0) ||
        1590;
      const shippingVal =
        typeof data.shippingCents === "number" ? data.shippingCents / 100 : undefined;
      const customSignals = buildGoogleAdsCustomSignals(data, purchaseItems, userData);

      pushToGtmDataLayer("purchase", {
        ecommerce: {
          transaction_id: orderId,
          value: computedVal,
          ...(shippingVal !== undefined ? { shipping: shippingVal } : {}),
          currency,
          items_count: data.itemCount || purchaseItems.length,
          items: purchaseItems,
        },
        user_data: userData,
        ...customSignals,
      });
      if (typeof window.gtag === "function") {
        window.gtag("event", "purchase", {
          transaction_id: orderId,
          value: computedVal,
          ...(shippingVal !== undefined ? { shipping: shippingVal } : {}),
          currency,
          items_count: data.itemCount || purchaseItems.length,
          items: purchaseItems,
          ...customSignals,
        });

        // Google Ads Conversion Oficial para Venda com Enhanced Conversions Completas
        const purchaseLabel = pixelConfig.googleAdsPurchaseLabel || "IR8ZCPThqakdEJ2cmMID";
        if (pixelConfig.googleAdsId && purchaseLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${purchaseLabel}`,
            value: computedVal,
            currency,
            transaction_id: orderId,
            items: purchaseItems,
            ...(userData ? { user_data: userData } : {}),
            ...customSignals,
          });
        }
      }
      break;
    }

    case ANALYTICS_EVENTS.WHATSAPP_CLICK: {
      const waSource = String(data.source || "floating_whatsapp_discreet");
      const waNumber = String(data.number || "5511991649959");
      const waUrl = String(data.url || "");
      const waButtonId = String(data.buttonId || "btn-floating-whatsapp");
      const waItems = buildEnhancedEcommerceItems(data, valueNumber);
      const waEstimatedVal =
        valueNumber ||
        waItems.reduce((acc, it) => acc + Number(it.price || 1590) * Number(it.quantity || 1), 0) ||
        1590;
      const customSignals = buildGoogleAdsCustomSignals(data, waItems, userData);

      // 1. Disparo no dataLayer para o GTM (GTM-W4N3KKL7) acionar a Tag de Conversão do WhatsApp
      pushToGtmDataLayer("contact_whatsapp", {
        method: "WhatsApp",
        source: waSource,
        button_id: waButtonId,
        phone_number: waNumber,
        whatsapp_url: waUrl,
        page_path: window.location.pathname,
        value: waEstimatedVal,
        currency: "BRL",
        items: waItems,
        ...(userData ? { user_data: userData } : {}),
        ...customSignals,
      });

      if (typeof window.gtag === "function") {
        // 2. Eventos GA4 (contact + generate_lead via WhatsApp com transport_type beacon)
        window.gtag("event", "contact", {
          method: "WhatsApp",
          source: waSource,
          button_id: waButtonId,
          phone_number: waNumber,
          page_path: window.location.pathname,
          transport_type: "beacon",
          ...customSignals,
        });

        window.gtag("event", "generate_lead", {
          currency: "BRL",
          value: waEstimatedVal,
          lead_source: "whatsapp",
          source: waSource,
          items: waItems,
          transport_type: "beacon",
          ...customSignals,
        });

        // 3. Google Ads Conversion Oficial para WhatsApp ([Totem Pro] WhatsApp Consultor Engenharia)
        const waLabel = pixelConfig.googleAdsWhatsappLabel || "2vTuCKyvo6kdEJ2cmMID";
        if (pixelConfig.googleAdsId && waLabel) {
          window.gtag("event", "conversion", {
            send_to: `${pixelConfig.googleAdsId}/${waLabel}`,
            value: waEstimatedVal,
            currency: "BRL",
            items: waItems,
            ...(userData ? { user_data: userData } : {}),
            ...customSignals,
            transport_type: "beacon",
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

let lastWhatsappClickTs = 0;
let lastStartConfiguratorTs = 0;

function collectBrowserSnapshots() {
  if (typeof window === "undefined") return {};

  let cartSnapshot: unknown[] = [];
  let customerDraft: Record<string, unknown> = {};
  let campaignAttribution: Record<string, unknown> = {};

  try {
    const rawCart = window.localStorage.getItem("totem_pro_cart_items_v1");
    if (rawCart) {
      const parsed = JSON.parse(rawCart);
      if (Array.isArray(parsed)) {
        cartSnapshot = parsed.map((it: any, idx: number) => {
          const cfg = it?.configuration || {};
          const model = cfg.model || {};
          const color = cfg.color || {};
          const monitor = cfg.monitor || null;
          const printer = cfg.printer || null;
          const reader = cfg.barcodeReader || null;
          const qty = Math.max(1, Number(it?.quantity || 1));
          const unitPriceCents = Number(
            it?.unitPriceCents || cfg?.calculatedPriceCents || model?.pixPriceCents || 159000
          );
          const isKitSelected = Boolean(
            it?.isKitSelected ||
              monitor?.isKit ||
              String(monitor?.displayName || monitor?.model || "")
                .toLowerCase()
                .includes("kit")
          );
          const assemblyServiceSelected = Boolean(
            it?.assemblyServiceSelected || cfg?.includeAssemblyService
          );
          return {
            id: String(it?.id || `item_${idx + 1}`),
            itemId: String(it?.id || it?.itemId || `item_${idx + 1}`),
            cabinetModelId: String(it?.cabinetModelId || model?.id || "floor_totem"),
            cabinetName: String(
              it?.cabinetName || model?.name || "Gabinete Totem de Autoatendimento"
            ),
            colorId: color?.id || it?.colorId || undefined,
            colorName: color?.name || it?.colorName || undefined,
            monitorId: monitor?.id || it?.monitorId || undefined,
            monitorName:
              monitor?.displayName || monitor?.model || it?.monitorName || undefined,
            printerId: printer?.id || it?.printerId || undefined,
            printerName:
              printer?.displayName || printer?.model || it?.printerName || undefined,
            barcodeReaderId: reader?.id || it?.barcodeReaderId || undefined,
            barcodeReaderName:
              reader?.displayName || reader?.model || it?.barcodeReaderName || undefined,
            isKitSelected,
            purchaseMode: isKitSelected ? "complete_kit" : "cabinet_only",
            assemblyServiceSelected,
            assemblyFeeCents: Number(
              cfg?.assemblyServicePriceCents || (assemblyServiceSelected ? 99900 : 0)
            ),
            customizationNotes: String(
              cfg?.customizationNotes || it?.customizationNotes || ""
            ),
            quantity: qty,
            unitPriceCents,
            pixPriceCents: unitPriceCents,
            cardPriceCents: Math.round(unitPriceCents * 1.12),
            subtotalCents: Number(it?.subtotalCents || unitPriceCents * qty),
          };
        });
      }
    }
  } catch {}

  try {
    const savedProfile = window.localStorage.getItem("totem_saved_buyer_profile");
    const draftV2 = window.localStorage.getItem("totem_checkout_draft_v2");
    const shippingCep = window.sessionStorage.getItem("totem_shipping_cep");
    const pObj = savedProfile ? JSON.parse(savedProfile) : {};
    const dObj = draftV2 ? JSON.parse(draftV2) : {};
    customerDraft = {
      ...pObj,
      ...dObj,
      cep: dObj?.cep || pObj?.cep || shippingCep || "",
    };
  } catch {}

  try {
    campaignAttribution = captureAndPersistAdsAttribution();
  } catch {}

  let cartTelemetry: Record<string, unknown> = {};
  let timeOnSiteSeconds = 0;
  let interactionsCount = 1;
  try {
    const nowMs = Date.now();
    const rawStart = window.sessionStorage.getItem("totem_session_started_at");
    const startMs = rawStart ? Number(rawStart) : nowMs;
    if (!rawStart) {
      window.sessionStorage.setItem("totem_session_started_at", String(nowMs));
    }
    timeOnSiteSeconds = Math.max(1, Math.round((nowMs - startMs) / 1000));

    const prevCount = Number(
      window.sessionStorage.getItem("totem_session_interactions_count") || "0"
    );
    interactionsCount = prevCount + 1;
    window.sessionStorage.setItem(
      "totem_session_interactions_count",
      String(interactionsCount)
    );

    const rawCartTel = window.sessionStorage.getItem("totem_cart_telemetry_v1");
    if (rawCartTel) {
      cartTelemetry = JSON.parse(rawCartTel) || {};
    }
  } catch {}

  return {
    cartSnapshot,
    customerDraft,
    campaignAttribution,
    cartTelemetry,
    timeOnSiteSeconds,
    interactionsCount,
    screenResolution:
      typeof window.screen !== "undefined"
        ? `${window.screen.width}x${window.screen.height}`
        : undefined,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
  };
}

/**
 * Disparador central de eventos de Analytics, Pixels e GTM dataLayer
 */
export function trackEvent(
  eventName: AnalyticsEventType,
  metadata?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  // Deduplicação automática de cliques em WhatsApp (evita duplo disparo entre onClick React e listener global)
  if (eventName === ANALYTICS_EVENTS.WHATSAPP_CLICK) {
    const now = Date.now();
    if (now - lastWhatsappClickTs < 800) {
      return;
    }
    lastWhatsappClickTs = now;
  }

  // Deduplicação automática de início de configurador (evita duplo disparo entre clique na Home e montagem da rota /monte-seu-totem)
  if (eventName === ANALYTICS_EVENTS.START_CONFIGURATOR) {
    const now = Date.now();
    if (now - lastStartConfiguratorTs < 2500) {
      return;
    }
    lastStartConfiguratorTs = now;
  }

  const sessionId = getOrCreateSessionId();
  const snapshots = collectBrowserSnapshots();
  const payload = {
    eventName,
    sessionId,
    timestamp: new Date().toISOString(),
    metadata: {
      ...snapshots,
      ...metadata,
      pathname: window.location.pathname,
      url: window.location.href,
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
