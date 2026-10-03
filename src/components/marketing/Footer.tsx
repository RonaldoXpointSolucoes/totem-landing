"use client";

import React from "react";
import { siteConfig } from "@/config/site";
import { ShieldCheck, MessageSquare, Phone } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-black/5 dark:border-slate-800 bg-[#f5f5f7] dark:bg-slate-950 py-12 text-slate-600 dark:text-slate-400 text-xs transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <p className="font-bold text-sm text-[#1d1d1f] dark:text-slate-200">{siteConfig.name}</p>
          <p className="text-slate-500 dark:text-slate-400">
            Fabricação especializada de gabinetes metálicos para totens e terminais de autoatendimento.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Garantia Estrutural de Fábrica</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <MessageSquare className="w-4 h-4 text-[#0071e3] dark:text-indigo-400" />
            <span>Suporte Técnico Especializado</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-black/5 dark:border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
        <p>© {new Date().getFullYear()} X-Point Soluções. Todos os direitos reservados.</p>
        <p>Desenvolvido com padrão Mobile-First e Engenharia CNC Integrada.</p>
      </div>
    </footer>
  );
};
