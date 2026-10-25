"use client";

import React, { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  initClientTelemetry,
  recordClientBreadcrumb,
} from "@/lib/telemetry/clientTelemetry";

/**
 * Monitor interno de rotas e parâmetros
 */
const RouteWatcherInner: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const query = searchParams?.toString() ? `?${searchParams.toString()}` : "";
    const fullRoute = `${pathname}${query}`;
    recordClientBreadcrumb("navigation", `Rota ativa: ${fullRoute}`);
  }, [pathname, searchParams]);

  return null;
};

/**
 * Componente sentinela global para observabilidade e telemetria de navegação
 */
export const SiteTelemetryWatcher: React.FC = () => {
  // Inicializa a escuta de runtime, promises e interceptação de APIs no cliente
  useEffect(() => {
    initClientTelemetry();
  }, []);

  // Monitora cliques em botões de ação e links para histórico de navegação
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const buttonOrLink = target.closest("button, a, [role='button']");
        if (buttonOrLink) {
          const text = (
            buttonOrLink.getAttribute("aria-label") ||
            buttonOrLink.getAttribute("title") ||
            buttonOrLink.textContent ||
            ""
          )
            .trim()
            .substring(0, 40);

          const tag = buttonOrLink.tagName.toLowerCase();
          const href = buttonOrLink.getAttribute("href");
          const label = text || (href ? `link:${href}` : tag);

          recordClientBreadcrumb("interaction", `Clique em <${tag}>: "${label}"`);
        }
      } catch {}
    };

    document.addEventListener("click", handleDocumentClick, { passive: true, capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <RouteWatcherInner />
    </Suspense>
  );
};
