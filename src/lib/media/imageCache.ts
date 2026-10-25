/**
 * Utilitário de Cache e Pré-carregamento Inteligente de Imagens para Carrossel
 * - Cache em memória com persistência de texturas na GPU via img.decode()
 * - Pré-carregamento prioritário inteligente (atual + próxima em alta prioridade)
 * - Mantém a URL estável entre pré-carregamento e renderização para evitar net::ERR_ABORTED
 */

// Cache em memória de elementos Image decodificados para retenção na GPU
const memoryImageCache = new Map<string, HTMLImageElement>();
// Set de URLs que estão atualmente em processo de pré-carregamento
const pendingRequests = new Set<string>();
// Listeners para notificar componentes quando uma imagem estiver pronta
const listeners = new Map<string, Set<() => void>>();

/**
 * Registra um callback para ser notificado quando a imagem estiver pronta
 */
export function onImageReady(url: string, callback: () => void): () => void {
  if (!listeners.has(url)) {
    listeners.set(url, new Set());
  }
  listeners.get(url)!.add(callback);

  // Se já estiver no cache, notifica imediatamente
  if (memoryImageCache.has(url)) {
    callback();
  }

  return () => {
    const list = listeners.get(url);
    if (list) {
      list.delete(callback);
      if (list.size === 0) listeners.delete(url);
    }
  };
}

function notifyReady(url: string) {
  const list = listeners.get(url);
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
  return memoryImageCache.has(url);
}

/**
 * Retorna a URL higienizada mantendo a URL estável para evitar cancelamento de requisição em voo
 */
export function getOptimizedImageUrl(url: string): string {
  return typeof url === "string" ? url.trim() : url;
}

/**
 * Pré-carrega e decodifica na GPU uma única imagem com prioridade imediata
 */
export async function preloadSingleImage(url: string): Promise<string> {
  if (typeof window === "undefined" || !url || typeof url !== "string") {
    return url;
  }

  const cleanUrl = url.trim();
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
    // Instancia objeto Image do navegador e força decodificação GPU mantendo a mesma URL do DOM
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
 * Pré-carrega um conjunto de imagens com escalonamento prioritário:
 * 1. Prioridade Máxima: primeira imagem e próxima imagem imediata
 * 2. Prioridade de Background: demais imagens da sequência em momentos de ociosidade
 */
export function preloadCarouselImages(urls: string[], currentIndex: number = 0) {
  if (typeof window === "undefined" || !Array.isArray(urls) || urls.length === 0) return;

  const validUrls = urls.filter((u) => typeof u === "string" && u.trim().length > 0);
  if (validUrls.length === 0) return;

  const total = validUrls.length;
  const currentUrl = validUrls[currentIndex % total];
  const nextIdx = (currentIndex + 1) % total;
  const nextUrl = validUrls[nextIdx];
  const prevIdx = (currentIndex - 1 + total) % total;
  const prevUrl = validUrls[prevIdx];

  // 1. Prioridade Alta: Atual e Próxima
  preloadSingleImage(currentUrl);
  if (nextUrl && nextUrl !== currentUrl) {
    preloadSingleImage(nextUrl);
  }
  if (prevUrl && prevUrl !== currentUrl && prevUrl !== nextUrl) {
    preloadSingleImage(prevUrl);
  }

  // 2. Prioridade Média/Baixa: As restantes são agendadas para não travar a rede
  const remaining = validUrls.filter(
    (u) => u !== currentUrl && u !== nextUrl && u !== prevUrl
  );

  if (remaining.length > 0) {
    const scheduleRemaining = () => {
      let delay = 150;
      remaining.forEach((u) => {
        setTimeout(() => {
          preloadSingleImage(u);
        }, delay);
        delay += 250;
      });
    };

    if ("requestIdleCallback" in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(scheduleRemaining);
    } else {
      setTimeout(scheduleRemaining, 300);
    }
  }
}
