import { CampaignTrackingData } from "@/types/voucher";

const CAMPAIGN_STORAGE_KEY = "totem_campaign_tracking_v2";

/**
 * Detecta o tipo de dispositivo a partir do user agent ou dimensões da janela
 */
function detectDevice(): "mobile" | "desktop" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  const ua = navigator.userAgent.toLowerCase();

  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua) || (width >= 640 && width <= 1024)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android.*mobile|blackberry|phone/i.test(ua) || width < 640) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Captura parâmetros de campanha e link tracking da URL atual
 */
export function captureCampaignFromUrl(): CampaignTrackingData | null {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    // Detecta se há parâmetros relevantes de campanha ou cupom
    const utmSource = searchParams.get("utm_source") || undefined;
    const utmMedium = searchParams.get("utm_medium") || undefined;
    const utmCampaign = searchParams.get("utm_campaign") || undefined;
    const utmContent = searchParams.get("utm_content") || undefined;
    const utmTerm = searchParams.get("utm_term") || undefined;
    const refCode =
      searchParams.get("cupom") ||
      searchParams.get("voucher") ||
      searchParams.get("ref") ||
      searchParams.get("influencer") ||
      undefined;

    const hasAnyTrack = !!(utmSource || utmCampaign || refCode || utmMedium);

    // Se houver parâmetros, monta o objeto de tracking
    if (hasAnyTrack) {
      const trackingData: CampaignTrackingData = {
        hasTracking: true,
        landingUrl: window.location.href,
        referrer: document.referrer || undefined,
        utmSource: utmSource ? utmSource.toLowerCase().trim() : undefined,
        utmMedium: utmMedium ? utmMedium.toLowerCase().trim() : undefined,
        utmCampaign: utmCampaign ? utmCampaign.toLowerCase().trim() : undefined,
        utmContent: utmContent ? utmContent.toLowerCase().trim() : undefined,
        utmTerm: utmTerm ? utmTerm.trim() : undefined,
        refCode: refCode ? refCode.toUpperCase().trim() : undefined,
        device: detectDevice(),
        capturedAt: new Date().toISOString(),
      };

      // Persiste no storage do navegador
      persistCampaignTracking(trackingData);
      return trackingData;
    }

    // Se não há na URL atual, tenta recuperar do storage
    return getPersistedCampaignTracking();
  } catch (err) {
    console.warn("Erro ao capturar tracking de campanha:", err);
    return getPersistedCampaignTracking();
  }
}

/**
 * Recupera o tracking persistido anteriormente no navegador
 */
export function getPersistedCampaignTracking(): CampaignTrackingData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as CampaignTrackingData;
  } catch {
    return null;
  }
}

/**
 * Persiste o tracking no localStorage
 */
export function persistCampaignTracking(data: CampaignTrackingData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Falha ao salvar tracking no localStorage:", err);
  }
}

/**
 * Limpa o tracking persistido (opcional após pedido concluído)
 */
export function clearCampaignTracking(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
  } catch {}
}

/**
 * Construtor inteligente de links rastreados com UTM para influenciadores
 */
export function buildTrackedCampaignLink(
  origin: string,
  couponCode: string,
  options: {
    targetPath?: string;
    channel: "instagram_stories" | "instagram_bio" | "tiktok" | "youtube" | "whatsapp" | "custom";
    customCampaign?: string;
    customMedium?: string;
    customContent?: string;
  }
): { url: string; displayLabel: string; channelKey: string } {
  const cleanPath = options.targetPath || "/monte-seu-totem";
  const url = new URL(cleanPath, origin);

  // Define UTMs padronizadas de acordo com o canal selecionado
  let utmSource = "organico";
  let utmMedium = "link";
  let utmCampaign = `parceria_${couponCode.toLowerCase()}`;
  let displayLabel = "Link Padrão";

  switch (options.channel) {
    case "instagram_stories":
      utmSource = "instagram";
      utmMedium = "stories";
      utmCampaign = options.customCampaign || `stories_${couponCode.toLowerCase()}`;
      displayLabel = "Instagram Stories (Arrasta p/ Cima)";
      break;
    case "instagram_bio":
      utmSource = "instagram";
      utmMedium = "bio";
      utmCampaign = options.customCampaign || `bio_${couponCode.toLowerCase()}`;
      displayLabel = "Instagram Link da Bio";
      break;
    case "tiktok":
      utmSource = "tiktok";
      utmMedium = "video";
      utmCampaign = options.customCampaign || `tiktok_${couponCode.toLowerCase()}`;
      displayLabel = "TikTok (Bio / Vídeo)";
      break;
    case "youtube":
      utmSource = "youtube";
      utmMedium = "description";
      utmCampaign = options.customCampaign || `video_${couponCode.toLowerCase()}`;
      displayLabel = "YouTube (Descrição do Vídeo)";
      break;
    case "whatsapp":
      utmSource = "whatsapp";
      utmMedium = "direct_message";
      utmCampaign = options.customCampaign || `conversa_${couponCode.toLowerCase()}`;
      displayLabel = "WhatsApp (Compartilhamento Direto)";
      break;
    case "custom":
      utmSource = options.customCampaign ? options.customCampaign.toLowerCase() : "custom";
      utmMedium = options.customMedium || "campanha";
      utmCampaign = options.customCampaign || `promo_${couponCode.toLowerCase()}`;
      displayLabel = "Campanha Personalizada";
      break;
  }

  url.searchParams.set("cupom", couponCode.toUpperCase());
  url.searchParams.set("utm_source", utmSource);
  url.searchParams.set("utm_medium", utmMedium);
  url.searchParams.set("utm_campaign", utmCampaign);

  if (options.customContent) {
    url.searchParams.set("utm_content", options.customContent);
  }

  return {
    url: url.toString(),
    displayLabel,
    channelKey: options.channel,
  };
}
