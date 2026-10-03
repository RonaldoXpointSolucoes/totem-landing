"use client";

import React from "react";
import Image from "next/image";
import { Button, Badge } from "@/components/ui";
import { Sparkles, ArrowRight, ShieldCheck, Cpu, ChevronDown } from "lucide-react";

interface HeroProps {
  onStartConfigurator: () => void;
  onExploreModels: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartConfigurator, onExploreModels }) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-28">
      {/* Background Glows Industriais */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/15 to-transparent blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Coluna Texto / Copywriting Persuasivo */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2">
            <Badge variant="accent" className="py-1 px-3.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Engenharia CNC Sob Medida
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Seu Totem. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-white bg-clip-text text-transparent">
              Do seu jeito.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            Escolha o modelo, a cor e informe seus equipamentos homologados. Nós fabricamos o gabinete
            em aço industrial com os cortes e encaixes exatos para a sua operação.
          </p>

          {/* CTAs de Conversão */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartConfigurator}
              className="w-full sm:w-auto shadow-indigo-600/30 shadow-xl group"
            >
              Montar meu Totem
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={onExploreModels}
              className="w-full sm:w-auto"
            >
              Conhecer os Modelos
              <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
            </Button>
          </div>

          {/* Destaques Rápidos */}
          <div className="pt-6 grid grid-cols-3 gap-3 border-t border-slate-800/80 max-w-md mx-auto lg:mx-0">
            <div>
              <p className="text-xs text-slate-400">Precisão</p>
              <p className="text-sm font-semibold text-slate-200">Submilimétrica</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Acabamento</p>
              <p className="text-sm font-semibold text-slate-200">Eletrostático</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Equipamentos</p>
              <p className="text-sm font-semibold text-slate-200">Sem Custo Extra</p>
            </div>
          </div>
        </div>

        {/* Coluna Visual do Produto (Render Principal) */}
        <div className="flex-1 w-full max-w-md lg:max-w-none flex justify-center">
          <div className="relative w-full aspect-[4/5] max-w-[420px] rounded-3xl p-6 glass-panel border border-slate-700/60 shadow-2xl flex items-center justify-center group overflow-hidden">
            {/* Efeito Glow Interno */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-cyan-500/10 opacity-70 pointer-events-none" />

            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img
                src="/models/cabinet-floor.svg"
                alt="Gabinete de Chão para Totem de Autoatendimento"
                className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(79,70,229,0.35)] transition-transform duration-500 group-hover:scale-105"
              />

              {/* Tag Flutuante de Produto */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[11px] text-slate-400">Gabinete em Destaque</p>
                  <p className="text-xs font-bold text-white">Totem de Chão Premium</p>
                </div>
                <span className="text-xs font-bold text-indigo-400">A partir de R$ 1.490</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
