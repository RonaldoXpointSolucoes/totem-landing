/**
 * Utilitário de Cache e Pré-carregamento Inteligente de Imagens para Carrossel
 * - Cache em memória com persistência de texturas na GPU via img.decode()
 * - Cache offline/local de respostas via CacheStorage do navegador (Cache API)
 * - Pré-carregamento prioritário inteligente (atual + próxima em alta prioridade)
 * - Elimina atrasos, telas brancas e engasgos de transição
 */

// Cache em memória de elementos Image decodificados para retenção na GPU
const memoryImageCache = new Map<string, HTMLImageElement>();
// Cache de URLs convertidas em Blobs locais ultrarrápidos
const blobUrlCache = new Map<string, string>();
// Set de URLs que estão atualmente em processo de pré-carregamento
const pendingRequests = new Set<string>();
// Listeners para notificar componentes quando uma imagem estiver pronta
const listeners = new Map<string, Set<() => void>>();

const CACHE_NAME = "totem-assets-cache-v1";

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
 * Retorna a URL otimizada (blob local em cache ou url original)
 */
export function getOptimizedImageUrl(url: string): string {
  return blobUrlCache.get(url) || url;
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
    return blobUrlCache.get(cleanUrl) || cleanUrl;
  }

  // Se já está sendo baixada, aguarda
  if (pendingRequests.has(cleanUrl)) {
    return new Promise((resolve) => {
      const unsubscribe = onImageReady(cleanUrl, () => {
        unsubscribe();
        resolve(blobUrlCache.get(cleanUrl) || cleanUrl);
      });
    });
  }

  pendingRequests.add(cleanUrl);

  try {
    // 1. Tenta recuperar ou armazenar via CacheStorage do navegador para velocidade instantânea
    let sourceUrl = cleanUrl;
    if ("caches" in window) {
      try {
        const cache = await window.caches.open(CACHE_NAME);
        const match = await cache.match(cleanUrl);
        if (match) {
          const blob = await match.blob();
          const blobUrl = URL.createObjectURL(blob);
          blobUrlCache.set(cleanUrl, blobUrl);
          sourceUrl = blobUrl;
        } else {
          // Busca e guarda no CacheStorage em segundo plano
          fetch(cleanUrl, { mode: "cors", credentials: "omit" })
            .then(async (response) => {
              if (response.ok) {
                const clone = response.clone();
                await cache.put(cleanUrl, clone);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                blobUrlCache.set(cleanUrl, blobUrl);
              }
            })
            .catch(() => {
              // Falha silenciosa de cache fetch; fallback direto para new Image()
            });
        }
      } catch {
        // Fallback transparente se caches não permitir CORS ou estiver desativado
      }
    }

    // 2. Instancia objeto Image do navegador e força decodificação GPU
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.src = sourceUrl;

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

    return blobUrlCache.get(cleanUrl) || cleanUrl;
  } catch (err) {
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
