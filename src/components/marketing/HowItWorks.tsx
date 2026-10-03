"use client";

import React from "react";
import { Badge } from "@/components/ui";
import { Monitor, Scissors, PackageCheck, Layers } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "Escolha o gabinete",
      description: "Selecione o formato ideal para seu estabelecimento: Parede, Chão ou Balcão e defina a cor.",
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
    },
    {
      num: "02",
      title: "Informe seus equipamentos",
      description: "Selecione seu monitor, impressora térmica e leitor. Eles definem as aberturas sem encarecer o gabinete.",
      icon: <Monitor className="w-5 h-5 text-cyan-400" />,
    },
    {
      num: "03",
      title: "Nós preparamos os encaixes",
      description: "Nossa fábrica CNC corta a chapa de aço a laser com furação VESA e encaixes sob medida para suas marcas.",
      icon: <Scissors className="w-5 h-5 text-indigo-400" />,
    },
    {
      num: "04",
      title: "Receba pronto para instalar",
      description: "Gabinete entregue com pintura eletrostática, chave de segurança e suporte para montagem rápida.",
      icon: <PackageCheck className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <section className="py-16 md:py-24 border-t border-slate-800/80 bg-slate-950/40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <Badge variant="accent" className="text-xs">
            Processo Produtivo Descomplicado
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Como funciona seu pedido sob medida
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Você não precisa de projetos CAD complexos. Nós já temos os templates homologados.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => (
            <div
              key={st.num}
              className="relative p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    {st.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-700 select-none">{st.num}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{st.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {st.description}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold">
                Passo homologado ✓
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
