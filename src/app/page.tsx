"use client";

import React, { useState, useRef, useEffect } from "react";
import { Hero, AppleHero, AppleBentoSection, ModelsSection, HowItWorks, Differentials, Footer } from "@/components/marketing";
import { ConfiguratorWizard } from "@/components/configurator";
import { CartView } from "@/components/cart";
import { CheckoutView } from "@/components/checkout";
import { CartProvider, useCart } from "@/modules/cart/CartContext";
import { Badge, Button, ThemeToggle } from "@/components/ui";
import { useTheme } from "@/lib/theme/ThemeContext";
import { Cpu, ArrowRight, ShoppingCart, Sparkles, Layers } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

function MainAppContent() {
  const [viewMode, setViewMode] = useState<"landing" | "configurator" | "cart" | "checkout">("landing");
  const [selectedModelId, setSelectedModelId] = useState<string>("cabinet-floor");
  const { totalItems, setEditingItem, items } = useCart();
  const { theme } = useTheme();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.VIEW_HOME, { page: "landing" });
  }, []);

  const handleStartConfigurator = (modelId?: string) => {
    setEditingItem(null); // Limpa edição anterior para nova configuração
    const chosenModel = modelId || selectedModelId;
    if (modelId) {
      setSelectedModelId(modelId);
    }
    trackEvent(ANALYTICS_EVENTS.START_CONFIGURATOR, {
      modelId: chosenModel,
      source: "navigation_action",
    });
    setViewMode("configurator");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditCartItem = (itemId: string) => {
    const itemToEdit = items.find((i) => i.id === itemId);
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setSelectedModelId(itemToEdit.configuration.model.id);
      setViewMode("configurator");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleExploreModels = () => {
    const el = document.getElementById("modelos");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-black/5 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => setViewMode("landing")}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0071e3] to-cyan-400 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#1d1d1f] dark:text-white leading-none">
                TOTEM<span className="text-[#0071e3] dark:text-cyan-400">PRO</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                X-Point Engenharia
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <button
              onClick={() => {
                setViewMode("landing");
                handleExploreModels();
              }}
              className="hover:text-[#0071e3] dark:hover:text-white transition-colors"
            >
              Modelos
            </button>
            <button
              onClick={() => {
                setViewMode("landing");
                document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-[#0071e3] dark:hover:text-white transition-colors"
            >
              Como Funciona
            </button>
            <button
              onClick={() => {
                setViewMode("landing");
                document.getElementById("diferenciais")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-[#0071e3] dark:hover:text-white transition-colors"
            >
              Diferenciais
            </button>
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Alternador de Tema Claro (Apple) / Escuro */}
            <ThemeToggle />

            {/* Botão de Carrinho com Badge Reativo */}
            <button
              onClick={() => setViewMode("cart")}
              className={`relative p-2.5 rounded-full border transition-all flex items-center justify-center ${
                viewMode === "cart"
                  ? "border-[#0071e3] bg-blue-50 dark:bg-indigo-950/40 text-[#0071e3] dark:text-indigo-300"
                  : "border-black/10 dark:border-slate-800 bg-[#f5f5f7] dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-slate-700"
              }`}
              title="Visualizar Carrinho"
              aria-label="Carrinho de Compras"
            >
              <ShoppingCart className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0071e3] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-in zoom-in-50">
                  {totalItems}
                </span>
              )}
            </button>

            {viewMode === "configurator" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("landing")}
              >
                Voltar à Página Inicial
              </Button>
            ) : viewMode === "cart" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStartConfigurator()}
                className="font-bold text-xs"
              >
                Montar Outro Totem
              </Button>
            ) : viewMode === "checkout" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("cart")}
              >
                Voltar ao Carrinho
              </Button>
            ) : (
              <button
                onClick={() => handleStartConfigurator()}
                className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Montar meu Totem</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Alternância de Telas */}
      {viewMode === "landing" ? (
        <main className="flex-1">
          {/* Exibição do Hero Temático: Tema Claro (Apple iMac Fiel) ou Tema Escuro */}
          {theme === "light" ? (
            <AppleHero
              onStartConfigurator={() => handleStartConfigurator("cabinet-floor")}
              onExploreModels={handleExploreModels}
            />
          ) : (
            <Hero
              onStartConfigurator={() => handleStartConfigurator("cabinet-floor")}
              onExploreModels={handleExploreModels}
            />
          )}

          {/* Bento Section Apple (Print 2 & 3 com cards arredondados e busca de periféricos) */}
          <AppleBentoSection
            onStartConfigurator={() => handleStartConfigurator("cabinet-floor")}
          />

          {/* Modelos de Totem */}
          <ModelsSection
            onSelectModelToConfigure={(modelId) => handleStartConfigurator(modelId)}
          />

          <div id="como-funciona">
            <HowItWorks />
          </div>

          <div id="diferenciais">
            <Differentials />
          </div>

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
                  onClick={() => handleStartConfigurator("cabinet-floor")}
                  className="px-8 py-3.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-500/25 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Abrir o Configurador Agora</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      ) : viewMode === "configurator" ? (
        <main className="flex-1">
          <ConfiguratorWizard
            initialModelId={selectedModelId}
            onOpenCart={() => setViewMode("cart")}
            onBackToHome={() => setViewMode("landing")}
          />
        </main>
      ) : viewMode === "cart" ? (
        <main className="flex-1">
          <CartView
            onContinueShopping={() => handleStartConfigurator()}
            onEditItem={handleEditCartItem}
            onProceedToCheckout={() => setViewMode("checkout")}
          />
        </main>
      ) : (
        <main className="flex-1">
          <CheckoutView
            onBackToCart={() => setViewMode("cart")}
            onOrderCompleted={() => setViewMode("landing")}
          />
        </main>
      )}
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <CartProvider>
      <MainAppContent />
    </CartProvider>
  );
}
