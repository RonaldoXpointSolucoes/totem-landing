"use client";

import React, { useState, useEffect } from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import {
  ShieldCheck,
  Package,
  Layers,
  FileText,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Wrench,
  AlertCircle,
  Eye,
  Edit2,
  Save,
  Plus,
  ArrowRight,
  Lock,
  ChevronRight,
  Database,
  ExternalLink,
} from "lucide-react";

interface OrderItem {
  $id: string;
  cabinet_name: string;
  color_name: string;
  monitor_name?: string;
  printer_name?: string;
  reader_name?: string;
  unit_price_cents: number;
  quantity: number;
  subtotal_cents: number;
}

interface OrderRecord {
  $id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_document: string;
  customer_email: string;
  customer_whatsapp: string;
  delivery_address_json: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  manufacturing_sheet_json?: string;
  $createdAt: string;
  items?: OrderItem[];
  payment?: {
    provider: string;
    amount_cents: number;
    status: string;
    pix_code?: string;
    paid_at?: string;
  };
}

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  target: string;
  details: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  awaiting_payment: { label: "Aguardando Pix", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: Clock },
  paid: { label: "Pago / Confirmado", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  in_production: { label: "Em Produção CNC", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: Wrench },
  ready: { label: "Pronto para Expedição", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: Package },
  shipped: { label: "Despachado / Enviado", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", icon: Truck },
  delivered: { label: "Entregue ao Cliente", color: "bg-teal-500/10 text-teal-400 border-teal-500/30", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: AlertCircle },
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navegação do painel
  const [activeTab, setActiveTab] = useState<"orders" | "catalog" | "logs">("orders");
  const [catalogSubTab, setCatalogSubTab] = useState<"models" | "colors" | "peripherals">("models");

  // Dados
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Catálogo
  const [catalogData, setCatalogData] = useState<any>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Modal de Detalhes do Pedido / Ficha CNC
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // Auditoria
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: "log_init",
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      action: "Acesso Administrativo",
      target: "Painel Totem Pro",
      details: "Sessão iniciada e conectada ao cluster Appwrite Self-Hosted",
    },
  ]);

  const addAuditLog = (action: string, target: string, details: string) => {
    setAuditLogs((prev) => [
      {
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        action,
        target,
        details,
      },
      ...prev,
    ]);
  };

  // Checar Auth ao carregar
  useEffect(() => {
    fetch("/api/admin/auth")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Carregar Pedidos
  const loadOrders = async (status = statusFilter) => {
    setIsLoadingOrders(true);
    try {
      const url = status && status !== "all" ? `/api/admin/orders?status=${status}` : `/api/admin/orders`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        setOrders(json.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Carregar Catálogo
  const loadCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await fetch("/api/admin/catalog");
      const json = await res.json();
      if (json.ok) {
        setCatalogData(json.data);
      }
    } catch (err) {
      console.error("Erro ao carregar catálogo:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
      loadCatalog();
    }
  }, [isAuthenticated]);

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();

      if (data.ok) {
        setIsAuthenticated(true);
        addAuditLog("Login", "Administrador", "Autenticado via chave mestra");
      } else {
        setLoginError(data.error || "Senha inválida.");
      }
    } catch (err: any) {
      setLoginError("Erro na conexão: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setIsAuthenticated(false);
  };

  // Atualizar Status do Pedido
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.ok) {
        addAuditLog("Atualização de Status", `Pedido #${orderId.substring(0, 8)}`, `Transição para "${newStatus}"`);
        loadOrders();
        if (selectedOrder && selectedOrder.$id === orderId) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error("Erro ao mudar status:", err);
    }
  };

  // Salvar Item do Catálogo
  const handleSaveCatalogItem = async (collectionType: string, docId: string) => {
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionType,
          documentId: docId,
          updates: editFields,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addAuditLog(
          "Ajuste Comercial de Catálogo",
          `${collectionType.toUpperCase()} - ${docId}`,
          `Campos atualizados no Appwrite: ${Object.keys(editFields).join(", ")}`
        );
        setSaveSuccessMsg(`Item ${docId} salvo com sucesso no Appwrite!`);
        setTimeout(() => setSaveSuccessMsg(""), 3500);
        setEditingItemId(null);
        setEditFields({});
        loadCatalog();
      }
    } catch (err) {
      console.error("Erro ao salvar catálogo:", err);
    }
  };

  // Filtragem de Pedidos por Busca
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_document?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q)
    );
  });

  // Tela de Carregamento inicial da Auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Validando credenciais do painel...</p>
        </div>
      </div>
    );
  }

  // 1. Tela de Login Administrativo
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Totem Pro <span className="text-indigo-400">Admin</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Gestão de Produção CNC, Preços e Catálogo Appwrite
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Chave de Acesso Administrativo
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Insira a senha do admin..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !passwordInput}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Ambiente protegido por Sessão Criptografada HTTP-Only e Appwrite Database.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Painel Administrativo Autenticado
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Topo / Header Administrativo */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">Totem Pro</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Painel Admin
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Appwrite Database Live (`totem_db`)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                loadOrders();
                loadCatalog();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
              title="Sincronizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders || isLoadingCatalog ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <a
              href="/"
              target="_blank"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Loja</span>
            </a>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navegação por Abas Principais */}
      <div className="border-b border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-2 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "orders"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Pedidos & Produção CNC</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 text-white font-bold">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "catalog"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Catálogo & Precificação</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "logs"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Auditoria & Logs</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 text-white font-bold">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Notificação de Sucesso */}
        {saveSuccessMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-3 animate-fade-in shadow-lg shadow-emerald-500/5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 1: PEDIDOS E PRODUÇÃO CNC */}
        {/* ======================================================== */}
        {activeTab === "orders" && (
          <div className="space-y-5">
            {/* Barra de Filtros e Busca */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Filtros por Status */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    loadOrders("all");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                    statusFilter === "all"
                      ? "bg-slate-200 text-slate-900"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  Todos ({orders.length})
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setStatusFilter(key);
                      loadOrders(key);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                      statusFilter === key
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900 text-slate-400 hover:bg-slate-800 border-slate-800"
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>

              {/* Campo de Busca */}
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar pedido, cliente, CPF/CNPJ..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Listagem de Pedidos */}
            {isLoadingOrders ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm">Carregando pedidos do Appwrite...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">Nenhum pedido encontrado</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Não há pedidos cadastrados com os filtros atuais. Faça uma compra no checkout da loja para visualizar aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredOrders.map((order) => {
                  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.awaiting_payment;
                  const StatusIcon = statusInfo.icon;
                  const itemsCount = order.items?.length || 0;

                  return (
                    <div
                      key={order.$id}
                      className="bg-slate-900/70 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 transition-all shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-white text-base font-mono">
                            {order.order_number}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(order.$createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300">
                          <span className="font-bold text-white">{order.customer_name}</span> •{" "}
                          <span className="text-slate-400">{order.customer_document}</span> •{" "}
                          <span className="text-slate-400">{order.customer_whatsapp}</span>
                        </div>

                        {/* Itens Gravados com Snapshot */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {order.items?.map((it, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300"
                            >
                              <strong>{it.quantity}x</strong> {it.cabinet_name} ({it.color_name})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                        <div className="text-right sm:pr-4">
                          <div className="text-[11px] text-slate-400">Total Faturado</div>
                          <div className="text-lg font-extrabold text-indigo-400">
                            {formatBRL(order.total_cents)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {/* Botão de Transição Rápida de Status */}
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.$id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                              <option key={k} value={k}>
                                Mudar: {cfg.label}
                              </option>
                            ))}
                          </select>

                          {/* Botão de Ver Ficha CNC */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ficha CNC</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: CATÁLOGO E PRECIFICAÇÃO */}
        {/* ======================================================== */}
        {activeTab === "catalog" && (
          <div className="space-y-6">
            {/* Sub-abas de Catálogo */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setCatalogSubTab("models")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  catalogSubTab === "models"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Modelos de Gabinete ({catalogData?.models?.length || 0})
              </button>
              <button
                onClick={() => setCatalogSubTab("colors")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  catalogSubTab === "colors"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Cores & Acabamentos ({catalogData?.colors?.length || 0})
              </button>
              <button
                onClick={() => setCatalogSubTab("peripherals")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  catalogSubTab === "peripherals"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Equipamentos Homologados (Monitores, Impressoras, Leitores)
              </button>
            </div>

            {isLoadingCatalog ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm">Carregando catálogo do Appwrite...</span>
              </div>
            ) : (
              <>
                {/* 1. Modelos de Gabinete */}
                {catalogSubTab === "models" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {catalogData?.models?.map((model: any) => {
                      const isEditing = editingItemId === model.$id;
                      const currentPrice = isEditing
                        ? editFields.base_price_cents ?? model.base_price_cents
                        : model.base_price_cents;

                      return (
                        <div
                          key={model.$id}
                          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-base">{model.name}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  model.active
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {model.active ? "Ativo no Site" : "Inativo"}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-3">{model.description}</p>

                            {/* Preço Base */}
                            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1">
                              <label className="text-[11px] text-slate-400 font-semibold block">
                                Preço Base (R$)
                              </label>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={currentPrice / 100}
                                  onChange={(e) =>
                                    setEditFields({
                                      ...editFields,
                                      base_price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                                    })
                                  }
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-indigo-500 rounded-lg text-white font-bold text-sm"
                                />
                              ) : (
                                <div className="text-xl font-extrabold text-indigo-400">
                                  {formatBRL(model.base_price_cents)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveCatalogItem("models", model.$id)}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Salvar</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingItemId(null);
                                    setEditFields({});
                                  }}
                                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingItemId(model.$id);
                                  setEditFields({
                                    base_price_cents: model.base_price_cents,
                                    active: model.active,
                                  });
                                }}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Ajustar Preço</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Cores & Acabamentos */}
                {catalogSubTab === "colors" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {catalogData?.colors?.map((color: any) => {
                      const isEditing = editingItemId === color.$id;
                      const currentAdj = isEditing
                        ? editFields.price_adjustment_cents ?? color.price_adjustment_cents
                        : color.price_adjustment_cents;

                      return (
                        <div
                          key={color.$id}
                          className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <span
                                className="w-6 h-6 rounded-full border border-slate-600 shadow-sm"
                                style={{ background: color.hex_reference }}
                              />
                              <div className="flex-1">
                                <h4 className="font-bold text-white text-sm">{color.name}</h4>
                                <span className="text-[10px] text-slate-500 font-mono">{color.slug}</span>
                              </div>
                            </div>

                            {/* Acréscimo Comercial */}
                            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1">
                              <label className="text-[11px] text-slate-400 font-semibold block">
                                Acréscimo Comercial (R$)
                              </label>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={currentAdj / 100}
                                  onChange={(e) =>
                                    setEditFields({
                                      ...editFields,
                                      price_adjustment_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                                    })
                                  }
                                  className="w-full px-3 py-1.5 bg-slate-900 border border-indigo-500 rounded-lg text-white font-bold text-sm"
                                />
                              ) : (
                                <div className="text-xl font-extrabold text-indigo-400">
                                  {color.price_adjustment_cents === 0
                                    ? "Sem acréscimo (Padrão)"
                                    : `+ ${formatBRL(color.price_adjustment_cents)}`}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveCatalogItem("colors", color.$id)}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Salvar Acréscimo</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingItemId(null);
                                    setEditFields({});
                                  }}
                                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingItemId(color.$id);
                                  setEditFields({
                                    price_adjustment_cents: color.price_adjustment_cents,
                                    active: color.active,
                                  });
                                }}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Ajustar Acréscimo</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Equipamentos Homologados */}
                {catalogSubTab === "peripherals" && (
                  <div className="space-y-6">
                    {/* Monitores */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        Monitores Homologados com Padrão VESA
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {catalogData?.monitors?.map((m: any) => (
                          <div key={m.$id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white">{m.display_name}</span>
                              <span className="text-[10px] text-indigo-400 font-mono">VESA {m.vesa_pattern}</span>
                            </div>
                            <p className="text-slate-400 text-[11px]">{m.notes}</p>
                            <span className="text-[10px] text-slate-500 font-mono">Cód: {m.technical_code}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Impressoras */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Impressoras Térmicas Homologadas (80mm)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {catalogData?.printers?.map((p: any) => (
                          <div key={p.$id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white">{p.display_name}</span>
                              <span className="text-[10px] text-emerald-400 font-mono">{p.paper_width_mm}mm</span>
                            </div>
                            <p className="text-slate-400 text-[11px]">{p.notes}</p>
                            <span className="text-[10px] text-slate-500 font-mono">Cód: {p.technical_code}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Leitores */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        Leitores Ópticos de Código de Barras / QR Code
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {catalogData?.readers?.map((r: any) => (
                          <div key={r.$id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white">{r.display_name}</span>
                              <span className="text-[10px] text-indigo-400 font-bold">{r.is_2d ? "1D / 2D QR" : "1D"}</span>
                            </div>
                            <p className="text-slate-400 text-[11px]">{r.notes}</p>
                            <span className="text-[10px] text-slate-500 font-mono">Cód: {r.technical_code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 3: AUDITORIA E LOGS */}
        {/* ======================================================== */}
        {activeTab === "logs" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base">Registro de Auditoria Administrativa</h3>
                <p className="text-xs text-slate-400">Rastreabilidade completa de ações e alterações comerciais.</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                {auditLogs.length} Registros
              </span>
            </div>

            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-950/80 border border-slate-800/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-800 text-slate-200">
                        {log.action}
                      </span>
                      <span className="font-bold text-indigo-400">{log.target}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{log.details}</p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: DETALHES DO PEDIDO & FICHA TÉCNICA CNC */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Ficha Técnica de Fabricação CNC
                </span>
                <h2 className="text-xl font-extrabold text-white font-mono mt-0.5">
                  {selectedOrder.order_number}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Dados do Cliente */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider text-slate-400">
                Cliente e Faturamento
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Nome:</span> {selectedOrder.customer_name}
                </div>
                <div>
                  <span className="text-slate-500">Documento:</span> {selectedOrder.customer_document}
                </div>
                <div>
                  <span className="text-slate-500">E-mail:</span> {selectedOrder.customer_email}
                </div>
                <div>
                  <span className="text-slate-500">WhatsApp:</span> {selectedOrder.customer_whatsapp}
                </div>
              </div>
            </div>

            {/* Itens Faturados com Snapshot Imutável */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
                Componentes de Fabricação (Snapshot Imutável)
              </h4>
              {selectedOrder.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center font-bold text-sm text-white">
                    <span>
                      {item.quantity}x {item.cabinet_name}
                    </span>
                    <span className="text-indigo-400">{formatBRL(item.subtotal_cents)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500">Acabamento:</span> {item.color_name}
                    </div>
                    <div>
                      <span className="text-slate-500">Monitor:</span> {item.monitor_name || "Nenhum"}
                    </div>
                    <div>
                      <span className="text-slate-500">Impressora:</span> {item.printer_name || "Nenhum"}
                    </div>
                    <div>
                      <span className="text-slate-500">Scanner Óptico:</span> {item.reader_name || "Nenhum"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagamento Pix */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 block">Status Financeiro Pix</span>
                <span className="font-bold text-emerald-400">
                  {selectedOrder.payment?.status === "paid" ? "PIX LIQUIDADO" : "AGUARDANDO PAGAMENTO"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Valor Total</span>
                <span className="text-lg font-extrabold text-white">
                  {formatBRL(selectedOrder.total_cents)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all"
            >
              Fechar Ficha Técnica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
