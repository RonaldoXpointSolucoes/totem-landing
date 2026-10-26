"use client";

import React from "react";
import { ArrowRight, CheckCircle2, Cpu, Search, Layers, ShieldCheck } from "lucide-react";

interface AppleBentoSectionProps {
  onStartConfigurator: () => void;
}

export function AppleBentoSection({ onStartConfigurator }: AppleBentoSectionProps) {
  return (
    <section className="py-20 md:py-32 bg-[#f5f5f7] dark:bg-[#090a0f] text-[#1d1d1f] dark:text-white transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho Apple Editorial */}
        <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-[#1d1d1f] dark:text-white">
            Feito para a sua operação.{" "}
            <span className="bg-gradient-to-r from-[#0071e3] via-[#af52de] to-[#ff375f] bg-clip-text text-transparent">
              Um novo jeito de atender seu cliente.
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A engenharia modular da X-Point combina usinagem computadorizada Router CNC em{" "}
            <strong className="text-[#1d1d1f] dark:text-slate-200 font-semibold">
              MaDeFibra BP 15mm
            </strong>{" "}
            com gabaritos homologados para monitores touch, impressoras térmicas e leitores 2D.
          </p>
          <button
            onClick={onStartConfigurator}
            className="mt-6 inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-[#0058b6] dark:text-[#4da3ff] hover:text-[#004494] hover:underline cursor-pointer"
          >
            Saiba mais sobre a nossa usinagem CNC
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bento Grid (2 Cards Pastel Superiores + 1 Card Full-Width Inferior) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Card 1: Pastel Rosa/Lavanda — Gabinete Sob Medida */}
          <div className="rounded-[32px] p-8 sm:p-10 bg-gradient-to-br from-[#fdf2f7] via-[#f8eefc] to-[#f2effe] dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-black/[0.04] dark:border-white/10 shadow-sm flex flex-col justify-between overflow-hidden relative group">
            <div className="space-y-3 z-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#9e1c60] dark:text-pink-400">
                <Layers className="w-3.5 h-3.5" />
                Estrutura Modular
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-snug">
                Encaixe milimétrico.{" "}
                <span className="text-[#9e1c60] dark:text-pink-400">
                  Zero arrepiamento de borda.
                </span>
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Cada gabinete passa por corte computadorizado de precisão com furação VESA exata e compartimento interno seguro com chave exclusiva.
              </p>
            </div>

            {/* Mockup Visual Interno */}
            <div className="mt-8 pt-6 bg-white/95 dark:bg-slate-950/90 rounded-2xl p-5 border border-black/5 dark:border-white/10 shadow-inner space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <span>Checklist de Usinagem CNC</span>
                <span className="text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Precisão
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#f5f5f7] dark:bg-slate-900">
                <span>Padrão VESA 75×75 / 100×100</span>
                <strong className="font-mono text-[#1d1d1f] dark:text-white">Incluído</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#f5f5f7] dark:bg-slate-900">
                <span>Berço para Impressora Térmica 80mm</span>
                <strong className="font-mono text-[#1d1d1f] dark:text-white">Sob Medida</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#f5f5f7] dark:bg-slate-900">
                <span>Janela Frontal Leitor 2D / QR Code</span>
                <strong className="font-mono text-[#1d1d1f] dark:text-white">Homologado</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Pastel Pêssego/Âmbar — Periféricos Homologados sem Taxa Extra */}
          <div className="rounded-[32px] p-8 sm:p-10 bg-gradient-to-br from-[#fef6ee] via-[#fbf4eb] to-[#f5f0ff] dark:from-slate-900 dark:via-amber-950/25 dark:to-slate-900 border border-black/[0.04] dark:border-white/10 shadow-sm flex flex-col justify-between overflow-hidden relative group">
            <div className="space-y-3 z-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#a34008] dark:text-amber-400">
                <Cpu className="w-3.5 h-3.5" />
                Compatibilidade Homologada
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-snug">
                Informe seus periféricos.{" "}
                <span className="text-[#a34008] dark:text-amber-400">
                  Sem taxa extra de corte.
                </span>
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Monitores Touch, impressoras Epson, Elgin, Bematech e leitores Honeywell já possuem gabaritos prontos em nossa linha de produção.
              </p>
            </div>

            {/* Mockup estilo Spotlight Search Bar do iMac */}
            <div className="mt-8 space-y-3">
              <div className="w-full bg-white dark:bg-slate-950 rounded-full px-5 py-3.5 shadow-xl border border-black/10 dark:border-white/15 flex items-center gap-3">
                <Search className="w-5 h-5 text-[#0058b6] dark:text-blue-400 shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  Elgin 21.5&quot;, Gertec 15.6&quot;, Bematech 80mm, Leitores 2D...
                </span>
                <span className="ml-auto text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full shrink-0">
                  Homologado
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-3 text-center border border-black/5 dark:border-white/5">
                  <strong className="block text-xs text-[#1d1d1f] dark:text-white">Monitores</strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">15.6&quot; a 24&quot; Touch</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-3 text-center border border-black/5 dark:border-white/5">
                  <strong className="block text-xs text-[#1d1d1f] dark:text-white">Impressoras</strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">Epson / Elgin / Bematech</span>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-3 text-center border border-black/5 dark:border-white/5">
                  <strong className="block text-xs text-[#1d1d1f] dark:text-white">Leitores</strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">1D / 2D / QR Fixo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3 Full-Width: Acabamento Industrial & Segurança */}
        <div className="mt-6 sm:mt-8 rounded-[32px] p-8 sm:p-12 bg-white dark:bg-slate-900/80 border border-black/[0.05] dark:border-white/10 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0058b6] dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              Pronto para Operação Intensiva
            </span>
            <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#1d1d1f] dark:text-white leading-tight">
              Configure online em menos de 2 minutos e receba pronto para instalar.
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Escolha entre Piso, Parede ou Balcão, selecione a cor em MaDeFibra BP 15mm (Branco TX, Preto TX ou Dual-Tone) e finalize seu pedido com pagamento instantâneo via PIX ou Cartão.
            </p>
          </div>

          <button
            onClick={onStartConfigurator}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#0062cc] hover:bg-[#0051a8] text-white font-semibold text-sm sm:text-base transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            Abrir Configurador Passo a Passo
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
