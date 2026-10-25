"use client";

import React, { useState, useEffect } from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { siteConfig } from "@/config/site";
import { CatalogManager } from "@/components/admin/CatalogManager";
import { MarketingSettingsManager } from "@/components/admin/MarketingSettingsManager";
import { TeamManager } from "@/components/admin/TeamManager";
import { VoucherManager } from "@/components/admin/VoucherManager";
import { CustomersManager } from "@/components/admin/CustomersManager";
import { SystemLogsManager } from "@/components/admin/SystemLogsManager";
import { TelemetryErrorsManager } from "@/components/admin/TelemetryErrorsManager";
import {
  OrderExecutionEditor,
  OrderExecutionViewer,
  OrderExecutionData,
  ExecutionAttachment,
  createDefaultExecutionOrder,
  hasExecutionOrderContent,
} from "@/components/admin/OrderExecutionEditor";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import {
  ShieldCheck,
  ShieldAlert,
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
  ChevronDown,
  ChevronUp,
  List,
  Maximize2,
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
  Trash2,
  AlertTriangle,
  Monitor,
  Sparkles,
  X,
  Camera,
  Film,
  ClipboardCheck,
  Upload,
  Sun,
  Moon,
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
  customerNotes?: string | null;
  executionOrder?: OrderExecutionData | null;
}

interface EditableOrderItem {
  $id?: string;
  cabinet_name: string;
  color_name: string;
  monitor_name: string;
  printer_name: string;
  reader_name: string;
  unit_price_cents: number;
  quantity: number;
  subtotal_cents: number;
  screenCutoutMm: string;
  customizationNotes: string;
  itemAttachments: ExecutionAttachment[];
}

