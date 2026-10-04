"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout";
import { Footer, ModelsSection } from "@/components/marketing";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { CABINET_MODELS } from "@/modules/catalog/catalogData";
import { formatBRL } from "@/modules/pricing/pricingEngine";

export default function ModelosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        {/* Hero da Página de Modelos */}
        <div className="pt-12 pb-8 max-w-4xl mx-auto px-4 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0071e3] dark:text-cyan-400">
            Linha Industrial Totem Pro
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#1d1d1f] dark:text-white">
            Modelos de Gabinete para Totem
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Gabinetes de chão, balcão e parede projetados para estabilidade mecânica, usinagem CNC milimétrica e facilidade de acesso técnico.
          </p>
        </div>

        {/* Seção dos Modelos */}
        <ModelsSection
          onSelectModelToConfigure={(modelId) =>
            router.push(`/monte-seu-totem?modelo=${modelId}`)
          }
        />

        {/* CTA Rápido */}
        <section className="py-14 bg-blue-50/50 dark:bg-slate-900/40 border-t border-black/5 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white">
              Precisa de um modelo adaptado ou medidas exclusivas?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              Nossa equipe de engenharia desenvolve usinagens sob medida para o hardware exato da sua empresa.
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push("/monte-seu-totem")}
                className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Iniciar Configuração no Totem Pro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
