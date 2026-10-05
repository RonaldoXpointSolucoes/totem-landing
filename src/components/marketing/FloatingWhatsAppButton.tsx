"use client";

import React, { useState, useEffect } from "react";
import { siteConfig } from "@/config/site";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";
import { MessageSquare, X } from "lucide-react";

export const FloatingWhatsAppButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isBadgeDismissed, setIsBadgeDismissed] = useState(false);

  useEffect(() => {
    // Revela suavemente após 1 segundo de navegação
    const timer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, {
      source: "floating_quick_cta",
      number: siteConfig.links.whatsappDisplay,
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-end flex-col gap-2 pointer-events-none select-none">
      {/* Tooltip Balão Flutuante (Dismissível) */}
      {!isBadgeDismissed && (
        <div className="pointer-events-auto flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3.5 py-2 rounded-2xl shadow-xl border border-black/10 dark:border-slate-800 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-[240px]">
          <div className="flex flex-col">
            <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
              Engenharia Disponível
            </span>
            <span className="text-[12px] font-semibold tracking-tight text-slate-900 dark:text-white">
              {siteConfig.links.whatsappDisplay}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsBadgeDismissed(true);
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto cursor-pointer"
            aria-label="Fechar balão informativo"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Botão Flutuante Principal de Ação */}
      <a
        href={siteConfig.links.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Falar com Engenheiro no WhatsApp ${siteConfig.links.whatsappDisplay}`}
        className="pointer-events-auto group relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
      >
        {/* Efeito de Ondulação / Pulse Suave */}
        <span className="absolute -inset-1 rounded-full bg-emerald-500 opacity-30 group-hover:opacity-50 animate-ping pointer-events-none" />

        {/* Ícone Estilizado WhatsApp */}
        <svg
          className="w-7 h-7 fill-current drop-shadow-sm transition-transform group-hover:scale-110"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>

        {/* Badge indicador online */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-300 border-2 border-white dark:border-slate-900" />
      </a>
    </div>
  );
};
