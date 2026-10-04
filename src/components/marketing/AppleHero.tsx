"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, ChevronRight, Check } from "lucide-react";

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeStick, setActiveStick] = useState<number | null>(null);
  const [hoveredTotem, setHoveredTotem] = useState<number | null>(null);

  useEffect(() => {
    // Gatilho imediato pós-hidratação com easing cinemático Apple
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-white transition-colors duration-300">
      {/* Glow suave superior estilo Apple */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[320px] bg-gradient-to-b from-indigo-50/70 dark:from-indigo-950/25 via-transparent to-transparent pointer-events-none -z-10" />

      {/* Aura Periférica Apple Intelligence Glow que expande na abertura */}
      <div
        className={`absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] max-w-5xl h-[380px] pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] -z-10 ${
          isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0, 113, 227, 0.16) 0%, rgba(175, 82, 222, 0.13) 38%, rgba(255, 149, 0, 0.09) 68%, transparent 80%)",
          filter: "blur(54px)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 text-center">
        {/* Eyebrow / Nome da Linha com revelação suave */}
        <span
          className={`text-xs sm:text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2 block transition-all duration-700 ease-out ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
          }`}
        >
          Totem Pro
        </span>

        {/* Título Principal Fiel: "Bri[|||||||]lhante." com animação em onda sequencial */}
        <div
          className={`flex items-center justify-center tracking-tight font-black text-5xl sm:text-7xl lg:text-8xl select-none my-2 transition-all duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isLoaded
              ? "opacity-100 translate-y-0 filter-none"
              : "opacity-0 translate-y-4 blur-[8px]"
          }`}
        >
          <span>Bri</span>

          {/* Bastões Verticais Coloridos com Fan/Wave Stagger estilo piano Apple */}
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
                    transitionDelay: isLoaded ? "0ms" : `${index * 60 + 100}ms`,
                  }}
                  className={`w-[6px] sm:w-[9px] lg:w-[11px] h-full rounded-full cursor-pointer shadow-sm origin-bottom transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isLoaded ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                  } ${
                    isStickActive
                      ? "scale-y-110 shadow-lg brightness-115 -translate-y-1"
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
        <div className="relative w-full max-w-4xl mx-auto my-6 sm:my-10">
          <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full flex items-end justify-center overflow-visible">
            {/* 1. Gabinete Esquerda Extrema (Parede Slim - Verde Menta) */}
            <div
              onMouseEnter={() => setHoveredTotem(0)}
              onMouseLeave={() => setHoveredTotem(null)}
              className={`w-[28%] sm:w-[26%] max-w-[220px] -mr-6 sm:-mr-10 z-10 filter drop-shadow-xl transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                isLoaded
                  ? "translate-x-0 opacity-100 scale-100 rotate-0"
                  : "translate-x-[90%] opacity-0 scale-90 -rotate-6"
              } ${
                hoveredTotem === 0 || activeStick === 0
                  ? "-translate-y-4 scale-105 z-40 brightness-110"
                  : "hover:-translate-y-2"
              }`}
              style={{ transitionDelay: isLoaded && !hoveredTotem ? "280ms" : "0ms" }}
            >
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 backdrop-blur-sm transition-shadow duration-300">
                <img
                  src="/models/cabinet-wall.svg"
                  alt="Totem de Parede Verde Menta"
                  className="w-full h-auto object-contain filter hue-rotate-[90deg] transition-transform duration-500"
                />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                  Parede Slim
                </span>
              </div>
            </div>

            {/* 2. Gabinete Centro-Esquerda (Balcão Expresso - Amarelo Canário) */}
            <div
              onMouseEnter={() => setHoveredTotem(1)}
              onMouseLeave={() => setHoveredTotem(null)}
              className={`w-[26%] sm:w-[24%] max-w-[190px] -mr-4 sm:-mr-6 z-20 filter drop-shadow-xl transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                isLoaded
                  ? "translate-x-0 opacity-100 scale-100 rotate-0"
                  : "translate-x-[45%] opacity-0 scale-92 -rotate-3"
              } ${
                hoveredTotem === 1 || activeStick === 1 || activeStick === 2
                  ? "-translate-y-4 scale-105 z-40 brightness-110"
                  : "hover:-translate-y-2"
              }`}
              style={{ transitionDelay: isLoaded && !hoveredTotem ? "180ms" : "0ms" }}
            >
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 backdrop-blur-sm transition-shadow duration-300">
                <img
                  src="/models/cabinet-countertop.svg"
                  alt="Totem de Balcão Amarelo Canário"
                  className="w-full h-auto object-contain filter hue-rotate-[45deg] transition-transform duration-500"
                />
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-1">
                  Balcão Expresso
                </span>
              </div>
            </div>

            {/* 3. Gabinete Central de Chão (Hero Principal - Azul Cobalto Oficial) */}
            <div
              onMouseEnter={() => setHoveredTotem(2)}
              onMouseLeave={() => setHoveredTotem(null)}
              className={`w-[34%] sm:w-[32%] max-w-[260px] z-30 filter drop-shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                isLoaded
                  ? "translate-y-0 opacity-100 scale-100"
                  : "translate-y-8 opacity-0 scale-95"
              } ${
                hoveredTotem === 2 || activeStick === 5 || activeStick === 3
                  ? "-translate-y-4 scale-105 z-40 brightness-110"
                  : "hover:-translate-y-3"
              }`}
              style={{ transitionDelay: isLoaded && !hoveredTotem ? "80ms" : "0ms" }}
            >
              <div className="relative p-3 rounded-3xl bg-gradient-to-b from-indigo-500/15 dark:from-indigo-600/30 via-white/80 dark:via-slate-900/80 to-transparent border-2 border-indigo-500/40 shadow-2xl transition-all duration-300">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0071e3] text-white text-[9px] font-black tracking-wider uppercase shadow-md flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Mais Escolhido</span>
                </div>
                <img
                  src="/models/cabinet-floor.svg"
                  alt="Totem de Chão Premium Azul Cobalto"
                  className="w-full h-auto object-contain transition-transform duration-500"
                />
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block mt-1.5">
                  Chão Pedestal Pro
                </span>
              </div>
            </div>

            {/* 4. Gabinete Centro-Direita (Parede - Roxo Lavanda) */}
            <div
              onMouseEnter={() => setHoveredTotem(3)}
              onMouseLeave={() => setHoveredTotem(null)}
              className={`w-[26%] sm:w-[24%] max-w-[190px] -ml-4 sm:-ml-6 z-20 filter drop-shadow-xl transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                isLoaded
                  ? "translate-x-0 opacity-100 scale-100 rotate-0"
                  : "-translate-x-[45%] opacity-0 scale-92 rotate-3"
              } ${
                hoveredTotem === 3 || activeStick === 4
                  ? "-translate-y-4 scale-105 z-40 brightness-110"
                  : "hover:-translate-y-2"
              }`}
              style={{ transitionDelay: isLoaded && !hoveredTotem ? "180ms" : "0ms" }}
            >
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20 backdrop-blur-sm transition-shadow duration-300">
                <img
                  src="/models/cabinet-wall.svg"
                  alt="Totem de Parede Roxo Lavanda"
                  className="w-full h-auto object-contain filter hue-rotate-[240deg] transition-transform duration-500"
                />
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block mt-1">
                  Lavanda Touch
                </span>
              </div>
            </div>

            {/* 5. Gabinete Direita Extrema (Balcão - Prata Titânio) */}
            <div
              onMouseEnter={() => setHoveredTotem(4)}
              onMouseLeave={() => setHoveredTotem(null)}
              className={`w-[28%] sm:w-[26%] max-w-[220px] -ml-6 sm:-ml-10 z-10 filter drop-shadow-xl transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ${
                isLoaded
                  ? "translate-x-0 opacity-100 scale-100 rotate-0"
                  : "-translate-x-[90%] opacity-0 scale-90 rotate-6"
              } ${
                hoveredTotem === 4 || activeStick === 6
                  ? "-translate-y-4 scale-105 z-40 brightness-110"
                  : "hover:-translate-y-2"
              }`}
              style={{ transitionDelay: isLoaded && !hoveredTotem ? "280ms" : "0ms" }}
            >
              <div className="relative p-2 rounded-2xl bg-gradient-to-b from-slate-500/10 to-transparent border border-slate-400/30 backdrop-blur-sm transition-shadow duration-300">
                <img
                  src="/models/cabinet-countertop.svg"
                  alt="Totem de Balcão Prata Titânio"
                  className="w-full h-auto object-contain filter grayscale transition-transform duration-500"
                />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mt-1">
                  Titanium Silver
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtítulo no Estilo Apple Intelligence (Gradiente Azul -> Roxo -> Laranja) */}
        <div
          className={`mt-6 space-y-3 max-w-xl mx-auto transition-all duration-800 ease-out ${
            isLoaded
              ? "opacity-100 translate-y-0 filter-none"
              : "opacity-0 translate-y-4 blur-[4px]"
          }`}
          style={{ transitionDelay: isLoaded ? "420ms" : "0ms" }}
        >
          <p className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-[#0071e3] via-[#af52de] to-[#ff9500] bg-clip-text text-transparent tracking-tight">
            Feito para alta precisão industrial.
          </p>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            Escolha o modelo, o padrão e selecione seus equipamentos homologados. Nós fabricamos o
            gabinete em MaDeFibra BP 15mm de alta densidade com cortes e encaixes exatos na Router CNC.
          </p>
        </div>

        {/* Botão Pill Azul Apple & Link Secundário */}
        <div
          className={`mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-800 ease-out ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: isLoaded ? "540ms" : "0ms" }}
        >
          <button
            onClick={onStartConfigurator}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Configurar meu Totem</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreModels}
            className="w-full sm:w-auto py-2 text-sm sm:text-base font-semibold text-[#0071e3] hover:text-[#0077ed] flex items-center justify-center gap-1 transition-colors hover:underline cursor-pointer"
          >
            <span>Conhecer os modelos</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Especificações Rápidas em Pílula */}
        <div
          className={`mt-12 pt-8 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-sm text-slate-500 dark:text-slate-400 transition-all duration-800 ease-out ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: isLoaded ? "660ms" : "0ms" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>MaDeFibra BP 15mm Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Corte Router CNC Sem Arrepiamento</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Branco TX, Preto TX ou Sob Medida</span>
          </div>
        </div>
      </div>
    </section>
  );
}
