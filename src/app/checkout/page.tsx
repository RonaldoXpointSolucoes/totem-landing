"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout";
import { Footer } from "@/components/marketing";
import { CheckoutView } from "@/components/checkout";
import { useCart } from "@/modules/cart/CartContext";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, isInitialized } = useCart();
  const hasTrackedBeginCheckoutRef = useRef(false);

  useEffect(() => {
    if (!isInitialized || items.length === 0) return;
    if (!hasTrackedBeginCheckoutRef.current) {
      hasTrackedBeginCheckoutRef.current = true;
      trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
        totalItems: items.length,
        source: "url_route_checkout",
      });
    }
  }, [isInitialized, items.length]);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <CheckoutView
          onBackToCart={() => router.push("/carrinho")}
          onOrderCompleted={() => router.push("/")}
        />
      </main>
      <Footer />
    </div>
  );
}
