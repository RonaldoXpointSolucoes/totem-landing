"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout";
import { Footer } from "@/components/marketing";
import { ConfiguratorWizard } from "@/components/configurator";
import { useCart } from "@/modules/cart/CartContext";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

function MonteSeuTotemContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, setEditingItem, editingItem } = useCart();

  const modeloParam = searchParams.get("modelo") || "cabinet-wall";
  const etapaParam = parseInt(searchParams.get("etapa") || "1", 10);
  const editParam = searchParams.get("edit");

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.START_CONFIGURATOR, {
      modelId: modeloParam,
      source: "url_route_monte_seu_totem",
    });

    if (editParam && !editingItem) {
      const itemToEdit = items.find((i) => i.id === editParam);
      if (itemToEdit) {
        setEditingItem(itemToEdit);
      }
    }
  }, [editParam, items, editingItem, setEditingItem, modeloParam]);

  return (
    <ConfiguratorWizard
      initialModelId={modeloParam}
      initialStep={etapaParam}
      onOpenCart={() => router.push("/carrinho")}
      onBackToHome={() => router.push("/")}
    />
  );
}

export default function MonteSeuTotemPage() {
  return (
    <div className="min-h-screen md:h-screen flex flex-col bg-[#fbfbfd] dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300 overflow-x-hidden">
      <Navbar />
      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#0071e3] border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-slate-500">Iniciando Configurador Pro...</p>
            </div>
          }
        >
          <MonteSeuTotemContent />
        </Suspense>
      </main>
    </div>
  );
}
