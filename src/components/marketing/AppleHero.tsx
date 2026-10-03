"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, ChevronRight, Check } from "lucide-react";

interface AppleHeroProps {
  onStartConfigurator: () => void;
  onExploreModels: () => void;
}

// Cores dos bastões e dos totens inspiradas no lineup do iMac
const COLOR_STICKS = [
  { name: "Verde Industrial", color: "#34c759", label: "Verde" },
  { name: "Amarelo Canário", color: "#ffd60a", label: "Amarelo" },
  { name: "Laranja Pêssego", color: "#ff9f0a", label: "Laranja" },
  { name: "Rosa Rubi Metálico", color: "#ff375f", label: "Rubi" },
  { name: "Roxo Lavanda", color: "#bf5af2", label: "Lavanda" },
  { name: "Azul Cobalto", color: "#0071e3", label: "Azul" },
  { name: "Prata Alumínio", color: "#86868b", label: "Prata" },
];

export function AppleHero({ onStartConfigurator, onExploreModels }: AppleHeroProps) {
  const [activeStick, setActiveStick] = useState<number | null>(null);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-white transition-colors duration-300">
      {/* Glow suave superior estilo Apple */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[300px] bg-gradient-to-b from-indigo-50/60 dark:from-indigo-950/20 via-transparent to-transparent pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 text-center">
        {/* Eyebrow / Nome da Linha */}
        <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2 block animate-in fade-in duration-500">
          Totem Pro
        </span>

        {/* Título Principal Fiel: "Bri[|||||||]lhante." */}
        <div className="flex items-center justify-center tracking-tight font-black text-5xl sm:text-7xl lg:text-8xl select-none my-2">
          <span>Bri</span>

          {/* Bastões Verticais Coloridos Animados */}
          <div className="inline-flex items-center gap-[3px] sm:gap-[5px] mx-1 sm:mx-1.5 self-center h-12 sm:h-16 lg:h-20">
            {COLOR_STICKS.map((stick, index) => {
              const isHovered = activeStick === index;
              return (
                <span
                  key={index}
                  onMouseEnter={() => setActiveStick(index)}
                  onMouseLeave={() => setActiveStick(null)}
                  style={{ backgroundColor: stick.color }}
                  className={`w-[6px] sm:w-[9px] lg:w-[11px] h-full rounded-full transition-all duration-300 cursor-pointer shadow-sm ${
                    isHovered
                      ? "scale-y-110 shadow-lg brightness-110"
                      : "opacity-95 hover:opacity-100"
                  }`}
                  title={stick.name}
                />
              );
            })}
          </div>

          <span>hante.</span>
        </div>

        {/* Lineup de Gabinetes em Perspectiva (Arco Multicolorido Apple) */}
        <div className="relative w-full max-w-4xl mx-auto my-6 sm:my-10">
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full flex items-end justify-center">
            {/* 1. Gabinete Esquerda (Parede - Verde / Turquesa) */}
            <div className="w-[28%] sm:w-[26%] max-w-[220px] transition-transform duration-500 hover:-translate-y-2 -mr-6 sm:-mr-10 z-10 filter drop-shadow-xl">
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 backdrop-blur-sm">
                <img
                  src="/models/cabinet-wall.svg"
                  alt="Totem de Parede Verde Menta"
                  className="w-full h-auto object-contain filter hue-rotate-[90deg]"
                />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                  Parede Slim
                </span>
              </div>
            </div>

            {/* 2. Gabinete Centro-Esquerda (Balcão - Amarelo / Dourado) */}
            <div className="w-[26%] sm:w-[24%] max-w-[190px] transition-transform duration-500 hover:-translate-y-2 -mr-4 sm:-mr-6 z-20 filter drop-shadow-xl">
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 backdrop-blur-sm">
                <img
                  src="/models/cabinet-countertop.svg"
                  alt="Totem de Balcão Amarelo Canário"
                  className="w-full h-auto object-contain filter hue-rotate-[45deg]"
                />
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-1">
                  Balcão Expresso
                </span>
              </div>
            </div>

            {/* 3. Gabinete Central de Chão (Hero Principal - Azul Cobalto Oficial) */}
            <div className="w-[34%] sm:w-[32%] max-w-[260px] transition-transform duration-500 hover:-translate-y-3 z-30 filter drop-shadow-2xl">
              <div className="relative p-3 rounded-3xl bg-gradient-to-b from-indigo-500/15 dark:from-indigo-600/30 via-white/80 dark:via-slate-900/80 to-transparent border-2 border-indigo-500/40 shadow-2xl">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0071e3] text-white text-[9px] font-black tracking-wider uppercase shadow-md">
                  Mais Escolhido
                </div>
                <img
                  src="/models/cabinet-floor.svg"
                  alt="Totem de Chão Premium Azul Cobalto"
                  className="w-full h-auto object-contain"
                />
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block mt-1.5">
                  Chão Pedestal Pro
                </span>
              </div>
            </div>

            {/* 4. Gabinete Centro-Direita (Parede - Roxo Lavanda) */}
            <div className="w-[26%] sm:w-[24%] max-w-[190px] transition-transform duration-500 hover:-translate-y-2 -ml-4 sm:-ml-6 z-20 filter drop-shadow-xl">
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20 backdrop-blur-sm">
                <img
                  src="/models/cabinet-wall.svg"
                  alt="Totem de Parede Roxo Lavanda"
                  className="w-full h-auto object-contain filter hue-rotate-[240deg]"
                />
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block mt-1">
                  Lavanda Touch
                </span>
              </div>
            </div>

            {/* 5. Gabinete Direita (Balcão - Prata Titânio) */}
            <div className="w-[28%] sm:w-[26%] max-w-[220px] transition-transform duration-500 hover:-translate-y-2 -ml-6 sm:-ml-10 z-10 filter drop-shadow-xl">
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-slate-500/10 to-transparent border border-slate-400/30 backdrop-blur-sm">
                <img
                  src="/models/cabinet-countertop.svg"
                  alt="Totem de Balcão Prata Titânio"
                  className="w-full h-auto object-contain filter grayscale"
                />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mt-1">
                  Titanium Silver
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtítulo no Estilo Apple Intelligence (Gradiente Azul -> Roxo -> Laranja) */}
        <div className="mt-6 space-y-3 max-w-xl mx-auto">
          <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-[#0071e3] via-[#af52de] to-[#ff9500] bg-clip-text text-transparent tracking-tight">
            Feito para alta precisão industrial.
          </p>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Escolha o modelo, a cor e selecione seus equipamentos homologados. Nós fabricamos o
            gabinete em aço industrial com os cortes e encaixes exatos na Router CNC.
          </p>
        </div>

        {/* Botão Pill Azul Apple & Link Secundário */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onStartConfigurator}
            className="px-8 py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <span>Configurar meu Totem</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreModels}
            className="text-sm sm:text-base font-semibold text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 transition-colors hover:underline cursor-pointer"
          >
            <span>Conhecer os modelos</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Especificações Rápidas em Pílula */}
        <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Corte CNC Submilimétrico</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Pintura Eletrostática Epóxi</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Compatibilidade VESA Universal</span>
          </div>
        </div>
      </div>
    </section>
  );
}
