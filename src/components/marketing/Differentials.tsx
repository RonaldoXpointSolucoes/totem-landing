"use client";

import React from "react";
import { Badge } from "@/components/ui";
import { ShieldCheck, Cpu, Paintbrush, Lock, RefreshCw, Sparkles } from "lucide-react";

export const Differentials: React.FC = () => {
  const items = [
    {
      title: "Corte CNC Submilimétrico",
      desc: "Nenhum rasgo é feito de forma manual. Todo o chassi passa por corte laser computadorizado para ajuste perfeito do display e leitor.",
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
    },
    {
      title: "Pintura Eletrostática a Pó",
      desc: "Camada de acabamento de alta resistência contra riscos, maresia e desgaste diário em ambientes de alto fluxo.",
      icon: <Paintbrush className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: "Segurança com Chave Exclusiva",
      desc: "Fechadura traseira com chave segredo para proteção de computadores, nobreaks e equipamentos contra acessos não autorizados.",
      icon: <Lock className="w-5 h-5 text-amber-400" />,
    },
    {
      title: "Equipamentos sem Sobretaxa",
      desc: "Monitores, impressoras e leitores homologados não aumentam o valor do gabinete. O preço padrão se mantém.",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: "Ventilação Ativa & Passiva",
      desc: "Aletas de arrefecimento e pré-disposição para ventoinhas silenciosas, garantindo estabilidade térmica 24/7.",
      icon: <RefreshCw className="w-5 h-5 text-indigo-400" />,
    },
    {
      title: "Canal para Personalizações",
      desc: "Possui um monitor ou leitor fora da nossa lista? Nossa engenharia avalia e desenvolve o gabarito sob medida.",
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
    },
  ];

  return (
    <section className="py-16 md:py-24 border-t border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <Badge variant="primary" className="text-xs">
            Diferenciais de Fábrica
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engenharia pensada para quem opera no mundo real
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Qualidade industrial com foco em durabilidade, facilidade de manutenção e segurança física.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="p-3 w-fit rounded-xl bg-slate-800/60 border border-slate-700/60">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
