"use client";

import React, { useState, useEffect } from "react";
import { CustomerAccount } from "@/types/customer";
import { OrderDetails } from "@/types/order";
import { CustomerDashboard } from "@/components/customer/CustomerDashboard";
import { CustomerAuthModal } from "@/components/auth/CustomerAuthModal";
import { RefreshCw, ShieldCheck, ArrowRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui";
import Link from "next/link";

export default function ClientePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Checa a sessão do cliente
  const checkSession = async () => {
    try {
      const res = await fetch("/api/auth/customer/session");
      const data = await res.json();
      if (res.ok && data.ok && data.authenticated && data.customer) {
        setIsAuthenticated(true);
        setCustomer(data.customer);
        loadOrders();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  // 2. Carrega pedidos do cliente
  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch("/api/customer/orders");
      const data = await res.json();
      if (res.ok && data.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Erro ao carregar pedidos do cliente:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/customer/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setCustomer(null);
      setOrders([]);
    }
  };

  // Carregando sessão
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-8 h-8 text-[#0071e3] animate-spin" />
          <p className="text-xs font-semibold">Carregando painel de compras...</p>
        </div>
      </div>
    );
  }

  // Não autenticado -> Apresenta portal de login do cliente
  if (!isAuthenticated || !customer) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#0071e3] to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Portal do Cliente TotemPro
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Acesse com seu número do WhatsApp ou Conta Google para acompanhar o corte, montagem e envio dos seus totens.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Entrar com WhatsApp ou Google</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Link href="/" className="block">
              <button
                type="button"
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Voltar à página inicial
              </button>
            </Link>
          </div>
        </div>

        <CustomerAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            checkSession();
          }}
        />
      </div>
    );
  }

  // Autenticado -> Exibe Dashboard do Cliente
  return (
    <CustomerDashboard
      customer={customer}
      orders={orders}
      onLogout={handleLogout}
    />
  );
}
