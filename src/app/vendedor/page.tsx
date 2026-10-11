"use client";

import React, { useState, useEffect } from "react";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { SellerDashboard } from "@/components/seller/SellerDashboard";
import { siteConfig } from "@/config/site";
import { Tag, RefreshCw, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";

export default function SellerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sellerData, setSellerData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loginError, setLoginError] = useState("");

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();

      if (data.ok && data.authenticated) {
        setIsAuthenticated(true);
        loadSellerOrders();
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  const loadSellerOrders = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch("/api/seller/orders");
      const json = await res.json();

      if (json.ok) {
        setSellerData(json.seller);
        setMetrics(json.metrics);
        setOrders(json.orders || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do vendedor:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setSellerData(null);
  };

  // Carregando verificação de sessão
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-sm font-semibold">Verificando credenciais Google...</span>
      </div>
    );
  }

  // 1. Tela de Login do Vendedor / Influenciador
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-4">
              <Tag className="w-8 h-8 text-white" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal de Influenciadores & Vendedores</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Totem Pro <span className="text-cyan-400">Vendedor</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs">
              Acesse seu painel com sua conta do Google para consultar suas comissões, vendas e cupons.
            </p>
          </div>

          <div className="space-y-4">
            <GoogleLoginButton
              onSuccess={(user) => {
                setIsAuthenticated(true);
                loadSellerOrders();
              }}
              onError={(err) => setLoginError(err)}
              buttonText="Continuar com o Google"
            />

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Acesso Restrito por Whitelist</span>
            </div>
            <p>
              Apenas contas Google credenciadas pela administração da Totem Pro possuem acesso. Se ainda não possui cadastro, solicite sua liberação.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>TotemPro Engenharia</span>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-[10px] font-mono text-slate-300">
              <span>v{siteConfig.version}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Dashboard do Vendedor Autenticado
  if (isLoadingData || !sellerData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-sm font-semibold">Carregando painel do vendedor...</span>
      </div>
    );
  }

  return (
    <SellerDashboard
      seller={sellerData}
      metrics={metrics}
      orders={orders}
      onLogout={handleLogout}
    />
  );
}
