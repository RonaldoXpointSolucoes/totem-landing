"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const URL_SYNC_EVENT = "totem:url-param-sync";

/**
 * Lê um parâmetro da query string atual do navegador.
 */
export function readUrlParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  } catch {
    return null;
  }
}

/**
 * Atualiza um ou mais parâmetros na URL sem recarregar a página (preservando F5 e histórico).
 */
export function writeUrlParams(
  updates: Record<string, string | null | undefined>,
  options?: { push?: boolean }
): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    let changed = false;

    for (const [key, value] of Object.entries(updates)) {
      const current = url.searchParams.get(key);
      if (value === null || value === undefined || value === "") {
        if (current !== null) {
          url.searchParams.delete(key);
          changed = true;
        }
      } else {
        if (current !== value) {
          url.searchParams.set(key, value);
          changed = true;
        }
      }
    }

    if (changed) {
      if (options?.push) {
        window.history.pushState({}, "", url.toString());
      } else {
        window.history.replaceState({}, "", url.toString());
      }
      window.dispatchEvent(new CustomEvent(URL_SYNC_EVENT, { detail: updates }));
    }
  } catch (err) {
    console.debug("[URL Sync] Failed to update URL params:", err);
  }
}

/**
 * Hook que sincroniza bidirecionalmente um estado React com um parâmetro da URL (?key=value).
 * Garante que ao pressionar F5 ou usar Voltar/Avançar do navegador a tela e os filtros sejam preservados.
 */
export function useUrlParamState<T extends string>(
  paramKey: string,
  defaultValue: T,
  options?: {
    validValues?: readonly T[];
    writeDefaultToUrl?: boolean;
    pushHistory?: boolean;
  }
): [T, (nextValue: T | ((prev: T) => T)) => void] {
  const validValuesRef = useRef(options?.validValues);
  validValuesRef.current = options?.validValues;

  const isValid = useCallback((val: string | null): val is T => {
    if (val === null) return false;
    if (validValuesRef.current && validValuesRef.current.length > 0) {
      return validValuesRef.current.includes(val as T);
    }
    return true;
  }, []);

  const [state, setState] = useState<T>(() => {
    const raw = readUrlParam(paramKey);
    if (isValid(raw)) {
      return raw;
    }
    return defaultValue;
  });

  // Sincroniza na montagem no cliente e quando o usuário usa Voltar/Avançar (popstate)
  useEffect(() => {
    const syncFromLocation = () => {
      const raw = readUrlParam(paramKey);
      if (isValid(raw)) {
        setState((prev) => (prev !== raw ? raw : prev));
      } else if (options?.writeDefaultToUrl && raw === null) {
        writeUrlParams({ [paramKey]: defaultValue });
      }
    };

    syncFromLocation();

    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener(URL_SYNC_EVENT, syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener(URL_SYNC_EVENT, syncFromLocation);
    };
  }, [paramKey, defaultValue, isValid, options?.writeDefaultToUrl]);

  const setUrlState = useCallback(
    (nextValueOrUpdater: T | ((prev: T) => T)) => {
      setState((prev) => {
        const resolved =
          typeof nextValueOrUpdater === "function"
            ? (nextValueOrUpdater as (prev: T) => T)(prev)
            : nextValueOrUpdater;

        writeUrlParams(
          { [paramKey]: resolved },
          { push: options?.pushHistory }
        );
        return resolved;
      });
    },
    [paramKey, options?.pushHistory]
  );

  return [state, setUrlState];
}
