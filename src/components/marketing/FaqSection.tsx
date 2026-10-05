"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui";
import { ChevronDown, HelpCircle, Sparkles, MessageSquare } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";
import { siteConfig } from "@/config/site";
import { FAQ_DATA, FaqItem } from "@/config/faqData";
export type { FaqItem };

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    const isOpening = openIndex !== index;
    setOpenIndex(isOpening ? index : null);
    if (isOpening) {
      trackEvent(ANALYTICS_EVENTS.VIEW_FAQ, {
        questionIndex: index,
        question: FAQ_DATA[index].question,
      });
    }
  };

  return (
    <section id="faq" className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800/80 bg-white dark:bg-[#090a0f] transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <Badge variant="primary" className="text-xs">
            <HelpCircle className="w-3.5 h-3.5 mr-1" />
            Tira-Dúvidas Frequentes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
            Perguntas Frequentes sobre Gabinetes para Totem
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Tudo o que você precisa saber sobre especificações técnicas, compatibilidade de equipamentos e prazos de fabricação.
          </p>
        </div>

        {/* Lista de Acordeões com acessibilidade semântica */}
        <div className="space-y-3 max-w-3xl mx-auto" role="region" aria-label="Perguntas Frequentes">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-[#f5f5f7] dark:bg-slate-900/90 border-[#0071e3]/40 dark:border-cyan-500/40 shadow-sm"
                    : "bg-white dark:bg-slate-900/40 border-black/5 dark:border-slate-800 hover:border-black/15 dark:hover:border-slate-700"
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                      {item.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#1d1d1f] dark:text-white leading-snug">
                      {item.question}
                    </h3>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#0071e3] dark:text-cyan-400" : ""
                    }`}
                  />
                </button>

                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-question-${idx}`}
                  className={`transition-all duration-300 ease-in-out px-5 sm:px-6 pb-6 pt-0 ${
                    isOpen ? "block opacity-100" : "hidden opacity-0"
                  }`}
                >
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1 sm:pl-2 border-l-2 border-[#0071e3]/60 dark:border-cyan-400/60">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Dúvida Adicional */}
        <div className="mt-12 text-center">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">
            Ainda tem alguma dúvida específica sobre o seu projeto?
          </p>
          <a
            href={siteConfig.links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, { source: "faq_bottom_cta" })
            }
            className="inline-flex items-center flex-wrap justify-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 active:scale-95 transition-all group"
          >
            <MessageSquare className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
            <span>Falar com Engenheiro no WhatsApp</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-emerald-700/60 border border-emerald-400/30 text-emerald-50 font-bold">
              {siteConfig.links.whatsappDisplay}
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};