interface EditOrderFormState {
  status: string;
  payment_method: "pix" | "credit_card";
  customer_name: string;
  customer_document: string;
  customer_email: string;
  customer_whatsapp: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  shipping_name: string;
  shipping_carrier: string;
  shipping_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  coupon_code: string;
  total_cents: number;
  order_notes: string;
  execution_order: OrderExecutionData;
  items: EditableOrderItem[];
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
  awaiting_custom_analysis: { label: "Em Análise CNC", color: "bg-amber-500/15 text-amber-300 border-amber-500/40", icon: AlertTriangle },
  custom_approved: { label: "Orçamento Aprovado", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40", icon: CheckCircle2 },
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

  // Tema do Painel (Escuro / Claro)
  const [adminTheme, setAdminTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("totem_admin_theme");
      if (saved === "light" || saved === "dark") {
        setAdminTheme(saved);
      }
    } catch {}
  }, []);

  const toggleAdminTheme = () => {
    const next = adminTheme === "dark" ? "light" : "dark";
    setAdminTheme(next);
    try {
      localStorage.setItem("totem_admin_theme", next);
    } catch {}
  };

  // Navegação do painel
  const [activeTab, setActiveTab] = useState<"orders" | "catalog" | "vouchers" | "customers" | "analytics" | "marketing" | "team" | "logs" | "telemetry">("orders");
  const [catalogSubTab, setCatalogSubTab] = useState<"models" | "colors" | "peripherals">("models");

  // Dados
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Modo de Exibição de Pedidos: "simplified" (lista compacta executiva) ou "detailed" (visão 3 colunas completa)
  const [ordersViewMode, setOrdersViewMode] = useState<"simplified" | "detailed">("simplified");
  // Conjunto de IDs de pedidos expandidos individualmente na lista simplificada
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("totem_admin_orders_view_mode");
      if (savedMode === "simplified" || savedMode === "detailed") {
        setOrdersViewMode(savedMode);
      }
    } catch {}
  }, []);

  const toggleOrdersViewMode = (mode: "simplified" | "detailed") => {
    setOrdersViewMode(mode);
    try {
      localStorage.setItem("totem_admin_orders_view_mode", mode);
    } catch {}
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

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

  // Modal de Edição Completa do Pedido e Exclusão de Pedido
  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);
  const [editOrderForm, setEditOrderForm] = useState<EditOrderFormState | null>(null);
  const [editModalFocusSection, setEditModalFocusSection] = useState<"all" | "execution">("all");
  const [uploadingItemIdx, setUploadingItemIdx] = useState<number | null>(null);
  const [isSavingOrderEdit, setIsSavingOrderEdit] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState<OrderRecord | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

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
        return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      }
    } catch {}
    return [];
  };

  const getCabinetCategoryLabel = (cabinetName: string): string => {
    const lower = (cabinetName || "").toLowerCase();
    if (lower.includes("balc") || lower.includes("mesa")) return "GABINETE DE BALCÃO / MESA";
    if (lower.includes("parede")) return "GABINETE DE PAREDE";
    return "GABINETE DE CHÃO (PEDESTAL)";
  };

  const getItemCabinetImage = (item: OrderItem, sheet: any): string => {
    // 1. Tenta foto salva no snapshot da ficha de fabricação
    const sheetImages = sheet?.dimensionsMm?.images;
    if (Array.isArray(sheetImages) && sheetImages.length > 0) {
      const validImg = sheetImages.find((u: string) => typeof u === "string" && u.startsWith("http") && !u.endsWith(".svg"));
      if (validImg) return validImg;
    }

    // 2. Tenta buscar no catálogo carregado
    const nameLower = (item.cabinet_name || "").toLowerCase();
    const colorLower = (item.color_name || "").toLowerCase();
    const isBlack = colorLower.includes("preto") || colorLower.includes("black") || colorLower.includes("grafite");

    if (catalogData?.models && Array.isArray(catalogData.models)) {
      const matchedModel = catalogData.models.find((m: any) => {
        const mName = (m.name || "").toLowerCase();
        return (
          mName === nameLower ||
          (nameLower.includes("balc") && (mName.includes("balc") || mName.includes("mesa"))) ||
          (nameLower.includes("parede") && mName.includes("parede")) ||
          (nameLower.includes("chão") && mName.includes("chão"))
        );
      });
      if (matchedModel) {
        try {
          const dims = matchedModel.dimensions_json ? JSON.parse(matchedModel.dimensions_json) : null;
          if (Array.isArray(dims?.images) && dims.images.length > 0) {
            const colorMatched = dims.images.find((u: string) =>
              isBlack ? u.toLowerCase().includes("preto") : u.toLowerCase().includes("branco")
            );
            if (colorMatched) return colorMatched;
            const firstHttp = dims.images.find((u: string) => typeof u === "string" && !u.endsWith(".svg"));
            if (firstHttp) return firstHttp;
          }
        } catch {}
        if (matchedModel.main_image && !matchedModel.main_image.endsWith(".svg")) {
          return matchedModel.main_image;
        }
      }
    }

    // 3. Imagens oficiais em alta definição por tipo e cor do gabinete
    if (nameLower.includes("balc") || nameLower.includes("mesa")) {
      return isBlack
        ? "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/MESA/totem%20mesa%20preto%20(1).png"
        : "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/MESA/totem%20mesa%20branco%20(1).png";
    }
    if (nameLower.includes("parede")) {
      return isBlack
        ? "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20preto%20(1).png"
        : "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/PAREDE/totem%20parede%20branco%20(10).png";
    }
    return isBlack
      ? "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/CHAO/totem%20chao%20preto%20(1).png"
      : "https://financial.xpointsolucoes.com.br/xpoint/arquivos/gastrofood/TOTENS/CHAO/totem%20chao%20branco%20(1).png";
  };

  const getItemAlertInfo = (order: OrderRecord, item: OrderItem, sheet: any, idx: number) => {
    const addr = getOrderAddress(order);
    const monName = item.monitor_name || "";
    const prtName = item.printer_name || "";
    const rdrName = item.reader_name || "";
    const colName = item.color_name || "";
    const cutoutText = sheet?.screenSpecs?.screenCutoutMm || "";

    const isCustomMonitor =
      Boolean(sheet?.isCustomMonitor || sheet?.customDimensions || sheet?.isCustomRequest) ||
      /sob medida|custom|outro|especial/i.test(monName) ||
      cutoutText.includes("Monitor Inteiro:") ||
      cutoutText.includes("Barras");

    const isCustomPrinter = /sob medida|custom|outro|especial/i.test(prtName);
    const isCustomReader = /sob medida|custom|outro|especial/i.test(rdrName);
    const isCustomColor = /sob medida|custom|outro|especial/i.test(colName);

    const itemNote =
      sheet?.customizationNotes ||
      sheet?.customerNotes ||
      sheet?.customNotes ||
      (idx === 0 && addr?.customerNotes ? addr.customerNotes : "") ||
      "";

    const engineeringNote =
      sheet?.engineeringAnalysis?.engineeringParecer &&
      order.order_number?.startsWith("CUST-")
        ? sheet.engineeringAnalysis.engineeringParecer
        : "";

    const itemAttachments: ExecutionAttachment[] = Array.isArray(sheet?.itemAttachments)
      ? sheet.itemAttachments
      : [];

    const hasDeviation =
      isCustomMonitor ||
      isCustomPrinter ||
      isCustomReader ||
      isCustomColor ||
      itemAttachments.length > 0 ||
      Boolean(itemNote && itemNote.trim().length > 0) ||
      Boolean(order.order_number?.startsWith("CUST-"));

    return {
      hasDeviation,
      isCustomMonitor,
      isCustomPrinter,
      isCustomReader,
      isCustomColor,
      cutoutText,
      customDims: sheet?.customDimensions || null,
      itemNote: itemNote.trim(),
      engineeringNote: engineeringNote.trim(),
      itemAttachments,
    };
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

  // Abrir Modal de Edição Completa do Pedido (com opção de foco na Ordem de Execução)
  const handleOpenEditOrder = (order: OrderRecord, focusSection: "all" | "execution" = "all") => {
    const addr = getOrderAddress(order);
    const shipping = getOrderShipping(order);
    const payMethod = getOrderPaymentMethod(order);
    const sheets = getOrderSheets(order);

    const editableItems: EditableOrderItem[] = (order.items || []).map((it, idx) => {
      const sheet = sheets[idx] || null;
      return {
        $id: it.$id,
        cabinet_name: it.cabinet_name || "Gabinete de Parede Compacto",
        color_name: it.color_name || "Branco TX",
        monitor_name: it.monitor_name || "Nenhum",
        printer_name: it.printer_name || "Nenhum",
        reader_name: it.reader_name || "Nenhum",
        unit_price_cents: it.unit_price_cents || 0,
        quantity: it.quantity || 1,
        subtotal_cents: it.subtotal_cents || 0,
        screenCutoutMm: sheet?.screenSpecs?.screenCutoutMm || "",
        customizationNotes:
          sheet?.customizationNotes ||
          sheet?.customerNotes ||
          sheet?.customNotes ||
          "",
        itemAttachments: Array.isArray(sheet?.itemAttachments) ? sheet.itemAttachments : [],
      };
    });

    setEditModalFocusSection(focusSection);
    setEditingOrder(order);
    setEditOrderForm({
      status: order.status || "awaiting_payment",
      payment_method: payMethod,
      customer_name: order.customer_name || "",
      customer_document: order.customer_document || "",
      customer_email: order.customer_email || "",
      customer_whatsapp: order.customer_whatsapp || "",
      cep: addr?.cep || "",
      street: addr?.street || "",
      number: addr?.number || "",
      complement: addr?.complement || "",
      neighborhood: addr?.neighborhood || "",
      city: addr?.city || "",
      state: addr?.state || "SP",
      shipping_name: shipping.name || "PAC (Correios)",
      shipping_carrier: shipping.carrier || "Correios",
      shipping_cents: order.shipping_cents || 0,
      subtotal_cents: order.subtotal_cents || 0,
      discount_cents: order.discount_cents || addr?.discountCents || 0,
      coupon_code: order.coupon_code || addr?.couponCode || "",
      total_cents: order.total_cents || 0,
      order_notes: addr?.customerNotes || "",
      execution_order: createDefaultExecutionOrder(addr?.executionOrder || null),
      items: editableItems,
    });
  };

  // Upload de Foto/Vídeo diretamente em um Item específico do Pedido
  const handleUploadItemMedia = async (itemIdx: number, files: FileList | File[]) => {
    if (!editOrderForm || !editingOrder) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadingItemIdx(itemIdx);
    const uploaded: ExecutionAttachment[] = [];

    try {
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("orderNumber", `${editingOrder.order_number}_ITEM${itemIdx + 1}`);
        formData.append("caption", file.name);

        const res = await fetch("/api/admin/orders/media", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (json.ok && json.attachment) {
          uploaded.push(json.attachment);
        } else {
          alert(json.error || `Falha ao enviar arquivo ${file.name}`);
        }
      }

      if (uploaded.length > 0) {
        const nextItems = [...editOrderForm.items];
        nextItems[itemIdx] = {
          ...nextItems[itemIdx],
          itemAttachments: [...(nextItems[itemIdx].itemAttachments || []), ...uploaded],
        };
        setEditOrderForm({
          ...editOrderForm,
          items: nextItems,
        });
      }
    } catch (err: any) {
      alert("Erro ao enviar anexo do item: " + err?.message);
    } finally {
      setUploadingItemIdx(null);
    }
  };

  // Salvar Edição Completa do Pedido (incluindo Ordem de Execução & Anexos Multimídia)
  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !editOrderForm) return;
    setIsSavingOrderEdit(true);

    try {
      const prevAddr = getOrderAddress(editingOrder) || {};
      const prevSheets = getOrderSheets(editingOrder);

      const newDeliveryAddress = {
        ...prevAddr,
        cep: editOrderForm.cep.trim(),
        street: editOrderForm.street.trim(),
        number: editOrderForm.number.trim(),
        complement: editOrderForm.complement.trim(),
        neighborhood: editOrderForm.neighborhood.trim(),
        city: editOrderForm.city.trim(),
        state: editOrderForm.state.trim() || "SP",
        paymentMethod: editOrderForm.payment_method,
        couponCode: editOrderForm.coupon_code.trim() || null,
        discountCents: Number(editOrderForm.discount_cents) || 0,
        customerNotes: editOrderForm.order_notes.trim() || null,
        executionOrder: editOrderForm.execution_order,
        shippingMethod: {
          ...(prevAddr.shippingMethod || {}),
          id: prevAddr.shippingMethod?.id || "custom_shipping",
          name: editOrderForm.shipping_name.trim() || "Transportadora / Correios",
          carrier: editOrderForm.shipping_carrier.trim() || "Logística Homologada",
          priceCents: Number(editOrderForm.shipping_cents) || 0,
          deliveryDaysMin: prevAddr.shippingMethod?.deliveryDaysMin || 5,
          deliveryDaysMax: prevAddr.shippingMethod?.deliveryDaysMax || 9,
        },
      };

      const newSheets = editOrderForm.items.map((it, idx) => {
        const baseSheet = prevSheets[idx] || {
          itemIndex: idx + 1,
          dimensionsMm: { heightMm: 680, widthMm: 420, depthMm: 220 },
          finishType: "Pintura Eletrostática a Pó Microtexturizada (Cura 200°C)",
          ventilationSpecs: "Grelhas de exaustão térmica convectiva superior e inferior (passagem de ar 35 CFM)",
          securityLock: "Fechadura tipo tubular escamoteável com segredo e par de chaves",
          status: "ready_for_cutting",
        };
        const isCustomMon =
          /sob medida|custom|outro|especial/i.test(it.monitor_name) ||
          it.screenCutoutMm.includes("Monitor Inteiro:") ||
          Boolean(baseSheet.isCustomMonitor);

        return {
          ...baseSheet,
          itemIndex: idx + 1,
          cabinetModelName: it.cabinet_name,
          colorName: it.color_name,
          customizationNotes: it.customizationNotes.trim(),
          itemAttachments: it.itemAttachments || [],
          isCustomMonitor: isCustomMon,
          screenSpecs: {
            ...(baseSheet.screenSpecs || {}),
            monitorName: it.monitor_name,
            screenCutoutMm:
              it.screenCutoutMm.trim() ||
              baseSheet.screenSpecs?.screenCutoutMm ||
              `Abertura usinada para ${it.monitor_name}`,
            vesaPattern: baseSheet.screenSpecs?.vesaPattern || "Padrão VESA 75/100 mm com insertos M4",
          },
          printerSpecs: {
            ...(baseSheet.printerSpecs || {}),
            printerName: it.printer_name,
            slotOpeningMm:
              baseSheet.printerSpecs?.slotOpeningMm ||
              "Rasgo de saída 80mm x 6 mm com chanfro ergonômico",
            rollSize: baseSheet.printerSpecs?.rollSize || "Compartimento interno para bobina térmica 80mm",
          },
          scannerSpecs: {
            ...(baseSheet.scannerSpecs || {}),
            hasScanner: it.reader_name !== "Nenhum" && it.reader_name !== "Sem leitor",
            scannerName: it.reader_name,
            windowSpecs:
              baseSheet.scannerSpecs?.windowSpecs ||
              "Janela usinada 65 x 45 mm com visor acrílico cristal 2mm",
          },
        };
      });

      const payload = {
        order_number: editingOrder.order_number,
        status: editOrderForm.status,
        payment_method: editOrderForm.payment_method,
        customer_name: editOrderForm.customer_name.trim(),
        customer_document: editOrderForm.customer_document.trim(),
        customer_email: editOrderForm.customer_email.trim(),
        customer_whatsapp: editOrderForm.customer_whatsapp.trim(),
        subtotal_cents: Number(editOrderForm.subtotal_cents) || 0,
        shipping_cents: Number(editOrderForm.shipping_cents) || 0,
        total_cents: Number(editOrderForm.total_cents) || 0,
        delivery_address_json: JSON.stringify(newDeliveryAddress),
        manufacturing_sheet_json: JSON.stringify(newSheets),
        items: editOrderForm.items.map((it) => ({
          $id: it.$id,
          cabinet_name: it.cabinet_name.trim(),
          color_name: it.color_name.trim(),
          monitor_name: it.monitor_name.trim() || "Nenhum",
          printer_name: it.printer_name.trim() || "Nenhum",
          reader_name: it.reader_name.trim() || "Nenhum",
          unit_price_cents: Number(it.unit_price_cents) || 0,
          quantity: Number(it.quantity) || 1,
          subtotal_cents: Number(it.subtotal_cents) || 0,
        })),
      };

      const res = await fetch(`/api/admin/orders/${editingOrder.$id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.ok) {
        addAuditLog(
          "Ordem de Execução & Edição",
          editingOrder.order_number,
          `Pedido e Ordem de Execução de ${editOrderForm.customer_name} salvos pelo administrador`
        );
        setSaveSuccessMsg(`Pedido e Ordem de Execução ${editingOrder.order_number} salvos com sucesso!`);
        setTimeout(() => setSaveSuccessMsg(""), 4000);
        setEditingOrder(null);
        setEditOrderForm(null);
        await loadOrders();
        if (selectedOrder && selectedOrder.$id === editingOrder.$id) {
          setSelectedOrder(null);
        }
      } else {
        alert(json.error || "Erro ao salvar alterações do pedido.");
      }
    } catch (err: any) {
      alert("Erro de conexão ao salvar pedido: " + err?.message);
    } finally {
      setIsSavingOrderEdit(false);
    }
  };

  // Confirmar Exclusão Definitiva do Pedido
  const handleConfirmDeleteOrder = async () => {
    if (!deletingOrder) return;
    setIsDeletingOrder(true);
    try {
      const res = await fetch(`/api/admin/orders/${deletingOrder.$id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.ok) {
        addAuditLog(
          "Exclusão de Pedido",
          deletingOrder.order_number,
          `Pedido de ${deletingOrder.customer_name} (${formatBRL(deletingOrder.total_cents)}) excluído permanentemente`
        );
        setOrders((prev) => prev.filter((o) => o.$id !== deletingOrder.$id));
        if (selectedOrder && selectedOrder.$id === deletingOrder.$id) {
          setSelectedOrder(null);
        }
        setSaveSuccessMsg(`Pedido ${deletingOrder.order_number} excluído com sucesso!`);
        setTimeout(() => setSaveSuccessMsg(""), 4000);
        setDeletingOrder(null);
      } else {
        alert(json.error || "Erro ao excluir pedido.");
      }
    } catch (err: any) {
      alert("Erro ao excluir pedido: " + err?.message);
    } finally {
      setIsDeletingOrder(false);
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
      <div className={`min-h-screen ${adminTheme === "light" ? "admin-light bg-slate-50 text-slate-900" : "bg-slate-950 text-white"} flex items-center justify-center p-4 transition-colors duration-200`}>
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
      <div className={`min-h-screen ${adminTheme === "light" ? "admin-light bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} flex flex-col justify-center items-center px-4 relative overflow-hidden transition-colors duration-200`}>
        {/* Alternador de Tema na tela de login */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleAdminTheme}
            className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-all border shadow-sm ${
              adminTheme === "light"
                ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/60"
            }`}
            title={adminTheme === "light" ? "Alternar para Tema Escuro" : "Alternar para Tema Claro"}
          >
            {adminTheme === "light" ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Tema Escuro</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">Tema Claro</span>
              </>
            )}
          </button>
        </div>

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
    <div className={`min-h-screen ${adminTheme === "light" ? "admin-light bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} flex flex-col antialiased transition-colors duration-200`}>
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
            {/* Alternador de Tema Claro / Escuro */}
            <button
              onClick={toggleAdminTheme}
              className={`p-2 rounded-lg text-xs flex items-center gap-1.5 transition-all border ${
                adminTheme === "light"
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border-amber-300"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60"
              }`}
              title={adminTheme === "light" ? "Alternar para Tema Escuro" : "Alternar para Tema Claro"}
            >
              {adminTheme === "light" ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline font-medium">Tema Escuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline font-medium">Tema Claro</span>
                </>
              )}
            </button>

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

          <button
            onClick={() => setActiveTab("telemetry")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "telemetry"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Erros & Diagnósticos</span>
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
            {/* Barra de Filtros, Busca e Modo de Visualização */}
            <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
              {/* Filtros por Status */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 xl:pb-0 scrollbar-none">
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

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Alternador de Modo de Visualização: Simplificada vs Detalhada */}
                <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleOrdersViewMode("simplified")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      ordersViewMode === "simplified"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Visualização em lista simplificada e ágil"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Lista Simplificada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleOrdersViewMode("detailed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      ordersViewMode === "detailed"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Visualização completa com todas as 3 colunas de produção abertas"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Visão Detalhada</span>
                  </button>
                </div>

                {/* Campo de Busca */}
                <div className="relative min-w-[240px] flex-1 sm:flex-none">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-order-search"
                    name="orderSearch"
                    aria-label="Buscar pedido, cliente ou CPF/CNPJ"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar pedido, cliente, CPF/CNPJ..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
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

                  const hasExecOrder = hasExecutionOrderContent(addr?.executionOrder);
                  const orderHasAnyDeviation =
                    Boolean(addr?.customerNotes && addr.customerNotes.trim()) ||
                    Boolean(order.order_number?.startsWith("CUST-")) ||
                    Boolean(addr?.executionOrder?.priority === "urgent") ||
                    (order.items || []).some((it, idx) => getItemAlertInfo(order, it, sheets[idx], idx).hasDeviation);

                  const isExpanded = ordersViewMode === "detailed" || expandedOrderIds.has(order.$id);
                  const firstItem = order.items?.[0];
                  const firstSheet = sheets[0] || null;
                  const firstItemThumb = firstItem ? getItemCabinetImage(firstItem, firstSheet) : "";
                  const totalItemsQty = (order.items || []).reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 1;

                  return (
                    <div
                      key={order.$id}
                      className={`bg-slate-900/85 border transition-all shadow-xl ${
                        isExpanded ? "rounded-3xl p-4 sm:p-6 space-y-4" : "rounded-2xl p-4 sm:p-5 hover:border-indigo-500/50"
                      } ${
                        orderHasAnyDeviation
                          ? "border-amber-400/70 hover:border-amber-400 shadow-amber-500/10"
                          : "border-slate-800"
                      }`}
                    >
                      {!isExpanded ? (
                        /* ======================================================== */
                        /* MODO: LISTA SIMPLIFICADA (RESUMO EXECUTIVO ÁGIL)        */
                        /* ======================================================== */
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                          {/* Bloco 1: Pedido, Status, Pagamento e Data */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-white text-base font-mono tracking-tight">
                                  {order.order_number}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${statusInfo.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  <span>{statusInfo.label}</span>
                                </span>
                                {orderHasAnyDeviation && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Atenção Fábrica</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                                <span>{new Date(order.$createdAt).toLocaleString("pt-BR")}</span>
                                <span>•</span>
                                <span className="text-slate-300 font-bold">{payMethod === "credit_card" ? "Cartão de Crédito" : "Pix à Vista"}</span>
                                <span>•</span>
                                <span className="text-cyan-400">{shipping.name}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bloco 2: Cliente */}
                          <div className="flex items-center gap-3 xl:border-l xl:border-slate-800/80 xl:pl-4 shrink-0 min-w-[190px]">
                            <div className="space-y-0.5 text-xs">
                              <p className="font-bold text-white text-sm truncate max-w-[200px]">
                                {order.customer_name || "Cliente não informado"}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                <span>{order.customer_document || "—"}</span>
                                {addr?.city && (
                                  <span className="text-slate-500">
                                    • {addr.city}/{addr.state}
                                  </span>
                                )}
                              </p>
                            </div>
                            {waHref && (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors shrink-0"
                                title="Falar com o cliente no WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          {/* Bloco 3: Totens e Equipamentos */}
                          <div className="flex items-center gap-3 xl:border-l xl:border-slate-800/80 xl:pl-4 flex-1 min-w-[200px]">
                            {firstItemThumb && (
                              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                                <img src={firstItemThumb} alt="Totem" className="w-full h-full object-contain" />
                              </div>
                            )}
                            <div className="text-xs space-y-0.5">
                              <p className="font-extrabold text-slate-200">
                                {totalItemsQty} {totalItemsQty > 1 ? "gabinetes" : "gabinete"}{" "}
                                <span className="font-normal text-slate-400">
                                  ({order.items?.map((it) => it.cabinet_name).join(", ") || "Configuração Padrão"})
                                </span>
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                {firstItem?.color_name && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                    {firstItem.color_name}
                                  </span>
                                )}
                                {firstItem?.monitor_name && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/30">
                                    Monitor: {firstItem.monitor_name}
                                  </span>
                                )}
                                {firstItem?.printer_name && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/30">
                                    Impressora: {firstItem.printer_name}
                                  </span>
                                )}
                                {Boolean(firstSheet?.assemblyService?.includes("Montagem Especializada") || firstItem?.monitor_name?.includes("100% Montado")) && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                                    <Wrench className="w-2.5 h-2.5" />
                                    Montagem de Fábrica (+R$ 999)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bloco 4: Financeiro */}
                          <div className="xl:border-l xl:border-slate-800/80 xl:pl-4 text-left xl:text-right shrink-0 min-w-[130px]">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Total do Pedido
                            </span>
                            <span className="text-base sm:text-lg font-black text-emerald-400 font-mono block">
                              {formatBRL(order.total_cents)}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              Frete: {order.shipping_cents > 0 ? formatBRL(order.shipping_cents) : "Isento"}
                            </span>
                          </div>

                          {/* Bloco 5: Botões de Ação com 'Ver em Detalhes' */}
                          <div className="flex items-center gap-2 flex-wrap shrink-0 xl:border-l xl:border-slate-800/80 xl:pl-4">
                            {/* Botão de Ver em Detalhes */}
                            <button
                              type="button"
                              onClick={() => toggleOrderExpanded(order.$id)}
                              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
                              title="Ver dados completos deste pedido em 3 colunas"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver em Detalhes</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Seletor rápido de Status */}
                            <select
                              id={`order-status-simplified-${order.$id}`}
                              name={`orderStatus-${order.$id}`}
                              aria-label={`Mudar status do pedido ${order.order_number}`}
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.$id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                            >
                              {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                                <option key={k} value={k}>
                                  Mudar: {cfg.label}
                                </option>
                              ))}
                            </select>

                            {/* Botão Editar Pedido */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditOrder(order, "all")}
                              className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 transition-all cursor-pointer shrink-0"
                              title="Editar dados deste pedido"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Excluir Pedido */}
                            <button
                              type="button"
                              onClick={() => setDeletingOrder(order)}
                              className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shrink-0"
                              title="Excluir este pedido permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ======================================================== */
                        /* MODO: VISÃO DETALHADA COMPLETA (3 COLUNAS DE FÁBRICA)   */
                        /* ======================================================== */
                        <>
                          {/* Topo do Card: Número do Pedido, Status, Pagamento, Método de Entrega e Ações */}
                          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
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

                              {/* Badge Ordem de Execução Ativa */}
                              {hasExecOrder && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/50 flex items-center gap-1.5">
                                  <ClipboardCheck className="w-3.5 h-3.5 text-indigo-300" />
                                  <span>
                                    O.S. Técnica ({addr?.executionOrder?.attachments?.length || 0} mídia/s)
                                  </span>
                                </span>
                              )}

                              {/* Badge Alerta Fora do Padrão / Observação no Topo */}
                              {orderHasAnyDeviation && (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border-2 border-amber-400 flex items-center gap-1.5 animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                                  <span>ATENÇÃO: FORA DO PADRÃO / OBSERVAÇÃO</span>
                                </span>
                              )}

                              <span className="text-xs text-slate-500 font-mono">
                                {new Date(order.$createdAt).toLocaleString("pt-BR")}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Botão Recolher Detalhes (quando aberto em modo simplificado) */}
                              {ordersViewMode === "simplified" && (
                                <button
                                  type="button"
                                  onClick={() => toggleOrderExpanded(order.$id)}
                                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                                  title="Recolher para lista simplificada"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>Recolher Detalhes</span>
                                </button>
                              )}
                          {/* Seletor rápido de Status */}
                          <select
                            id={`order-status-detailed-${order.$id}`}
                            name={`orderStatus-${order.$id}`}
                            aria-label={`Mudar status do pedido ${order.order_number}`}
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

                          {/* Botão Direto: Ordem de Execução (Fotos, Vídeos & Dados Técnicos) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditOrder(order, "execution")}
                            className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                            title="Abrir Editor Rico da Ordem de Execução para anexar fotos, vídeos e dados técnicos"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Ordem de Execução (Fotos & Vídeos)</span>
                          </button>

                          {/* 1-) Botão Editar Pedido */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditOrder(order, "all")}
                            className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                            title="Editar dados, itens, equipamentos ou observações deste pedido"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar Pedido</span>
                          </button>

                          {/* 1-) Botão Excluir Pedido */}
                          <button
                            type="button"
                            onClick={() => setDeletingOrder(order)}
                            className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                            title="Excluir este pedido permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>

                          {/* Botão de Ver Pedido Completo & Ficha CNC */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all shrink-0 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Pedido Completo & Ficha CNC</span>
                          </button>
                        </div>
                      </div>

                      {/* Painel de Conferência em 3 Colunas: (1) Cliente & Endereço [3 cols], (2) Entrega & Pagamento [3 cols], (3) Detalhes na Escolha & Alertas [6 cols] */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 text-xs">
                        {/* 1-) CLIENTE & ENDEREÇO DE ENTREGA */}
                        <div className="lg:col-span-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span>1. Cliente & Endereço</span>
                              </span>
                              {addr?.street && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyAddress(order.$id, addr, order.customer_name)}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                                  title="Copiar endereço completo para etiqueta de envio"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{copiedAddressId === order.$id ? "Copiado!" : "Copiar"}</span>
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
                        <div className="lg:col-span-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between">
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 shrink-0" />
                              <span>2. Entrega & Pagamento</span>
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

                        {/* 3-) DETALHES NA ESCOLHA (FOTO DO GABINETE, EQUIPAMENTOS EM DESTAQUE & ALERTAS FORA DO PADRÃO) */}
                        <div className="lg:col-span-6 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5" />
                                <span>
                                  3. Detalhes na Escolha, Equipamentos & Alertas de Produção ({order.items?.length || 0} item/ns)
                                </span>
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditOrder(order, "execution")}
                                  className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>+ Anexar Fotos / Vídeos / Ordem de Execução</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditOrder(order, "all")}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>+ Observação / Editar Itens</span>
                                </button>
                              </div>
                            </div>

                            {/* Visualização da Ordem de Execução & Anexos Multimídia (se preenchido) */}
                            {hasExecOrder && (
                              <OrderExecutionViewer
                                orderNumber={order.order_number}
                                customerName={order.customer_name}
                                executionOrder={addr?.executionOrder}
                                onEditClick={() => handleOpenEditOrder(order, "execution")}
                                compact
                              />
                            )}

                            {/* Alerta Geral de Observação do Pedido (se houver no nível do pedido) */}
                            {addr?.customerNotes && addr.customerNotes.trim().length > 0 && (
                              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/25 via-rose-500/20 to-amber-500/25 border-2 border-amber-400 space-y-1 shadow-lg shadow-amber-500/10">
                                <div className="flex items-center gap-1.5 text-amber-300 font-black text-[11px] uppercase tracking-wider">
                                  <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                                  <span>⚠️ OBSERVAÇÃO GERAL DO PEDIDO / EXPEDIÇÃO</span>
                                </div>
                                <p className="text-xs sm:text-sm font-extrabold text-white bg-black/40 p-2 rounded-lg border border-amber-400/40">
                                  {addr.customerNotes}
                                </p>
                              </div>
                            )}

                            {/* Lista Integral de Itens (Sem corte de scroll max-h-56) */}
                            <div className="space-y-3">
                              {order.items?.map((it, idx) => {
                                const sheet = sheets[idx] || null;
                                const cabinetImg = getItemCabinetImage(it, sheet);
                                const cabinetCategory = getCabinetCategoryLabel(it.cabinet_name);
                                const alertInfo = getItemAlertInfo(order, it, sheet, idx);
                                const isBlackColor = (it.color_name || "").toLowerCase().includes("preto");

                                return (
                                  <div
                                    key={it.$id || idx}
                                    className={`p-3 rounded-2xl border space-y-2.5 text-[11px] transition-all ${
                                      alertInfo.hasDeviation
                                        ? "bg-amber-950/20 border-2 border-amber-400/80 shadow-lg shadow-amber-500/10"
                                        : "bg-slate-900/95 border-slate-800"
                                    }`}
                                  >
                                    {/* Linha Superior do Item: Foto do Gabinete + Nome + Acabamento + Valor */}
                                    <div className="flex items-start gap-3 pb-2.5 border-b border-slate-800/80">
                                      {/* Miniatura Real do Gabinete Escolhido */}
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white p-1.5 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden shadow-md">
                                        <img
                                          src={cabinetImg}
                                          alt={it.cabinet_name}
                                          className="w-full h-full object-contain"
                                        />
                                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-950/90 text-white font-black text-[10px] font-mono shadow">
                                          {it.quantity}x
                                        </span>
                                      </div>

                                      {/* Identificação do Gabinete e Cor */}
                                      <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black text-[9px] uppercase tracking-wider">
                                            {cabinetCategory}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            {alertInfo.hasDeviation ? (
                                              <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-amber-300 font-black text-[9px] uppercase flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>FORA DO PADRÃO / OBS</span>
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[9px] uppercase">
                                                ✓ Padrão Homologado
                                              </span>
                                            )}
                                            <span className="font-black text-indigo-400 font-mono text-xs sm:text-sm">
                                              {formatBRL(it.subtotal_cents)}
                                            </span>
                                          </div>
                                        </div>

                                        <p className="font-extrabold text-white text-xs sm:text-sm leading-tight">
                                          {it.quantity}x {it.cabinet_name}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pt-0.5">
                                          <span className="inline-flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                                            <span
                                              className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                                              style={{ backgroundColor: isBlackColor ? "#18181b" : "#f8fafc" }}
                                            />
                                            <span className="text-slate-400">Cor:</span>
                                            <strong className="text-white">{it.color_name}</strong>
                                          </span>

                                          {sheet?.dimensionsMm?.heightMm && (
                                            <span className="text-[10px] font-mono text-slate-400">
                                              Medidas: {sheet.dimensionsMm.heightMm}×{sheet.dimensionsMm.widthMm}×
                                              {sheet.dimensionsMm.depthMm}mm
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* DESTAQUE DOS EQUIPAMENTOS ESCOLHIDOS: MONITOR, IMPRESSORA E LEITOR */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      {/* MONITOR ESCOLHIDO (EM DESTAQUE) */}
                                      <div
                                        className={`p-2.5 rounded-xl border space-y-0.5 ${
                                          alertInfo.isCustomMonitor
                                            ? "bg-amber-500/20 border-2 border-amber-400"
                                            : "bg-cyan-950/55 border-cyan-500/40"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                                            <Monitor className="w-3 h-3 shrink-0" />
                                            <span>Monitor Escolhido</span>
                                          </span>
                                          {alertInfo.isCustomMonitor && (
                                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase">
                                              SOB MEDIDA
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-extrabold text-white text-xs leading-snug">
                                          {it.monitor_name || "Nenhum"}
                                        </p>
                                      </div>

                                      {/* IMPRESSORA ESCOLHIDA (EM DESTAQUE) */}
                                      <div
                                        className={`p-2.5 rounded-xl border space-y-0.5 ${
                                          alertInfo.isCustomPrinter
                                            ? "bg-amber-500/20 border-2 border-amber-400"
                                            : "bg-indigo-950/55 border-indigo-500/40"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                                            <Printer className="w-3 h-3 shrink-0" />
                                            <span>Impressora Escolhida</span>
                                          </span>
                                          {alertInfo.isCustomPrinter && (
                                            <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 uppercase">
                                              ESPECIAL
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-extrabold text-white text-xs leading-snug">
                                          {it.printer_name || "Nenhuma"}
                                        </p>
                                      </div>

                                      {/* LEITOR 2D / QR CODE */}
                                      <div
                                        className={`p-2.5 rounded-xl border space-y-0.5 ${
                                          alertInfo.isCustomReader
                                            ? "bg-amber-500/20 border-2 border-amber-400"
                                            : "bg-purple-950/40 border-purple-500/30"
                                        }`}
                                      >
                                        <span className="text-[9px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                                          <QrCode className="w-3 h-3 shrink-0" />
                                          <span>Leitor 2D / QR</span>
                                        </span>
                                        <p className="font-bold text-slate-100 text-xs leading-snug">
                                          {it.reader_name || "Sem leitor"}
                                        </p>
                                      </div>

                                      {/* SERVIÇO DE MONTAGEM DE FÁBRICA (SE CONTRATADO) */}
                                      {Boolean(sheet?.assemblyService?.includes("Montagem Especializada") || it.monitor_name?.includes("100% Montado")) && (
                                        <div className="p-2.5 rounded-xl border bg-amber-500/15 border-amber-400 text-amber-200 space-y-1 sm:col-span-2">
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                              <Wrench className="w-3.5 h-3.5 shrink-0" />
                                              <span>Serviço Especializado de Montagem de Fábrica Contratado</span>
                                            </span>
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-400 text-slate-950 uppercase">
                                              + R$ 999,00
                                            </span>
                                          </div>
                                          <p className="font-bold text-white text-xs leading-snug">
                                            ⚙️ ATENÇÃO PRODUÇÃO / BANCADA: O cliente contratou a montagem completa deste totem. Entregar 100% montado de fábrica, com componentes fixados, fiação travada e testado em bancada. Não despachar em caixas desmontadas!
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* 🚨 CAIXA DE ALTA EVIDÊNCIA: ITEM FORA DO PADRÃO / MEDIDAS ESPECIAIS / OBSERVAÇÃO DO CLIENTE / FOTOS & VÍDEOS DO ITEM */}
                                    {alertInfo.hasDeviation ? (
                                      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/25 via-rose-500/20 to-amber-500/25 border-2 border-amber-400 space-y-2 shadow-md">
                                        <div className="flex items-center gap-1.5 text-amber-300 font-black text-[10px] sm:text-[11px] uppercase tracking-wider">
                                          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                                          <span>
                                            ⚠️ ATENÇÃO FÁBRICA: ITEM FORA DO PADRÃO / OBSERVAÇÃO OU MÍDIA ANEXADA
                                          </span>
                                        </div>

                                        {alertInfo.isCustomMonitor && alertInfo.cutoutText && (
                                          <div className="p-2 rounded-lg bg-black/50 border border-amber-400/50 text-amber-100 font-mono text-[11px]">
                                            <span className="text-amber-300 font-bold block uppercase text-[10px]">
                                              📐 Medidas de Corte CNC / Monitor Sob Medida:
                                            </span>
                                            {alertInfo.cutoutText}
                                          </div>
                                        )}

                                        {alertInfo.itemNote && (
                                          <div className="p-2.5 rounded-lg bg-black/60 border border-rose-400/60 text-white">
                                            <span className="text-rose-300 font-black block uppercase text-[10px] mb-0.5">
                                              📝 Observação Escrita para este Gabinete:
                                            </span>
                                            <p className="text-xs sm:text-sm font-extrabold text-amber-200 whitespace-pre-wrap">
                                              {alertInfo.itemNote}
                                            </p>
                                          </div>
                                        )}

                                        {alertInfo.itemAttachments && alertInfo.itemAttachments.length > 0 && (
                                          <div className="space-y-1.5 pt-1">
                                            <span className="text-cyan-300 font-black block uppercase text-[10px]">
                                              📎 Fotos & Vídeos Técnicos deste Gabinete ({alertInfo.itemAttachments.length}):
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {alertInfo.itemAttachments.map((att) => (
                                                <div
                                                  key={att.id}
                                                  className="p-2 rounded-lg bg-black/70 border border-slate-700 space-y-1"
                                                >
                                                  {att.type === "video" ? (
                                                    <video
                                                      src={att.url}
                                                      controls
                                                      preload="metadata"
                                                      className="w-full h-32 object-contain rounded bg-black"
                                                    />
                                                  ) : (
                                                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                                                      <img
                                                        src={att.url}
                                                        alt={att.caption}
                                                        className="w-full h-32 object-contain rounded bg-black"
                                                      />
                                                    </a>
                                                  )}
                                                  <p className="text-[10px] font-bold text-slate-200 truncate">
                                                    {att.caption}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {alertInfo.engineeringNote && (
                                          <p className="text-[11px] text-amber-200 font-semibold">
                                            🔧 Parecer Engenharia: {alertInfo.engineeringNote}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      sheet?.screenSpecs?.screenCutoutMm && (
                                        <p className="text-[10px] text-slate-400 pl-2 border-l-2 border-cyan-500/40">
                                          Corte CNC: {sheet.screenSpecs.screenCutoutMm}
                                        </p>
                                      )
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
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
        {activeTab === "logs" && <SystemLogsManager />}

        {/* ======================================================== */}
        {/* ABA: TELEMETRIA DE ERROS E DIAGNÓSTICO IA */}
        {/* ======================================================== */}
        {activeTab === "telemetry" && <TelemetryErrorsManager />}

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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditOrder(selectedOrder, "execution")}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/25 via-indigo-500/20 to-cyan-500/20 hover:from-amber-500/35 hover:to-cyan-500/30 text-amber-200 text-xs font-extrabold flex items-center gap-1.5 border border-amber-400/50 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ordem de Execução (Fotos & Vídeos)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditOrder(selectedOrder, "all")}
                    className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Pedido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingOrder(selectedOrder)}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold flex items-center gap-1.5 border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
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
                {/* ORDEM DE EXECUÇÃO & DADOS TÉCNICOS MULTIMÍDIA (FOTOS, VÍDEOS, TEXTO RICO E CHECKLIST) */}
                {modalAddr?.executionOrder && hasExecutionOrderContent(modalAddr.executionOrder) ? (
                  <OrderExecutionViewer
                    orderNumber={selectedOrder.order_number}
                    customerName={selectedOrder.customer_name}
                    executionOrder={modalAddr.executionOrder}
                    onEditClick={() => handleOpenEditOrder(selectedOrder, "execution")}
                  />
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-dashed border-amber-500/40 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white">
                          Ordem de Execução & Ficha Técnica Multimídia (O.S. CNC)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Anexe fotos enviadas pelo cliente, vídeos de demonstração, medidas técnicas em texto rico e checklist de produção.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEditOrder(selectedOrder, "execution")}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Criar Ordem de Execução (Fotos, Vídeos & Texto)</span>
                    </button>
                  </div>
                )}

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

                {/* Alerta de Observação Geral do Pedido no Modal */}
                {modalAddr?.customerNotes && modalAddr.customerNotes.trim().length > 0 && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-rose-500/20 to-amber-500/25 border-2 border-amber-400 space-y-1.5 shadow-lg shadow-amber-500/10">
                    <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>⚠️ OBSERVAÇÃO GERAL DO PEDIDO / INSTRUÇÃO DO CLIENTE</span>
                    </div>
                    <p className="text-xs sm:text-sm font-extrabold text-white bg-black/40 p-3 rounded-xl border border-amber-400/50 whitespace-pre-wrap">
                      {modalAddr.customerNotes}
                    </p>
                  </div>
                )}

                {/* LINHA 2: DETALHES NA ESCOLHA (ESPELHO COMERCIAL + FOTOS + EQUIPAMENTOS EM DESTAQUE + FICHA TÉCNICA CNC) */}
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

                  <div className="space-y-3.5">
                    {selectedOrder.items?.map((item, idx) => {
                      const sheet = modalSheets[idx] || null;
                      const cabinetImg = getItemCabinetImage(item, sheet);
                      const cabinetCategory = getCabinetCategoryLabel(item.cabinet_name);
                      const alertInfo = getItemAlertInfo(selectedOrder, item, sheet, idx);

                      return (
                        <div
                          key={item.$id || idx}
                          className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 text-xs ${
                            alertInfo.hasDeviation
                              ? "bg-amber-950/20 border-2 border-amber-400"
                              : "bg-slate-950 border-slate-800/90"
                          }`}
                        >
                          {/* Cabeçalho do Item com Foto do Gabinete */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white p-1.5 border border-slate-700 shrink-0 flex items-center justify-center overflow-hidden shadow-md">
                                <img
                                  src={cabinetImg}
                                  alt={item.cabinet_name}
                                  className="w-full h-full object-contain"
                                />
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-slate-950/90 text-white font-black text-[10px] font-mono">
                                  #{idx + 1}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black text-[9px] uppercase tracking-wider inline-block">
                                  {cabinetCategory}
                                </span>
                                <h5 className="font-extrabold text-sm sm:text-base text-white">
                                  {item.quantity}x {item.cabinet_name}
                                </h5>
                                <p className="text-[11px] text-slate-400">
                                  Valor Unitário: <strong className="text-slate-200">{formatBRL(item.unit_price_cents)}</strong>
                                </p>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              {alertInfo.hasDeviation && (
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-amber-300 font-black text-[10px] uppercase inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>ITEM FORA DO PADRÃO / OBS</span>
                                </span>
                              )}
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase font-bold block">Subtotal do Item</span>
                                <span className="text-base font-black text-indigo-400 font-mono">
                                  {formatBRL(item.subtotal_cents)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Escolhas do Cliente em Destaque no Configurador */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                                Acabamento / Cor
                              </span>
                              <strong className="text-white text-xs sm:text-sm">{item.color_name}</strong>
                            </div>
                            <div
                              className={`p-3 rounded-xl border ${
                                alertInfo.isCustomMonitor
                                  ? "bg-amber-500/20 border-2 border-amber-400"
                                  : "bg-cyan-950/60 border-cyan-500/40"
                              }`}
                            >
                              <span className="text-[10px] font-black uppercase text-cyan-300 flex items-center gap-1 mb-0.5">
                                <Monitor className="w-3.5 h-3.5" />
                                <span>Monitor Escolhido</span>
                              </span>
                              <strong className="text-white text-xs sm:text-sm block">
                                {item.monitor_name || "Nenhum"}
                              </strong>
                            </div>
                            <div
                              className={`p-3 rounded-xl border ${
                                alertInfo.isCustomPrinter
                                  ? "bg-amber-500/20 border-2 border-amber-400"
                                  : "bg-indigo-950/60 border-indigo-500/40"
                              }`}
                            >
                              <span className="text-[10px] font-black uppercase text-indigo-300 flex items-center gap-1 mb-0.5">
                                <Printer className="w-3.5 h-3.5" />
                                <span>Impressora Escolhida</span>
                              </span>
                              <strong className="text-white text-xs sm:text-sm block">
                                {item.printer_name || "Nenhuma"}
                              </strong>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30">
                              <span className="text-[10px] font-black uppercase text-purple-300 flex items-center gap-1 mb-0.5">
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Leitor / Scanner 2D</span>
                              </span>
                              <strong className="text-white text-xs sm:text-sm block">
                                {item.reader_name || "Sem leitor frontal"}
                              </strong>
                            </div>
                          </div>

                          {/* Alerta de Evidência de Item Fora do Padrão / Observação no Modal */}
                          {alertInfo.hasDeviation && (
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/25 via-rose-500/20 to-amber-500/25 border-2 border-amber-400 space-y-2">
                              <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs uppercase tracking-wider">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>⚠️ ATENÇÃO PRODUÇÃO: ESPECIFICAÇÃO ESPECIAL / OBSERVAÇÃO</span>
                              </div>
                              {alertInfo.isCustomMonitor && alertInfo.cutoutText && (
                                <div className="p-2.5 rounded-lg bg-black/50 border border-amber-400/50 text-amber-100 font-mono text-xs">
                                  <strong className="text-amber-300 block uppercase text-[10px]">
                                    Medidas do Monitor Sob Medida:
                                  </strong>
                                  {alertInfo.cutoutText}
                                </div>
                              )}
                              {alertInfo.itemNote && (
                                <div className="p-2.5 rounded-lg bg-black/60 border border-rose-400/60 text-white">
                                  <strong className="text-rose-300 block uppercase text-[10px] mb-0.5">
                                    Observação Escrita para este Item:
                                  </strong>
                                  <p className="text-xs sm:text-sm font-extrabold text-amber-200 whitespace-pre-wrap">
                                    {alertInfo.itemNote}
                                  </p>
                                </div>
                              )}
                              {alertInfo.itemAttachments && alertInfo.itemAttachments.length > 0 && (
                                <div className="pt-1 space-y-2">
                                  <strong className="text-cyan-300 block uppercase text-[10px]">
                                    Anexos Técnicos deste Item ({alertInfo.itemAttachments.length}):
                                  </strong>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {alertInfo.itemAttachments.map((att) => (
                                      <div
                                        key={att.id}
                                        className="rounded-xl overflow-hidden bg-slate-950 border border-slate-700"
                                      >
                                        {att.type === "video" ? (
                                          <video
                                            src={att.url}
                                            controls
                                            preload="metadata"
                                            className="w-full h-36 object-cover bg-black"
                                          />
                                        ) : (
                                          <a href={att.url} target="_blank" rel="noopener noreferrer">
                                            <img
                                              src={att.url}
                                              alt={att.caption || att.fileName}
                                              className="w-full h-36 object-cover bg-black hover:opacity-90 transition-opacity"
                                            />
                                          </a>
                                        )}
                                        <div className="p-2 text-[10px] font-bold text-slate-200 truncate">
                                          {att.caption || att.fileName}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

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

      {/* ======================================================== */}
      {/* MODAL: EDIÇÃO COMPLETA DO PEDIDO + ORDEM DE EXECUÇÃO MULTIMÍDIA */}
      {/* ======================================================== */}
      {editingOrder && editOrderForm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveOrderEdit}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[95dvh] flex flex-col overflow-hidden shadow-2xl relative animate-fade-in"
          >
            {/* Header Fixo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-slate-800 bg-slate-900/95 shrink-0">
              <div>
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edição Administrativa & Ordem de Execução Técnica (O.S.)</span>
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-white font-mono mt-0.5">
                  {editingOrder.order_number} — {editOrderForm.customer_name}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Seletor rápido de modo no modal */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditModalFocusSection("execution")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      editModalFocusSection === "execution"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ordem de Execução (Fotos, Vídeos & Texto)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModalFocusSection("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                      editModalFocusSection === "all"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Pedido Completo (Cliente, Itens & Tudo)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingOrder(null);
                    setEditOrderForm(null);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Corpo Rolável do Formulário */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6 text-xs">
              {/* ===================================================================== */}
              {/* BLOCO PRINCIPAL: EDITOR POTENTE DE ORDEM DE EXECUÇÃO (TEXTO, FOTOS E VÍDEOS) */}
              {/* ===================================================================== */}
              <OrderExecutionEditor
                orderNumber={editingOrder.order_number}
                value={editOrderForm.execution_order}
                onChange={(nextExecutionOrder) =>
                  setEditOrderForm({
                    ...editOrderForm,
                    execution_order: nextExecutionOrder,
                  })
                }
              />

              {editModalFocusSection === "execution" && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-slate-400 text-xs">
                    Deseja também alterar dados do cliente, endereço, valores ou anexar fotos/vídeos a um item específico?
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditModalFocusSection("all")}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Mostrar Campos Comerciais e Itens do Pedido</span>
                  </button>
                </div>
              )}

              {editModalFocusSection === "all" && (
                <>
                  {/* 1. Status, Pagamento e Observação Geral de Alerta */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <h4 className="font-black text-indigo-400 uppercase text-[11px] tracking-wider">
                      Status, Pagamento & Alerta Geral de Produção
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Status do Pedido</label>
                        <select
                          value={editOrderForm.status}
                          onChange={(e) => setEditOrderForm({ ...editOrderForm, status: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500"
                        >
                          {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                            <option key={k} value={k}>
                              {cfg.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Método de Pagamento</label>
                        <select
                          value={editOrderForm.payment_method}
                          onChange={(e) =>
                            setEditOrderForm({
                              ...editOrderForm,
                              payment_method: e.target.value as "pix" | "credit_card",
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="pix">PIX à Vista</option>
                          <option value="credit_card">Cartão de Crédito</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-1.5">
                      <label className="block text-amber-300 font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>⚠️ Observação Geral do Pedido / Instrução em Destaque para Fábrica ou Expedição:</span>
                      </label>
                      <textarea
                        rows={2}
                        value={editOrderForm.order_notes}
                        onChange={(e) => setEditOrderForm({ ...editOrderForm, order_notes: e.target.value })}
                        placeholder="Se preenchido, ficará em evidência máxima (alerta amarelo/vermelho) no card do pedido para evitar qualquer erro na entrega..."
                        className="w-full px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* 2. Dados do Cliente & Endereço de Entrega */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h4 className="font-black text-indigo-400 uppercase text-[11px] tracking-wider">
                        1. Dados do Cliente
                      </h4>
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Nome / Razão Social</label>
                          <input
                            type="text"
                            value={editOrderForm.customer_name}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">CPF / CNPJ</label>
                          <input
                            type="text"
                            value={editOrderForm.customer_document}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_document: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">WhatsApp</label>
                            <input
                              type="text"
                              value={editOrderForm.customer_whatsapp}
                              onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_whatsapp: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">E-mail</label>
                            <input
                              type="email"
                              value={editOrderForm.customer_email}
                              onChange={(e) => setEditOrderForm({ ...editOrderForm, customer_email: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h4 className="font-black text-cyan-400 uppercase text-[11px] tracking-wider">
                        Endereço de Entrega
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">CEP</label>
                          <input
                            type="text"
                            value={editOrderForm.cep}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, cep: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-slate-400 font-semibold mb-1">Rua / Logradouro</label>
                          <input
                            type="text"
                            value={editOrderForm.street}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, street: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Número</label>
                          <input
                            type="text"
                            value={editOrderForm.number}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, number: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-slate-400 font-semibold mb-1">Complemento</label>
                          <input
                            type="text"
                            value={editOrderForm.complement}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, complement: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-2">
                          <label className="block text-slate-400 font-semibold mb-1">Bairro</label>
                          <input
                            type="text"
                            value={editOrderForm.neighborhood}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, neighborhood: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-slate-400 font-semibold mb-1">Cidade</label>
                          <input
                            type="text"
                            value={editOrderForm.city}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, city: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">UF</label>
                          <input
                            type="text"
                            maxLength={2}
                            value={editOrderForm.state}
                            onChange={(e) => setEditOrderForm({ ...editOrderForm, state: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Método de Entrega & Valores Financeiros */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-black text-cyan-400 uppercase text-[11px] tracking-wider">
                        2. Método de Entrega & Valores Financeiros
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const itemsSum = editOrderForm.items.reduce((acc, i) => acc + (Number(i.subtotal_cents) || 0), 0);
                          const disc = Number(editOrderForm.discount_cents) || 0;
                          const ship = Number(editOrderForm.shipping_cents) || 0;
                          setEditOrderForm({
                            ...editOrderForm,
                            subtotal_cents: itemsSum,
                            total_cents: Math.max(0, itemsSum - disc + ship),
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold text-[10px] cursor-pointer"
                      >
                        Recalcular Total pelos Itens + Frete
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="lg:col-span-2">
                        <label className="block text-slate-400 font-semibold mb-1">Modalidade de Frete (PAC, SEDEX, etc.)</label>
                        <input
                          type="text"
                          value={editOrderForm.shipping_name}
                          onChange={(e) => setEditOrderForm({ ...editOrderForm, shipping_name: e.target.value })}
                          placeholder="Ex: PAC (Correios) ou SEDEX (Correios)"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Subtotal Gabinetes (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(editOrderForm.subtotal_cents / 100).toFixed(2)}
                          onChange={(e) =>
                            setEditOrderForm({
                              ...editOrderForm,
                              subtotal_cents: Math.round((parseFloat(e.target.value) || 0) * 100),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Valor do Frete (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(editOrderForm.shipping_cents / 100).toFixed(2)}
                          onChange={(e) =>
                            setEditOrderForm({
                              ...editOrderForm,
                              shipping_cents: Math.round((parseFloat(e.target.value) || 0) * 100),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-cyan-300 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-emerald-400 font-bold mb-1">Total Pago (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={(editOrderForm.total_cents / 100).toFixed(2)}
                          onChange={(e) =>
                            setEditOrderForm({
                              ...editOrderForm,
                              total_cents: Math.round((parseFloat(e.target.value) || 0) * 100),
                            })
                          }
                          className="w-full px-3 py-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono font-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Itens do Pedido, Equipamentos (Monitor/Impressora), Observações e Anexos por Gabinete */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-emerald-400 uppercase text-[11px] tracking-wider">
                        3. Itens do Pedido, Monitor, Impressora, Especificações & Fotos/Vídeos por Item ({editOrderForm.items.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          setEditOrderForm({
                            ...editOrderForm,
                            items: [
                              ...editOrderForm.items,
                              {
                                cabinet_name: "Gabinete de Balcão Compacto",
                                color_name: "Branco TX",
                                monitor_name: 'Touch 21.5" Full HD — Mais Vendido',
                                printer_name: "Elgin i9",
                                reader_name: "Sem leitor",
                                unit_price_cents: 120000,
                                quantity: 1,
                                subtotal_cents: 120000,
                                screenCutoutMm: "",
                                customizationNotes: "",
                                itemAttachments: [],
                              },
                            ],
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Item ao Pedido</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {editOrderForm.items.map((it, idx) => (
                        <div
                          key={it.$id || idx}
                          className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-black text-white text-xs">
                              Item #{idx + 1} — {it.cabinet_name}
                            </span>
                            {editOrderForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = editOrderForm.items.filter((_, i) => i !== idx);
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                className="text-rose-400 hover:text-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remover Item</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div className="lg:col-span-2">
                              <label className="block text-slate-400 font-semibold mb-1">Modelo do Gabinete</label>
                              <input
                                type="text"
                                value={it.cabinet_name}
                                onChange={(e) => {
                                  const next = [...editOrderForm.items];
                                  next[idx] = { ...next[idx], cabinet_name: e.target.value };
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Acabamento / Cor</label>
                              <input
                                type="text"
                                value={it.color_name}
                                onChange={(e) => {
                                  const next = [...editOrderForm.items];
                                  next[idx] = { ...next[idx], color_name: e.target.value };
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">Qtd</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={it.quantity}
                                  onChange={(e) => {
                                    const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                                    const next = [...editOrderForm.items];
                                    next[idx] = {
                                      ...next[idx],
                                      quantity: q,
                                      subtotal_cents: q * (next[idx].unit_price_cents || 0),
                                    };
                                    setEditOrderForm({ ...editOrderForm, items: next });
                                  }}
                                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 font-semibold mb-1">Subtotal (R$)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={(it.subtotal_cents / 100).toFixed(2)}
                                  onChange={(e) => {
                                    const sub = Math.round((parseFloat(e.target.value) || 0) * 100);
                                    const next = [...editOrderForm.items];
                                    next[idx] = {
                                      ...next[idx],
                                      subtotal_cents: sub,
                                      unit_price_cents: Math.round(sub / Math.max(1, next[idx].quantity)),
                                    };
                                    setEditOrderForm({ ...editOrderForm, items: next });
                                  }}
                                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-indigo-300 font-mono font-bold"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-cyan-300 font-bold mb-1">Monitor Escolhido</label>
                              <input
                                type="text"
                                value={it.monitor_name}
                                onChange={(e) => {
                                  const next = [...editOrderForm.items];
                                  next[idx] = { ...next[idx], monitor_name: e.target.value };
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                placeholder='Ex: Touch 21.5" Full HD ou Monitor Sob Medida'
                                className="w-full px-3 py-2 bg-cyan-950/30 border border-cyan-500/40 rounded-xl text-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-indigo-300 font-bold mb-1">Impressora Escolhida</label>
                              <input
                                type="text"
                                value={it.printer_name}
                                onChange={(e) => {
                                  const next = [...editOrderForm.items];
                                  next[idx] = { ...next[idx], printer_name: e.target.value };
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                placeholder="Ex: Elgin i9, Epson TM-T20X..."
                                className="w-full px-3 py-2 bg-indigo-950/30 border border-indigo-500/40 rounded-xl text-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-purple-300 font-bold mb-1">Leitor 2D / QR Code</label>
                              <input
                                type="text"
                                value={it.reader_name}
                                onChange={(e) => {
                                  const next = [...editOrderForm.items];
                                  next[idx] = { ...next[idx], reader_name: e.target.value };
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                placeholder="Ex: Sem leitor ou Leitor 2D Fixo"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">
                                Especificação de Corte CNC da Tela / Medidas do Monitor
                              </label>
                              <input
                                type="text"
                                value={it.screenCutoutMm}
                                onChange={(e) => {
                                  const next = [...editOrderForm.items];
                                  next[idx] = { ...next[idx], screenCutoutMm: e.target.value };
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                placeholder="Ex: Monitor Inteiro: 49.6x30cm | Tela: 47.6x27cm..."
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-amber-300 font-extrabold mb-1">
                                ⚠️ Observação Especial / Alerta Fora do Padrão deste Item
                              </label>
                              <input
                                type="text"
                                value={it.customizationNotes}
                                onChange={(e) => {
                                  const next = [...editOrderForm.items];
                                  next[idx] = { ...next[idx], customizationNotes: e.target.value };
                                  setEditOrderForm({ ...editOrderForm, items: next });
                                }}
                                placeholder="Qualquer observação escrita aqui ficará em destaque amarelo/vermelho no card!"
                                className="w-full px-3 py-2 bg-amber-950/30 border border-amber-500/50 rounded-xl text-amber-100 placeholder-slate-500 font-bold"
                              />
                            </div>
                          </div>

                          {/* ANEXOS TÉCNICOS DESTE ITEM (FOTOS E VÍDEOS ESPECÍFICOS DO GABINETE) */}
                          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" />
                                <span>
                                  Fotos & Vídeos Técnicos deste Item ({it.itemAttachments?.length || 0})
                                </span>
                              </span>
                              <label className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors">
                                {uploadingItemIdx === idx ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Enviando mídia...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Anexar Foto ou Vídeo neste Item</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*,video/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      handleUploadItemMedia(idx, e.target.files);
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>

                            {it.itemAttachments && it.itemAttachments.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                {it.itemAttachments.map((att, attIdx) => (
                                  <div
                                    key={att.id}
                                    className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col"
                                  >
                                    <div className="relative h-28 bg-black flex items-center justify-center">
                                      {att.type === "video" ? (
                                        <video
                                          src={att.url}
                                          controls
                                          preload="metadata"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <img
                                          src={att.url}
                                          alt={att.caption || att.fileName}
                                          className="w-full h-full object-cover"
                                        />
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...editOrderForm.items];
                                          next[idx] = {
                                            ...next[idx],
                                            itemAttachments: (next[idx].itemAttachments || []).filter(
                                              (a) => a.id !== att.id
                                            ),
                                          };
                                          setEditOrderForm({ ...editOrderForm, items: next });
                                        }}
                                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center text-xs cursor-pointer"
                                        title="Remover anexo"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                    <div className="p-2">
                                      <input
                                        type="text"
                                        value={att.caption || ""}
                                        onChange={(e) => {
                                          const next = [...editOrderForm.items];
                                          const nextAtts = [...(next[idx].itemAttachments || [])];
                                          nextAtts[attIdx] = { ...nextAtts[attIdx], caption: e.target.value };
                                          next[idx] = { ...next[idx], itemAttachments: nextAtts };
                                          setEditOrderForm({ ...editOrderForm, items: next });
                                        }}
                                        placeholder="Legenda técnica (ex: Foto traseira do monitor)..."
                                        className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Rodapé Fixo de Ações */}
            <div className="px-5 sm:px-7 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setEditOrderForm(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingOrderEdit}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                {isSavingOrderEdit ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando Ordem de Execução & Pedido...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Ordem de Execução & Pedido</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE PEDIDO */}
      {/* ======================================================== */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">
                  Excluir Pedido Permanentemente?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Você está prestes a remover o pedido{" "}
                  <strong className="text-white font-mono">{deletingOrder.order_number}</strong> do cliente{" "}
                  <strong className="text-white">{deletingOrder.customer_name}</strong> no valor de{" "}
                  <strong className="text-emerald-400">{formatBRL(deletingOrder.total_cents)}</strong>.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Esta ação removerá o pedido e seus itens do banco de dados Appwrite e do painel administrativo.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => setDeletingOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={handleConfirmDeleteOrder}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
              >
                {isDeletingOrder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir Pedido</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
