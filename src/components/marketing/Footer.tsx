"use client";

import React from "react";
import { siteConfig } from "@/config/site";
import { ShieldCheck, MessageSquare, Phone } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-black/5 dark:border-slate-800 bg-[#f5f5f7] dark:bg-slate-950 py-12 text-slate-600 dark:text-slate-400 text-xs transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <p className="font-bold text-sm text-[#1d1d1f] dark:text-slate-200">{siteConfig.name}</p>
          <p className="text-slate-500 dark:text-slate-400">
            Fabricação especializada em MaDeFibra (MDF) BP para totens e terminais de autoatendimento.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Garantia Estrutural de Fábrica</span>
          </div>
          <a
            href={siteConfig.links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, { source: "footer_support" })
            }
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-[#0071e3] dark:hover:text-cyan-400 transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-[#0071e3] dark:text-indigo-400" />
            <span>Suporte Técnico Especializado</span>
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-black/5 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <p>© {new Date().getFullYear()} X-Point Soluções. Todos os direitos reservados.</p>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">v{siteConfig.version}</span>
          </div>
        </div>
        <p className="text-[11px]">Desenvolvido com padrão Mobile-First e Usinagem Router CNC Integrada.</p>
      </div>
    </footer>
  );
};

