"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, ChevronRight, Check } from "lucide-react";
import { InstagramVideoModal, InstagramGlyph } from "@/components/media";

interface AppleHeroProps {
  onStartConfigurator: () => void;
  onExploreModels: () => void;
}

// Cores dos bastões e dos totens inspiradas no lineup oficial do iMac
const COLOR_STICKS = [
  { name: "Verde Industrial", color: "#34c759", label: "Verde", totemIndex: 0 },
  { name: "Amarelo Canário", color: "#ffd60a", label: "Amarelo", totemIndex: 1 },
  { name: "Laranja Pêssego", color: "#ff9f0a", label: "Laranja", totemIndex: 1 },
  { name: "Rosa Rubi Metálico", color: "#ff375f", label: "Rubi", totemIndex: 2 },
  { name: "Roxo Lavanda", color: "#bf5af2", label: "Lavanda", totemIndex: 3 },
  { name: "Azul Cobalto", color: "#0071e3", label: "Azul", totemIndex: 2 },
  { name: "Prata Titânio", color: "#86868b", label: "Prata", totemIndex: 4 },
];

export function AppleHero({ onStartConfigurator, onExploreModels }: AppleHeroProps) {
  const [activeStick, setActiveStick] = useState<number | null>(null);
  const [hoveredTotem, setHoveredTotem] = useState<number | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  return (
    <section
      aria-label="Apresentação Totem Pro — Totem de Autoatendimento Sob Medida"
      className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-white transition-colors duration-300"
    >
      {/* Aura Periférica Apple Intelligence Glow (Gradiente nativo sem custo de rasterização de blur) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[460px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 45%, rgba(0, 113, 227, 0.12) 0%, rgba(175, 82, 222, 0.09) 38%, rgba(255, 149, 0, 0.05) 65%, transparent 80%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 text-center">
        {/* Eyebrow / Nome da Linha */}
        <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase mb-2 block">
          Totem Pro • Fábrica de Gabinetes &amp; Totens
        </span>

        {/* Título Visual Fiel: "Bri[|||||||]lhante." */}
        <div
          aria-hidden="true"
          className="flex items-center justify-center tracking-tight font-black text-5xl sm:text-7xl lg:text-8xl select-none my-2"
        >
          <span>Bri</span>

          {/* Bastões Verticais Coloridos estilo piano Apple */}
          <div className="inline-flex items-center gap-[3px] sm:gap-[5px] mx-1 sm:mx-1.5 self-center h-12 sm:h-16 lg:h-20 overflow-visible">
            {COLOR_STICKS.map((stick, index) => {
              const isStickActive =
                activeStick === index ||
                (hoveredTotem !== null && stick.totemIndex === hoveredTotem);
              return (
                <span
                  key={index}
                  onMouseEnter={() => setActiveStick(index)}
                  onMouseLeave={() => setActiveStick(null)}
                  style={{
                    backgroundColor: stick.color,
                  }}
                  className={`w-[6px] sm:w-[9px] lg:w-[11px] h-full rounded-full cursor-pointer shadow-sm origin-bottom transition-transform duration-300 ${
                    isStickActive
                      ? "scale-y-110 shadow-lg -translate-y-1"
                      : "opacity-95 hover:opacity-100"
                  }`}
                  title={`${stick.name} — clique para destacar`}
                />
              );
            })}
          </div>

          <span>hante.</span>
        </div>

        {/* Lineup de Gabinetes em Acordeão / Fan-Out Cinemático Apple */}
        <div className="relative w-full max-w-4xl mx-auto my-6 sm:my-10 aspect-[16/9] sm:aspect-[21/9] flex items-end justify-center overflow-visible">
          {/* 1. Gabinete Esquerda Extrema (Parede Slim - Verde Menta) */}
          <div
            onMouseEnter={() => setHoveredTotem(0)}
            onMouseLeave={() => setHoveredTotem(null)}
            className={`relative w-[28%] sm:w-[26%] max-w-[220px] -mr-6 sm:-mr-10 z-10 p-2 rounded-2xl bg-gradient-to-b from-emerald-500/15 via-white/95 dark:via-slate-900/95 to-white/90 dark:to-slate-900/90 border border-emerald-500/25 shadow-lg transition-transform duration-300 cursor-pointer ${
              hoveredTotem === 0 || activeStick === 0
                ? "-translate-y-4 scale-105 z-40 shadow-xl"
                : "hover:-translate-y-2"
            }`}
          >
            <img
              src="/models/cabinet-wall.svg"
              alt="Gabinete para Totem de Autoatendimento de Parede Slim"
              width={220}
              height={310}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[22/31] object-contain"
            />
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 block mt-1">
              Parede Slim
            </span>
          </div>

          {/* 2. Gabinete Centro-Esquerda (Balcão Expresso - Amarelo Canário) */}
          <div
            onMouseEnter={() => setHoveredTotem(1)}
            onMouseLeave={() => setHoveredTotem(null)}
            className={`relative w-[26%] sm:w-[24%] max-w-[190px] -mr-4 sm:-mr-6 z-20 p-2 rounded-2xl bg-gradient-to-b from-amber-500/15 via-white/95 dark:via-slate-900/95 to-white/90 dark:to-slate-900/90 border border-amber-500/25 shadow-lg transition-transform duration-300 cursor-pointer ${
              hoveredTotem === 1 || activeStick === 1 || activeStick === 2
                ? "-translate-y-4 scale-105 z-40 shadow-xl"
                : "hover:-translate-y-2"
            }`}
          >
            <img
              src="/models/cabinet-countertop.svg"
              alt="Totem de Autoatendimento de Balcão Expresso"
              width={190}
              height={260}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[19/26] object-contain"
            />
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 block mt-1">
              Balcão Expresso
            </span>
          </div>

          {/* 3. Gabinete Central de Piso (Hero Principal - Azul Cobalto Oficial) */}
          <div
            onMouseEnter={() => setHoveredTotem(2)}
            onMouseLeave={() => setHoveredTotem(null)}
            className={`relative w-[34%] sm:w-[32%] max-w-[260px] z-30 p-3 rounded-3xl bg-gradient-to-b from-indigo-500/15 dark:from-indigo-600/30 via-white dark:via-slate-900 to-white dark:to-slate-900 border-2 border-indigo-500/40 shadow-2xl transition-transform duration-300 cursor-pointer ${
              hoveredTotem === 2 || activeStick === 5 || activeStick === 3
                ? "-translate-y-4 scale-105 z-40"
                : "hover:-translate-y-3"
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0058b6] text-white text-[9px] font-black tracking-wider uppercase shadow-md flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="w-2.5 h-2.5" />
              Mais Escolhido
            </div>
            <img
              src="/models/cabinet-floor.svg"
              alt="Totem de Autoatendimento de Piso Pedestal Pro"
              width={260}
              height={380}
              fetchPriority="high"
              decoding="async"
              className="w-full aspect-[13/19] object-contain"
            />
            <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 block mt-1.5">
              Piso Pedestal Pro
            </span>
          </div>

          {/* 4. Gabinete Centro-Direita (Parede - Roxo Lavanda) */}
          <div
            onMouseEnter={() => setHoveredTotem(3)}
            onMouseLeave={() => setHoveredTotem(null)}
            className={`relative w-[26%] sm:w-[24%] max-w-[190px] -ml-4 sm:-ml-6 z-20 p-2 rounded-2xl bg-gradient-to-b from-purple-500/15 via-white/95 dark:via-slate-900/95 to-white/90 dark:to-slate-900/90 border border-purple-500/25 shadow-lg transition-transform duration-300 cursor-pointer ${
              hoveredTotem === 3 || activeStick === 4
                ? "-translate-y-4 scale-105 z-40 shadow-xl"
                : "hover:-translate-y-2"
            }`}
          >
            <img
              src="/models/cabinet-wall.svg"
              alt="Gabinete de Parede para Totem Touch Screen"
              width={190}
              height={260}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[19/26] object-contain"
            />
            <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 block mt-1">
              Lavanda Touch
            </span>
          </div>

          {/* 5. Gabinete Direita Extrema (Balcão - Prata Titânio) */}
          <div
            onMouseEnter={() => setHoveredTotem(4)}
            onMouseLeave={() => setHoveredTotem(null)}
            className={`relative w-[28%] sm:w-[26%] max-w-[220px] -ml-6 sm:-ml-10 z-10 p-2 rounded-2xl bg-gradient-to-b from-slate-500/15 via-white/95 dark:via-slate-900/95 to-white/90 dark:to-slate-900/90 border border-slate-400/30 shadow-lg transition-transform duration-300 cursor-pointer ${
              hoveredTotem === 4 || activeStick === 6
                ? "-translate-y-4 scale-105 z-40 shadow-xl"
                : "hover:-translate-y-2"
            }`}
          >
            <img
              src="/models/cabinet-countertop.svg"
              alt="Gabinete de Balcão para Autoatendimento Comercial"
              width={220}
              height={310}
              loading="lazy"
              decoding="async"
              className="w-full aspect-[22/31] object-contain"
            />
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mt-1">
              Titanium Silver
            </span>
          </div>
        </div>

        {/* H1 Principal Otimizado para SEO Orgânico + Subtítulo Apple Intelligence */}
        <div className="mt-6 space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-600/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Monte seu próprio Totem e economize mais de 50%
          </div>

          <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-[#0058b6] via-[#8938b8] to-[#b35900] dark:from-[#4da3ff] dark:via-[#c77dff] dark:to-[#ffb703] bg-clip-text text-transparent tracking-tight">
            Você mesmo monta seu Totem de Autoatendimento. Simples e sob medida.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Compre <strong>apenas o gabinete para totem</strong> (usinado na Router CNC com encaixe exato para as peças que você já tem) ou leve o <strong>Gabinete + Kit Completo de Autoatendimento</strong> pronto para instalar em restaurantes, clínicas e varejo.
          </p>
        </div>

        {/* Botão Pill Azul Apple, Passo a Passo, Ver Vídeos no Instagram & Link Secundário */}
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onStartConfigurator}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#0062cc] hover:bg-[#0051a8] text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            Montar Meu Totem Agora
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#como-funciona"
            className="w-full sm:w-auto px-5 py-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-600/30 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Ver Passo a Passo (-50%)
            <ChevronRight className="w-4 h-4" />
          </a>

          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-[#1d1d1f] dark:text-white border border-rose-500/30 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
          >
            <InstagramGlyph className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Vídeos dos Totens
          </button>

          <button
            onClick={onExploreModels}
            className="w-full sm:w-auto py-2.5 px-4 text-sm sm:text-base font-semibold text-[#0058b6] dark:text-[#4da3ff] hover:text-[#004494] flex items-center justify-center gap-1 transition-colors hover:underline cursor-pointer"
          >
            Conhecer os modelos
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Especificações Rápidas em Pílula */}
        <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/10 hidden sm:flex sm:flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Economia Acima de 50%
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Só o Gabinete ou Gabinete + Kit
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-600" />
            MaDeFibra BP 15mm • Router CNC
          </div>
        </div>
      </div>

      {/* Modal de Vídeo dos Totens no Instagram */}
      <InstagramVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl="https://www.instagram.com/p/Dct5wckmKlZ/"
        productName="Totem Pro Industrial"
        title="Demonstração Real de Operação"
      />
    </section>
  );
}
