"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AppleHero,
  AppleBentoSection,
  ModelsSection,
  HowItWorks,
  Differentials,
  FaqSection,
  SeoAuthoritySection,
  Footer,
} from "@/components/marketing";
import { Navbar } from "@/components/layout";
import { Badge } from "@/components/ui";
import { Sparkles } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

/**
 * Componente isolado apenas para redirecionamento de links legados (?view=),
 * permitindo que 100% do conteúdo da Home seja pré-renderizado no servidor (SSR) para SEO e LCP!
 */
function LegacyViewRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const legacyView = searchParams.get("view");
    if (legacyView === "configurator") {
      router.replace("/monte-seu-totem");
    } else if (legacyView === "cart") {
      router.replace("/carrinho");
    } else if (legacyView === "checkout") {
      router.replace("/checkout");
    }
  }, [searchParams, router]);

  return null;
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.VIEW_HOME, { page: "landing" });
  }, []);

  const handleStartConfigurator = (modelId?: string) => {
    trackEvent(ANALYTICS_EVENTS.START_CONFIGURATOR, {
      modelId: modelId || "cabinet-wall",
      source: "navigation_action",
    });
    const target = modelId ? `/monte-seu-totem?modelo=${modelId}` : "/monte-seu-totem?modelo=cabinet-wall";
    router.push(target);
  };

  const handleExploreModels = () => {
    const el = document.getElementById("modelos");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300">
      <Suspense fallback={null}>
        <LegacyViewRedirect />
      </Suspense>

      {/* Top Navbar Compartilhado */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Principal com H1 Semântico e LCP Instantâneo */}
        <AppleHero
          onStartConfigurator={() => handleStartConfigurator("cabinet-wall")}
          onExploreModels={handleExploreModels}
        />

        {/* Bento Section Apple (Cards de segmentos e busca de periféricos) */}
        <AppleBentoSection
          onStartConfigurator={() => handleStartConfigurator("cabinet-wall")}
        />

        {/* Modelos de Totem de Autoatendimento */}
        <ModelsSection
          onSelectModelToConfigure={(modelId) => handleStartConfigurator(modelId)}
        />

        <div id="como-funciona">
          <HowItWorks />
        </div>

        <div id="diferenciais">
          <Differentials />
        </div>

        <div id="faq">
          <FaqSection />
        </div>

        {/* Guia de Autoridade Semântica SEO, Tabela Comparativa de Preços e Silo de Links */}
        <SeoAuthoritySection />

        {/* CTA Final da Landing Page */}
        <section className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800 bg-gradient-to-b from-transparent to-blue-50/50 dark:to-indigo-950/20 transition-colors">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <Badge variant="accent" className="text-xs">
              Inicie sua Produção
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
              Pronto para fabricar seu Totem sob medida?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
              Escolha o gabinete, personalize a cor e informe os equipamentos que você já utiliza.
              Calculamos o orçamento em tempo real sem surpresas.
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleStartConfigurator("cabinet-wall")}
                className="px-8 py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-500/25 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                <span>Abrir o Configurador Agora</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
