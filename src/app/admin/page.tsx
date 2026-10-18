"use client";

import React, { useState, useEffect } from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { siteConfig } from "@/config/site";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { MarketingSettingsManager } from "@/components/admin/MarketingSettingsManager";
import { TeamManager } from "@/components/admin/TeamManager";
import { VoucherManager } from "@/components/admin/VoucherManager";
import { CustomersManager } from "@/components/admin/CustomersManager";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
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
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Share2,
  Tag,
  MapPin,
  CreditCard,
  QrCode,
  Copy,
  MessageCircle,
  Printer,
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

interface ShippingMethodInfo {
  id?: string;
  name: string;
  carrier?: string;
  priceCents: number;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
}

interface ParsedDeliveryAddress {
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  shippingMethod?: ShippingMethodInfo | null;
  paymentMethod?: "pix" | "credit_card";
  couponCode?: string | null;
  discountCents?: number;
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
  delivery_address?: ParsedDeliveryAddress | null;
  shipping_method?: ShippingMethodInfo | null;
  manufacturing_sheets?: any[];
  coupon_code?: string | null;
  discount_cents?: number;
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
    payment_method?: "pix" | "credit_card" | string | null;
    gateway_payment_id?: string | null;
    gateway_status?: string | null;
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navegação do painel
  const [activeTab, setActiveTab] = useState<"orders" | "catalog" | "vouchers" | "customers" | "analytics" | "marketing" | "team" | "logs">("orders");
  const [catalogSubTab, setCatalogSubTab] = useState<"models" | "colors" | "peripherals">("models");

