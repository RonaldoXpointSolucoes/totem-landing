"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

export const FloatingWhatsAppButton: React.FC = () => {
  const pathname = usePathname();

  // Oculta em painéis administrativos/internos e no visualizador 3D fullscreen
  const isInternalRoute =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/vendedor") ||
    pathname?.startsWith("/influenciador") ||
    pathname?.startsWith("/viewer3d");

  if (isInternalRoute) {
    return null;
  }

  // Em rotas com barra de ação inferior no mobile, eleva a posição para nunca cobrir botões
  const hasBottomActionBar =
    pathname?.startsWith("/monte-seu-totem") ||
    pathname?.startsWith("/configurador") ||
    pathname?.startsWith("/carrinho") ||
    pathname?.startsWith("/checkout");

  const handleClick = () => {
    trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, {
      source: "floating_whatsapp_discreet",
      number: siteConfig.links.whatsappRaw,
    });
  };

  return (
    <div
      className={`fixed right-3.5 sm:right-5 z-30 flex items-center pointer-events-none select-none transition-all duration-300 ${
        hasBottomActionBar ? "bottom-20 sm:bottom-6" : "bottom-4 sm:bottom-5"
      }`}
    >
      <a
        href={siteConfig.links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Solicitar catálogo pelo WhatsApp ${siteConfig.links.whatsappDisplay}`}
        title="Solicitar catálogo pelo WhatsApp"
        className="pointer-events-auto group relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600/80 hover:bg-emerald-600 dark:bg-emerald-600/75 dark:hover:bg-emerald-500 text-white/95 hover:text-white backdrop-blur-md border border-white/20 dark:border-emerald-400/20 shadow-sm hover:shadow-md opacity-75 hover:opacity-100 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
      >
        {/* Tooltip discreto exibido apenas ao passar o mouse no desktop */}
        <span className="hidden sm:flex items-center whitespace-nowrap pointer-events-none absolute right-full mr-2.5 px-2.5 py-1 rounded-lg bg-slate-900/90 dark:bg-slate-800/95 text-white text-[11px] font-medium shadow-md border border-white/10 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
          Receber catálogo no WhatsApp
        </span>

        {/* Ícone WhatsApp Minimalista */}
        <svg
          className="w-5 h-5 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>
    </div>
  );
};
