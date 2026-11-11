"use client";

import React, { useState, useMemo } from "react";
import {
  Columns3,
  Clock,
  CheckCircle2,
  Wrench,
  Package,
  Truck,
  AlertTriangle,
  AlertCircle,
  MessageCircle,
  Printer,
  Eye,
  Edit2,
  Plus,
  Trash2,
  Tag,
  CheckSquare,
  Calendar,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Filter,
  ArrowUpDown,
  Flame,
  Paperclip,
  MessageSquare,
  Palette,
  X,
  Send,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { resolveKitEquipmentSummary } from "@/modules/catalog/kitDefaults";

export interface TrelloLabelItem {
  id: string;
  name: string;
  color: string; // bg/border/text tailwind classes or hex
  dotColor: string;
}

export interface TrelloChecklistEntry {
  id: string;
  text: string;
  done: boolean;
}

export interface TrelloCommentEntry {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface TrelloCardMetadata {
  labels?: string[]; // IDs of active labels
  customLabels?: TrelloLabelItem[];
  coverColor?: string | null;
  checklist?: TrelloChecklistEntry[];
  comments?: TrelloCommentEntry[];
  assignedOperator?: string;
  priority?: "normal" | "urgent";
  dueDate?: string;
  columnOrderIndex?: number;
}

export const DEFAULT_TRELLO_LABELS: TrelloLabelItem[] = [
  {
    id: "lbl_urgent",
    name: "🔥 Prioridade Máxima",
    color: "bg-rose-500/20 text-rose-200 border-rose-500/50",
    dotColor: "#f43f5e",
  },
  {
    id: "lbl_cnc_custom",
    name: "📐 Gabarito / Corte Especial",
    color: "bg-amber-500/20 text-amber-200 border-amber-500/50",
    dotColor: "#f59e0b",
  },
  {
    id: "lbl_kit_ok",
    name: "📦 Kit Separado",
    color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50",
    dotColor: "#10b981",
  },
  {
    id: "lbl_waiting_part",
    name: "⏳ Aguardando Peça / Tela",
    color: "bg-orange-500/20 text-orange-200 border-orange-500/50",
    dotColor: "#f97316",
  },
  {
    id: "lbl_electrical_ok",
    name: "⚡ Elétrica & Coolers OK",
    color: "bg-cyan-500/20 text-cyan-200 border-cyan-500/50",
    dotColor: "#06b6d4",
  },
  {
    id: "lbl_nf_ready",
    name: "🧾 NF / Etiqueta Pronta",
    color: "bg-purple-500/20 text-purple-200 border-purple-500/50",
    dotColor: "#a855f7",
  },
  {
    id: "lbl_pickup",
    name: "🏠 Retirada na Fábrica",
    color: "bg-indigo-500/20 text-indigo-200 border-indigo-500/50",
    dotColor: "#6366f1",
  },
  {
    id: "lbl_vip",
    name: "⭐ Cliente Recorrente / B2B",
    color: "bg-pink-500/20 text-pink-200 border-pink-500/50",
    dotColor: "#ec4899",
  },
];

export const CARD_COVER_COLORS = [
  { id: "none", label: "Sem Capa", className: "" },
  { id: "emerald", label: "Verde Produção", className: "bg-gradient-to-r from-emerald-600 to-teal-500" },
  { id: "indigo", label: "Azul Engenharia", className: "bg-gradient-to-r from-indigo-600 to-blue-500" },
  { id: "amber", label: "Âmbar Alerta", className: "bg-gradient-to-r from-amber-500 to-orange-500" },
  { id: "rose", label: "Vermelho Urgente", className: "bg-gradient-to-r from-rose-600 to-pink-600" },
  { id: "purple", label: "Roxo Expedição", className: "bg-gradient-to-r from-purple-600 to-indigo-600" },
  { id: "cyan", label: "Ciano Logística", className: "bg-gradient-to-r from-cyan-600 to-sky-500" },
];

export interface KanbanStageColumn {
  key: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  accentColor: string;
  headerBg: string;
  badgeBg: string;
  borderAccent: string;
  defaultWipLimit: number;
  alwaysVisible: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

export const KANBAN_STAGE_COLUMNS: KanbanStageColumn[] = [
  {
    key: "awaiting_payment",
    title: "Aguardando Pagto",
    shortTitle: "Aguard. Pagto",
    subtitle: "PIX / Cartão pendente ou em recuperação",
    accentColor: "#f59e0b",
    headerBg: "from-amber-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    borderAccent: "border-t-amber-500",
    defaultWipLimit: 15,
    alwaysVisible: true,
    icon: Clock,
  },
  {
    key: "awaiting_custom_analysis",
    title: "Em Análise CNC",
    shortTitle: "Análise CNC",
    subtitle: "Avaliação técnica de corte / gabarito",
    accentColor: "#f97316",
    headerBg: "from-orange-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    borderAccent: "border-t-orange-500",
    defaultWipLimit: 8,
    alwaysVisible: false,
    icon: AlertTriangle,
  },
  {
    key: "custom_approved",
    title: "Orçamento Aprovado",
    shortTitle: "Orç. Aprovado",
    subtitle: "Viabilidade técnica aprovada",
    accentColor: "#06b6d4",
    headerBg: "from-cyan-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    borderAccent: "border-t-cyan-500",
    defaultWipLimit: 8,
    alwaysVisible: false,
    icon: CheckCircle2,
  },
  {
    key: "paid",
    title: "Pago / Confirmado",
    shortTitle: "Pago / Fila",
    subtitle: "Pronto para iniciar corte Router CNC",
    accentColor: "#10b981",
    headerBg: "from-emerald-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    borderAccent: "border-t-emerald-500",
    defaultWipLimit: 10,
    alwaysVisible: true,
    icon: CheckCircle2,
  },
  {
    key: "in_production",
    title: "Em Produção CNC",
    shortTitle: "Produção CNC",
    subtitle: "Usinagem, montagem, elétrica e kit",
    accentColor: "#3b82f6",
    headerBg: "from-blue-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    borderAccent: "border-t-blue-500",
    defaultWipLimit: 6,
    alwaysVisible: true,
    icon: Wrench,
  },
  {
    key: "ready",
    title: "Pronto p/ Expedição",
    shortTitle: "Expedição",
    subtitle: "Conferido, embalado e aguardando coleta",
    accentColor: "#a855f7",
    headerBg: "from-purple-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    borderAccent: "border-t-purple-500",
    defaultWipLimit: 8,
    alwaysVisible: true,
    icon: Package,
  },
  {
    key: "shipped",
    title: "Despachado / Enviado",
    shortTitle: "Despachado",
    subtitle: "Postado nos Correios / Transportadora",
    accentColor: "#6366f1",
    headerBg: "from-indigo-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    borderAccent: "border-t-indigo-500",
    defaultWipLimit: 20,
    alwaysVisible: true,
    icon: Truck,
  },
  {
    key: "delivered",
    title: "Entregue ao Cliente",
    shortTitle: "Entregue",
    subtitle: "Ciclo concluído com sucesso",
    accentColor: "#14b8a6",
    headerBg: "from-teal-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    borderAccent: "border-t-teal-500",
    defaultWipLimit: 50,
    alwaysVisible: true,
    icon: CheckCircle2,
  },
  {
    key: "cancelled",
    title: "Cancelado",
    shortTitle: "Cancelado",
    subtitle: "Pedidos cancelados ou substituídos",
    accentColor: "#f43f5e",
    headerBg: "from-rose-950/80 via-slate-900 to-slate-900",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    borderAccent: "border-t-rose-500",
    defaultWipLimit: 50,
    alwaysVisible: false,
    icon: AlertCircle,
  },
];

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

function cleanDisplayColor(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/\(\s*MaDeFibra\s*BP\s*\)/gi, "")
    .replace(/\bMaDeFibra\s*BP\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Calcula a meta de 5 dias úteis a partir da data do pedido/pagamento
 */
function addBusinessDays(startIso: string, businessDays: number): Date {
  const d = new Date(startIso || Date.now());
  let added = 0;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return d;
}

function buildDefaultTrelloChecklist(order: any): TrelloChecklistEntry[] {
  const firstItem = order.items?.[0];
  const resolved = firstItem
    ? resolveKitEquipmentSummary({
        kitItemsSnapshot: (firstItem as any).kit_items_snapshot || null,
        monitorName: firstItem.monitor_name,
        printerName: firstItem.printer_name,
        readerName: firstItem.reader_name,
      })
    : null;

  const list: TrelloChecklistEntry[] = [
    {
      id: "chk_cnc_cut",
      text: "1. Corte de chapas MDF na Router CNC e acabamento de bordas",
      done: ["ready", "shipped", "delivered"].includes(order.status),
    },
    {
      id: "chk_cutout_check",
      text: "2. Conferência de recorte VESA da tela e rasgo da impressora",
      done: ["ready", "shipped", "delivered"].includes(order.status),
    },
  ];

  if (resolved?.isKit) {
    list.push({
      id: "chk_kit_sep",
      text: `3. Separação de Kit (${
        !resolved.hasMonitorInKit && !resolved.hasPrinterInKit
          ? "ATENÇÃO: SEM TELA E SEM IMPRESSORA"
          : !resolved.hasMonitorInKit
          ? "ATENÇÃO: SEM TELA"
          : !resolved.hasPrinterInKit
          ? "ATENÇÃO: SEM IMPRESSORA"
          : "Kit Completo c/ Tela + Impressora"
      })`,
      done: ["ready", "shipped", "delivered"].includes(order.status),
    });
  }

  list.push(
    {
      id: "chk_accessories",
      text: "4. Kit Complementar: Chave, Trava Monitor, Parafusos, Manuais e Folder",
      done: ["ready", "shipped", "delivered"].includes(order.status),
    },
    {
      id: "chk_pack_label",
      text: "5. Embalagem reforçada lacrada + Etiqueta de Envio / Nota",
      done: ["shipped", "delivered"].includes(order.status),
    }
  );

  return list;
}

export interface OrdersTrelloKanbanBoardProps {
  orders: any[];
  getOrderAddress: (order: any) => any;
  getOrderShipping: (order: any) => any;
  getOrderPaymentMethod: (order: any) => "pix" | "credit_card";
  isOrderConfirmedPaid: (order: any) => boolean;
  getOrderSheets: (order: any) => any[];
  getItemCabinetImage: (item: any, sheet: any) => string;
  getItemAlertInfo: (order: any, item: any, sheet: any, idx: number) => { hasDeviation: boolean };
  onMoveOrderStage: (orderId: string, newStatus: string) => Promise<void> | void;
  onSaveTrelloMetadata: (order: any, nextMeta: TrelloCardMetadata) => Promise<void> | void;
  onOpenOrderDetailsModal: (order: any) => void;
  onOpenEditOrder: (order: any, section?: "all" | "execution" | "payment_proposal") => void;
  onOpenPrintProductionOrder: (order: any) => void;
  onOpenCorreiosLabel: (order: any) => void;
  onSendPaidConfirmation: (order: any, forceResend?: boolean) => void;
  onOpenRemarketingForOrder: (orderNumber: string) => void;
  onDeleteOrder: (order: any) => void;
}

export function OrdersTrelloKanbanBoard({
  orders,
  getOrderAddress,
  getOrderShipping,
  getOrderPaymentMethod,
  isOrderConfirmedPaid,
  getOrderSheets,
  getItemCabinetImage,
  getItemAlertInfo,
  onMoveOrderStage,
  onSaveTrelloMetadata,
  onOpenOrderDetailsModal,
  onOpenEditOrder,
  onOpenPrintProductionOrder,
  onOpenCorreiosLabel,
  onSendPaidConfirmation,
  onOpenRemarketingForOrder,
  onDeleteOrder,
}: OrdersTrelloKanbanBoardProps) {
  // Estados do Quadro Kanban Trello
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverStageKey, setDragOverStageKey] = useState<string | null>(null);
  const [celebratingOrderId, setCelebratingOrderId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [showAllEmptyColumns, setShowAllEmptyColumns] = useState<boolean>(false);
  const [compactCardsMode, setCompactCardsMode] = useState<boolean>(false);
  const [isFullscreenBoard, setIsFullscreenBoard] = useState<boolean>(false);

  // Filtros estilo Trello
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string>("all");
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>("all");
  const [onlyUrgentOrDeviation, setOnlyUrgentOrDeviation] = useState<boolean>(false);
  const [onlyOverdueOrDueSoon, setOnlyOverdueOrDueSoon] = useState<boolean>(false);
  const [columnSortBy, setColumnSortBy] = useState<
    Record<string, "newest" | "oldest" | "value_desc" | "urgent_first">
  >({});

  // Modal de Card Trello Aberto
  const [activeTrelloCardOrderId, setActiveTrelloCardOrderId] = useState<string | null>(null);
  const [newChecklistInput, setNewChecklistInput] = useState<string>("");
  const [newCommentInput, setNewCommentInput] = useState<string>("");
  const [newCustomLabelName, setNewCustomLabelName] = useState<string>("");
  const [newCustomLabelColorIdx, setNewCustomLabelColorIdx] = useState<number>(0);
  const [isSavingCardMeta, setIsSavingCardMeta] = useState<boolean>(false);

  // Cache otimista local de metadados Trello por pedido para resposta em 0ms
  const [optimisticMetaByOrder, setOptimisticMetaByOrder] = useState<
    Record<string, TrelloCardMetadata>
  >({});

  // Extrai os metadados Trello de um pedido (combinando otimista + salvo no Appwrite)
  const getCardMeta = (order: any): TrelloCardMetadata => {
    const addr = getOrderAddress(order) || {};
    const exec = addr.executionOrder || {};
    const savedTrello: TrelloCardMetadata = exec.trelloCard || {};
    const opt = optimisticMetaByOrder[order.$id] || {};

    const checklist =
      opt.checklist ??
      savedTrello.checklist ??
      buildDefaultTrelloChecklist(order);

    const priority =
      opt.priority ??
      savedTrello.priority ??
      (exec.priority === "urgent" ? "urgent" : "normal");

    const assignedOperator =
      opt.assignedOperator ??
      savedTrello.assignedOperator ??
      exec.technicianName ??
      exec.assignedOperator ??
      "";

    const defaultDue =
      exec.deadlineDate ||
      exec.targetDispatchDate ||
      addBusinessDays(order.payment?.paid_at || order.$createdAt, 5)
        .toISOString()
        .slice(0, 10);

    return {
      labels: opt.labels ?? savedTrello.labels ?? [],
      customLabels: opt.customLabels ?? savedTrello.customLabels ?? [],
      coverColor: opt.coverColor !== undefined ? opt.coverColor : savedTrello.coverColor || null,
      checklist,
      comments: opt.comments ?? savedTrello.comments ?? [],
      assignedOperator,
      priority,
      dueDate: opt.dueDate ?? savedTrello.dueDate ?? defaultDue,
      columnOrderIndex: opt.columnOrderIndex ?? savedTrello.columnOrderIndex ?? 0,
    };
  };

  const updateCardMetaOptimistic = async (
    order: any,
    patch: Partial<TrelloCardMetadata>
  ) => {
    const current = getCardMeta(order);
    const nextMeta: TrelloCardMetadata = {
      ...current,
      ...patch,
    };
    setOptimisticMetaByOrder((prev) => ({
      ...prev,
      [order.$id]: nextMeta,
    }));
    setIsSavingCardMeta(true);
    try {
      await onSaveTrelloMetadata(order, nextMeta);
    } finally {
      setIsSavingCardMeta(false);
    }
  };

  // Lista de operadores únicos para filtro
  const availableOperators = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const op = getCardMeta(o).assignedOperator?.trim();
      if (op) set.add(op);
    });
    return Array.from(set);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, optimisticMetaByOrder]);

  // Verifica desvio/personalização do pedido
  const checkOrderHasDeviation = (order: any): boolean => {
    const addr = getOrderAddress(order);
    const sheets = getOrderSheets(order);
    return (
      Boolean(addr?.customerNotes && addr.customerNotes.trim()) ||
      Boolean(order.order_number?.startsWith("CUST-")) ||
      Boolean(getCardMeta(order).priority === "urgent") ||
      (order.items || []).some((it: any, idx: number) =>
        getItemAlertInfo(order, it, sheets[idx], idx).hasDeviation
      )
    );
  };

  // Calcula status do prazo SLA (Due Date)
  const getDueDateStatus = (order: any, dueDateStr?: string) => {
    if (order.status === "delivered" || order.status === "shipped") {
      return {
        code: "completed" as const,
        label: order.status === "delivered" ? "Entregue ✓" : "Despachado ✓",
        className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      };
    }
    if (order.status === "cancelled") {
      return {
        code: "cancelled" as const,
        label: "Cancelado",
        className: "bg-slate-800 text-slate-400 border-slate-700",
      };
    }
    if (!dueDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr + "T12:00:00");
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = due.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    if (diffDays < 0) {
      return {
        code: "overdue" as const,
        label: `Atrasado ${Math.abs(diffDays)}d (${formatted})`,
        className: "bg-rose-500/25 text-rose-200 border-rose-500 animate-pulse",
      };
    }
    if (diffDays <= 1) {
      return {
        code: "due_soon" as const,
        label: diffDays === 0 ? `Vence Hoje (${formatted})` : `Vence Amanhã (${formatted})`,
        className: "bg-amber-500/25 text-amber-200 border-amber-400",
      };
    }
    return {
      code: "on_track" as const,
      label: `Meta ${formatted} (${diffDays}d)`,
      className: "bg-slate-800/90 text-slate-300 border-slate-700",
    };
  };

  // Filtra pedidos conforme filtros da barra do Trello
  const trelloFilteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const meta = getCardMeta(order);
      if (selectedLabelFilter !== "all") {
        if (!(meta.labels || []).includes(selectedLabelFilter)) return false;
      }
      if (selectedOperatorFilter !== "all") {
        if ((meta.assignedOperator || "").trim() !== selectedOperatorFilter) return false;
      }
      if (onlyUrgentOrDeviation) {
        if (meta.priority !== "urgent" && !checkOrderHasDeviation(order)) return false;
      }
      if (onlyOverdueOrDueSoon) {
        const dStat = getDueDateStatus(order, meta.dueDate);
        if (!dStat || (dStat.code !== "overdue" && dStat.code !== "due_soon")) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    orders,
    optimisticMetaByOrder,
    selectedLabelFilter,
    selectedOperatorFilter,
    onlyUrgentOrDeviation,
    onlyOverdueOrDueSoon,
  ]);

  // KPIs do Topo do Quadro
  const boardKpis = useMemo(() => {
    const activeOrders = trelloFilteredOrders.filter((o) => o.status !== "cancelled");
    const inProdOrQueue = trelloFilteredOrders.filter(
      (o) => o.status === "paid" || o.status === "in_production"
    );
    const readyToShip = trelloFilteredOrders.filter((o) => o.status === "ready");
    const urgentCount = trelloFilteredOrders.filter(
      (o) => getCardMeta(o).priority === "urgent" || checkOrderHasDeviation(o)
    ).length;
    const totalPipelineCents = activeOrders.reduce(
      (acc, o) => acc + (Number(o.total_cents) || 0),
      0
    );
    return {
      totalCards: trelloFilteredOrders.length,
      inProdOrQueueCount: inProdOrQueue.length,
      readyToShipCount: readyToShip.length,
      urgentCount,
      totalPipelineCents,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trelloFilteredOrders, optimisticMetaByOrder]);

  // Movimentação de Card com Celebração
  const handleDropOrMoveToStage = async (orderId: string, targetStageKey: string) => {
    const targetOrder = orders.find((o) => o.$id === orderId);
    if (!targetOrder || targetOrder.status === targetStageKey) {
      setDraggedOrderId(null);
      setDragOverStageKey(null);
      return;
    }

    setDraggedOrderId(null);
    setDragOverStageKey(null);

    if (["ready", "shipped", "delivered"].includes(targetStageKey)) {
      setCelebratingOrderId(orderId);
      setTimeout(() => setCelebratingOrderId(null), 1800);
    }

    await onMoveOrderStage(orderId, targetStageKey);
  };

  const activeModalOrder = useMemo(
    () => orders.find((o) => o.$id === activeTrelloCardOrderId) || null,
    [orders, activeTrelloCardOrderId]
  );

  const visibleColumns = useMemo(() => {
    return KANBAN_STAGE_COLUMNS.filter((col) => {
      if (showAllEmptyColumns || col.alwaysVisible) return true;
      return trelloFilteredOrders.some((o) => o.status === col.key);
    });
  }, [showAllEmptyColumns, trelloFilteredOrders]);

  return (
    <div
      className={`${
        isFullscreenBoard
          ? "fixed inset-0 z-50 bg-[#060a14] p-3 sm:p-5 overflow-y-auto flex flex-col"
          : "space-y-3.5"
      }`}
    >
      {/* ===================================================================== */}
      {/* SUPER-BARRA DO QUADRO KANBAN TRELLO (KPIS + FILTROS + CONTROLES)      */}
      {/* ===================================================================== */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-indigo-950/35 to-slate-900/95 border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Esquerda: Título do Quadro + Resumo de KPIs do Pipeline */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40">
              <Columns3 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                Quadro Trello • Produção CNC & Expedição
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 font-bold">
                📦 <strong className="text-white">{boardKpis.totalCards}</strong> cards
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-blue-950/50 border border-blue-500/35 text-blue-300 font-bold">
                ⚙️ Fila/Produção: <strong>{boardKpis.inProdOrQueueCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-purple-950/50 border border-purple-500/35 text-purple-300 font-bold">
                🚚 Expedição: <strong>{boardKpis.readyToShipCount}</strong>
              </span>
              {boardKpis.urgentCount > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
                  ⚠️ Atenção/Urgentes: <strong>{boardKpis.urgentCount}</strong>
                </span>
              )}
              <span className="px-2.5 py-1 rounded-xl bg-emerald-950/50 border border-emerald-500/35 text-emerald-300 font-mono font-black">
                {formatBRL(boardKpis.totalPipelineCents)}
              </span>
            </div>
          </div>

          {/* Direita: Filtros Rápidos do Trello & Modos de Tela */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Etiqueta */}
            <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedLabelFilter}
                onChange={(e) => setSelectedLabelFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                title="Filtrar cards por etiqueta do Trello"
              >
                <option value="all" className="bg-slate-900">
                  Todas as Etiquetas
                </option>
                {DEFAULT_TRELLO_LABELS.map((lbl) => (
                  <option key={lbl.id} value={lbl.id} className="bg-slate-900">
                    {lbl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Operador */}
            {availableOperators.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <select
                  value={selectedOperatorFilter}
                  onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                  title="Filtrar por Operador / Responsável"
                >
                  <option value="all" className="bg-slate-900">
                    Todos Operadores
                  </option>
                  {availableOperators.map((op) => (
                    <option key={op} value={op} className="bg-slate-900">
                      👤 {op}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filtro Apenas Atenção / Urgente */}
            <button
              type="button"
              onClick={() => setOnlyUrgentOrDeviation((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                onlyUrgentOrDeviation
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                  : "bg-slate-950/90 text-amber-300 border-slate-800 hover:border-amber-500/40"
              }`}
              title="Mostrar apenas pedidos com personalização CNC ou marcados como Urgentes"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Urgentes / Atenção</span>
            </button>

            {/* Filtro Atrasados / Vencendo */}
            <button
              type="button"
              onClick={() => setOnlyOverdueOrDueSoon((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                onlyOverdueOrDueSoon
                  ? "bg-rose-600 text-white border-rose-400 shadow-md"
                  : "bg-slate-950/90 text-rose-300 border-slate-800 hover:border-rose-500/40"
              }`}
              title="Mostrar apenas pedidos com prazo SLA vencendo hoje/amanhã ou atrasados"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Prazo Crítico</span>
            </button>

            {/* Mostrar / Ocultar Colunas Secundárias Vazias */}
            <button
              type="button"
              onClick={() => setShowAllEmptyColumns((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                showAllEmptyColumns
                  ? "bg-indigo-600 text-white border-indigo-400"
                  : "bg-slate-950/90 text-slate-300 border-slate-800 hover:text-white"
              }`}
              title="Alternar exibição de todas as 9 colunas de estágio mesmo quando vazias"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showAllEmptyColumns ? "9 Estágios" : "Estágios Ativos"}</span>
            </button>

            {/* Alternar Densidade dos Cards */}
            <button
              type="button"
              onClick={() => setCompactCardsMode((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                compactCardsMode
                  ? "bg-cyan-600 text-white border-cyan-400"
                  : "bg-slate-950/90 text-slate-300 border-slate-800 hover:text-white"
              }`}
              title="Alternar entre Cards Completos e Cards Compactos"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{compactCardsMode ? "Cards Compactos" : "Cards Completos"}</span>
            </button>

            {/* Modo Tela Cheia (Monitor TV de Fábrica) */}
            <button
              type="button"
              onClick={() => setIsFullscreenBoard((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isFullscreenBoard
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-lg"
                  : "bg-slate-950/90 text-emerald-400 border-emerald-500/40 hover:bg-slate-900"
              }`}
              title="Expandir Quadro Trello em Tela Cheia (Modo Monitoramento TV Chão de Fábrica)"
            >
              {isFullscreenBoard ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Sair Tela Cheia</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Tela Cheia (TV)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* COLUNAS DO QUADRO KANBAN (SCROLL HORIZONTAL FLUIDO + DRAG & DROP)     */}
      {/* ===================================================================== */}
      <div
        className={`flex items-start gap-3.5 overflow-x-auto pb-4 pt-1 select-none ${
          isFullscreenBoard ? "flex-1" : "min-h-[68vh]"
        }`}
      >
        {visibleColumns.map((stageCol, colIdx) => {
          const StageIcon = stageCol.icon;
          const isCollapsed = Boolean(collapsedColumns[stageCol.key]);
          const sortMode = columnSortBy[stageCol.key] || "newest";

          const colOrders = trelloFilteredOrders
            .filter((o) => o.status === stageCol.key)
            .sort((a, b) => {
              if (sortMode === "oldest") {
                return new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
              }
              if (sortMode === "value_desc") {
                return (Number(b.total_cents) || 0) - (Number(a.total_cents) || 0);
              }
              if (sortMode === "urgent_first") {
                const aUrg = getCardMeta(a).priority === "urgent" || checkOrderHasDeviation(a) ? 1 : 0;
                const bUrg = getCardMeta(b).priority === "urgent" || checkOrderHasDeviation(b) ? 1 : 0;
                if (bUrg !== aUrg) return bUrg - aUrg;
              }
              return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
            });

          const colTotalCents = colOrders.reduce(
            (acc, o) => acc + (Number(o.total_cents) || 0),
            0
          );
          const isOverWip = colOrders.length > stageCol.defaultWipLimit;
          const isDropTarget = dragOverStageKey === stageCol.key;

          // MODO COLUNA MINIMIZADA (ESTILO TRELLO)
          if (isCollapsed) {
            return (
              <div
                key={stageCol.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStageKey !== stageCol.key) setDragOverStageKey(stageCol.key);
                }}
                onDragLeave={() => setDragOverStageKey(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const orderId = e.dataTransfer.getData("text/plain") || draggedOrderId;
                  if (orderId) handleDropOrMoveToStage(orderId, stageCol.key);
                }}
                onClick={() =>
                  setCollapsedColumns((prev) => ({ ...prev, [stageCol.key]: false }))
                }
                title={`Clique para expandir a coluna "${stageCol.title}" (${colOrders.length} pedidos)`}
                className={`w-12 shrink-0 rounded-2xl bg-slate-900/90 border-2 border-t-4 ${
                  stageCol.borderAccent
                } ${
                  isDropTarget ? "border-indigo-400 bg-indigo-950/40 scale-105" : "border-slate-800/90"
                } py-4 px-2 flex flex-col items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/80 transition-all min-h-[420px]`}
              >
                <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${stageCol.badgeBg}`}>
                  {colOrders.length}
                </span>
                <div className="writing-mode-vertical transform -rotate-180 text-xs font-black text-slate-200 tracking-wider uppercase whitespace-nowrap">
                  {stageCol.title}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            );
          }

          return (
            <div
              key={stageCol.key}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStageKey !== stageCol.key) {
                  setDragOverStageKey(stageCol.key);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStageKey(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const orderId = e.dataTransfer.getData("text/plain") || draggedOrderId;
                if (orderId) {
                  handleDropOrMoveToStage(orderId, stageCol.key);
                }
              }}
              className={`w-[325px] sm:w-[345px] shrink-0 rounded-2xl bg-slate-950/90 border-2 border-t-4 ${
                stageCol.borderAccent
              } flex flex-col transition-all duration-200 shadow-xl ${
                isDropTarget
                  ? "border-indigo-400 ring-4 ring-indigo-500/25 bg-indigo-950/25 scale-[1.01]"
                  : "border-slate-800/90"
              }`}
            >
              {/* CABEÇALHO DA COLUNA TRELLO */}
              <div
                className={`p-3 rounded-t-xl bg-gradient-to-b ${stageCol.headerBg} border-b border-slate-800/90 space-y-1.5`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <StageIcon className="w-4 h-4 shrink-0 text-white" />
                    <h3 className="font-black text-white text-xs sm:text-sm tracking-tight truncate">
                      {stageCol.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black border shrink-0 ${stageCol.badgeBg}`}
                    >
                      {colOrders.length}
                    </span>
                    {isOverWip && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black animate-pulse"
                        title={`Acima do limite WIP recomendado (${stageCol.defaultWipLimit})`}
                      >
                        WIP!
                      </span>
                    )}
                  </div>

                  {/* Controles da Coluna: Ordenação + Minimizar */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="relative flex items-center">
                      <ArrowUpDown className="w-3 h-3 text-slate-400 pointer-events-none absolute left-1.5" />
                      <select
                        value={sortMode}
                        onChange={(e) =>
                          setColumnSortBy((prev) => ({
                            ...prev,
                            [stageCol.key]: e.target.value as any,
                          }))
                        }
                        title="Ordenar cards desta coluna"
                        className="pl-5 pr-1 py-0.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-[10px] font-bold text-slate-300 focus:outline-none cursor-pointer"
                      >
                        <option value="newest">Recentes</option>
                        <option value="oldest">Mais Antigos (FIFO)</option>
                        <option value="urgent_first">Urgentes 1º</option>
                        <option value="value_desc">Maior Valor</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedColumns((prev) => ({ ...prev, [stageCol.key]: true }))
                      }
                      title="Minimizar esta coluna"
                      className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate">{stageCol.subtitle}</span>
                  <span className="font-mono font-bold text-slate-200 shrink-0">
                    {formatBRL(colTotalCents)}
                  </span>
                </div>
              </div>

              {/* LISTA DE CARDS DA COLUNA */}
              <div className="p-2.5 space-y-2.5 overflow-y-auto max-h-[72vh] flex-1">
                {colOrders.length === 0 ? (
                  <div
                    className={`py-10 px-4 rounded-xl border-2 border-dashed text-center transition-all ${
                      isDropTarget
                        ? "border-indigo-400 bg-indigo-500/15 text-indigo-200"
                        : "border-slate-800/80 text-slate-500"
                    }`}
                  >
                    <p className="text-xs font-bold">
                      {isDropTarget
                        ? "📥 Solte o card aqui para mover para " + stageCol.shortTitle
                        : "Nenhum pedido neste estágio"}
                    </p>
                    <p className="text-[10px] mt-0.5">
                      Arraste qualquer card para cá
                    </p>
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const addr = getOrderAddress(order);
                    const shipping = getOrderShipping(order);
                    const payMethod = getOrderPaymentMethod(order);
                    const isOrderPaid = isOrderConfirmedPaid(order);
                    const sheets = getOrderSheets(order);
                    const firstItem = order.items?.[0];
                    const firstSheet = sheets[0] || null;
                    const firstItemThumb = firstItem
                      ? getItemCabinetImage(firstItem, firstSheet)
                      : "";
                    const totalItemsQty =
                      (order.items || []).reduce(
                        (acc: number, curr: any) => acc + (curr.quantity || 1),
                        0
                      ) || 1;
                    const resolvedFirst = firstItem
                      ? resolveKitEquipmentSummary({
                          kitItemsSnapshot:
                            (firstItem as any).kit_items_snapshot ||
                            firstSheet?.kitItemsSnapshot ||
                            null,
                          monitorName: firstItem.monitor_name,
                          printerName: firstItem.printer_name,
                          readerName: firstItem.reader_name,
                        })
                      : null;

                    const meta = getCardMeta(order);
                    const hasDeviation = checkOrderHasDeviation(order);
                    const dueInfo = getDueDateStatus(order, meta.dueDate);
                    const checklist = meta.checklist || [];
                    const doneCount = checklist.filter((c) => c.done).length;
                    const totalChk = checklist.length;
                    const chkPercent =
                      totalChk > 0 ? Math.round((doneCount / totalChk) * 100) : 0;

                    const allAvailableLabels = [
                      ...DEFAULT_TRELLO_LABELS,
                      ...(meta.customLabels || []),
                    ];
                    const activeLabels = allAvailableLabels.filter((l) =>
                      (meta.labels || []).includes(l.id)
                    );

                    const coverObj = CARD_COVER_COLORS.find(
                      (c) => c.id === meta.coverColor
                    );
                    const cleanPhone = (order.customer_whatsapp || "").replace(
                      /\D/g,
                      ""
                    );
                    const waHref = cleanPhone
                      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                          `Olá ${order.customer_name || ""}, referente ao seu pedido ${order.order_number} na Totem Pro:`
                        )}`
                      : null;

                    const totalAttachments =
                      (addr?.executionOrder?.attachments?.length || 0) +
                      (sheets || []).reduce(
                        (acc: number, s: any) =>
                          acc + (Array.isArray(s?.itemAttachments) ? s.itemAttachments.length : 0),
                        0
                      );

                    const prevStage = colIdx > 0 ? visibleColumns[colIdx - 1] : null;
                    const nextStage =
                      colIdx < visibleColumns.length - 1
                        ? visibleColumns[colIdx + 1]
                        : null;

                    const isDraggingThis = draggedOrderId === order.$id;
                    const isCelebratingThis = celebratingOrderId === order.$id;

                    return (
                      <div
                        key={order.$id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedOrderId(order.$id);
                          e.dataTransfer.setData("text/plain", order.$id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggedOrderId(null);
                          setDragOverStageKey(null);
                        }}
                        className={`group rounded-2xl bg-slate-900/95 border transition-all duration-200 overflow-hidden cursor-grab active:cursor-grabbing ${
                          isDraggingThis
                            ? "opacity-45 scale-95 rotate-1 border-indigo-400 shadow-2xl"
                            : isCelebratingThis
                            ? "ring-4 ring-emerald-400 border-emerald-400 scale-[1.02] shadow-xl shadow-emerald-500/25"
                            : meta.priority === "urgent"
                            ? "border-rose-500/70 hover:border-rose-400 shadow-lg shadow-rose-950/30"
                            : hasDeviation
                            ? "border-amber-500/60 hover:border-amber-400 shadow-md"
                            : "border-slate-800 hover:border-indigo-500/60 hover:shadow-xl hover:-translate-y-0.5"
                        }`}
                      >
                        {/* CAPA DO CARD TRELLO (SE CONFIGURADA OU AUTOMÁTICA EM URGÊNCIA) */}
                        {coverObj && coverObj.id !== "none" ? (
                          <div className={`h-2.5 w-full ${coverObj.className}`} />
                        ) : meta.priority === "urgent" ? (
                          <div className="h-2 w-full bg-gradient-to-r from-rose-600 via-orange-500 to-rose-600 animate-pulse" />
                        ) : hasDeviation ? (
                          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-yellow-400" />
                        ) : null}

                        <div className="p-3 space-y-2.5">
                          {/* 1. FAIXA DE ETIQUETAS COLORIDAS DO TRELLO (LABELS) */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1 flex-wrap">
                              {meta.priority === "urgent" && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-500/25 text-rose-200 border border-rose-500/50 inline-flex items-center gap-1">
                                  <Flame className="w-2.5 h-2.5 text-rose-400" />
                                  <span>URGENTE</span>
                                </span>
                              )}
                              {hasDeviation && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/50 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>ATENÇÃO CNC</span>
                                </span>
                              )}
                              {activeLabels.map((lbl) => (
                                <span
                                  key={lbl.id}
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${lbl.color}`}
                                >
                                  {lbl.name}
                                </span>
                              ))}
                            </div>

                            {/* Número do Pedido */}
                            <span className="font-mono font-extrabold text-[10px] text-slate-400">
                              {order.order_number}
                            </span>
                          </div>

                          {/* 2. NOME COMPLETO DO CLIENTE + WHATSAPP + CIDADE/UF */}
                          <div className="flex items-start justify-between gap-2">
                            <div
                              onClick={() => setActiveTrelloCardOrderId(order.$id)}
                              className="min-w-0 flex-1 cursor-pointer"
                            >
                              <p className="font-extrabold text-white text-sm leading-snug break-words group-hover:text-indigo-200 transition-colors">
                                {order.customer_name || "Cliente não informado"}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {addr?.city
                                  ? `📍 ${addr.city}/${addr.state || "SP"}`
                                  : "📍 Local não informado"}{" "}
                                •{" "}
                                <span className="text-cyan-400 font-semibold">
                                  {shipping.name?.split(" (")[0]}
                                </span>
                              </p>
                            </div>

                            {waHref && (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all shrink-0"
                                title="Conversar com o cliente no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>

                          {/* 3. RESUMO DO PRODUTO / GABINETE (OCULTÁVEL NO MODO SUPER COMPACTO) */}
                          {!compactCardsMode && (
                            <div
                              onClick={() => setActiveTrelloCardOrderId(order.$id)}
                              className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5 cursor-pointer hover:border-slate-700 transition-colors"
                            >
                              {firstItemThumb && (
                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-700 overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                                  <img
                                    src={firstItemThumb}
                                    alt="Gabinete"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-bold text-slate-100 text-xs leading-tight break-words">
                                  {totalItemsQty}x{" "}
                                  {order.items
                                    ?.map((it: any) => it.cabinet_name)
                                    .join(", ") || "Gabinete Padrão"}
                                </p>
                                <div className="flex items-center gap-1 flex-wrap text-[10px]">
                                  {firstItem?.color_name && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-semibold">
                                      {cleanDisplayColor(firstItem.color_name)}
                                    </span>
                                  )}
                                  {resolvedFirst?.isKit ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold border ${
                                        !resolvedFirst.hasMonitorInKit ||
                                        !resolvedFirst.hasPrinterInKit
                                          ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                                          : "bg-cyan-950/60 text-cyan-300 border-cyan-500/35"
                                      }`}
                                    >
                                      {!resolvedFirst.hasMonitorInKit &&
                                      !resolvedFirst.hasPrinterInKit
                                        ? "Kit s/ Tela & s/ Impr."
                                        : !resolvedFirst.hasMonitorInKit
                                        ? "Kit s/ Tela (+ Impr.)"
                                        : !resolvedFirst.hasPrinterInKit
                                        ? 'Kit Touch 23.8" (s/ Impr.)'
                                        : "Kit Completo"}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-cyan-500/30 font-semibold">
                                      Só Gabinete
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 4. BARRA DE PROGRESSO DO CHECKLIST DE PRODUÇÃO (ESTILO TRELLO) */}
                          {totalChk > 0 && (
                            <div
                              onClick={() => setActiveTrelloCardOrderId(order.$id)}
                              className="space-y-1 cursor-pointer"
                              title="Clique para abrir e marcar os itens do Checklist de Produção"
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span
                                  className={`font-extrabold inline-flex items-center gap-1 ${
                                    chkPercent === 100
                                      ? "text-emerald-400"
                                      : "text-slate-300"
                                  }`}
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  <span>
                                    Checklist: {doneCount}/{totalChk}
                                  </span>
                                </span>
                                <span
                                  className={`font-mono font-bold ${
                                    chkPercent === 100
                                      ? "text-emerald-400"
                                      : "text-indigo-300"
                                  }`}
                                >
                                  {chkPercent}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    chkPercent === 100
                                      ? "bg-emerald-500"
                                      : "bg-indigo-500"
                                  }`}
                                  style={{ width: `${chkPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* 5. BADGES DE PRAZO SLA, OPERADOR, ANEXOS, COMENTÁRIOS & VALOR */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap pt-0.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              {dueInfo && (
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 ${dueInfo.className}`}
                                >
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>{dueInfo.label}</span>
                                </span>
                              )}

                              {meta.assignedOperator && (
                                <span
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/35 inline-flex items-center gap-1"
                                  title={`Operador Responsável: ${meta.assignedOperator}`}
                                >
                                  <User className="w-2.5 h-2.5" />
                                  <span className="max-w-[85px] truncate">
                                    {meta.assignedOperator}
                                  </span>
                                </span>
                              )}

                              {(meta.comments?.length || 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 inline-flex items-center gap-0.5">
                                  <MessageSquare className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>{meta.comments?.length}</span>
                                </span>
                              )}

                              {totalAttachments > 0 && (
                                <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 inline-flex items-center gap-0.5">
                                  <Paperclip className="w-2.5 h-2.5 text-amber-400" />
                                  <span>{totalAttachments}</span>
                                </span>
                              )}
                            </div>

                            {/* Preço & Status Pagamento */}
                            <span
                              className={`text-xs font-black font-mono ${
                                isOrderPaid ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {formatBRL(order.total_cents)}{" "}
                              <span className="text-[9px] uppercase font-sans">
                                ({payMethod === "credit_card" ? "Cartão" : "PIX"})
                              </span>
                            </span>
                          </div>

                          {/* 6. RODAPÉ DE AÇÕES RÁPIDAS + SETAS DE AVANÇO DE ESTÁGIO (1 CLIQUE) */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1">
                            {/* Botões de Ação Direta do Card */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setActiveTrelloCardOrderId(order.$id)}
                                className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-all"
                                title="Abrir Card Completo do Trello (Checklists, Etiquetas, Comentários, Prazo e Operador)"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Card</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenPrintProductionOrder(order)}
                                className="px-2 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-all"
                                title="Imprimir Ordem de Produção A4 (Sem Preços)"
                              >
                                <Printer className="w-3 h-3" />
                                <span>O.P.</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenCorreiosLabel(order)}
                                className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer"
                                title="Etiqueta Correios"
                              >
                                <Truck className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenOrderDetailsModal(order)}
                                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                                title="Ver Ficha Completa do Pedido"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Setas Rápidas para Mover de Coluna (Estilo Trello Mobile/PC) */}
                            <div className="flex items-center gap-1">
                              {prevStage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDropOrMoveToStage(order.$id, prevStage.key)
                                  }
                                  title={`Voltar para: ${prevStage.title}`}
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer active:scale-95"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {nextStage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDropOrMoveToStage(order.$id, nextStage.key)
                                  }
                                  title={`Avançar para: ${nextStage.title}`}
                                  className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 border border-indigo-500/40 text-[10px] font-extrabold inline-flex items-center gap-0.5 cursor-pointer active:scale-95"
                                >
                                  <span>Avançar</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* MODAL DE CARD COMPLETO ESTILO TRELLO (CHECKLISTS, ETIQUETAS, ATIVIDADES) */}
      {/* ===================================================================== */}
      {activeModalOrder && (() => {
        const meta = getCardMeta(activeModalOrder);
        const addr = getOrderAddress(activeModalOrder);
        const shipping = getOrderShipping(activeModalOrder);
        const payMethod = getOrderPaymentMethod(activeModalOrder);
        const isPaid = isOrderConfirmedPaid(activeModalOrder);
        const checklist = meta.checklist || [];
        const doneCount = checklist.filter((c) => c.done).length;
        const totalChk = checklist.length;
        const chkPercent = totalChk > 0 ? Math.round((doneCount / totalChk) * 100) : 0;
        const allLabels = [...DEFAULT_TRELLO_LABELS, ...(meta.customLabels || [])];
        const coverObj = CARD_COVER_COLORS.find((c) => c.id === meta.coverColor);

        return (
          <div
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
            onClick={() => setActiveTrelloCardOrderId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-4xl w-full max-h-[94dvh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Capa Superior do Modal Trello */}
              {coverObj && coverObj.id !== "none" && (
                <div className={`h-6 w-full ${coverObj.className}`} />
              )}

              {/* Cabeçalho do Card Trello */}
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono font-black text-xs">
                      {activeModalOrder.order_number}
                    </span>
                    <span className="text-xs text-slate-400">
                      na coluna{" "}
                      <strong className="text-white underline">
                        {KANBAN_STAGE_COLUMNS.find((c) => c.key === activeModalOrder.status)
                          ?.title || activeModalOrder.status}
                      </strong>
                    </span>
                    {isSavingCardMeta && (
                      <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                        • Salvando no Appwrite...
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {activeModalOrder.customer_name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    📍 {addr?.street ? `${addr.street}, nº ${addr.number || "S/N"} — ` : ""}
                    {addr?.city || "—"}/{addr?.state || "SP"} • Envio:{" "}
                    <strong className="text-cyan-300">{shipping.name}</strong> • Total:{" "}
                    <strong className={isPaid ? "text-emerald-400" : "text-amber-400"}>
                      {formatBRL(activeModalOrder.total_cents)}
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTrelloCardOrderId(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 flex items-center justify-center font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo do Modal Trello: 2 Colunas (Esquerda: Conteúdo | Direita: Ferramentas do Trello) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
                {/* COLUNA PRINCIPAL (8 COLS) */}
                <div className="lg:col-span-8 space-y-5">
                  {/* 1. ETIQUETAS ATIVAS & METADADOS RÁPIDOS */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-slate-300 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Etiquetas do Card (Clique para ativar/desativar)</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {allLabels.map((lbl) => {
                        const isSelected = (meta.labels || []).includes(lbl.id);
                        return (
                          <button
                            key={lbl.id}
                            type="button"
                            onClick={() => {
                              const currentLabels = meta.labels || [];
                              const nextLabels = isSelected
                                ? currentLabels.filter((id) => id !== lbl.id)
                                : [...currentLabels, lbl.id];
                              updateCardMetaOptimistic(activeModalOrder, {
                                labels: nextLabels,
                              });
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? `${lbl.color} ring-2 ring-white/40 scale-[1.02]`
                                : "bg-slate-900/90 text-slate-400 border-slate-800 opacity-65 hover:opacity-100"
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: lbl.dotColor }}
                            />
                            <span>{lbl.name}</span>
                            {isSelected && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Criar Nova Etiqueta Personalizada */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newCustomLabelName}
                        onChange={(e) => setNewCustomLabelName(e.target.value)}
                        placeholder="Nova etiqueta personalizada (ex: Pintura Especial)..."
                        className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCustomLabelName.trim()) return;
                          const palette = [
                            {
                              color: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50",
                              dotColor: "#10b981",
                            },
                            {
                              color: "bg-indigo-500/20 text-indigo-200 border-indigo-500/50",
                              dotColor: "#6366f1",
                            },
                            {
                              color: "bg-amber-500/20 text-amber-200 border-amber-500/50",
                              dotColor: "#f59e0b",
                            },
                            {
                              color: "bg-rose-500/20 text-rose-200 border-rose-500/50",
                              dotColor: "#f43f5e",
                            },
                          ];
                          const chosen =
                            palette[newCustomLabelColorIdx % palette.length];
                          const newLbl: TrelloLabelItem = {
                            id: `custom_lbl_${Date.now()}`,
                            name: newCustomLabelName.trim(),
                            color: chosen.color,
                            dotColor: chosen.dotColor,
                          };
                          setNewCustomLabelColorIdx((i) => i + 1);
                          setNewCustomLabelName("");
                          updateCardMetaOptimistic(activeModalOrder, {
                            customLabels: [...(meta.customLabels || []), newLbl],
                            labels: [...(meta.labels || []), newLbl.id],
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shrink-0"
                      >
                        + Criar Etiqueta
                      </button>
                    </div>
                  </div>

                  {/* 2. CHECKLIST INTERATIVO DE PRODUÇÃO & EXPEDIÇÃO (ESTILO TRELLO) */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-emerald-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4" />
                        <span>
                          Checklist de Produção CNC & Expedição ({doneCount}/{totalChk})
                        </span>
                      </span>
                      <span className="font-mono font-black text-xs text-emerald-300">
                        {chkPercent}% concluído
                      </span>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          chkPercent === 100 ? "bg-emerald-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${chkPercent}%` }}
                      />
                    </div>

                    {/* Lista de Itens do Checklist */}
                    <div className="space-y-1.5 pt-1">
                      {checklist.map((item, cIdx) => (
                        <div
                          key={item.id || cIdx}
                          onClick={() => {
                            const next = checklist.map((c, i) =>
                              i === cIdx ? { ...c, done: !c.done } : c
                            );
                            updateCardMetaOptimistic(activeModalOrder, {
                              checklist: next,
                            });
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            item.done
                              ? "bg-emerald-950/25 border-emerald-500/35 text-slate-400 line-through"
                              : "bg-slate-900 border-slate-800 text-white hover:border-indigo-500/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => {}}
                              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer shrink-0"
                            />
                            <span className="font-bold text-xs break-words">
                              {item.text}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = checklist.filter((_, i) => i !== cIdx);
                              updateCardMetaOptimistic(activeModalOrder, {
                                checklist: next,
                              });
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Remover item do checklist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Adicionar novo item ao Checklist */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newChecklistInput}
                        onChange={(e) => setNewChecklistInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newChecklistInput.trim()) {
                            e.preventDefault();
                            const next: TrelloChecklistEntry[] = [
                              ...checklist,
                              {
                                id: `chk_${Date.now()}`,
                                text: newChecklistInput.trim(),
                                done: false,
                              },
                            ];
                            setNewChecklistInput("");
                            updateCardMetaOptimistic(activeModalOrder, {
                              checklist: next,
                            });
                          }
                        }}
                        placeholder="Adicionar nova tarefa ao checklist deste pedido..."
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newChecklistInput.trim()) return;
                          const next: TrelloChecklistEntry[] = [
                            ...checklist,
                            {
                              id: `chk_${Date.now()}`,
                              text: newChecklistInput.trim(),
                              done: false,
                            },
                          ];
                          setNewChecklistInput("");
                          updateCardMetaOptimistic(activeModalOrder, {
                            checklist: next,
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shrink-0"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>

                  {/* 3. MURAL DE ATIVIDADES & COMENTÁRIOS INTERNOS DA FÁBRICA (ESTILO TRELLO) */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="font-black text-cyan-400 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        Comentários & Histórico de Produção ({meta.comments?.length || 0})
                      </span>
                    </span>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCommentInput}
                        onChange={(e) => setNewCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newCommentInput.trim()) {
                            e.preventDefault();
                            const newEntry: TrelloCommentEntry = {
                              id: `cmt_${Date.now()}`,
                              author: meta.assignedOperator || "Equipe Admin",
                              text: newCommentInput.trim(),
                              createdAt: new Date().toISOString(),
                            };
                            setNewCommentInput("");
                            updateCardMetaOptimistic(activeModalOrder, {
                              comments: [newEntry, ...(meta.comments || [])],
                            });
                          }
                        }}
                        placeholder="Escreva uma atualização (ex: Chapa cortada, aguardando transportadora)..."
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCommentInput.trim()) return;
                          const newEntry: TrelloCommentEntry = {
                            id: `cmt_${Date.now()}`,
                            author: meta.assignedOperator || "Equipe Admin",
                            text: newCommentInput.trim(),
                            createdAt: new Date().toISOString(),
                          };
                          setNewCommentInput("");
                          updateCardMetaOptimistic(activeModalOrder, {
                            comments: [newEntry, ...(meta.comments || [])],
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Registrar</span>
                      </button>
                    </div>

                    {(meta.comments?.length || 0) > 0 && (
                      <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                        {(meta.comments || []).map((cmt) => (
                          <div
                            key={cmt.id}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 text-[10px]">
                                <strong className="text-indigo-300">{cmt.author}</strong>
                                <span className="text-slate-500">
                                  {new Date(cmt.createdAt).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200">{cmt.text}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = (meta.comments || []).filter(
                                  (c) => c.id !== cmt.id
                                );
                                updateCardMetaOptimistic(activeModalOrder, {
                                  comments: next,
                                });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* BARRA LATERAL DIREITA DO CARD TRELLO (4 COLS): CONTROLES E AÇÕES */}
                <div className="lg:col-span-4 space-y-3.5">
                  {/* 1. Mover de Coluna / Estágio */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <label className="block font-black text-indigo-300 uppercase text-[10px] tracking-wider">
                      Mover para Estágio (Coluna)
                    </label>
                    <select
                      value={activeModalOrder.status}
                      onChange={(e) =>
                        handleDropOrMoveToStage(activeModalOrder.$id, e.target.value)
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs cursor-pointer"
                    >
                      {KANBAN_STAGE_COLUMNS.map((col) => (
                        <option key={col.key} value={col.key}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Operador Responsável, Prioridade & Data Meta (SLA) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div>
                      <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                        👤 Operador CNC / Responsável
                      </label>
                      <input
                        type="text"
                        value={meta.assignedOperator || ""}
                        onChange={(e) =>
                          updateCardMetaOptimistic(activeModalOrder, {
                            assignedOperator: e.target.value,
                          })
                        }
                        placeholder="Ex: Ronaldo / Equipe CNC"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                        🚨 Prioridade do Card
                      </label>
                      <select
                        value={meta.priority || "normal"}
                        onChange={(e) =>
                          updateCardMetaOptimistic(activeModalOrder, {
                            priority: e.target.value as "normal" | "urgent",
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs cursor-pointer"
                      >
                        <option value="normal">🟢 Normal (Fila Padrão)</option>
                        <option value="urgent">🔴 URGENTE (Destaque Topo)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                        📅 Data Meta de Expedição (SLA)
                      </label>
                      <input
                        type="date"
                        value={meta.dueDate || ""}
                        onChange={(e) =>
                          updateCardMetaOptimistic(activeModalOrder, {
                            dueDate: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs"
                      />
                    </div>

                    {/* Cor da Capa do Card */}
                    <div>
                      <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1 flex items-center gap-1">
                        <Palette className="w-3 h-3 text-cyan-400" />
                        <span>Cor da Capa do Card</span>
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {CARD_COVER_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              updateCardMetaOptimistic(activeModalOrder, {
                                coverColor: c.id === "none" ? null : c.id,
                              })
                            }
                            title={c.label}
                            className={`h-6 rounded-lg border text-[9px] font-bold cursor-pointer ${
                              c.id === "none" ? "bg-slate-900 text-slate-400" : c.className
                            } ${
                              (meta.coverColor || "none") === c.id
                                ? "ring-2 ring-white border-white"
                                : "border-slate-700"
                            }`}
                          >
                            {c.id === "none" ? "Sem" : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Ações Operacionais Diretas do Pedido */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="block font-black text-emerald-400 uppercase text-[10px] tracking-wider">
                      Ações de Produção & Logística
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTrelloCardOrderId(null);
                        onOpenPrintProductionOrder(activeModalOrder);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimir Ordem de Produção A4</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTrelloCardOrderId(null);
                        onOpenCorreiosLabel(activeModalOrder);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Pré-Postagem & Etiqueta Correios</span>
                    </button>

                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSendPaidConfirmation(
                            activeModalOrder,
                            Boolean(addr?.customerPaidConfirmationSentAt)
                          )
                        }
                        className="w-full py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>
                          {addr?.customerPaidConfirmationSentAt
                            ? "Reenviar Confirmação WhatsApp"
                            : "Confirmar Pedido ao Cliente"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTrelloCardOrderId(null);
                          onOpenRemarketingForOrder(activeModalOrder.order_number);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>Recuperar Pagamento WhatsApp</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTrelloCardOrderId(null);
                          onOpenOrderDetailsModal(activeModalOrder);
                        }}
                        className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ficha CNC</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTrelloCardOrderId(null);
                          onOpenEditOrder(activeModalOrder, "all");
                        }}
                        className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar Tudo</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
