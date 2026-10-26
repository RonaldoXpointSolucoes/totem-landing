/**
 * Utilitário de Cache e Pré-carregamento Inteligente de Imagens para Carrossel
 * - Converte automaticamente caminhos locais /images/totems/*.png e URLs de catálogo legado para .webp (~98% menor)
 * - Cache em memória com persistência de texturas na GPU via img.decode()
 * - Pré-carregamento just-in-time (atual + próxima imediata) sem congestionar o LCP
 */

// Mapa de imagens de catálogo remotas para versões locais WebP ultraleves (600x600 ~25KB)
export const REMOTE_TOTEM_IMAGE_MAP: Record<string, string> = {
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20branco%20(10).png": "/images/totems/wall/parede-branco-10.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20branco%20(12).png": "/images/totems/wall/parede-branco-12.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20branco%20(14).png": "/images/totems/wall/parede-branco-14.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20branco%20(2).png": "/images/totems/wall/parede-branco-2.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20branco%20(4).png": "/images/totems/wall/parede-branco-4.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20preto%20(1).png": "/images/totems/wall/parede-preto-1.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20preto%20(12).png": "/images/totems/wall/parede-preto-12.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20preto%20(14).png": "/images/totems/wall/parede-preto-14.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20preto%20(20).png": "/images/totems/wall/parede-preto-20.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20preto%20(7)%20%20.png": "/images/totems/wall/parede-preto-7.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20preto%20(8)%20%20.png": "/images/totems/wall/parede-preto-8.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/BALCAO/totem%20balc%C3%A3o%20branco%20(4).png": "/images/totems/countertop/balcao-branco-4.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/BALCAO/totem%20balc%C3%A3o%20branco%20(1).png": "/images/totems/countertop/balcao-branco-1.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/BALCAO/totem%20balc%C3%A3o%20branco%20(10).png": "/images/totems/countertop/balcao-branco-10.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/BALCAO/totem%20balc%C3%A3o%20preto%20(1).png": "/images/totems/countertop/balcao-preto-1.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/BALCAO/totem%20balc%C3%A3o%20preto%20(10).png": "/images/totems/countertop/balcao-preto-10.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/BALCAO/totem%20balc%C3%A3o%20preto%20(8).png": "/images/totems/countertop/balcao-preto-8.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/CHAO/totem%20base%20branco%20(20).png": "/images/totems/floor/base-branco-20.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/CHAO/totem%20base%20branco%20(10).png": "/images/totems/floor/base-branco-10.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/CHAO/totem%20base%20branco%20(1).png": "/images/totems/floor/base-branco-1.webp",
  "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/Kit%20Completo%20para%20Totem%20de%20Autoatendimento.png": "/images/totems/kit-completo.webp",
};

// Cache em memória de elementos Image decodificados para retenção na GPU
const memoryImageCache = new Map<string, HTMLImageElement>();
// Set de URLs que estão atualmente em processo de pré-carregamento
const pendingRequests = new Set<string>();
// Listeners para notificar componentes quando uma imagem estiver pronta
const listeners = new Map<string, Set<() => void>>();

/**
 * Converte automaticamente imagens locais de totens .png ou URLs remotas legadas para .webp otimizado (~25KB vs 1.7MB)
 */
export function getOptimizedImageUrl(url: string): string {
  if (typeof url !== "string") return url;
  const trimmed = url.trim();
  if (REMOTE_TOTEM_IMAGE_MAP[trimmed]) {
    return REMOTE_TOTEM_IMAGE_MAP[trimmed];
  }
  if (trimmed.startsWith("/images/totems/") && trimmed.endsWith(".png")) {
    return trimmed.replace(/\.png$/i, ".webp");
  }
  return trimmed;
}

/**
 * Registra um callback para ser notificado quando a imagem estiver pronta
 */
export function onImageReady(url: string, callback: () => void): () => void {
  const optUrl = getOptimizedImageUrl(url);
  if (!listeners.has(optUrl)) {
    listeners.set(optUrl, new Set());
  }
  listeners.get(optUrl)!.add(callback);

  // Se já estiver no cache, notifica imediatamente
  if (memoryImageCache.has(optUrl)) {
    callback();
  }

  return () => {
    const list = listeners.get(optUrl);
    if (list) {
      list.delete(callback);
      if (list.size === 0) listeners.delete(optUrl);
    }
  };
}

function notifyReady(url: string) {
  const optUrl = getOptimizedImageUrl(url);
  const list = listeners.get(optUrl);
  if (list) {
    list.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn("Erro ao executar callback de cache de imagem:", err);
      }
    });
  }
}

/**
 * Retorna true se a imagem já estiver pronta e decodificada na memória
 */
export function isImagePreloaded(url: string): boolean {
  return memoryImageCache.has(getOptimizedImageUrl(url));
}

/**
 * Pré-carrega e decodifica na GPU uma única imagem com prioridade imediata
 */
export async function preloadSingleImage(url: string): Promise<string> {
  if (typeof window === "undefined" || !url || typeof url !== "string") {
    return url;
  }

  const cleanUrl = getOptimizedImageUrl(url);
  if (!cleanUrl) return "";

  // Se já está na memória decodificada, retorna imediatamente
  if (memoryImageCache.has(cleanUrl)) {
    return cleanUrl;
  }

  // Se já está sendo baixada, aguarda
  if (pendingRequests.has(cleanUrl)) {
    return new Promise((resolve) => {
      const unsubscribe = onImageReady(cleanUrl, () => {
        unsubscribe();
        resolve(cleanUrl);
      });
    });
  }

  pendingRequests.add(cleanUrl);

  try {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.src = cleanUrl;

      const handleSuccess = async () => {
        try {
          if ("decode" in img) {
            await img.decode();
          }
        } catch {
          // Decode pode falhar em SVGs ou imagens parciais; não quebra o fluxo
        }
        memoryImageCache.set(cleanUrl, img);
        pendingRequests.delete(cleanUrl);
        notifyReady(cleanUrl);
        resolve();
      };

      if (img.complete) {
        handleSuccess();
      } else {
        img.onload = handleSuccess;
        img.onerror = () => {
          pendingRequests.delete(cleanUrl);
          notifyReady(cleanUrl);
          resolve();
        };
      }
    });

    return cleanUrl;
  } catch {
    pendingRequests.delete(cleanUrl);
    return cleanUrl;
  }
}

/**
 * Pré-carrega de forma enxuta apenas a imagem atual e a próxima imediata:
 * Evita congestionamento de banda no carregamento inicial (melhora LCP e TTI)
 */
export function preloadCarouselImages(urls: string[], currentIndex: number = 0) {
  if (typeof window === "undefined" || !Array.isArray(urls) || urls.length === 0) return;

  const validUrls = urls.filter((u) => typeof u === "string" && u.trim().length > 0);
  if (validUrls.length === 0) return;

  const total = validUrls.length;
  const currentUrl = getOptimizedImageUrl(validUrls[currentIndex % total]);
  const nextIdx = (currentIndex + 1) % total;
  const nextUrl = getOptimizedImageUrl(validUrls[nextIdx]);

  // Carrega a atual imediatamente
  preloadSingleImage(currentUrl);

  // Agenda a próxima imagem para momentos ociosos após o LCP inicial
  if (nextUrl && nextUrl !== currentUrl) {
    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
        () => preloadSingleImage(nextUrl)
      );
    } else {
      setTimeout(() => preloadSingleImage(nextUrl), 400);
    }
  }
}
