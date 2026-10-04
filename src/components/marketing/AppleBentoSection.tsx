"use client";

import React from "react";
import { ChevronRight, Search, ShieldCheck, Wrench, Sparkles, Cpu, Layers } from "lucide-react";

interface AppleBentoSectionProps {
  onStartConfigurator: () => void;
}

export function AppleBentoSection({ onStartConfigurator }: AppleBentoSectionProps) {
  return (
    <section className="py-20 md:py-32 bg-[#f5f5f7] dark:bg-[#090a0f] text-[#1d1d1f] dark:text-white transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho da Seção (Estilo Print 2 da Apple) */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#0071e3] via-[#af52de] to-[#ff9500] bg-clip-text text-transparent tracking-tight">
            Feito para a sua operação.
          </p>

          <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-[#1d1d1f] dark:text-white leading-[1.08]">
            Um novo jeito de atender seu cliente.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal pt-2">
            A engenharia sob medida da Totem Pro é o sistema industrial definitivo que ajuda seu
            negócio a vender com mais rapidez, eliminar filas e garantir máxima confiabilidade. Com
            usinagem CNC submilimétrica para seus monitores touch, impressoras térmicas e leitores de código.
          </p>

          <div className="pt-2">
            <button
              onClick={onStartConfigurator}
              className="text-[#0071e3] hover:text-[#0077ed] font-semibold text-base inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Saiba mais sobre a nossa usinagem CNC</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bento Grid Inspirado no Print 3 da Apple (Cards Arredondados rounded-[32px]) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Card 1: Fundo Vinho / Rubi Profundo (Estilo Card 1 da Apple) */}
          <div className="relative rounded-[32px] overflow-hidden p-8 sm:p-10 bg-gradient-to-br from-[#852238] via-[#661829] to-[#400e18] text-white shadow-xl flex flex-col justify-between min-h-[440px] group transition-all duration-300 hover:shadow-2xl">
            <div className="space-y-4 max-w-md z-10">
              <span className="text-xs uppercase font-extrabold tracking-widest text-rose-300/80">
                Matéria-Prima Premium
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                MaDeFibra BP 15mm. Acabamento superior e encaixes firmes.
              </h3>
              <p className="text-sm text-rose-100/90 leading-relaxed font-normal">
                Painel revestido em MaDeFibra (MDF) BP feito com composição de fibras selecionadas mais
                curtas. Proporciona corte limpo sem arrepiamento na Router CNC, fixação superior de parafusos
                e durabilidade para a rotina do varejo.
              </p>
            </div>

            {/* Mockup Ilustrativo no Rodapé do Card */}
            <div className="relative mt-8 pt-4 flex items-center justify-center">
              <div className="w-full max-w-sm rounded-2xl bg-black/30 backdrop-blur-md border border-white/15 p-4 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-rose-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  <span className="text-[11px] font-mono text-white/70 ml-2">Usinagem Router CNC</span>
                </div>
                <div className="space-y-2 text-xs text-white/80">
                  <div className="flex justify-between border-b border-white/10 pb-1">
                    <span>Espessura:</span>
                    <span className="font-mono font-bold">15 mm MaDeFibra BP</span>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-1">
                    <span>Corte CNC:</span>
                    <span className="font-mono font-bold">Sem Arrepiamento</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Padrões:</span>
                    <span className="font-mono font-bold">Branco TX, Preto TX ou Sob Medida</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Fundo Champanhe / Pêssego Claro (Estilo Card 2 da Apple com Busca Flutuante) */}
          <div className="relative rounded-[32px] overflow-hidden p-8 sm:p-10 bg-gradient-to-br from-[#fbf4eb] to-[#f4e8d8] dark:from-slate-900 dark:to-slate-800/90 text-[#1d1d1f] dark:text-white border border-black/5 dark:border-white/10 shadow-xl flex flex-col justify-between min-h-[440px] group transition-all duration-300 hover:shadow-2xl">
            <div className="space-y-4 max-w-md z-10">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#e06b24] dark:text-amber-400">
                Compatibilidade Homologada
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                Encaixe exato para seus periféricos atuais.
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Você não precisa trocar seus monitores nem impressoras. Nós adaptamos os furos,
                presilhas e passagens para as marcas líderes que sua empresa já possui.
              </p>
            </div>

            {/* Barra de Busca Flutuante Estilo Apple Intelligence (Print 3) */}
            <div className="relative mt-8 pt-4">
              <div className="w-full bg-white dark:bg-slate-950 rounded-full px-5 py-3.5 shadow-xl border border-black/10 dark:border-slate-800 flex items-center gap-3 transition-transform duration-300 group-hover:scale-[1.02]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate font-medium">
                  Elgin 21.5", Gertec 15.6", Bematech 80mm, Leitores 2D...
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full shrink-0">
                  Homologado
                </span>
              </div>

              {/* Chips de Categorias Homologadas */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-black/5 dark:border-slate-700">
                  Monitores VESA 75/100
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-black/5 dark:border-slate-700">
                  Bobinas Térmicas 80mm
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm border border-black/5 dark:border-slate-700">
                  PinPads & TEF
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
