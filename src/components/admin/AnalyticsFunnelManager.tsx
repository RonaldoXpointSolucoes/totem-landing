"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Save,
  Trash2,
  Edit2,
  Download,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Monitor,
  Tablet,
  MessageCircle,
  ShoppingCart,
  QrCode,
  Layers,
  Clock,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Target,
  Activity,
  FileText,
  X,
  Gauge,
  Eye,
} from "lucide-react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { siteConfig } from "@/config/site";
import { FUNNEL_STAGES } from "@/lib/analytics/events";
import type {
  AnalyticsSnapshot,
  FunnelImprovementAction,
  FunnelBottleneckInsight,
  StoredAnalyticsEvent,
} from "@/lib/analytics/serverStore";

interface AnalyticsFunnelManagerProps {
  initialData?: any;
}

const PRIORITY_STYLES: Record<
  FunnelImprovementAction["priority"],
  { label: string; badgeClass: string }
> = {
  critica: {
    label: "Crítica",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  },
  alta: {
    label: "Alta",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  media: {
    label: "Média",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  baixa: {
    label: "Baixa",
    badgeClass: "bg-slate-700/60 text-slate-300 border-slate-600",
  },
};

const STATUS_IMPROVEMENT_STYLES: Record<
  FunnelImprovementAction["status"],
  { label: string; badgeClass: string }
> = {
  planejada: {
    label: "Planejada",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  },
  em_andamento: {
    label: "Em Execução",
    badgeClass: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
  em_teste_ab: {
    label: "Em Monitoramento / A-B",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  concluida: {
    label: "Implementada",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  },
  validada: {
    label: "Validada c/ Ganho",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
};

const WHATSAPP_SOURCE_LABELS: Record<string, string> = {
  floating_whatsapp_discreet: "Botão Flutuante WhatsApp",
  faq_bottom_cta: "CTA Dúvidas (Rodapé FAQ)",
  b2b_reseller_card: "Card Revenda / Software House B2B",
  footer_support: "Link Engenharia no Rodapé",
  gtag_report_conversion_whatsapp: " Disparo Direto Conversão",
};

const MODEL_LABELS: Record<string, string> = {
  "cabinet-floor": "Totem de Piso (Pedestal Pro)",
  "cabinet-wall": "Totem de Parede (Slim)",
  "cabinet-countertop": "Totem de Balcão (Expresso)",
  floor: "Totem de Piso (Pedestal Pro)",
  wall: "Totem de Parede (Slim)",
  countertop: "Totem de Balcão (Expresso)",
};

export const AnalyticsFunnelManager: React.FC<AnalyticsFunnelManagerProps> = ({
  initialData,
}) => {
  const [data, setData] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);

  // Sub-abas internas da Central de Inteligência
  const [subTab, setSubTab] = useState<
    "overview" | "snapshots" | "improvements" | "events"
  >("overview");

  // Filtros globais de consulta
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "mobile" | "desktop" | "tablet">("all");
  const [eventSearch, setEventSearch] = useState("");

  // Comparador de Snapshots
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>("");
  const [viewingSnapshot, setViewingSnapshot] = useState<AnalyticsSnapshot | null>(null);

  // Modal: Salvar Novo Snapshot
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState({
    title: "",
    periodLabel: "Ciclo Atual",
    siteVersion: siteConfig.version || "3.2.2",
    notes: "",
    appliedImprovements: "",
    futureGoals: "",
    tags: "Core Web Vitals, Funil B2B, Conversão",
    pagespeedMobile: 99,
    pagespeedDesktop: 100,
    gtmetrixGrade: "A",
    gtmetrixPerformance: 96,
    gtmetrixStructure: 98,
    lcpMs: 339,
    tbtMs: 7,
    cls: 0,
    domElements: 890,
  });

  // Modal: Criar / Editar Melhoria (CRO)
  const [isImprovementModalOpen, setIsImprovementModalOpen] = useState(false);
  const [isSavingImprovement, setIsSavingImprovement] = useState(false);
  const [improvementStatusFilter, setImprovementStatusFilter] = useState<string>("all");
  const [improvementForm, setImprovementForm] = useState<{
    id?: string;
    title: string;
    targetStageId: string;
    problemIdentified: string;
    proposedAction: string;
    expectedImpact: string;
    measuredResult: string;
    priority: FunnelImprovementAction["priority"];
    status: FunnelImprovementAction["status"];
    owner: string;
    versionTag: string;
  }>({
    title: "",
    targetStageId: "stage_home",
    problemIdentified: "",
    proposedAction: "",
    expectedImpact: "",
    measuredResult: "",
    priority: "alta",
    status: "planejada",
    owner: "Engenharia & Produto",
    versionTag: `v${siteConfig.version}`,
  });

  // Feedback visual
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchAnalyticsData = async (
    period = periodFilter,
    device = deviceFilter,
    search = eventSearch
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("device", device);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/analytics/funnel?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
        if (!selectedSnapshotId && Array.isArray(json.snapshots) && json.snapshots.length > 0) {
          setSelectedSnapshotId(json.snapshots[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados de analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData(periodFilter, deviceFilter, eventSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter, deviceFilter]);

  const funnel = data?.funnel || {};
  const counts = data?.counts || {};
  const commercial = data?.commercial || {};
  const snapshots: AnalyticsSnapshot[] = data?.snapshots || [];
  const improvements: FunnelImprovementAction[] = data?.improvements || [];
  const recentEvents: StoredAnalyticsEvent[] = data?.recentEvents || [];
  const stages = funnel?.stages || [];
  const insights: FunnelBottleneckInsight[] = funnel?.bottleneckInsights || [];

  // Snapshot selecionado para comparação Antes vs. Agora
  const comparisonSnapshot = useMemo(() => {
    if (!snapshots.length) return null;
    return snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0];
  }, [snapshots, selectedSnapshotId]);

  // Abrir modal de Snapshot preenchido com sugestão inteligente
  const handleOpenSnapshotModal = () => {
    const todayStr = new Date().toLocaleDateString("pt-BR");
    setSnapshotForm((prev) => ({
      ...prev,
      title: `Snapshot de Funil & Performance (${todayStr} — v${siteConfig.version})`,
      periodLabel:
        periodFilter === "today"
          ? "Hoje"
          : periodFilter === "7d"
          ? "Últimos 7 Dias"
          : periodFilter === "30d"
          ? "Últimos 30 Dias"
          : "Período Acumulado",
      siteVersion: siteConfig.version || "3.2.2",
    }));
    setIsSnapshotModalOpen(true);
  };

  // Salvar Snapshot no servidor
  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotForm.title.trim()) return;
    setIsSavingSnapshot(true);

    try {
      const res = await fetch("/api/analytics/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_snapshot",
          title: snapshotForm.title,
          periodLabel: snapshotForm.periodLabel,
          siteVersion: snapshotForm.siteVersion,
          notes: snapshotForm.notes,
          appliedImprovements: snapshotForm.appliedImprovements,
          futureGoals: snapshotForm.futureGoals,
          tags: snapshotForm.tags,
          periodFilter,
          webVitals: {
            pagespeedMobile: Number(snapshotForm.pagespeedMobile) || 99,
            pagespeedDesktop: Number(snapshotForm.pagespeedDesktop) || 100,
            gtmetrixGrade: snapshotForm.gtmetrixGrade || "A",
            gtmetrixPerformance: Number(snapshotForm.gtmetrixPerformance) || 96,
            gtmetrixStructure: Number(snapshotForm.gtmetrixStructure) || 98,
            lcpMs: Number(snapshotForm.lcpMs) || 339,
            tbtMs: Number(snapshotForm.tbtMs) || 7,
            cls: Number(snapshotForm.cls) || 0,
            domElements: Number(snapshotForm.domElements) || 890,
          },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev: any) => ({ ...prev, snapshots: json.snapshots }));
        if (json.snapshot?.id) setSelectedSnapshotId(json.snapshot.id);
        setIsSnapshotModalOpen(false);
        setSubTab("snapshots");
        showToast("Snapshot salvo com sucesso para análise futura!");
      }
    } catch (err) {
      console.error("Erro ao salvar snapshot:", err);
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    try {
      const res = await fetch("/api/analytics/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_snapshot", id }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev: any) => ({ ...prev, snapshots: json.snapshots }));
        showToast("Snapshot removido do histórico.");
      }
    } catch (err) {
      console.error("Erro ao excluir snapshot:", err);
    }
  };

  // Abrir modal de Melhoria (novo ou edição, ou a partir de uma etapa/insight)
  const handleOpenImprovementModal = (prefill?: Partial<typeof improvementForm>) => {
    setImprovementForm({
      id: prefill?.id,
      title: prefill?.title || "",
      targetStageId: prefill?.targetStageId || "stage_home",
      problemIdentified: prefill?.problemIdentified || "",
      proposedAction: prefill?.proposedAction || "",
      expectedImpact: prefill?.expectedImpact || "",
      measuredResult: prefill?.measuredResult || "",
      priority: prefill?.priority || "alta",
      status: prefill?.status || "planejada",
      owner: prefill?.owner || "Engenharia & Produto",
      versionTag: prefill?.versionTag || `v${siteConfig.version}`,
    });
    setIsImprovementModalOpen(true);
  };

  const handleSaveImprovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!improvementForm.title.trim()) return;
    setIsSavingImprovement(true);

    try {
      const stageObj = FUNNEL_STAGES.find((s) => s.stageId === improvementForm.targetStageId);
      const res = await fetch("/api/analytics/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_improvement",
          ...improvementForm,
          targetStageLabel: stageObj
            ? `${stageObj.stepNumber}. ${stageObj.label}`
            : "Funil Global",
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev: any) => ({ ...prev, improvements: json.improvements }));
        setIsImprovementModalOpen(false);
        showToast(
          improvementForm.id
            ? "Registro de melhoria atualizado!"
            : "Nova melhoria registrada no plano de CRO!"
        );
      }
    } catch (err) {
      console.error("Erro ao salvar melhoria:", err);
    } finally {
      setIsSavingImprovement(false);
    }
  };

  const handleQuickUpdateImprovementStatus = async (
    item: FunnelImprovementAction,
    newStatus: FunnelImprovementAction["status"]
  ) => {
    try {
      const res = await fetch("/api/analytics/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_improvement",
          ...item,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev: any) => ({ ...prev, improvements: json.improvements }));
        showToast(`Status alterado para "${STATUS_IMPROVEMENT_STYLES[newStatus].label}"`);
      }
    } catch (err) {
      console.error("Erro ao atualizar status da melhoria:", err);
    }
  };

  const handleDeleteImprovement = async (id: string) => {
    try {
      const res = await fetch("/api/analytics/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_improvement", id }),
      });
      const json = await res.json();
      if (json.ok) {
        setData((prev: any) => ({ ...prev, improvements: json.improvements }));
        showToast("Melhoria removida.");
      }
    } catch (err) {
      console.error("Erro ao remover melhoria:", err);
    }
  };

  // Exportar Relatório Markdown p/ IA ou Clipboard
  const handleCopyMarkdownReport = () => {
    const lines = [
      `# Relatório de Telemetria de Funil & Performance — Totem Pro (v${siteConfig.version})`,
      `Data da Extração: ${new Date().toLocaleString("pt-BR")}`,
      `Filtro de Período: ${periodFilter} | Dispositivo: ${deviceFilter}`,
      ``,
      `## 1. KPIs Executivos`,
      `- **Sessões Únicas:** ${funnel.totalSessions || 0} (${funnel.totalEvents || 0} eventos disparados)`,
      `- **Taxa de Conversão Checkout:** ${funnel.globalConversionRate || 0}%`,
      `- **Cliques no WhatsApp:** ${funnel.whatsappClicks || 0} (${funnel.whatsappConversionRate || 0}% das visitas)`,
      `- **Pix Emitidos (Telemetria):** ${counts.pix_generated || 0}`,
      `- **Vendas Confirmadas (Telemetria):** ${counts.purchase || 0}`,
      `- **Pedidos Reais no Banco (Appwrite):** ${commercial.totalOrders || 0} pedidos (${commercial.paidOrders || 0} pagos | GMV: ${formatBRL(commercial.totalGmvCents || 0)})`,
      ``,
      `## 2. Desempenho por Etapa do Funil`,
      ...stages.map(
        (s: any) =>
          `${s.stepNumber}. **${s.label}** (\`${s.eventName}\`): ${s.uniqueSessions} sessões únicas (${s.count} eventos) | Retenção: ${s.conversionRateFromPrevious}% | Drop-off: ${s.stepNumber === 1 ? "—" : `${s.dropoffRateFromPrevious}%`}`
      ),
      ``,
      `## 3. Diagnóstico Automático de Gargalos`,
      ...insights.map((ins) => `- **[${ins.severity.toUpperCase()}] ${ins.title}:** ${ins.diagnosis} -> *Recomendação:* ${ins.recommendation}`),
      ``,
      `## 4. Plano de Melhorias Registradas (${improvements.length})`,
      ...improvements.map(
        (imp) =>
          `- [${STATUS_IMPROVEMENT_STYLES[imp.status]?.label}] **${imp.title}** (${imp.targetStageLabel}) — Prioridade: ${imp.priority.toUpperCase()} | Impacto: ${imp.expectedImpact}`
      ),
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedMarkdown(true);
    showToast("Relatório Markdown copiado para a área de transferência!");
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  // Exportar JSON completo
  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `totem-analytics-v${siteConfig.version}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Arquivo JSON exportado com sucesso!");
  };

  const filteredImprovements = useMemo(() => {
    if (improvementStatusFilter === "all") return improvements;
    return improvements.filter((i) => i.status === improvementStatusFilter);
  }, [improvements, improvementStatusFilter]);

  const deviceTotal =
    (funnel?.deviceBreakdown?.mobile || 0) +
    (funnel?.deviceBreakdown?.desktop || 0) +
    (funnel?.deviceBreakdown?.tablet || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast de Feedback */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-2xl border border-emerald-400/40 flex items-center gap-2 animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CABEÇALHO EXECUTIVO COM FILTROS, EXPORTAÇÃO & AÇÕES DE SALVAMENTO    */}
      {/* ==================================================================== */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/30 p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Inteligência de Conversão & CRO
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Persistência Ativa • v{siteConfig.version}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-6 h-6 text-cyan-400 shrink-0" />
              <span>Telemetria de Funil B2B, Histórico de Snapshots & Melhorias</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Analise sessões únicas vs. eventos por etapa, identifique gargalos de abandono, salve snapshots congelados para comparação futura (Antes vs. Depois) e gerencie o plano de melhorias contínuas.
            </p>
          </div>

          {/* Botões Principais de Ação */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenSnapshotModal}
              className="min-h-[42px] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Snapshot p/ Análise Futura</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenImprovementModal()}
              className="min-h-[42px] px-4 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 active:scale-95 text-indigo-300 border border-indigo-500/40 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Melhoria</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdownReport}
              className="min-h-[42px] px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar Relatório Completo em Markdown para Análise"
            >
              {copiedMarkdown ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-cyan-400" />
              )}
              <span className="hidden sm:inline">
                {copiedMarkdown ? "Copiado!" : "Copiar Relatório"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="min-h-[42px] p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Baixar Dados Completos em JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => fetchAnalyticsData(periodFilter, deviceFilter, eventSearch)}
              disabled={isLoading}
              className="min-h-[42px] px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Barra de Sub-Abas + Filtros de Período e Dispositivo */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Sub-Abas de Navegação */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSubTab("overview")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                subTab === "overview"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Funil & Diagnóstico</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("snapshots")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                subTab === "snapshots"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Snapshots Salvos & Comparador</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px]">
                {snapshots.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("improvements")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                subTab === "improvements"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Plano de Melhorias (CRO)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px]">
                {improvements.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab("events")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                subTab === "events"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-slate-950/70 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Log de Eventos ao Vivo</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px]">
                {recentEvents.length}
              </span>
            </button>
          </div>

          {/* Filtros de Período e Dispositivo */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1 gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
              {(
                [
                  { id: "all", label: "Tudo" },
                  { id: "today", label: "Hoje" },
                  { id: "7d", label: "7 Dias" },
                  { id: "30d", label: "30 Dias" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodFilter(p.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    periodFilter === p.id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1 gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
              {(
                [
                  { id: "all", label: "Todos" },
                  { id: "mobile", label: "Mobile" },
                  { id: "desktop", label: "Desktop" },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeviceFilter(d.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    deviceFilter === d.id
                      ? "bg-cyan-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 8 CARDS DE KPI EXECUTIVOS (SESSÕES, WHATSAPP, CONFIGURADOR, GMV)     */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Sessões Únicas vs Eventos */}
        <div className="bg-slate-900/85 border border-slate-800/90 p-5 rounded-2xl space-y-2 hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total de Sessões Únicas</span>
            <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
              Topo do Funil
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-black text-white font-mono">
              {funnel.totalSessions || 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {funnel.totalEvents || 0} eventos totais
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/70">
            <span>Mobile: {funnel?.deviceBreakdown?.mobile || 0}</span>
            <span>Desktop: {funnel?.deviceBreakdown?.desktop || 0}</span>
          </div>
        </div>

        {/* KPI 2: Cliques e Conversão Assistida no WhatsApp */}
        <div className="bg-slate-900/85 border border-slate-800/90 p-5 rounded-2xl space-y-2 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Leads / Cliques WhatsApp</span>
            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Canal B2B
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {funnel.whatsappClicks || 0}
            </span>
            <span className="text-xs font-bold text-emerald-300">
              {funnel.whatsappConversionRate || 0}% das visitas
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/70 truncate">
            Sessões únicas em contato: <strong className="text-slate-200">{funnel.whatsappUniqueSessions || 0}</strong>
          </div>
        </div>

        {/* KPI 3: Pix Emitidos & Checkout */}
        <div className="bg-slate-900/85 border border-slate-800/90 p-5 rounded-2xl space-y-2 hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Pix Gerados & Checkouts</span>
            <span className="text-[10px] font-bold bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
              Fundo de Funil
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-black text-cyan-400 font-mono">
              {Math.max(counts.pix_generated || 0, commercial.totalOrders || 0)}
            </span>
            <span className="text-xs text-slate-400">
              {counts.add_to_cart || 0} carrinhos criados
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/70">
            <span>Aguardando Pix: <strong className="text-amber-300">{commercial.awaitingPaymentOrders || 0}</strong></span>
            <span>Cadastros: <strong className="text-slate-200">{counts.lead_submitted || 0}</strong></span>
          </div>
        </div>

        {/* KPI 4: Vendas Confirmadas & GMV no Banco */}
        <div className="bg-slate-900/85 border border-slate-800/90 p-5 rounded-2xl space-y-2 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Pedidos & Receita (GMV)</span>
            <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30">
              Appwrite Live
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
              {formatBRL(commercial.totalGmvCents || 0)}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {Math.max(counts.purchase || 0, commercial.paidOrders || 0)} pagos
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/70">
            <span>Total Pedidos: <strong className="text-white">{commercial.totalOrders || 0}</strong></span>
            <span>Ticket Médio: <strong className="text-slate-200">{formatBRL(commercial.averageTicketCents || 0)}</strong></span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SUB-ABA 1: VISÃO GERAL, FUNIL DE 8 ETAPAS & DIAGNÓSTICO DE GARGALOS  */}
      {/* ==================================================================== */}
      {subTab === "overview" && (
        <div className="space-y-6">
          {/* Bloco de Diagnóstico Inteligente de Gargalos (CRO Insights) */}
          {insights.length > 0 && (
            <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Diagnóstico Inteligente de Gargalos & Oportunidades de Melhoria</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Análise automática gerada sobre as taxas atuais de passagem e engajamento do funil.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {insights.map((ins) => {
                  const borderMap = {
                    critical: "border-rose-500/40 bg-rose-950/15",
                    warning: "border-amber-500/40 bg-amber-950/15",
                    opportunity: "border-cyan-500/40 bg-cyan-950/15",
                    success: "border-emerald-500/40 bg-emerald-950/15",
                  };
                  const badgeMap = {
                    critical: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                    opportunity: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
                    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                  };

                  return (
                    <div
                      key={ins.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${borderMap[ins.severity]}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            {ins.stageLabel}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeMap[ins.severity]}`}
                          >
                            {ins.metricBadge}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                          {ins.title}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{ins.diagnosis}</p>
                        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300">
                          <strong className="text-cyan-300 block mb-0.5">Ação Recomendada:</strong>
                          {ins.recommendation}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenImprovementModal({
                            title: ins.title,
                            targetStageId: ins.stageId,
                            problemIdentified: ins.diagnosis,
                            proposedAction: ins.recommendation,
                            expectedImpact: "Reduzir taxa de abandono da etapa e elevar conversão PIX/WhatsApp.",
                            priority: ins.severity === "critical" ? "critica" : "alta",
                          })
                        }
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Salvar no Plano de Melhorias</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Funil de 8 Etapas com Sessões Únicas vs. Disparos Totais + Botão de Ação por Etapa */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-white text-base sm:text-lg">
                  Desempenho por Etapa & Análise de Drop-off (Sessões Únicas vs. Eventos)
                </h3>
                <p className="text-xs text-slate-400">
                  A retenção é calculada sobre <strong>Sessões Únicas</strong> (evitando distorção quando o mesmo visitante clica múltiplas vezes no configurador).
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Boa Retenção (&gt;50%)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Gargalo (&gt;50% Abandono)
                </span>
              </div>
            </div>

            <div className="space-y-3.5 pt-1">
              {stages.map((stage: any, index: number) => {
                const isTop = index === 0;
                const isHighDropoff = !isTop && stage.dropoffRateFromPrevious > 50;

                return (
                  <div
                    key={stage.stageId}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                      isHighDropoff
                        ? "bg-slate-950/90 border-rose-500/30 hover:border-rose-500/50"
                        : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-500/30 shrink-0">
                          {stage.stepNumber}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-white text-sm sm:text-base">
                              {stage.label}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
                              {stage.eventName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 sm:gap-6 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">
                            Sessões Únicas
                          </span>
                          <span className="font-black text-white text-sm sm:text-base">
                            {stage.uniqueSessions ?? stage.count}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">
                            Total Disparos
                          </span>
                          <span className="font-bold text-slate-300 text-sm">
                            {stage.count}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">
                            Retenção da Etapa
                          </span>
                          <span className="font-extrabold text-emerald-400 text-sm">
                            {stage.conversionRateFromPrevious}%
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] font-sans">
                            Taxa de Abandono
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-lg text-[11px] inline-block ${
                              isTop
                                ? "text-slate-500"
                                : isHighDropoff
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {isTop ? "—" : `${stage.dropoffRateFromPrevious}%`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenImprovementModal({
                              targetStageId: stage.stageId,
                              title: `Otimizar etapa: ${stage.label}`,
                              problemIdentified: `Etapa "${stage.label}" apresenta ${stage.dropoffRateFromPrevious}% de taxa de abandono (${stage.uniqueSessions} sessões únicas).`,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 font-sans font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Criar ação de melhoria para esta etapa"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Melhorar Etapa</span>
                        </button>
                      </div>
                    </div>

                    {/* Barra de Progresso Visual */}
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800/90">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.max(4, Math.min(100, stage.overallConversionRate || 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Inferior: Preferências de Produto, Canais de WhatsApp & Dispositivos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Card 1: Modelos de Gabinete Mais Selecionados */}
            <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Modelos Mais Selecionados</span>
                </h4>
                <span className="text-[11px] text-slate-400">Configurador</span>
              </div>

              {funnel?.popularModels && Object.keys(funnel.popularModels).length > 0 ? (
                <div className="space-y-2.5">
                  {Object.entries(funnel.popularModels)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .map(([mId, count]: [string, any]) => (
                      <div
                        key={mId}
                        className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-slate-200">
                          {MODEL_LABELS[mId] || mId.replace("cabinet-", "Totem ")}
                        </span>
                        <span className="font-mono font-extrabold text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-700/40">
                          {count} seleções
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">
                  Nenhuma seleção de modelo registrada no filtro atual.
                </p>
              )}
            </div>

            {/* Card 2: Origens dos Cliques no WhatsApp */}
            <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Cliques no WhatsApp por Origem</span>
                </h4>
                <span className="text-[11px] text-emerald-400 font-bold">
                  {funnel.whatsappClicks || 0} total
                </span>
              </div>

              {funnel?.whatsappSources && Object.keys(funnel.whatsappSources).length > 0 ? (
                <div className="space-y-2.5">
                  {Object.entries(funnel.whatsappSources)
                    .sort((a: any, b: any) => b[1] - a[1])
                    .map(([src, cnt]: [string, any]) => (
                      <div
                        key={src}
                        className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 flex justify-between items-center text-xs"
                      >
                        <span className="font-bold text-slate-200 truncate pr-2">
                          {WHATSAPP_SOURCE_LABELS[src] || src}
                        </span>
                        <span className="font-mono font-extrabold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-700/40 shrink-0">
                          {cnt} clique(s)
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">
                  Nenhum clique em WhatsApp registrado no período filtrado.
                </p>
              )}
            </div>

            {/* Card 3: Dispositivos & Engajamento Técnico */}
            <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Dispositivos & Engajamento</span>
                </h4>
                <span className="text-[11px] text-slate-400">{deviceTotal} sessões</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <Smartphone className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <span className="text-lg font-black text-white block font-mono">
                    {funnel?.deviceBreakdown?.mobile || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Mobile</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <Monitor className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                  <span className="text-lg font-black text-white block font-mono">
                    {funnel?.deviceBreakdown?.desktop || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Desktop</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <Tablet className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                  <span className="text-lg font-black text-white block font-mono">
                    {funnel?.deviceBreakdown?.tablet || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Tablet</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Inspeções 3D:</span>
                  <strong className="text-white font-mono">{funnel.view3dCount || 0}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Leituras FAQ:</span>
                  <strong className="text-white font-mono">{funnel.faqViewsCount || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 2: SNAPSHOTS SALVOS & COMPARADOR HISTÓRICO (ANTES VS DEPOIS) */}
      {/* ==================================================================== */}
      {subTab === "snapshots" && (
        <div className="space-y-6">
          {/* Comparador Lado a Lado: Snapshot Salvo vs. Métricas Atuais */}
          {comparisonSnapshot && (
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">
                    Comparador de Evolução (Antes vs. Agora)
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    Comparando Snapshot Salvo com as Métricas Atuais em Tempo Real
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="select-snapshot-compare" className="text-xs text-slate-400 font-bold">
                    Snapshot Base:
                  </label>
                  <select
                    id="select-snapshot-compare"
                    value={selectedSnapshotId}
                    onChange={(e) => setSelectedSnapshotId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {snapshots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({new Date(s.createdAt).toLocaleDateString("pt-BR")})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: "Sessões Únicas",
                    before: comparisonSnapshot.metrics.totalSessions || 0,
                    now: funnel.totalSessions || 0,
                  },
                  {
                    label: "Cliques WhatsApp",
                    before: comparisonSnapshot.metrics.whatsappClicks || 0,
                    now: funnel.whatsappClicks || 0,
                  },
                  {
                    label: "Início Configurador",
                    before: comparisonSnapshot.metrics.configuratorStarts || 0,
                    now: counts.start_configurator || 0,
                  },
                  {
                    label: "Adições Carrinho",
                    before: comparisonSnapshot.metrics.cartAdditions || 0,
                    now: counts.add_to_cart || 0,
                  },
                  {
                    label: "Pix Emitidos",
                    before: comparisonSnapshot.metrics.pixGenerated || 0,
                    now: Math.max(counts.pix_generated || 0, commercial.totalOrders || 0),
                  },
                  {
                    label: "Vendas Pagas",
                    before: comparisonSnapshot.metrics.purchasesCompleted || 0,
                    now: Math.max(counts.purchase || 0, commercial.paidOrders || 0),
                  },
                ].map((metric, idx) => {
                  const diff = metric.now - metric.before;
                  const isPositive = diff >= 0;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1.5"
                    >
                      <span className="text-[11px] font-bold text-slate-400 block">
                        {metric.label}
                      </span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-white font-mono">
                          {metric.now}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-bold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                            diff > 0
                              ? "bg-emerald-500/15 text-emerald-300"
                              : diff < 0
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {diff > 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : diff < 0 ? (
                            <ArrowDownRight className="w-3 h-3" />
                          ) : null}
                          {isPositive && diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        No Snapshot: {metric.before}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lista de Todos os Snapshots Salvos */}
          <div className="space-y-4">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/85 border border-slate-800 hover:border-slate-700 transition-all space-y-4 shadow-lg"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        v{snap.siteVersion}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Salvo em {new Date(snap.createdAt).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-cyan-400 font-semibold">
                        • {snap.periodLabel}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold text-white">
                      {snap.title}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingSnapshot(viewingSnapshot?.id === snap.id ? null : snap)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{viewingSnapshot?.id === snap.id ? "Ocultar Detalhes" : "Ver Etapas Congeladas"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 cursor-pointer"
                      title="Excluir Snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resumo de Métricas e Web Vitals do Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Sessões</span>
                    <strong className="text-white font-mono text-sm">{snap.metrics.totalSessions}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">WhatsApp</span>
                    <strong className="text-emerald-400 font-mono text-sm">{snap.metrics.whatsappClicks}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Carrinhos</span>
                    <strong className="text-cyan-400 font-mono text-sm">{snap.metrics.cartAdditions}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Pix / Pedidos</span>
                    <strong className="text-indigo-400 font-mono text-sm">
                      {Math.max(snap.metrics.pixGenerated, snap.metrics.realOrdersCount || 0)}
                    </strong>
                  </div>
                  {snap.webVitals && (
                    <>
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-300 block">PageSpeed Mobile</span>
                        <strong className="text-emerald-400 font-mono text-sm">
                          {snap.webVitals.pagespeedMobile || 99}/100
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-300 block">GTmetrix</span>
                        <strong className="text-emerald-400 font-mono text-sm">
                          {snap.webVitals.gtmetrixGrade || "A"} ({snap.webVitals.gtmetrixPerformance || 96}%)
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">LCP / TBT</span>
                        <strong className="text-white font-mono text-sm">
                          {snap.webVitals.lcpMs || 339}ms / {snap.webVitals.tbtMs || 7}ms
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">DOM Nodes</span>
                        <strong className="text-white font-mono text-sm">
                          {snap.webVitals.domElements || 890}
                        </strong>
                      </div>
                    </>
                  )}
                </div>

                {/* Notas, Melhorias Aplicadas e Metas Futuras Salvas no Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {snap.notes && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <strong className="text-indigo-300 block uppercase text-[10px] tracking-wider">
                        Diagnóstico / Contexto Salvo:
                      </strong>
                      <p className="text-slate-300 whitespace-pre-line leading-relaxed">{snap.notes}</p>
                    </div>
                  )}
                  {snap.appliedImprovements && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <strong className="text-emerald-300 block uppercase text-[10px] tracking-wider">
                        Melhorias Implementadas no Marco:
                      </strong>
                      <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                        {snap.appliedImprovements}
                      </p>
                    </div>
                  )}
                  {snap.futureGoals && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <strong className="text-amber-300 block uppercase text-[10px] tracking-wider">
                        Metas & Próximos Passos:
                      </strong>
                      <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                        {snap.futureGoals}
                      </p>
                    </div>
                  )}
                </div>

                {/* Expansão das 8 etapas congeladas neste Snapshot */}
                {viewingSnapshot?.id === snap.id && (
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {snap.metrics.stages?.map((st) => (
                      <div
                        key={st.stageId}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Etapa {st.stepNumber}
                          </span>
                          <strong className="text-white">{st.label}</strong>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-sm font-black text-cyan-300 block">
                            {st.uniqueSessions ?? st.count} sess.
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {st.conversionRateFromPrevious}% ret.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 3: PLANO DE MELHORIAS CONTÍNUAS (CRO BACKLOG)                */}
      {/* ==================================================================== */}
      {subTab === "improvements" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/85 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  { id: "all", label: "Todas" },
                  { id: "planejada", label: "Planejadas" },
                  { id: "em_andamento", label: "Em Execução" },
                  { id: "em_teste_ab", label: "Em Monitoramento" },
                  { id: "concluida", label: "Implementadas" },
                  { id: "validada", label: "Validadas" },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setImprovementStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    improvementStatusFilter === st.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleOpenImprovementModal()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Nova Melhoria</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredImprovements.map((imp) => {
              const prio = PRIORITY_STYLES[imp.priority] || PRIORITY_STYLES.alta;
              const stat = STATUS_IMPROVEMENT_STYLES[imp.status] || STATUS_IMPROVEMENT_STYLES.planejada;

              return (
                <div
                  key={imp.id}
                  className="p-5 rounded-3xl bg-slate-900/85 border border-slate-800 hover:border-slate-700 transition-all space-y-3.5 shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${prio.badgeClass}`}
                        >
                          Prioridade {prio.label}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stat.badgeClass}`}
                        >
                          {stat.label}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 text-cyan-300 border border-slate-800">
                          {imp.targetStageLabel}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          • {imp.versionTag} • {imp.owner}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-white">{imp.title}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Mudar status da melhoria ${imp.title}`}
                        value={imp.status}
                        onChange={(e) =>
                          handleQuickUpdateImprovementStatus(
                            imp,
                            e.target.value as FunnelImprovementAction["status"]
                          )
                        }
                        className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-bold"
                      >
                        {Object.entries(STATUS_IMPROVEMENT_STYLES).map(([k, v]) => (
                          <option key={k} value={k}>
                            Status: {v.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenImprovementModal({
                            id: imp.id,
                            title: imp.title,
                            targetStageId: imp.targetStageId,
                            problemIdentified: imp.problemIdentified,
                            proposedAction: imp.proposedAction,
                            expectedImpact: imp.expectedImpact,
                            measuredResult: imp.measuredResult || "",
                            priority: imp.priority,
                            status: imp.status,
                            owner: imp.owner,
                            versionTag: imp.versionTag,
                          })
                        }
                        className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 cursor-pointer"
                        title="Editar Melhoria"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteImprovement(imp.id)}
                        className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 cursor-pointer"
                        title="Excluir Melhoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                      <strong className="text-rose-300 block uppercase text-[10px] mb-1">
                        1. Problema / Gargalo Identificado:
                      </strong>
                      <p className="text-slate-300 leading-relaxed">
                        {imp.problemIdentified || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                      <strong className="text-cyan-300 block uppercase text-[10px] mb-1">
                        2. Ação / Melhoria Implementada:
                      </strong>
                      <p className="text-slate-300 leading-relaxed">
                        {imp.proposedAction || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                      <strong className="text-emerald-300 block uppercase text-[10px] mb-1">
                        3. Impacto Esperado & Resultado Medido:
                      </strong>
                      <p className="text-slate-300 leading-relaxed">
                        {imp.expectedImpact}
                      </p>
                      {imp.measuredResult && (
                        <p className="mt-1.5 pt-1.5 border-t border-slate-800 text-emerald-300 font-semibold">
                          ✓ {imp.measuredResult}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-ABA 4: LOG DE EVENTOS EM TEMPO REAL (LIVE STREAM)                */}
      {/* ==================================================================== */}
      {subTab === "events" && (
        <div className="bg-slate-900/85 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-white">
                Stream de Eventos de Telemetria em Tempo Real
              </h3>
              <p className="text-xs text-slate-400">
                Últimos {recentEvents.length} eventos registrados no servidor com sessão, rota e metadados.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar evento, modelo, sessão..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchAnalyticsData(periodFilter, deviceFilter, eventSearch);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 pr-3 font-bold">Horário</th>
                  <th className="py-3 px-3 font-bold">Evento</th>
                  <th className="py-3 px-3 font-bold">Sessão</th>
                  <th className="py-3 px-3 font-bold">Rota / Tela</th>
                  <th className="py-3 pl-3 font-bold">Metadados Capturados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-950/60">
                    <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
                        {evt.eventName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {evt.sessionId.slice(0, 14)}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300">
                      {String(evt.metadata?.pathname || "/")}
                    </td>
                    <td className="py-2.5 pl-3 text-slate-400 max-w-md truncate font-sans">
                      {JSON.stringify(evt.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: SALVAR NOVO SNAPSHOT PARA ANÁLISE FUTURA                      */}
      {/* ==================================================================== */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[32px] sm:rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  Congelar Métricas & Benchmarks
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Salvar Snapshot para Análise e Comparação no Futuro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSnapshotModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSnapshot} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-300 block">
                    Título do Snapshot / Marco *
                  </label>
                  <input
                    type="text"
                    required
                    value={snapshotForm.title}
                    onChange={(e) =>
                      setSnapshotForm({ ...snapshotForm, title: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Versão do Site</label>
                  <input
                    type="text"
                    value={snapshotForm.siteVersion}
                    onChange={(e) =>
                      setSnapshotForm({ ...snapshotForm, siteVersion: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Benchmarks de Performance (PageSpeed & GTmetrix) */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Indicadores Técnicos (PageSpeed Insights & GTmetrix)</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      PageSpeed Mobile
                    </label>
                    <input
                      type="number"
                      value={snapshotForm.pagespeedMobile}
                      onChange={(e) =>
                        setSnapshotForm({
                          ...snapshotForm,
                          pagespeedMobile: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      GTmetrix Nota
                    </label>
                    <input
                      type="text"
                      value={snapshotForm.gtmetrixGrade}
                      onChange={(e) =>
                        setSnapshotForm({
                          ...snapshotForm,
                          gtmetrixGrade: e.target.value,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      LCP (ms)
                    </label>
                    <input
                      type="number"
                      value={snapshotForm.lcpMs}
                      onChange={(e) =>
                        setSnapshotForm({
                          ...snapshotForm,
                          lcpMs: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Elementos DOM
                    </label>
                    <input
                      type="number"
                      value={snapshotForm.domElements}
                      onChange={(e) =>
                        setSnapshotForm({
                          ...snapshotForm,
                          domElements: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">
                  Diagnóstico & Observações da Análise
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Comportamento observado nos clientes B2B nesta semana..."
                  value={snapshotForm.notes}
                  onChange={(e) =>
                    setSnapshotForm({ ...snapshotForm, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-emerald-300 block">
                    Melhorias Aplicadas neste Ciclo
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Liste os ajustes feitos no site/configurador..."
                    value={snapshotForm.appliedImprovements}
                    onChange={(e) =>
                      setSnapshotForm({
                        ...snapshotForm,
                        appliedImprovements: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-amber-300 block">
                    Metas & Próximos Experimentos
                  </label>
                  <textarea
                    rows={3}
                    placeholder="O que testar ou acompanhar na próxima semana..."
                    value={snapshotForm.futureGoals}
                    onChange={(e) =>
                      setSnapshotForm({
                        ...snapshotForm,
                        futureGoals: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSnapshot}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingSnapshot ? "Salvando..." : "Confirmar e Salvar Snapshot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CRIAR / EDITAR AÇÃO DE MELHORIA (CRO BACKLOG)                 */}
      {/* ==================================================================== */}
      {isImprovementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[32px] sm:rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">
                  Gestão de Evolução Contínua (CRO)
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {improvementForm.id ? "Editar Melhoria" : "Registrar Nova Melhoria do Funil"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImprovementModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveImprovement} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">
                  Título da Melhoria / Hipótese *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Destacar frete rápido e desconto PIX no resumo do configurador"
                  value={improvementForm.title}
                  onChange={(e) =>
                    setImprovementForm({ ...improvementForm, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Etapa do Funil Alvo</label>
                  <select
                    value={improvementForm.targetStageId}
                    onChange={(e) =>
                      setImprovementForm({
                        ...improvementForm,
                        targetStageId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                  >
                    {FUNNEL_STAGES.map((st) => (
                      <option key={st.stageId} value={st.stageId}>
                        {st.stepNumber}. {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Prioridade</label>
                  <select
                    value={improvementForm.priority}
                    onChange={(e) =>
                      setImprovementForm({
                        ...improvementForm,
                        priority: e.target.value as FunnelImprovementAction["priority"],
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                  >
                    <option value="critica">Crítica</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Status Atual</label>
                  <select
                    value={improvementForm.status}
                    onChange={(e) =>
                      setImprovementForm({
                        ...improvementForm,
                        status: e.target.value as FunnelImprovementAction["status"],
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold"
                  >
                    {Object.entries(STATUS_IMPROVEMENT_STYLES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-rose-300 block">
                  Problema ou Gargalo Observado nos Dados
                </label>
                <textarea
                  rows={2}
                  value={improvementForm.problemIdentified}
                  onChange={(e) =>
                    setImprovementForm({
                      ...improvementForm,
                      problemIdentified: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-cyan-300 block">
                  Ação / Solução Proposta ou Implementada
                </label>
                <textarea
                  rows={2}
                  value={improvementForm.proposedAction}
                  onChange={(e) =>
                    setImprovementForm({
                      ...improvementForm,
                      proposedAction: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Impacto Esperado</label>
                  <input
                    type="text"
                    placeholder="Ex: +20% de avanço para o carrinho"
                    value={improvementForm.expectedImpact}
                    onChange={(e) =>
                      setImprovementForm({
                        ...improvementForm,
                        expectedImpact: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-emerald-300 block">
                    Resultado Medido (após implementar)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Conversão subiu de 4% para 9.5%"
                    value={improvementForm.measuredResult}
                    onChange={(e) =>
                      setImprovementForm({
                        ...improvementForm,
                        measuredResult: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImprovementModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingImprovement}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingImprovement ? "Salvando..." : "Salvar no Plano de Melhorias"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