  // Dados
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Analytics de Funil
  const [funnelData, setFunnelData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Catálogo
  const [catalogData, setCatalogData] = useState<any>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Modal de Detalhes do Pedido / Ficha CNC
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [copiedAddressId, setCopiedAddressId] = useState<string | null>(null);

  const getOrderAddress = (order: OrderRecord): ParsedDeliveryAddress | null => {
    if (order.delivery_address) return order.delivery_address;
    try {
      if (order.delivery_address_json) {
        return JSON.parse(order.delivery_address_json);
      }
    } catch {}
    return null;
  };

  const getOrderShipping = (order: OrderRecord): ShippingMethodInfo => {
    if (order.shipping_method) return order.shipping_method;
    const addr = getOrderAddress(order);
    if (addr?.shippingMethod) return addr.shippingMethod;
    if (order.shipping_cents > 0) {
      return {
        name: "Transportadora / Correios (Frete Contratado)",
        carrier: "Logística Homologada",
        priceCents: order.shipping_cents,
      };
    }
    return {
      name: "Retirada na Fábrica / Frete Isento",
      carrier: "X-Point Engenharia (SP)",
      priceCents: 0,
    };
  };

  const getOrderPaymentMethod = (order: OrderRecord): "pix" | "credit_card" => {
    const addr = getOrderAddress(order);
    const raw = order.payment?.payment_method || addr?.paymentMethod || "pix";
    return raw === "credit_card" ? "credit_card" : "pix";
  };

  const getOrderSheets = (order: OrderRecord): any[] => {
    if (Array.isArray(order.manufacturing_sheets) && order.manufacturing_sheets.length > 0) {
      return order.manufacturing_sheets;
    }
    try {
      if (order.manufacturing_sheet_json) {
        const parsed = JSON.parse(order.manufacturing_sheet_json);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  };

  const formatFullAddressText = (addr: ParsedDeliveryAddress | null): string => {
    if (!addr || !addr.street) return "Endereço não informado";
    const comp = addr.complement ? ` (${addr.complement})` : "";
    const neigh = addr.neighborhood ? ` - Bairro ${addr.neighborhood}` : "";
    const cityState = addr.city ? ` - ${addr.city}/${addr.state || "SP"}` : "";
    const cep = addr.cep ? ` - CEP: ${addr.cep}` : "";
    return `${addr.street}, nº ${addr.number || "S/N"}${comp}${neigh}${cityState}${cep}`;
  };

  const handleCopyAddress = (orderId: string, addr: ParsedDeliveryAddress | null, customerName?: string) => {
    const text = `${customerName ? `Destinatário: ${customerName}\n` : ""}${formatFullAddressText(addr)}`;
    navigator.clipboard.writeText(text);
    setCopiedAddressId(orderId);
    setTimeout(() => setCopiedAddressId(null), 2500);
  };

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

  // Checar Auth ao carregar (sessão Google ou legacy password)
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.authenticated) {
          if (data.user?.role === "seller") {
            window.location.href = "/vendedor";
            return;
          }
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          return;
        }

        // Fallback para checar legacy admin token
        return fetch("/api/admin/auth")
          .then((res) => res.json())
          .then((legacyData) => {
            if (legacyData.ok && legacyData.authenticated) {
              setIsAuthenticated(true);
              setCurrentUser({ name: "Administrador Root", email: "admin@totempro.com.br", role: "admin" });
            } else {
              setIsAuthenticated(false);
            }
          });
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

  // Carregar Telemetria de Funil & Abandono
  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch("/api/analytics/funnel");
      const json = await res.json();
      if (json.ok) {
        setFunnelData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar telemetria de funil:", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
      loadCatalog();
      loadAnalytics();
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
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await fetch("/api/admin/auth", { method: "DELETE" });
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
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

          {/* Login Oficial com Google & Whitelist */}
          <div className="space-y-4 mb-5">
            <GoogleLoginButton
              onSuccess={(user) => {
                if (user.role === "seller") {
                  window.location.href = "/vendedor";
                } else {
                  setIsAuthenticated(true);
                  setCurrentUser(user);
                  addAuditLog("Login Google", user.email, "Autenticado via Google Whitelist");
                }
              }}
              onError={(err) => setLoginError(err)}
              buttonText="Continuar com o Google"
            />

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-semibold uppercase tracking-wider shrink-0">
                ou com chave de acesso
              </span>
              <div className="border-t border-slate-800 w-full" />
            </div>
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

          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Ambiente seguro Appwrite Database</span>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-[10px] text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>v{siteConfig.version}</span>
            </div>
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
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>v{siteConfig.version}</span>
                </div>
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
                loadAnalytics();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
              title="Sincronizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders || isLoadingCatalog || isLoadingAnalytics ? "animate-spin" : ""}`} />
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
            {currentUser && (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name ? currentUser.name.substring(0, 1).toUpperCase() : "A"}
                </div>
                <span className="font-semibold text-slate-200">{currentUser.name || currentUser.email}</span>
              </div>
            )}

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
            onClick={() => setActiveTab("vouchers")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "vouchers"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Tag className="w-4 h-4 text-emerald-400" />
            <span>Gestão de Vouchers</span>
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "customers"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Clientes & Compras</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("analytics");
              loadAnalytics();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "analytics"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Analytics & Funil</span>
          </button>

          <button
            onClick={() => setActiveTab("marketing")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "marketing"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>SEO & Tráfego Pago</span>
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "team"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Equipe & Vendedores</span>
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
              <div className="grid grid-cols-1 gap-5">
                {filteredOrders.map((order) => {
                  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.awaiting_payment;
                  const StatusIcon = statusInfo.icon;
                  const addr = getOrderAddress(order);
                  const shipping = getOrderShipping(order);
                  const payMethod = getOrderPaymentMethod(order);
                  const sheets = getOrderSheets(order);
                  const cleanPhone = (order.customer_whatsapp || "").replace(/\D/g, "");
                  const waHref = cleanPhone
                    ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                        `Olá ${order.customer_name || ""}, referente ao seu pedido ${order.order_number} na Totem Pro:`
                      )}`
                    : null;

                  return (
                    <div
                      key={order.$id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-4 sm:p-6 transition-all shadow-xl space-y-4"
                    >
                      {/* Topo do Card: Número do Pedido, Status, Pagamento, Método de Entrega e Ações Rápidas */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-white text-base sm:text-lg font-mono tracking-tight">
                            {order.order_number}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusInfo.label}</span>
                          </span>

                          {/* Badge Forma de Pagamento */}
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border flex items-center gap-1.5 ${
                              payMethod === "credit_card"
                                ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {payMethod === "credit_card" ? (
                              <CreditCard className="w-3.5 h-3.5" />
                            ) : (
                              <QrCode className="w-3.5 h-3.5" />
                            )}
                            <span>{payMethod === "credit_card" ? "CARTÃO DE CRÉDITO" : "PIX À VISTA"}</span>
                          </span>

                          {/* Badge Método de Entrega */}
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" />
                            <span>
                              {shipping.name}{" "}
                              {order.shipping_cents > 0 ? `(${formatBRL(order.shipping_cents)})` : "(Isento)"}
                            </span>
                          </span>

                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(order.$createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Seletor rápido de Status */}
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.$id, e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                              <option key={k} value={k}>
                                Mudar: {cfg.label}
                              </option>
                            ))}
                          </select>

                          {/* Botão de Ver Pedido Completo & Ficha CNC */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all shrink-0 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Pedido Completo & Ficha CNC</span>
                          </button>
                        </div>
                      </div>

                      {/* Painel de Conferência em 3 Colunas: (1) Cliente & Endereço, (2) Entrega & Pagamento, (3) Detalhes na Escolha */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 text-xs">
                        {/* 1-) CLIENTE & ENDEREÇO DE ENTREGA */}
                        <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>1. Cliente & Endereço de Entrega</span>
                              </span>
                              {addr?.street && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyAddress(order.$id, addr, order.customer_name)}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Copiar endereço completo para etiqueta de envio"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{copiedAddressId === order.$id ? "Copiado!" : "Copiar Endereço"}</span>
                                </button>
                              )}
                            </div>

                            <div className="space-y-0.5 text-slate-300 border-b border-slate-800/70 pb-2">
                              <p className="font-bold text-white text-xs sm:text-sm">{order.customer_name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                CPF/CNPJ: <strong className="text-slate-200">{order.customer_document || "—"}</strong>
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                E-mail: <span className="text-slate-300">{order.customer_email || "—"}</span>
                              </p>
                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <span className="text-[11px] text-slate-400">
                                  WhatsApp: <strong className="text-slate-200">{order.customer_whatsapp || "—"}</strong>
                                </span>
                                {waHref && (
                                  <a
                                    href={waHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>Chamar</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Endereço de Entrega */}
                            {addr && addr.street ? (
                              <div className="space-y-0.5 text-[11px] text-slate-300">
                                <p className="font-bold text-white">
                                  {addr.street}, nº {addr.number || "S/N"}
                                  {addr.complement ? ` • ${addr.complement}` : ""}
                                </p>
                                <p className="text-slate-400">
                                  Bairro: <strong className="text-slate-200">{addr.neighborhood || "—"}</strong>
                                </p>
                                <p className="text-slate-400">
                                  Cidade/UF:{" "}
                                  <strong className="text-cyan-300">
                                    {addr.city}/{addr.state || "SP"}
                                  </strong>{" "}
                                  • CEP: <strong className="font-mono text-white">{addr.cep}</strong>
                                </p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-500 italic">
                                Endereço não registrado neste pedido.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 2-) MÉTODO DE ENTREGA & CONFERÊNCIA DE PAGAMENTO */}
                        <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" />
                              <span>2. Método de Entrega & Pagamento</span>
                            </span>

                            {/* Box Método de Envio */}
                            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Modalidade de Frete:</span>
                                <span className="text-[11px] font-extrabold text-cyan-300">
                                  {order.shipping_cents > 0 ? formatBRL(order.shipping_cents) : "Grátis / Isento"}
                                </span>
                              </div>
                              <p className="font-bold text-white text-xs">{shipping.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {shipping.carrier ? `Transportadora: ${shipping.carrier}` : ""}
                                {shipping.deliveryDaysMin && shipping.deliveryDaysMax
                                  ? ` • Prazo: ${shipping.deliveryDaysMin} a ${shipping.deliveryDaysMax} dias úteis`
                                  : ""}
                              </p>
                            </div>

                            {/* Box Demonstrativo Financeiro (O que o cliente pagou) */}
                            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-[11px]">
                              <div className="flex justify-between text-slate-400">
                                <span>Subtotal dos Gabinetes:</span>
                                <span className="font-semibold text-slate-200">{formatBRL(order.subtotal_cents)}</span>
                              </div>
                              {(order.discount_cents || addr?.discountCents) ? (
                                <div className="flex justify-between text-emerald-400">
                                  <span>Cupom ({order.coupon_code || addr?.couponCode}):</span>
                                  <span className="font-bold">
                                    - {formatBRL(order.discount_cents || addr?.discountCents || 0)}
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex justify-between text-slate-400">
                                <span>Frete ({shipping.name.split(" ")[0]}):</span>
                                <span className="font-semibold text-slate-200">
                                  {order.shipping_cents > 0 ? `+ ${formatBRL(order.shipping_cents)}` : "R$ 0,00"}
                                </span>
                              </div>
                              <div className="pt-1.5 border-t border-slate-800 flex items-baseline justify-between">
                                <span className="font-bold text-white">
                                  Valor Pago ({payMethod === "credit_card" ? "Cartão" : "PIX"}):
                                </span>
                                <span className="text-base font-black text-emerald-400">
                                  {formatBRL(order.total_cents)}
                                </span>
                              </div>
                              {order.payment?.gateway_payment_id && (
                                <p className="text-[10px] text-slate-500 font-mono pt-0.5">
                                  ID Mercado Pago: #{order.payment.gateway_payment_id}
                                  {order.payment.paid_at
                                    ? ` • Pago em ${new Date(order.payment.paid_at).toLocaleString("pt-BR")}`
                                    : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3-) DETALHES NA ESCOLHA (ITENS E EQUIPAMENTOS DO PEDIDO) */}
                        <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" />
                                <span>3. Detalhes na Escolha ({order.items?.length || 0} item/ns)</span>
                              </span>
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {order.items?.map((it, idx) => {
                                const sheet = sheets[idx] || null;
                                return (
                                  <div
                                    key={it.$id || idx}
                                    className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-800 space-y-1.5 text-[11px]"
                                  >
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1">
                                      <span className="font-extrabold text-white">
                                        {it.quantity}x {it.cabinet_name}
                                      </span>
                                      <span className="font-bold text-indigo-400 font-mono">
                                        {formatBRL(it.subtotal_cents)}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-0.5 text-slate-300">
                                      <p>
                                        <span className="text-slate-500">Acabamento/Cor:</span>{" "}
                                        <strong className="text-white">{it.color_name}</strong>
                                      </p>
                                      <p>
                                        <span className="text-slate-500">Monitor:</span>{" "}
                                        <strong className="text-cyan-300">{it.monitor_name || "Nenhum"}</strong>
                                      </p>
                                      {sheet?.screenSpecs?.screenCutoutMm && (
                                        <p className="text-[10px] text-slate-400 pl-2 border-l-2 border-cyan-500/40">
                                          {sheet.screenSpecs.screenCutoutMm}
                                        </p>
                                      )}
                                      <p>
                                        <span className="text-slate-500">Impressora:</span>{" "}
                                        <strong className="text-slate-200">{it.printer_name || "Nenhuma"}</strong>
                                      </p>
                                      <p>
                                        <span className="text-slate-500">Leitor 2D/QR:</span>{" "}
                                        <strong className="text-slate-200">{it.reader_name || "Sem leitor"}</strong>
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
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
          <CatalogManager
            catalogData={catalogData}
            isLoading={isLoadingCatalog}
            onReload={loadCatalog}
            addAuditLog={addAuditLog}
            onShowNotification={(msg) => {
              setSaveSuccessMsg(msg);
              setTimeout(() => setSaveSuccessMsg(""), 3500);
            }}
          />
        )}

        {/* ======================================================== */}
        {/* ABA: GESTÃO DE VOUCHERS, RASTREAMENTO & INFLUENCIADORES */}
        {/* ======================================================== */}
        {activeTab === "vouchers" && <VoucherManager />}

        {/* ======================================================== */}
        {/* ABA: ANALYTICS E FUNIL DE CONVERSÃO */}
        {/* ======================================================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header com Atualizar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Telemetria de Funil de Vendas B2B & Taxas de Abandono
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Métricas em tempo real de jornada, abandono de etapas do configurador e conversão de pedidos Pix.
                </p>
              </div>
              <button
                onClick={loadAnalytics}
                disabled={isLoadingAnalytics}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto shadow-md shadow-indigo-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnalytics ? "animate-spin" : ""}`} />
                <span>Atualizar Métricas</span>
              </button>
            </div>

            {/* 4 Cards de KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Total de Sessões / Visitas
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-white">
                    {funnelData?.funnel?.totalSessions || 0}
                  </span>
                  <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    Sessões
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Taxa de Conversão Global
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-emerald-400">
                    {funnelData?.funnel?.globalConversionRate || 0}%
                  </span>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Final / Topo
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Pix Copia e Cola Emitidos
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-cyan-400">
                    {funnelData?.counts?.pix_generated || 0}
                  </span>
                  <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    Etapa 6
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Vendas / Pix Compensados
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold text-purple-400">
                    {funnelData?.counts?.purchase || 0}
                  </span>
                  <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    Concluídos
                  </span>
                </div>
              </div>
            </div>

            {/* Tabela do Funil com Taxas de Abandono */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="font-extrabold text-white text-base">
                  Desempenho por Etapa & Análise de Drop-off (Abandono)
                </h4>
                <p className="text-xs text-slate-400">
                  Identifique os pontos exatos de evasão do cliente desde a visualização até a compra.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {funnelData?.funnel?.stages?.map((stage: any, index: number) => {
                  const isTop = index === 0;
                  const isHighDropoff = stage.dropoffRateFromPrevious > 50;

                  return (
                    <div
                      key={stage.stageId}
                      className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 font-bold text-xs flex items-center justify-center border border-slate-700">
                            {stage.stepNumber}
                          </span>
                          <div>
                            <span className="font-bold text-white text-sm">{stage.label}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2">
                              ({stage.eventName})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Contagem</span>
                            <span className="font-extrabold text-white text-sm">{stage.count}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Retenção da Etapa</span>
                            <span className="font-bold text-emerald-400">
                              {stage.conversionRateFromPrevious}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Taxa de Abandono</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                isTop
                                  ? "text-slate-500"
                                  : isHighDropoff
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-amber-500/10 text-amber-400"
                              }`}
                            >
                              {isTop ? "—" : `${stage.dropoffRateFromPrevious}%`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Barra de Progresso Visual */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-500 rounded-full"
                          style={{
                            width: `${Math.max(4, Math.min(100, stage.overallConversionRate))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumo de Modelos Populares */}
            {funnelData?.funnel?.popularModels && Object.keys(funnelData.funnel.popularModels).length > 0 && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h4 className="font-extrabold text-white text-sm">
                  Modelos de Gabinete Mais Selecionados pelos Clientes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(funnelData.funnel.popularModels).map(([mId, count]: [string, any]) => (
                    <div
                      key={mId}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs"
                    >
                      <span className="font-semibold text-slate-300 capitalize">
                        {mId.replace("cabinet-", "Totem ")}
                      </span>
                      <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                        {count} seleções
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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

        {/* ======================================================== */}
        {/* ABA 4: CONFIGURAÇÃO DE SEO, MARKETING & TRÁFEGO PAGO */}
        {/* ======================================================== */}
        {activeTab === "marketing" && <MarketingSettingsManager />}

        {/* ======================================================== */}
        {/* ABA 5: EQUIPE, VENDEDORES & WHITELIST GOOGLE */}
        {/* ======================================================== */}
        {activeTab === "team" && <TeamManager />}

        {/* ======================================================== */}
        {/* ABA 6: CLIENTES CADASTRADOS & VOLUME DE COMPRAS */}
        {/* ======================================================== */}
        {activeTab === "customers" && <CustomersManager />}
      </main>

      {/* ======================================================== */}
      {/* MODAL: ESPELHO COMPLETO DO PEDIDO DE COMPRA & FICHA TÉCNICA CNC */}
      {/* ======================================================== */}
      {selectedOrder && (() => {
        const modalAddr = getOrderAddress(selectedOrder);
        const modalShipping = getOrderShipping(selectedOrder);
        const modalPayMethod = getOrderPaymentMethod(selectedOrder);
        const modalSheets = getOrderSheets(selectedOrder);
        const modalStatusInfo = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.awaiting_payment;
        const ModalStatusIcon = modalStatusInfo.icon;
        const cleanModalPhone = (selectedOrder.customer_whatsapp || "").replace(/\D/g, "");
        const modalWaHref = cleanModalPhone
          ? `https://wa.me/55${cleanModalPhone}?text=${encodeURIComponent(
              `Olá ${selectedOrder.customer_name || ""}, referente ao seu pedido ${selectedOrder.order_number} na Totem Pro:`
            )}`
          : null;

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[94dvh] flex flex-col overflow-hidden shadow-2xl relative animate-fade-in">
              {/* Cabeçalho Fixo da Ordem de Compra */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-slate-800 bg-slate-900/95 shrink-0">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-wider">
                      Ordem de Compra Completa & Ficha CNC
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${modalStatusInfo.color}`}
                    >
                      <ModalStatusIcon className="w-3 h-3" />
                      <span>{modalStatusInfo.label}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg sm:text-2xl font-extrabold text-white font-mono">
                      {selectedOrder.order_number}
                    </h2>
                    <span className="text-xs text-slate-400">
                      Emitido em: {new Date(selectedOrder.$createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                    title="Imprimir Ordem de Compra e Ficha CNC"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Imprimir Pedido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Corpo Rolável do Pedido Completo */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-5">
                {/* LINHA 1: DADOS DO CLIENTE + ENDEREÇO DE ENTREGA E MÉTODO DE ENVIO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card 1: Dados do Comprador */}
                  <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800/90 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-black text-indigo-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Dados do Comprador / Faturamento</span>
                      </h4>
                      {modalWaHref && (
                        <a
                          href={modalWaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    <div className="space-y-1.5 text-slate-300">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Nome / Razão Social:</span>
                        <strong className="text-white text-right">{selectedOrder.customer_name}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">CPF / CNPJ:</span>
                        <strong className="text-slate-200 font-mono">{selectedOrder.customer_document || "—"}</strong>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">E-mail:</span>
                        <span className="text-slate-200 break-all text-right">{selectedOrder.customer_email || "—"}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">WhatsApp / Telefone:</span>
                        <strong className="text-emerald-400">{selectedOrder.customer_whatsapp || "—"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Endereço de Entrega & Método de Frete */}
                  <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800/90 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="font-black text-cyan-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>1. Endereço de Entrega & 2. Método de Envio</span>
                      </h4>
                      {modalAddr?.street && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyAddress(`modal_${selectedOrder.$id}`, modalAddr, selectedOrder.customer_name)
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>
                            {copiedAddressId === `modal_${selectedOrder.$id}` ? "Endereço Copiado!" : "Copiar Etiqueta"}
                          </span>
                        </button>
                      )}
                    </div>

                    {modalAddr && modalAddr.street ? (
                      <div className="space-y-1 text-slate-300">
                        <p className="font-extrabold text-white text-sm">
                          {modalAddr.street}, nº {modalAddr.number || "S/N"}
                          {modalAddr.complement ? ` (${modalAddr.complement})` : ""}
                        </p>
                        <p className="text-slate-400">
                          Bairro: <strong className="text-slate-200">{modalAddr.neighborhood || "—"}</strong>
                        </p>
                        <p className="text-slate-400">
                          Cidade / UF:{" "}
                          <strong className="text-cyan-300">
                            {modalAddr.city} / {modalAddr.state || "SP"}
                          </strong>{" "}
                          • CEP: <strong className="font-mono text-white">{modalAddr.cep}</strong>
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">Endereço não cadastrado neste pedido.</p>
                    )}

                    {/* Box do Método de Entrega */}
                    <div className="p-3 rounded-xl bg-cyan-950/25 border border-cyan-500/30 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-extrabold text-cyan-400 block">
                          Método de Entrega Selecionado:
                        </span>
                        <p className="font-extrabold text-white text-xs sm:text-sm">{modalShipping.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {modalShipping.carrier ? `${modalShipping.carrier}` : ""}
                          {modalShipping.deliveryDaysMin && modalShipping.deliveryDaysMax
                            ? ` • Prazo estimado: ${modalShipping.deliveryDaysMin} a ${modalShipping.deliveryDaysMax} dias úteis`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block">Valor do Frete</span>
                        <span className="text-sm font-black text-cyan-300">
                          {selectedOrder.shipping_cents > 0 ? formatBRL(selectedOrder.shipping_cents) : "Grátis"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LINHA 2: DETALHES NA ESCOLHA (ESPELHO COMERCIAL + FICHA TÉCNICA DE CORTE CNC) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-emerald-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      <span>
                        3. Detalhes na Escolha do Cliente & Especificações de Usinagem CNC (
                        {selectedOrder.items?.length || 0} item/ns)
                      </span>
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, idx) => {
                      const sheet = modalSheets[idx] || null;
                      return (
                        <div
                          key={item.$id || idx}
                          className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800/90 space-y-3 text-xs"
                        >
                          {/* Cabeçalho do Item */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-black text-xs flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <h5 className="font-extrabold text-sm sm:text-base text-white">
                                  {item.quantity}x {item.cabinet_name}
                                </h5>
                                <p className="text-[11px] text-slate-400">
                                  Valor Unitário: <strong className="text-slate-200">{formatBRL(item.unit_price_cents)}</strong>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">Subtotal do Item</span>
                              <span className="text-base font-black text-indigo-400 font-mono">
                                {formatBRL(item.subtotal_cents)}
                              </span>
                            </div>
                          </div>

                          {/* Escolhas do Cliente no Configurador */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Acabamento / Cor
                              </span>
                              <strong className="text-white text-xs">{item.color_name}</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Monitor / Kit Escolhido
                              </span>
                              <strong className="text-cyan-300 text-xs">{item.monitor_name || "Nenhum"}</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Impressora Térmica
                              </span>
                              <strong className="text-white text-xs">{item.printer_name || "Nenhuma"}</strong>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Leitor / Scanner 2D
                              </span>
                              <strong className="text-white text-xs">{item.reader_name || "Sem leitor frontal"}</strong>
                            </div>
                          </div>

                          {/* Detalhamento Técnico de Corte Router CNC (se disponível na ficha) */}
                          {sheet && (
                            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/25 space-y-2 text-[11px]">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-1.5">
                                <span className="font-black text-indigo-300 uppercase text-[10px] tracking-wider">
                                  Gabarito de Usinagem Router CNC — Item #{idx + 1}
                                </span>
                                {sheet.dimensionsMm && (
                                  <span className="font-mono text-slate-300 text-[10px]">
                                    Dimensões Gabinete: {sheet.dimensionsMm.heightMm}×{sheet.dimensionsMm.widthMm}×
                                    {sheet.dimensionsMm.depthMm} mm
                                    {sheet.dimensionsMm.weightKg ? ` • ${sheet.dimensionsMm.weightKg}kg` : ""}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
                                <div>
                                  <span className="text-slate-500 font-semibold block text-[10px]">
                                    Corte de Tela e VESA:
                                  </span>
                                  <p className="text-slate-200">{sheet.screenSpecs?.screenCutoutMm || "—"}</p>
                                  <p className="text-indigo-300 text-[10px]">{sheet.screenSpecs?.vesaPattern || ""}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-semibold block text-[10px]">
                                    Rasgo e Berço de Impressora:
                                  </span>
                                  <p className="text-slate-200">{sheet.printerSpecs?.slotOpeningMm || "—"}</p>
                                  <p className="text-slate-400 text-[10px]">{sheet.printerSpecs?.rollSize || ""}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-semibold block text-[10px]">
                                    Janela de Scanner & Segurança:
                                  </span>
                                  <p className="text-slate-200">{sheet.scannerSpecs?.windowSpecs || "—"}</p>
                                  <p className="text-slate-400 text-[10px]">{sheet.securityLock || ""}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LINHA 3: DEMONSTRATIVO FINANCEIRO COMPLETO (O QUE O CLIENTE PAGOU) */}
                <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                        4. Conferência Financeira & Método de Pagamento
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-extrabold text-white text-sm">
                          {modalPayMethod === "credit_card"
                            ? "Pagamento via Cartão de Crédito (Mercado Pago)"
                            : "Pagamento via PIX à Vista (Mercado Pago)"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            selectedOrder.payment?.status === "paid" || selectedOrder.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {selectedOrder.payment?.status === "paid" || selectedOrder.status === "paid"
                            ? "PAGAMENTO CONFIRMADO / LIQUIDADO"
                            : "AGUARDANDO COMPENSAÇÃO"}
                        </span>
                      </div>
                    </div>

                    {selectedOrder.payment?.gateway_payment_id && (
                      <div className="text-left sm:text-right font-mono text-[11px] text-slate-400">
                        <div>Transação MP: #{selectedOrder.payment.gateway_payment_id}</div>
                        {selectedOrder.payment.paid_at && (
                          <div className="text-emerald-400">
                            Pago em: {new Date(selectedOrder.payment.paid_at).toLocaleString("pt-BR")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Subtotal dos Produtos</span>
                      <span className="text-base font-extrabold text-white font-mono">
                        {formatBRL(selectedOrder.subtotal_cents)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">
                        Frete ({modalShipping.name})
                      </span>
                      <span className="text-base font-extrabold text-cyan-300 font-mono">
                        {selectedOrder.shipping_cents > 0 ? `+ ${formatBRL(selectedOrder.shipping_cents)}` : "R$ 0,00"}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                      <span className="text-emerald-300 text-[11px] font-bold block">
                        Valor Total Pago pelo Cliente
                      </span>
                      <span className="text-xl font-black text-emerald-400 font-mono">
                        {formatBRL(selectedOrder.total_cents)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Avaliação e Precificação de Personalização Especial (Engenharia CNC) */}
                {selectedOrder.status === "awaiting_custom_analysis" ||
                selectedOrder.status === "custom_approved" ||
                selectedOrder.order_number.startsWith("CUST-") ? (
                  <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-4">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-indigo-400" />
                      <h4 className="font-extrabold text-white text-sm">
                        Painel do Engenheiro CNC — Avaliação de Gabarito & Corte
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          Acréscimo de Usinagem CNC (R$)
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 280.00"
                          defaultValue={(selectedOrder.total_cents - selectedOrder.subtotal_cents) / 100 || 0}
                          id="custom_adj_input"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          Parecer Técnico de Engenharia
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Viável corte sob medida com folga +1.5mm"
                          defaultValue="Viável usinagem e fixação com gabarito especial."
                          id="custom_notes_input"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={async () => {
                          const adjInput = document.getElementById("custom_adj_input") as HTMLInputElement;
                          const notesInput = document.getElementById("custom_notes_input") as HTMLInputElement;
                          const adjVal = Math.round(parseFloat(adjInput?.value || "0") * 100);
                          const notesVal = notesInput?.value || "";

                          const res = await fetch(`/api/customizations/${selectedOrder.$id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              feasibility: "approved",
                              customAdjustmentCents: adjVal,
                              engineeringNotes: notesVal,
                            }),
                          });
                          const json = await res.json();
                          if (json.ok) {
                            addAuditLog(
                              "Aprovação de Orçamento Especial",
                              selectedOrder.order_number,
                              `Aprovado com acréscimo de ${formatBRL(adjVal)}`
                            );
                            loadOrders();
                            setSelectedOrder(null);
                          }
                        }}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprovar Orçamento e Liberar ao Cliente</span>
                      </button>

                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/customizations/${selectedOrder.$id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              feasibility: "rejected",
                              customAdjustmentCents: 0,
                              engineeringNotes: "Inviável dimensionalmente para este padrão de gabinete.",
                            }),
                          });
                          const json = await res.json();
                          if (json.ok) {
                            addAuditLog("Recusa de Orçamento Especial", selectedOrder.order_number, "Inviável");
                            loadOrders();
                            setSelectedOrder(null);
                          }
                        }}
                        className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs transition-all"
                      >
                        Recusar Inviável
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Rodapé Fixo do Modal */}
              <div className="px-5 sm:px-7 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-slate-400">
                  Alterar status do pedido:{" "}
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateOrderStatus(selectedOrder.$id, e.target.value)}
                    className="ml-1.5 bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Fechar Pedido
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
