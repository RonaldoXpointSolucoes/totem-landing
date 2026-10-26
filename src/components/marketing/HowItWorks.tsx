"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import {
  LayoutGrid,
  Cpu,
  Wrench,
  PiggyBank,
  ArrowRight,
  PackageCheck,
  Sparkles,
} from "lucide-react";

export const HowItWorks: React.FC = () => {
  const router = useRouter();

  const steps = [
    {
      num: "01",
      title: "Escolha o formato do Gabinete",
      desc: "Defina entre Piso, Parede ou Balcão e escolha a cor em MaDeFibra BP 15mm (Branco TX, Preto TX ou B&W).",
      icon: <LayoutGrid className="w-5 h-5 text-[#0058b6] dark:text-indigo-400" />,
    },
    {
      num: "02",
      title: "Use suas peças ou escolha o Kit",
      desc: "Já tem monitor, impressora ou leitor? Informe os modelos para o corte exato. Não tem? Adicione nosso Kit Completo homologado.",
      icon: <Cpu className="w-5 h-5 text-cyan-700 dark:text-cyan-400" />,
    },
    {
      num: "03",
      title: "Usinagem CNC sob medida",
      desc: "Nossa Router CNC fabrica seu gabinete com furação VESA milimétrica e berços exatos para seus equipamentos — sem taxa extra.",
      icon: <Wrench className="w-5 h-5 text-amber-700 dark:text-amber-400" />,
    },
    {
      num: "04",
      title: "Encaixe simples e economize +50%",
      desc: "Você recebe o gabinete pronto: basta encaixar as peças em minutos (ou peça o totem 100% montado pela nossa fábrica!).",
      icon: <PiggyBank className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />,
    },
  ];

  const handleGoToConfigurator = (mode: "cabinet" | "kit") => {
    router.push(`/monte-seu-totem?modelo=cabinet-wall&modo=${mode}`);
  };

  return (
    <section
      id="como-funciona"
      className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800/80 bg-white dark:bg-slate-900/20 transition-colors duration-300"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho Principal Focado em "Você Mesmo Monta & Economiza +50%" */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <Badge variant="accent" className="text-xs">
            Passo a Passo: Monte Você Mesmo &amp; Economize +50%
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
            Como montar seu próprio Totem de Autoatendimento gastando menos da metade
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            O segredo dos grandes restaurantes, clínicas e redes de varejo: você não precisa pagar{" "}
            <span className="line-through text-slate-500">R$ 9.000+</span> em um totem fechado.
            Escolha como prefere montar o seu:
          </p>
        </div>

        {/* 4 Passos Visuais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative mb-14">
          {steps.map((st, idx) => (
            <div
              key={st.num}
              className="relative p-6 rounded-[24px] border border-black/5 dark:border-slate-800 bg-[#f5f5f7] dark:bg-slate-900/70 flex flex-col justify-between group hover:border-[#0071e3]/30 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-black/5 dark:border-slate-700 group-hover:scale-105 transition-transform shadow-sm">
                  {st.icon}
                </div>
                <span className="text-2xl font-black text-slate-600 dark:text-slate-400 select-none">
                  Passo {st.num}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#1d1d1f] dark:text-white mb-2">
                {st.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                {st.desc}
              </p>

              <div className="mt-auto pt-3 border-t border-black/5 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <span>Etapa {idx + 1} de 4</span>
                <span className="text-[#0058b6] dark:text-indigo-300 font-semibold">
                  Passo homologado ✓
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Comparativo das 2 Opções: Só o Gabinete vs. Gabinete + Kit Completo (com opção de Montagem) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Opção 1: Comprar Apenas o Gabinete */}
          <div className="rounded-[28px] p-6 sm:p-8 border border-black/10 dark:border-slate-800 bg-[#fbfbfd] dark:bg-slate-900/60 flex flex-col justify-between shadow-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-[#0051a8] dark:text-blue-300">
                  Opção 1 • Use o que você já tem
                </span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  A partir de R$ 950 no PIX
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-white">
                Comprar Apenas o Gabinete para Totem
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Ideal para quem já possui monitor, impressora térmica ou mini PC (ou prefere comprar as peças separadamente) e quer transformar tudo em um Totem Profissional de alto padrão.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-2">
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400 font-black shrink-0">✓</span>
                  <span>
                    <strong>Usinagem CNC sem custo adicional:</strong> recortamos as janelas exatas para o modelo da sua tela, impressora e leitor.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400 font-black shrink-0">✓</span>
                  <span>
                    <strong>Montagem DIY em 15 minutos:</strong> furação VESA pronta, suporte interno e porta traseira com chave exclusiva.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400 font-black shrink-0">✓</span>
                  <span>
                    <strong>Perfeito também para Software Houses:</strong> compre o gabinete White-Label para revender junto com o seu sistema PDV.
                  </span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleGoToConfigurator("cabinet")}
              className="mt-7 w-full py-3.5 px-5 rounded-full bg-[#0062cc] hover:bg-[#0051a8] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Configurar Apenas o Gabinete
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Opção 2: Gabinete + Kit Completo (Você monta ou Recebe 100% Montado) */}
          <div className="rounded-[28px] p-6 sm:p-8 border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/[0.06] to-transparent dark:from-emerald-950/30 dark:to-slate-900/80 flex flex-col justify-between shadow-lg relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Opção 2 • Pronto para Operar
                </span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <PackageCheck className="w-4 h-4" />
                  Economia de +50%
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-[#1d1d1f] dark:text-white">
                Gabinete + Kit Completo de Autoatendimento
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Não quer garimpar peças? Selecione nosso <strong>Kit de Montagem Homologado</strong> direto no configurador com 100% de compatibilidade garantida de fábrica.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 pt-2">
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400 font-black shrink-0">✓</span>
                  <span>
                    <strong>Hardware Completo Opcional:</strong> Computador All-in-One Touch 23.8&quot;, Impressora Térmica 80mm com guilhotina, Leitor 2D QR Code e Cabos.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400 font-black shrink-0">✓</span>
                  <span>
                    <strong>Você escolhe os itens do Kit:</strong> marque no configurador apenas os periféricos que precisar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400 font-black shrink-0">✓</span>
                  <span>
                    <strong>Quer receber 100% montado?</strong> No configurador você pode incluir o serviço opcional de{" "}
                    <strong className="text-emerald-800 dark:text-emerald-300">Montagem Industrial</strong>{" "}
                    para receber tudo instalado e testado, pronto para ligar na tomada!
                  </span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleGoToConfigurator("kit")}
              className="mt-7 w-full py-3.5 px-5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/25 transition-all cursor-pointer"
            >
              Montar Gabinete + Kit Completo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
