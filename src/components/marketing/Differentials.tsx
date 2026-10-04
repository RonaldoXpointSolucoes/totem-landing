"use client";

import React from "react";
import { Badge } from "@/components/ui";
import { ShieldCheck, Cpu, Paintbrush, Lock, RefreshCw, Sparkles } from "lucide-react";

export const Differentials: React.FC = () => {
  const items = [
    {
      title: "Corte Router CNC Sem Arrepiamento",
      desc: "Usinagem computadorizada de precisão que preserva o revestimento das bordas, garantindo furação VESA e encaixes milimétricos para monitores e periféricos.",
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
    },
    {
      title: "MaDeFibra BP 15mm de Alta Densidade",
      desc: "Painel estrutural com composição de fibras curtas selecionadas, conferindo alta rigidez, fixação reforçada de parafusos e máxima durabilidade comercial.",
      icon: <Paintbrush className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: "Segurança com Chave Exclusiva",
      desc: "Porta traseira com fechadura de chave segredo para proteção de computadores, nobreaks e equipamentos contra acessos não autorizados.",
      icon: <Lock className="w-5 h-5 text-amber-400" />,
    },
    {
      title: "Equipamentos sem Sobretaxa",
      desc: "Monitores, impressoras e leitores homologados não aumentam o valor do gabinete. O preço padrão se mantém.",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: "Padrões TX & Personalização Ilimitada",
      desc: "Disponível em Branco TX, Preto TX, Black & White ou personalização sob consulta em qualquer cor e padrão de MDF do mercado.",
      icon: <RefreshCw className="w-5 h-5 text-indigo-400" />,
    },
    {
      title: "Canal para Projetos Especiais",
      desc: "Possui um monitor ou leitor fora da nossa lista? Nossa engenharia desenvolve o gabarito sob medida na Router CNC.",
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
    },
  ];

  return (
    <section className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800/80 bg-[#fbfbfd] dark:bg-[#090a0f] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <Badge variant="primary" className="text-xs">
            Diferenciais de Fábrica
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
            Engenharia pensada para quem opera no mundo real
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Qualidade industrial com foco em durabilidade, facilidade de manutenção e segurança física.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-[24px] border border-black/5 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 backdrop-blur-sm space-y-3 shadow-sm hover:shadow-md dark:hover:border-slate-700 transition-all"
            >
              <div className="p-3 w-fit rounded-2xl bg-[#f5f5f7] dark:bg-slate-800/60 border border-black/5 dark:border-slate-700/60">
                {item.icon}
              </div>
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">{item.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
