"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RefreshCw,
  Settings,
  History,
  ChevronDown,
  ChevronUp,
  Phone,
  FileText,
  Zap,
  Lock,
  Eye,
  X,
} from "lucide-react";

export type CommercialRecoveryStage =
  | "awaiting_contact"
  | "auto_contacted"
  | "manual_contacted"
  | "in_negotiation"
  | "recovered"
  | "do_not_disturb";

export type RemarketingTemplateId = "soft_support" | "payment_flex" | "cart_concierge";

export interface SafetyGuardItem {
  code: string;
  label: string;
  passed: boolean;
  blockingMode: "both" | "auto_only" | "info";
  detail: string;
}

export interface EvaluatedRemarketingTarget {
  targetId: string;
  targetType: "order" | "cart_lead";
  appwriteDocId?: string;
  orderNumber: string;
  createdAt: string;
  idleMinutes: number;
  idleLabel: string;
  customerName: string;
  customerFirstName: string;
  customerDocument: string;
  customerEmail: string;
  customerWhatsappRaw: string;
  phoneE164: string;
  phoneCoreKey: string;
  phoneValid: boolean;
  phoneValidationReason?: string;
  cityState: string;
  totalCents: number;
  paymentMethod: "pix" | "credit_card";
  productSummary: string;
  checkoutUrl: string;
  stage: CommercialRecoveryStage;
  doNotDisturb: boolean;
  commercialNotes: string;
  autoSentCount: number;
  manualSentCount: number;
  lastSentAt?: string;
  lastMode?: "auto" | "manual";
  alreadyPaidInOtherOrder?: {
    orderNumber: string;
    paidAt: string;
    totalCents: number;
  } | null;
  supersededByNewerOrder?: {
    orderNumber: string;
    createdAt: string;
  } | null;
  canSendManual: boolean;
  canSendAutoNow: boolean;
  primaryStatusBadge: {
    code: string;
    label: string;
    tone: "emerald" | "indigo" | "amber" | "sky" | "rose" | "slate";
    explanation: string;
  };
  safetyGuards: SafetyGuardItem[];
  templates: Record<RemarketingTemplateId, string>;
}

export interface RemarketingConfig {
  autoEnabled: boolean;
  autoEnabledSinceIso: string;
  minIdleMinutesBeforeAuto: number;
  maxOrderAgeHoursForAuto: number;
  maxAutoMessagesPerTarget: number;
  phoneCooldownHours: number;
  businessHoursStart: number;
  businessHoursEnd: number;
  instanceName: string;
  instanceId: string;
  instancePhone: string;
}

export interface RemarketingHistoryEntry {
  id: string;
  targetId: string;
  targetType: "order" | "cart_lead";
  orderNumber?: string;
  customerName: string;
  customerFirstName: string;
  phoneE164: string;
  phoneCoreKey: string;
  mode: "auto" | "manual";
  templateId: RemarketingTemplateId;
  messagePreview: string;
  instanceUsed: string;
  sentAt: string;
  actor: string;
  ok: boolean;
  error?: string;
}

export interface RemarketingDashboardData {
  commercialInstanceStatus: {
    ok: boolean;
    instanceName: string;
    instanceId: string;
    phone: string;
    state: string;
  };
  config: RemarketingConfig;
  kpis: {
    totalUnpaidOrders: number;
    eligibleAssistedCount: number;
    eligibleAutoNowCount: number;
    recoverableRevenueCents: number;
    alreadyRecoveredCount: number;
    alreadyRecoveredCents: number;
    blockedDuplicateOrPaidCount: number;
    autoSentTotalCount: number;
    manualSentTotalCount: number;
  };
  targets: EvaluatedRemarketingTarget[];
  history: RemarketingHistoryEntry[];
}

