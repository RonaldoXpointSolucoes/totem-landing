"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import {
  Monitor,
  Scissors,
  PackageCheck,
  Layers,
  Wrench,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Cpu,
  TrendingDown,
} from "lucide-react";

export const HowItWorks: React.FC = () => {
  const router = useRouter();

  const steps = [
    {
      num: "01",
      title: "Escolha o formato do Gabinete",
      description:
        "Defina entre Piso, Parede ou Balcão e escolha a cor em MaDeFibra BP 15mm (Branco TX, Preto TX ou B&W).",
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
    },
    {
      num: "02",
      title: "Use suas peças ou escolha o Kit",
      description:
        "Já tem monitor, impressora ou leitor? Informe os modelos para cortarmos na medida sem taxa extra — ou adicione nosso Kit Completo.",
      icon: <Monitor className="w-5 h-5 text-cyan-400" />,
    },
    {
      num: "03",
      title: "Usinagem CNC sob medida",
      description:
        "Nossa Router CNC fabrica seu gabinete com furação VESA exata, berço de impressora 80mm, nicho de leitor e chave de segurança.",
      icon: <Scissors className="w-5 h-5 text-indigo-400" />,
    },
    {
      num: "04",
      title: "Encaixe simples e economize +50%",
      description:
        "Você recebe o gabinete pronto: basta fixar a tela no suporte VESA, posicionar a impressora e ligar os cabos. Sem mão de obra cara!",
      icon: <PackageCheck className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <section className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800/80 bg-white dark:bg-slate-950/40 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho com foco na Economia de +50% e Passo a Passo DIY */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <Badge variant="accent" className="text-xs">
            Passo a Passo: Monte Você Mesmo & Economize +50%
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight leading-tight">
            Como montar seu próprio Totem de Autoatendimento com mais de 50% de economia
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Totens prontos do mercado custam caro porque cobram caro pela montagem fechada. Aqui{" "}
            <strong className="text-[#1d1d1f] dark:text-white">
              você mesmo monta seu totem em minutos
            </strong>{" "}
            seguindo nosso passo a passo: compre{" "}
            <strong className="text-[#1d1d1f] dark:text-white">
              apenas o gabinete para as peças que você já tem
            </strong>{" "}
            ou leve o{" "}
            <strong className="text-[#1d1d1f] dark:text-white">
              Gabinete + Kit Completo
            </strong>{" "}
            com tudo que precisa.
          </p>
        </div>

        {/* Os 4 Passos Práticos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((st) => (
            <div
              key={st.num}
              className="relative p-6 rounded-[24px] border border-black/5 dark:border-slate-800 bg-[#f5f5f7] dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-black/5 dark:border-slate-700/60 shadow-sm">
                    {st.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-400 dark:text-slate-700 select-none">
                    Passo {st.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white mb-2">
                  {st.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {st.description}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-black/5 dark:border-slate-800/60 flex items-center gap-1.5 text-[11px] text-[#0071e3] dark:text-indigo-400 font-semibold">
                Passo homologado ✓
              </div>
            </div>
          ))}
        </div>

        {/* Comparativo das 2 Formas de Comprar: Só o Gabinete vs. Gabinete + Kit Completo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Opção 1: Apenas o Gabinete */}
          <div className="rounded-[28px] p-6 sm:p-8 border border-black/10 dark:border-slate-800 bg-[#fbfbfd] dark:bg-slate-900/80 flex flex-col justify-between shadow-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-[#0071e3] dark:text-blue-400 border border-blue-500/20">
                  Opção 1 • Use o que você já tem
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  A partir de R$ 950 no PIX
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-[#0071e3] dark:text-blue-400">
                  <Wrench className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-white">
                  Comprar Apenas o Gabinete
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Ideal se você já possui monitor touch, impressora térmica ou leitor de código, ou prefere comprar cada peça separadamente.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Recortes em Router CNC feitos sob medida para as suas peças sem custo extra</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Suporte padrão VESA 75/100, berço para impressora 80mm e porta com chave</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Basta encaixar seus equipamentos no gabinete e ligar na tomada</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-black/5 dark:border-slate-800">
              <button
                onClick={() => router.push("/monte-seu-totem?modelo=cabinet-wall")}
                className="w-full py-3.5 px-5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Configurar Apenas o Gabinete</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Opção 2: Gabinete + Kit Completo */}
          <div className="rounded-[28px] p-6 sm:p-8 border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/60 via-white to-blue-50/40 dark:from-emerald-950/25 dark:via-slate-900 dark:to-indigo-950/25 flex flex-col justify-between shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Opção 2 • Solução Completa Pronta
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Mais de 50% de Economia
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-white">
                  Comprar Gabinete + Kit Completo
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Não tem nenhum equipamento ainda? Selecione a opção{" "}
                <strong>Kit de Montagem</strong> na Etapa 3 do configurador e receba tudo homologado:
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-1">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Gabinete em MaDeFibra BP 15mm (Piso, Parede ou Balcão) com chave traseira</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Computador All-in-One Touch Screen 23.8&quot; + Impressora Térmica 80mm + Leitor 2D</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Economia superior a 50% comparado a totens prontos tradicionais do mercado</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-emerald-500/20">
              <button
                onClick={() => router.push("/monte-seu-totem?modelo=cabinet-floor")}
                className="w-full py-3.5 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <span>Montar Gabinete + Kit Completo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
