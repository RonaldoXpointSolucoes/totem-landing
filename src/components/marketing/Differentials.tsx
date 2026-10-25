"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui";
import {
  ShieldCheck,
  Cpu,
  Paintbrush,
  Lock,
  RefreshCw,
  Sparkles,
  Utensils,
  ShoppingCart,
  Stethoscope,
  Briefcase,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

export const Differentials: React.FC = () => {
  const router = useRouter();

  const segments = [
    {
      badge: "Food Service & Gastronomia",
      title: "Restaurantes, Hamburguerias, Pizzarias, Açaí e Bares",
      desc: "Elimine filas no horário de pico e aumente o ticket médio em até 30% com sugestões automáticas na tela. Monte seu totem com mais de 50% de economia.",
      icon: <Utensils className="w-5 h-5 text-amber-500" />,
      ctaText: "Configurar p/ Gastronomia",
      model: "cabinet-floor",
    },
    {
      badge: "Varejo & Self-Checkout",
      title: "Mercados Autônomos, Condomínios, Padarias e Lojas",
      desc: "Gabinetes compactos de Parede, Balcão ou Piso com encaixe para leitor de código de barras 2D, impressora 80mm e suporte para PinPad/TEF.",
      icon: <ShoppingCart className="w-5 h-5 text-emerald-500" />,
      ctaText: "Configurar Self-Checkout",
      model: "cabinet-wall",
    },
    {
      badge: "Saúde, Senhas & Check-in",
      title: "Clínicas, Laboratórios, Recepção, Hotéis e Eventos",
      desc: "Agilize a triagem de pacientes, emissão de senhas de atendimento e check-in expresso com estética corporativa premium em MaDeFibra BP 15mm.",
      icon: <Stethoscope className="w-5 h-5 text-cyan-500" />,
      ctaText: "Configurar p/ Recepção",
      model: "cabinet-countertop",
    },
    {
      badge: "B2B • Revenda & Parcerias",
      title: "Software Houses (PDV/ERP) e Automação Comercial",
      desc: "Já tem o software ou os periféricos em estoque? Compre apenas o gabinete White-Label a partir de R$ 950 no PIX para revender ou destravar a implantação no seu cliente.",
      icon: <Briefcase className="w-5 h-5 text-indigo-500" />,
      ctaText: "Cotar p/ Revenda ou Uso",
      model: "cabinet-wall",
    },
  ];

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
      title: "Padrões TX & White-Label para Revenda",
      desc: "Disponível em Branco TX, Preto TX ou Black & White sem marcas externas concorrentes — perfeito tanto para uso próprio quanto para revendedores e integradores.",
      icon: <RefreshCw className="w-5 h-5 text-indigo-400" />,
    },
    {
      title: "Canal para Projetos Especiais e Lotes",
      desc: "Possui um monitor fora da lista ou deseja comprar múltiplas unidades para franquia ou software house? Nossa engenharia desenvolve o gabarito sob medida.",
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
    },
  ];

  return (
    <section className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800/80 bg-[#fbfbfd] dark:bg-[#090a0f] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 space-y-20">
        {/* Bloco 1: Segmentos que utilizam e Revenda / Software Houses */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="accent" className="text-xs">
              Para Uso Próprio ou Revenda B2B
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
              Projetado para o seu segmento de atuação
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Seja para modernizar o atendimento do seu negócio ou para integrar e revender totens aos seus clientes de software e automação comercial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {segments.map((seg, i) => (
              <div
                key={i}
                className="p-6 sm:p-7 rounded-[28px] border border-black/5 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#f5f5f7] dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {seg.badge}
                    </span>
                    <div className="p-2.5 rounded-xl bg-[#f5f5f7] dark:bg-slate-800/80">
                      {seg.icon}
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white">
                    {seg.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {seg.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-black/5 dark:border-slate-800/60 flex items-center justify-between gap-3">
                  <button
                    onClick={() => router.push(`/monte-seu-totem?modelo=${seg.model}`)}
                    className="text-xs sm:text-sm font-bold text-[#0071e3] dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{seg.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {i === 3 && (
                    <a
                      href={siteConfig.links.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, { source: "b2b_reseller_card" })
                      }
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Falar com Comercial</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 2: Diferenciais de Fábrica */}
        <div>
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
      </div>
    </section>
  );
};