const STAGE_LABELS: Record<CommercialRecoveryStage, { label: string; badgeClass: string }> = {
  awaiting_contact: {
    label: "Aguardando 1º Contato",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  auto_contacted: {
    label: "1º Contato Auto Enviado",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  manual_contacted: {
    label: "Contato Comercial Enviado",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  in_negotiation: {
    label: "Em Negociação / Dúvida",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  recovered: {
    label: "Venda Recuperada / Pago",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  do_not_disturb: {
    label: "Pausado / Não Perturbar",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
};

const TEMPLATE_LABELS: Record<RemarketingTemplateId, { title: string; subtitle: string }> = {
  soft_support: {
    title: "1. Consultivo & Suporte Técnico (Recomendado)",
    subtitle: "Abordagem leve perguntando se houve dúvida técnica ou no checkout, com link direto.",
  },
  payment_flex: {
    title: "2. Facilitação PIX ou Cartão em até 10x",
    subtitle: "Focado em destravar forma de pagamento (alternar PIX/Cartão ou condição comercial).",
  },
  cart_concierge: {
    title: "3. Recuperação de Carrinho / Orçamento",
    subtitle: "Ideal para leads que simularam o totem mas não concluíram o pedido.",
  },
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

interface CommercialRemarketingPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  selectedOrderNumberForModal?: string | null;
  onClearSelectedOrderForModal?: () => void;
  onDataLoaded?: (data: RemarketingDashboardData) => void;
}

export function CommercialRemarketingPanel({
  isOpen,
  onToggleOpen,
  selectedOrderNumberForModal,
  onClearSelectedOrderForModal,
  onDataLoaded,
}: CommercialRemarketingPanelProps) {
  const [data, setData] = useState<RemarketingDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<"queue" | "settings" | "history">("queue");
  const [filterMode, setFilterMode] = useState<"eligible" | "all" | "blocked">("all");

  // Modal de disparo e auditoria
  const [activeTarget, setActiveTarget] = useState<EvaluatedRemarketingTarget | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RemarketingTemplateId>("soft_support");
  const [customMessage, setCustomMessage] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [editingStage, setEditingStage] = useState<CommercialRecoveryStage>("awaiting_contact");
  const [sending, setSending] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Configurações editáveis
  const [cfgMinIdle, setCfgMinIdle] = useState(45);
  const [cfgCooldownHours, setCfgCooldownHours] = useState(72);
  const [cfgStartHour, setCfgStartHour] = useState(8);
  const [cfgEndHour, setCfgEndHour] = useState(20);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchRemarketingData = useCallback(
    async (withAutoSweep = false) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/remarketing${withAutoSweep ? "?autoSweep=true" : ""}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json.ok) {
          setData(json);
          setCfgMinIdle(json.config.minIdleMinutesBeforeAuto);
          setCfgCooldownHours(json.config.phoneCooldownHours);
          setCfgStartHour(json.config.businessHoursStart);
          setCfgEndHour(json.config.businessHoursEnd);
          onDataLoaded?.(json);
        }
      } catch (err) {
        console.warn("Erro ao carregar remarketing:", err);
      } finally {
        setLoading(false);
      }
    },
    [onDataLoaded]
  );

  // Carrega ao montar e executa varredura segura a cada 3 minutos enquanto o Admin estiver aberto
  useEffect(() => {
    fetchRemarketingData(true);
    const interval = setInterval(() => {
      fetchRemarketingData(true);
    }, 180_000);
    return () => clearInterval(interval);
  }, [fetchRemarketingData]);

  // Se o usuário clicou em "Recuperar Venda" num card de pedido específico da lista principal
  useEffect(() => {
    if (selectedOrderNumberForModal && data?.targets) {
      const found = data.targets.find(
        (t) => t.orderNumber === selectedOrderNumberForModal || t.targetId === `order:${selectedOrderNumberForModal}`
      );
      if (found) {
        openTargetModal(found);
      }
      onClearSelectedOrderForModal?.();
    }
  }, [selectedOrderNumberForModal, data]);

  const openTargetModal = (target: EvaluatedRemarketingTarget) => {
    setActiveTarget(target);
    const defaultTpl: RemarketingTemplateId =
      target.targetType === "cart_lead" ? "cart_concierge" : "soft_support";
    setSelectedTemplate(defaultTpl);
    setCustomMessage(target.templates[defaultTpl] || "");
    setEditingNotes(target.commercialNotes || "");
    setEditingStage(target.stage);
    setFeedbackBanner(null);
  };

  const handleTemplateChange = (tpl: RemarketingTemplateId) => {
    setSelectedTemplate(tpl);
    if (activeTarget) {
      setCustomMessage(activeTarget.templates[tpl] || "");
    }
  };

  const handleDispatchMessage = async () => {
    if (!activeTarget || sending) return;
    setSending(true);
    setFeedbackBanner(null);
    try {
      const res = await fetch("/api/admin/remarketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_manual",
          targetId: activeTarget.targetId,
          templateId: selectedTemplate,
          customMessage,
          actor: "Gestor Comercial (Painel Admin)",
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                config: json.config,
                kpis: json.kpis,
                targets: json.targets,
                history: json.history,
              }
            : prev
        );
        onDataLoaded?.({
          commercialInstanceStatus: data!.commercialInstanceStatus,
          config: json.config,
          kpis: json.kpis,
          targets: json.targets,
          history: json.history,
        });
        const updated = json.targets?.find(
          (t: EvaluatedRemarketingTarget) => t.targetId === activeTarget.targetId
        );
        if (updated) {
          setActiveTarget(updated);
          setEditingStage(updated.stage);
        }
        setFeedbackBanner({
          type: "success",
          text: `Mensagem enviada com sucesso pela instância "${json.instanceUsed || "Comercial X-Point"}" para ${activeTarget.customerName} (${activeTarget.phoneE164})!`,
        });
      } else {
        setFeedbackBanner({
          type: "error",
          text: json.error || "Não foi possível enviar a mensagem.",
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: "error",
        text: err?.message || "Falha de conexão ao disparar mensagem.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSaveTargetMeta = async (overrideDnd?: boolean) => {
    if (!activeTarget || savingMeta) return;
    setSavingMeta(true);
    setFeedbackBanner(null);
    try {
      const nextDnd = overrideDnd !== undefined ? overrideDnd : activeTarget.doNotDisturb;
      const res = await fetch("/api/admin/remarketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_target",
          targetId: activeTarget.targetId,
          appwriteDocId: activeTarget.appwriteDocId,
          phoneCoreKey: activeTarget.phoneCoreKey,
          stage: editingStage,
          doNotDisturb: nextDnd,
          commercialNotes: editingNotes,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                config: json.config,
                kpis: json.kpis,
                targets: json.targets,
                history: json.history,
              }
            : prev
        );
        const updated = json.targets?.find(
          (t: EvaluatedRemarketingTarget) => t.targetId === activeTarget.targetId
        );
        if (updated) {
          setActiveTarget(updated);
          setEditingStage(updated.stage);
        }
        setFeedbackBanner({
          type: "info",
          text: "Anotações comerciais e etapa atualizadas com sucesso.",
        });
      }
    } catch {
      setFeedbackBanner({
        type: "error",
        text: "Erro ao salvar acompanhamento comercial.",
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleToggleAutoPilot = async () => {
    if (!data || savingConfig) return;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/remarketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          config: {
            autoEnabled: !data.config.autoEnabled,
          },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                config: json.config,
                kpis: json.kpis,
                targets: json.targets,
                history: json.history,
              }
            : prev
        );
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveConfigParameters = async () => {
    if (!data || savingConfig) return;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/remarketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          config: {
            minIdleMinutesBeforeAuto: cfgMinIdle,
            phoneCooldownHours: cfgCooldownHours,
            businessHoursStart: cfgStartHour,
            businessHoursEnd: cfgEndHour,
          },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                config: json.config,
                kpis: json.kpis,
                targets: json.targets,
                history: json.history,
              }
            : prev
        );
      }
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredTargets = (data?.targets || []).filter((t) => {
    if (filterMode === "eligible") return t.canSendManual;
    if (filterMode === "blocked") return !t.canSendManual;
    return true;
  });

  const badgeToneClasses: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    slate: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };

  return (
    <>
      {isOpen && (
        <div className="mb-4 rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-3 sm:p-5 shadow-2xl">
          {/* Top Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3.5">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30 text-indigo-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Central de Remarketing & Recuperação Comercial
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      data?.commercialInstanceStatus?.ok !== false
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        data?.commercialInstanceStatus?.ok !== false
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-amber-400"
                      }`}
                    />
                    Instância: {data?.config?.instanceName || "Comercial X-Point"} (11 99164-9959)
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  Recuperação consultiva de pedidos sem pagamento e carrinhos com{" "}
                  <strong className="text-emerald-400">10 travas anti-loop</strong> e cruzamento
                  automático de pedidos já pagos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAutoPilot}
                disabled={savingConfig}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  data?.config?.autoEnabled
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                }`}
                title="Ativa ou pausa o envio automático de 1 única mensagem consultiva para novos pedidos parados"
              >
                <Zap className="h-3.5 w-3.5" />
                Auto-Remarketing: {data?.config?.autoEnabled ? "ATIVO (Máx 1 msg)" : "PAUSADO"}
              </button>

              <button
                type="button"
                onClick={() => fetchRemarketingData(true)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
                Atualizar
              </button>

              <button
                type="button"
                onClick={onToggleOpen}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Ocultar
              </button>
            </div>
          </div>

          {/* 4 KPIs Comerciais */}
          <div className="mt-3.5 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300">
                <span>RECEITA RECUPERÁVEL REAL</span>
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-white">
                {formatCurrency(data?.kpis?.recoverableRevenueCents || 0)}
              </div>
              <div className="mt-0.5 text-[11px] text-indigo-200/80">
                {data?.kpis?.eligibleAssistedCount || 0} cliente(s) aptos e validados
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                <span>JÁ RECUPERADOS / PAGOS</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-emerald-300">
                {formatCurrency(data?.kpis?.alreadyRecoveredCents || 0)}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-200/80">
                {data?.kpis?.alreadyRecoveredCount || 0} pedido(s) pagos em nova ordem
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300">
                <span>TRAVAS ANTI-ERRO ATIVAS</span>
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-white">
                {data?.kpis?.blockedDuplicateOrPaidCount || 0} bloqueio(s)
              </div>
              <div className="mt-0.5 text-[11px] text-amber-200/80">
                Evitou cobrança duplicada ou já paga
              </div>
            </div>

            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-sky-300">
                <span>DISPAROS COMERCIAL X-POINT</span>
                <Send className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-white">
                {(data?.kpis?.autoSentTotalCount || 0) + (data?.kpis?.manualSentTotalCount || 0)}{" "}
                envio(s)
              </div>
              <div className="mt-0.5 text-[11px] text-sky-200/80">
                {data?.kpis?.autoSentTotalCount || 0} auto • {data?.kpis?.manualSentTotalCount || 0}{" "}
                assistido(s)
              </div>
            </div>
          </div>

          {/* Sub-abas: Fila de Recuperação | Regras & Anti-Loop | Histórico de Envios */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSubTab("queue")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  subTab === "queue"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                Fila Comercial ({data?.targets?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setSubTab("settings")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  subTab === "settings"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                Regras Anti-Loop & Horários
              </button>
              <button
                type="button"
                onClick={() => setSubTab("history")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  subTab === "history"
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                Log de Envios ({data?.history?.length || 0})
              </button>
            </div>

            {subTab === "queue" && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    filterMode === "all"
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Todos ({data?.targets?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("eligible")}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    filterMode === "eligible"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Aptos p/ Contato ({data?.kpis?.eligibleAssistedCount || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("blocked")}
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    filterMode === "blocked"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Bloqueados Anti-Erro ({data?.kpis?.blockedDuplicateOrPaidCount || 0})
                </button>
              </div>
            )}
          </div>

          {/* Conteúdo da Sub-Aba 1: Fila Comercial */}
          {subTab === "queue" && (
            <div className="mt-3 space-y-2.5">
              {filteredTargets.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
                  Nenhum pedido ou carrinho encontrado neste filtro.
                </div>
              ) : (
                filteredTargets.map((target) => {
                  const stageInfo =
                    STAGE_LABELS[target.stage] || STAGE_LABELS.awaiting_contact;
                  const toneClass =
                    badgeToneClasses[target.primaryStatusBadge.tone] ||
                    badgeToneClasses.slate;

                  return (
                    <div
                      key={target.targetId}
                      className={`rounded-xl border p-3 sm:p-4 transition ${
                        target.canSendManual
                          ? "border-slate-700/80 bg-slate-950/80 hover:border-indigo-500/40"
                          : "border-slate-800/70 bg-slate-950/40 opacity-85"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Info Esquerda */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-400">
                              #{target.orderNumber}
                            </span>
                            <span className="text-sm font-bold text-white truncate">
                              {target.customerName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              (Saudação: <strong className="text-slate-200">&ldquo;Olá, {target.customerFirstName}!&rdquo;</strong>)
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${toneClass}`}
                            >
                              {target.alreadyPaidInOtherOrder || target.supersededByNewerOrder ? (
                                <ShieldCheck className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {target.primaryStatusBadge.label}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageInfo.badgeClass}`}
                            >
                              {stageInfo.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                            <span className="font-semibold text-emerald-400">
                              {formatCurrency(target.totalCents)}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-xs sm:max-w-md">
                              {target.productSummary}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">
                              📱 {target.customerWhatsappRaw || "Sem telefone"} ({target.cityState})
                            </span>
                            <span>•</span>
                            <span className="text-amber-300/90 font-medium">
                              ⏱ Parado há {target.idleLabel}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400">
                            {target.primaryStatusBadge.explanation}
                          </p>

                          {target.commercialNotes && (
                            <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] text-indigo-200 border border-slate-800">
                              <FileText className="h-3 w-3 text-indigo-400 shrink-0" />
                              <span className="truncate">{target.commercialNotes}</span>
                            </div>
                          )}
                        </div>

                        {/* Botões Direita */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openTargetModal(target)}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition w-full sm:w-auto ${
                              target.canSendManual
                                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                                : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            {target.canSendManual ? (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                Recuperar Venda (Comercial X-Point)
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                Ver Auditoria Anti-Erro (10/10)
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Conteúdo da Sub-Aba 2: Configurações & Regras Anti-Loop */}
          {subTab === "settings" && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Settings className="h-4 w-4" />
                  Parâmetros de Tempo & Janela Sem Incomodar o Cliente
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tempo Mínimo Parado (Minutos)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={1440}
                      value={cfgMinIdle}
                      onChange={(e) => setCfgMinIdle(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    />
                    <span className="text-[10px] text-slate-500">
                      Padrão: 45 min após gerar o pedido sem pagamento.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Cooldown por Telefone (Horas)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={720}
                      value={cfgCooldownHours}
                      onChange={(e) => setCfgCooldownHours(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    />
                    <span className="text-[10px] text-slate-500">
                      Padrão: 72h sem enviar outra msg automática ao mesmo número.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Início Horário Comercial (BRT)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={20}
                      value={cfgStartHour}
                      onChange={(e) => setCfgStartHour(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Fim Horário Comercial (BRT)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={22}
                      value={cfgEndHour}
                      onChange={(e) => setCfgEndHour(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    🔒 Limite Automático Fixo: 1 mensagem por pedido (Impossível entrar em loop)
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveConfigParameters}
                    disabled={savingConfig}
                    className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    {savingConfig ? "Salvando..." : "Salvar Parâmetros"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  10 Travas de Segurança Ativas (Anti-Loop & Anti-Mensagem Errada)
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li>
                    ✅ <strong>1. Instância Exclusiva:</strong> Todo envio ao cliente sai estritamente por{" "}
                    <code className="text-emerald-300">Comercial X-Point (5511991649959)</code>.
                  </li>
                  <li>
                    ✅ <strong>2. Cruzamento de Pedidos Pagos:</strong> Antes de enviar, o motor cruza CPF/CNPJ, WhatsApp e E-mail em todos os pedidos. Se o cliente já pagou em outro pedido, o envio é bloqueado na hora.
                  </li>
                  <li>
                    ✅ <strong>3. Deduplicação por Telefone:</strong> Se o cliente gerou 2 ou mais pedidos em aberto, apenas o mais recente fica elegível.
                  </li>
                  <li>
                    ✅ <strong>4. Higienização do Nome:</strong> Remove números de CNPJ/CPF do início do nome (ex: <em>&ldquo;59.942.855 Luis...&rdquo;</em> vira <em>&ldquo;Olá, Luis!&rdquo;</em>).
                  </li>
                  <li>
                    ✅ <strong>5. Trava de Disparo Único (1x):</strong> O piloto automático envia no máximo 1 mensagem por pedido e encerra.
                  </li>
                  <li>
                    ✅ <strong>6. Cooldown de 72h por Telefone + Trava de 60s em Memória:</strong> Impede cliques duplos ou mensagens repetidas.
                  </li>
                  <li>
                    ✅ <strong>7. Corte Anti-Retroativo:</strong> Ativar o automático nunca dispara mensagens em massa para pedidos antigos de dias atrás.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Conteúdo da Sub-Aba 3: Histórico de Envios */}
          {subTab === "history" && (
            <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
              {!data?.history || data.history.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
                  Nenhum disparo de remarketing registrado ainda.
                </div>
              ) : (
                data.history.map((h) => (
                  <div
                    key={h.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            h.ok
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {h.ok ? "ENVIADO" : "FALHA"}
                        </span>
                        <span className="font-mono font-bold text-indigo-400">
                          #{h.orderNumber}
                        </span>
                        <span className="font-bold text-white">{h.customerName}</span>
                        <span className="text-slate-400">({h.phoneE164})</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          {h.mode === "auto" ? "Piloto Automático" : "Envio Assistido"} •{" "}
                          {h.instanceUsed}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {h.messagePreview}
                      </p>
                      {h.error && <p className="text-[11px] text-rose-400">Erro: {h.error}</p>}
                    </div>
                    <div className="text-[11px] text-slate-400 shrink-0">
                      {new Date(h.sentAt).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de Pré-Visualização, Auditoria Anti-Loop (10 Travas) e Disparo via Comercial X-Point */}
      {activeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6 shadow-2xl max-h-[94vh] overflow-y-auto">
            {/* Cabeçalho Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                    Instância: Comercial X-Point
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-400">
                    #{activeTarget.orderNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    • Parado há {activeTarget.idleLabel}
                  </span>
                </div>
                <h3 className="mt-1 text-base sm:text-lg font-extrabold text-white">
                  {activeTarget.customerName}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    ({activeTarget.customerWhatsappRaw} • {activeTarget.cityState})
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTarget(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {feedbackBanner && (
              <div
                className={`mt-3 rounded-xl border p-3 text-xs font-semibold ${
                  feedbackBanner.type === "success"
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                    : feedbackBanner.type === "error"
                    ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                    : "border-indigo-500/40 bg-indigo-500/15 text-indigo-200"
                }`}
              >
                {feedbackBanner.text}
              </div>
            )}

            {/* Alerta de Bloqueio se o Cliente já pagou em outro pedido ou é duplicado */}
            {!activeTarget.canSendManual && (
              <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-100 space-y-1">
                  <div className="font-bold text-amber-300">
                    Disparo Bloqueado Automaticamente pelas Travas de Segurança
                  </div>
                  <p>{activeTarget.primaryStatusBadge.explanation}</p>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Coluna Esquerda (7 cols): Seleção de Template e Mensagem */}
              <div className="lg:col-span-7 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Escolha a Abordagem Consultiva (Sem ser invasivo):
                  </label>
                  <div className="space-y-1.5">
                    {(Object.keys(TEMPLATE_LABELS) as RemarketingTemplateId[]).map((tplKey) => {
                      const info = TEMPLATE_LABELS[tplKey];
                      const active = selectedTemplate === tplKey;
                      return (
                        <button
                          key={tplKey}
                          type="button"
                          onClick={() => handleTemplateChange(tplKey)}
                          className={`w-full text-left rounded-xl border p-2.5 transition ${
                            active
                              ? "border-indigo-500 bg-indigo-500/15 text-white"
                              : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-bold">{info.title}</div>
                          <div className="text-[11px] text-slate-400">{info.subtitle}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      Pré-visualização / Edição da Mensagem WhatsApp:
                    </label>
                    <span className="text-[11px] text-emerald-400">
                      Saudação sanitizada: &ldquo;Olá, {activeTarget.customerFirstName}!&rdquo;
                    </span>
                  </div>
                  <textarea
                    rows={9}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 leading-relaxed focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveTargetMeta(!activeTarget.doNotDisturb)}
                    disabled={savingMeta}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
                      activeTarget.doNotDisturb
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                    }`}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {activeTarget.doNotDisturb
                      ? "Reativar Contato para este Cliente"
                      : "Marcar Não Perturbar"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDispatchMessage}
                    disabled={!activeTarget.canSendManual || sending}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                      activeTarget.canSendManual
                        ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/25"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    }`}
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Enviando via Comercial X-Point...
                      </>
                    ) : activeTarget.canSendManual ? (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Agora via Comercial X-Point
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Envio Bloqueado pelas Travas
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Coluna Direita (5 cols): Gestão Comercial (CRM) + Checklist das 10 Travas */}
              <div className="lg:col-span-5 space-y-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Acompanhamento Comercial (CRM)
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Etapa da Recuperação:
                    </label>
                    <select
                      value={editingStage}
                      onChange={(e) =>
                        setEditingStage(e.target.value as CommercialRecoveryStage)
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="awaiting_contact">Aguardando 1º Contato</option>
                      <option value="auto_contacted">1º Contato Automático Enviado</option>
                      <option value="manual_contacted">Contato Comercial Enviado</option>
                      <option value="in_negotiation">Em Negociação / Dúvida Técnica</option>
                      <option value="recovered">Venda Recuperada / Pago</option>
                      <option value="do_not_disturb">Pausado / Não Perturbar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Anotações Comerciais / Combinado com o Cliente:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Cliente pediu para aguardar liberação do limite do cartão na segunda-feira..."
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveTargetMeta()}
                    disabled={savingMeta}
                    className="w-full rounded-lg bg-indigo-600/90 hover:bg-indigo-500 py-1.5 text-xs font-bold text-white"
                  >
                    {savingMeta ? "Salvando..." : "Salvar Etapa & Notas"}
                  </button>
                </div>

                {/* Checklist Auditável das Travas de Segurança */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Auditoria Anti-Loop ({activeTarget.safetyGuards.filter((g) => g.passed).length}/
                    {activeTarget.safetyGuards.length})
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {activeTarget.safetyGuards.map((g) => (
                      <div
                        key={g.code}
                        className={`rounded-lg border p-2 text-[11px] ${
                          g.passed
                            ? "border-emerald-500/20 bg-emerald-500/5 text-slate-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{g.passed ? "✅" : "🛡️"}</span>
                          <span>{g.label}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] opacity-85 pl-5">{g.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
