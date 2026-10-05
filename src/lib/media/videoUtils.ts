/**
 * Utilitários para parsing, validação e formatação de vídeos do Instagram e arquivos de vídeo
 */

export interface ParsedVideoInfo {
  originalUrl: string;
  isInstagram: boolean;
  isDirectVideo: boolean;
  shortcode?: string;
  embedUrl?: string;
  canonicalUrl?: string;
  videoType: "instagram_reel" | "instagram_post" | "instagram_tv" | "direct_video" | "unknown";
}

/**
 * Extrai o shortcode e monta as URLs canônicas e de embed do Instagram
 */
export function parseInstagramUrl(inputUrl: string): ParsedVideoInfo {
  const url = (inputUrl || "").trim();

  if (!url) {
    return {
      originalUrl: "",
      isInstagram: false,
      isDirectVideo: false,
      videoType: "unknown",
    };
  }

  // Verifica se é arquivo direto de vídeo (.mp4, .webm, .ogg, .mov)
  const isDirect = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
  if (isDirect) {
    return {
      originalUrl: url,
      isInstagram: false,
      isDirectVideo: true,
      embedUrl: url,
      canonicalUrl: url,
      videoType: "direct_video",
    };
  }

  // Expressão regular robusta para extrair links do Instagram:
  // Suporta instagram.com/reel/{code}, instagram.com/p/{code}, instagram.com/tv/{code}, instagr.am/...
  const instagramRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(reel|reels|p|tv)\/([a-zA-Z0-9_-]+)/i;
  const match = url.match(instagramRegex);

  if (match) {
    const rawType = match[1].toLowerCase();
    const shortcode = match[2];

    let videoType: "instagram_reel" | "instagram_post" | "instagram_tv" = "instagram_reel";
    if (rawType.startsWith("reel")) {
      videoType = "instagram_reel";
    } else if (rawType === "tv") {
      videoType = "instagram_tv";
    } else {
      videoType = "instagram_post";
    }

    const canonicalPath = videoType === "instagram_post" ? "p" : "reel";
    const canonicalUrl = `https://www.instagram.com/${canonicalPath}/${shortcode}/`;
    const embedUrl = `https://www.instagram.com/${canonicalPath}/${shortcode}/embed/`;

    return {
      originalUrl: url,
      isInstagram: true,
      isDirectVideo: false,
      shortcode,
      embedUrl,
      canonicalUrl,
      videoType,
    };
  }

  // Se o usuário colou apenas o shortcode (ex: D123abc_-x)
  if (/^[a-zA-Z0-9_-]{9,15}$/.test(url)) {
    return {
      originalUrl: url,
      isInstagram: true,
      isDirectVideo: false,
      shortcode: url,
      embedUrl: `https://www.instagram.com/reel/${url}/embed/`,
      canonicalUrl: `https://www.instagram.com/reel/${url}/`,
      videoType: "instagram_reel",
    };
  }

  // Fallback para URL genérica
  return {
    originalUrl: url,
    isInstagram: false,
    isDirectVideo: false,
    embedUrl: url,
    canonicalUrl: url,
    videoType: "unknown",
  };
}

/**
 * Valida se uma string é uma URL de vídeo ou Instagram aceitável
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const parsed = parseInstagramUrl(url);
  return parsed.isInstagram || parsed.isDirectVideo || url.startsWith("http");
}
