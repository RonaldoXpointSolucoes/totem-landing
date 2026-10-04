"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout";
import { Footer, FaqSection } from "@/components/marketing";
import { ArrowRight, Sparkles } from "lucide-react";

export default function FaqPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <div className="pt-12 pb-4 max-w-4xl mx-auto px-4 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0071e3] dark:text-cyan-400">
            Perguntas Frequentes
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#1d1d1f] dark:text-white">
            Central de Dúvidas
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Esclareça suas dúvidas técnicas, comerciais e de fabricação sobre os gabinetes Totem Pro.
          </p>
        </div>

        <FaqSection />

        <div className="py-14 text-center border-t border-black/5 dark:border-slate-800">
          <button
            onClick={() => router.push("/monte-seu-totem")}
            className="px-8 py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-500/25 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>Configurar meu Totem</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
