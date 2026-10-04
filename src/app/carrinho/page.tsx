"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout";
import { Footer } from "@/components/marketing";
import { CartView } from "@/components/cart";
import { useCart } from "@/modules/cart/CartContext";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, setEditingItem } = useCart();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.VIEW_CART, {
      itemsCount: items.length,
      source: "url_route_carrinho",
    });
  }, [items.length]);

  const handleEditItem = (itemId: string) => {
    const itemToEdit = items.find((i) => i.id === itemId);
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      router.push(`/monte-seu-totem?edit=${itemId}&modelo=${itemToEdit.configuration.model.id}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <CartView
          onContinueShopping={() => router.push("/monte-seu-totem")}
          onEditItem={handleEditItem}
          onProceedToCheckout={() => router.push("/checkout")}
        />
      </main>
      <Footer />
    </div>
  );
}
