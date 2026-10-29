"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { useUrlParamState } from "@/lib/navigation/useUrlParamState";
import {
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  MousePointerClick,
  Eye,
  DollarSign,
  Target,
  Smartphone,
  Monitor,
  MapPin,
  Layers,
  Tag,
  Plus,
  Trash2,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Lock,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";

interface GoogleAdsIntelligencePanelProps {
  organicFunnelSummary?: {
    totalSessions?: number;
    addToCartCount?: number;
    whatsappClickCount?: number;
    purchaseCount?: number;
  };
}

export function GoogleAdsIntelligencePanel({
  organicFunnelSummary,
}: GoogleAdsIntelligencePanelProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "warning" | "info";
    text: string;
  } | null>(null);

  // Filtros de Alto Nível sincronizados com a URL (?adsDate=... & ?adsSection=... & ?adsGroup=... & ?adsMatch=... & ?adsConv=... & ?adsClicks=... & ?adsSearch=...)
  const [dateFilter, setDateFilter] = useUrlParamState<string>("adsDate", "ALL", {
    writeDefaultToUrl: true,
  });
  const [sectionView, setSectionView] = useUrlParamState<
    "ALL" | "DAILY" | "AD_GROUPS" | "SEARCH_TERMS" | "CONVERSIONS" | "OPTIMIZATIONS"
  >("adsSection", "ALL", {
    validValues: [
      "ALL",
      "DAILY",
      "AD_GROUPS",
      "SEARCH_TERMS",
      "CONVERSIONS",
      "OPTIMIZATIONS",
    ] as const,
    writeDefaultToUrl: true,
  });
  const [campaignFilter, setCampaignFilter] = useUrlParamState<string>("adsCampaign", "ALL");
  const [adGroupFilter, setAdGroupFilter] = useUrlParamState<string>("adsGroup", "ALL");
  const [matchTypeFilter, setMatchTypeFilter] = useUrlParamState<string>("adsMatch", "ALL");
  const [onlyConversionsStr, setOnlyConversionsStr] = useUrlParamState<"true" | "false">(
    "adsConv",
    "false",
    { validValues: ["true", "false"] as const }
  );
  const [onlyClicksStr, setOnlyClicksStr] = useUrlParamState<"true" | "false">(
    "adsClicks",
    "false",
    { validValues: ["true", "false"] as const }
  );
  const onlyConversions = onlyConversionsStr === "true";
  const setOnlyConversions = (val: boolean | ((prev: boolean) => boolean)) => {
    setOnlyConversionsStr((prev) => {
      const next = typeof val === "function" ? val(prev === "true") : val;
      return next ? "true" : "false";
    });
  };
  const onlyClicks = onlyClicksStr === "true";
  const setOnlyClicks = (val: boolean | ((prev: boolean) => boolean)) => {
    setOnlyClicksStr((prev) => {
      const next = typeof val === "function" ? val(prev === "true") : val;
      return next ? "true" : "false";
    });
  };
  const [searchQuery, setSearchQuery] = useUrlParamState<string>("adsSearch", "");

  // Modais de Registro e Importação
  const [isOptModalOpen, setIsOptModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [optForm, setOptForm] = useState({
    date: "2026-10-26",
    category: "BID_REDUCTION",
    title: "",
    targetScope: "Campanha Completa",
    beforeValue: "",
    afterValue: "",
    expectedImpact: "",
    technicalReason: "",
  });

  const [importText, setImportText] = useState<string>("");
  const [importDate, setImportDate] = useState<string>("2026-10-26");

  const fetchAdsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        date: dateFilter,
        campaignId: campaignFilter,
        adGroup: adGroupFilter,
        matchType: matchTypeFilter,
        onlyConversions: String(onlyConversions),
        onlyClicks: String(onlyClicks),
        search: searchQuery,
      });
      const res = await fetch(`/api/analytics/google-ads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar inteligência Google Ads:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    dateFilter,
    campaignFilter,
    adGroupFilter,
    matchTypeFilter,
    onlyConversions,
    onlyClicks,
    searchQuery,
  ]);

  useEffect(() => {
    fetchAdsData();
  }, [fetchAdsData]);

  const handleLiveApiSync = async () => {
    setIsSyncingLive(true);
    setFeedbackBanner(null);
    try {
      const res = await fetch("/api/analytics/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_live_api",
          filters: {
            dateFilter,
            campaignId: campaignFilter,
            adGroupFilter,
            matchTypeFilter,
            onlyConversions,
            onlyClicks,
            search: searchQuery,
          },
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setFeedbackBanner({
          type: json.synced ? "success" : "info",
          text: json.syncMessage || "Dados do Google Ads atualizados com sucesso.",
        });
      }
    } catch (err) {
      setFeedbackBanner({
        type: "warning",
        text: "Não foi possível contatar a API ao vivo no momento; mantendo base oficial salva.",
      });
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handleSaveOptimization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optForm.title.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/analytics/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_optimization",
          optimization: optForm,
          filters: {
            dateFilter,
            campaignId: campaignFilter,
            adGroupFilter,
            matchTypeFilter,
            onlyConversions,
            onlyClicks,
            search: searchQuery,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsOptModalOpen(false);
        setOptForm({
          date: "2026-10-26",
          category: "BID_REDUCTION",
          title: "",
          targetScope: "Campanha Completa",
          beforeValue: "",
          afterValue: "",
          expectedImpact: "",
          technicalReason: "",
        });
        setFeedbackBanner({
          type: "success",
          text: "Ajuste / recalibragem salva permanentemente no histórico do Google Ads!",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/analytics/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import_report",
          rawText: importText,
          reportDate: importDate,
          filters: {
            dateFilter,
            campaignId: campaignFilter,
            adGroupFilter,
            matchTypeFilter,
            onlyConversions,
            onlyClicks,
            search: searchQuery,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsImportModalOpen(false);
        setImportText("");
        setFeedbackBanner({
          type: "success",
          text: "Relatório importado e arquivado com sucesso para análises futuras!",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOptimization = async (id: string) => {
    if (!window.confirm("Deseja remover este registro do histórico de otimizações?")) return;
    const res = await fetch("/api/analytics/google-ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_optimization",
        id,
        filters: {
          dateFilter,
          campaignId: campaignFilter,
          adGroupFilter,
          matchTypeFilter,
          onlyConversions,
          onlyClicks,
          search: searchQuery,
        },
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
  };

  const handleExportAdsMarkdown = () => {
    if (!data) return;
    const camp = data.campaigns?.[0];
    const s = data.summary || {};
    const y = data.comparison?.yesterday;
    const t = data.comparison?.today;

    const lines: string[] = [
      `# Relatório Executivo Google Ads — ${camp?.name || "Totem Pro"}`,
      `- **ID da Campanha:** ${camp?.id || "24395671655"} | **Conta:** ${camp?.customerId || "2248859628"} | **GTM:** ${camp?.gtmContainerId || "GTM-W4N3KKL7"}`,
      `- **Orçamento Nominal Travado:** ${formatBRL(camp?.nominalDailyBudget || 35)}/dia (Faixa Efetiva: R$ 35 a R$ 50/dia)`,
      `- **Palavras Negativas Ativas:** ${camp?.negativeKeywordsCount || 67}`,
      `- **Filtro de Data Aplicado:** ${dateFilter}`,
      ``,
      `## 1. Resumo Consolidado`,
      `- **Impressões:** ${s.impressions || 0}`,
      `- **Cliques:** ${s.clicks || 0}`,
      `- **CTR:** ${s.ctr || 0}%`,
      `- **CPC Médio:** ${formatBRL(s.avgCpc || 0)}`,
      `- **Investimento:** ${formatBRL(s.cost || 0)}`,
      `- **Conversões Principais:** ${s.conversions || 0}`,
      `- **Valor em Conversão:** ${formatBRL(s.conversionValue || 0)}`,
      `- **CPA Médio:** ${formatBRL(s.cpa || 0)} | **ROAS de Intenção:** ${s.roas || 0}x`,
      ``,
    ];

    if (y && t) {
      lines.push(
        `## 2. Evolução Hoje (${t.date}) vs. Ontem (${y.date})`,
        `| Métrica | Ontem (${y.date}) | Hoje (${t.date}) | Acumulado |`,
        `| :--- | :---: | :---: | :---: |`,
        `| Impressões | ${y.impressions} | ${t.impressions} | ${y.impressions + t.impressions} |`,
        `| Cliques | ${y.clicks} | ${t.clicks} | ${y.clicks + t.clicks} |`,
        `| CTR | ${y.ctr}% | ${t.ctr}% | ${s.ctr}% |`,
        `| CPC Médio | ${formatBRL(y.avgCpc)} | ${formatBRL(t.avgCpc)} | ${formatBRL(s.avgCpc)} |`,
        `| Investimento | ${formatBRL(y.cost)} | ${formatBRL(t.cost)} | ${formatBRL(y.cost + t.cost)} |`,
        `| Conversões | ${y.conversions} | ${t.conversions} | ${y.conversions + t.conversions} |`,
        `| Valor em Conversão | ${formatBRL(y.conversionValue)} | ${formatBRL(t.conversionValue)} | ${formatBRL(y.conversionValue + t.conversionValue)} |`,
        ``
      );
    }

    lines.push(
      `## 3. Desempenho por Grupo de Anúncios`,
      `| Grupo de Anúncios | Impr. | Cliques | CTR | Custo | CPC Médio | CPC Máx Atual | Conversões |`,
      `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`,
      ...(data.adGroups || []).map(
        (ag: any) =>
          `| ${ag.adGroupName} | ${ag.impressions} | ${ag.clicks} | ${ag.ctr}% | ${formatBRL(ag.cost)} | ${formatBRL(ag.avgCpc)} | ${formatBRL(ag.maxCpcCurrent)} | ${ag.conversionBreakdownText || ag.conversions} |`
      ),
      ``,
      `## 4. Termos Reais Pesquisados (Qualificados)`,
      `| Termo | Grupo | Corresp. | Impr. | Cliques | CTR | CPC | Conv. |`,
      `| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |`,
      ...(data.searchTerms || []).map(
        (st: any) =>
          `| ${st.term} | ${st.adGroupName} | ${st.matchType} | ${st.impressions} | ${st.clicks} | ${st.ctr}% | ${formatBRL(st.avgCpc)} | ${st.conversions} |`
      )
    );

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `google-ads-totem-pro-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const campaign = data?.campaigns?.[0];
  const summary = data?.summary || {
    impressions: 0,
    clicks: 0,
    ctr: 0,
    avgCpc: 0,
    cost: 0,
    conversions: 0,
    conversionValue: 0,
    cpa: 0,
    roas: 0,
  };
  const yesterday = data?.comparison?.yesterday;
  const today = data?.comparison?.today;

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* CABEÇALHO EXECUTIVO DA CAMPANHA & AUTOMAÇÃO API GOOGLE ADS v25     */}
      {/* ================================================================= */}
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Campanha Ativa • Search
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                ID: {campaign?.id || "24395671655"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                GTM: {campaign?.gtmContainerId || "GTM-W4N3KKL7"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Trava Nominal: {formatBRL(campaign?.nominalDailyBudget || 35)}/dia (Efetivo R$ 35–R$ 50)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {campaign?.negativeKeywordsCount || 67} Palavras Negativas
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>{campaign?.name || "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)"}</span>
            </h3>

            <p className="text-xs text-slate-400">
              {data?.liveSyncMessage ||
                "Inteligência de Tráfego Pago sincronizada com Google Ads API v25 e rastreamento de fundo de funil GTM."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleLiveApiSync}
              disabled={isSyncingLive}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLive ? "animate-spin" : ""}`} />
              <span>{isSyncingLive ? "Sincronizando API v25..." : "Sincronizar API Google Ads"}</span>
            </button>

            <button
              onClick={() => setIsOptModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Ajuste / Trava</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Importar Relatório</span>
            </button>

            <button
              onClick={handleExportAdsMarkdown}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Exportar Relatório Executivo Google Ads (.md)"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar .MD</span>
            </button>
          </div>
        </div>

        {feedbackBanner && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
              feedbackBanner.type === "success"
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                : feedbackBanner.type === "warning"
                ? "bg-amber-950/50 border-amber-500/40 text-amber-300"
                : "bg-indigo-950/50 border-indigo-500/40 text-indigo-300"
            }`}
          >
            <span>{feedbackBanner.text}</span>
            <button
              onClick={() => setFeedbackBanner(null)}
              className="text-[11px] underline ml-3 opacity-80 hover:opacity-100"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* BARRA DE FILTROS OBJETIVOS (DATA, SEÇÃO, GRUPO, CORRESP., BUSCA)  */}
      {/* ================================================================= */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Seletor de Data Dinâmico */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Data:
            </span>
            {[
              {
                id: "ALL",
                label: `Acumulado Total (${data?.dailyMetrics?.length || 2} dias)`,
              },
              ...([...(data?.dailyMetrics || [])]
                .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
                .map((dm: any) => {
                  const parts = String(dm.date || "").split("-");
                  const shortDate =
                    parts.length === 3 ? `${parts[2]}/${parts[1]}` : dm.date;
                  return {
                    id: dm.date,
                    label: dm.label || shortDate,
                  };
                })),
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  dateFilter === d.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Seletor de Seção / Foco */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Visão 360° Completa" },
              { id: "DAILY", label: "1. Evolução Diária" },
              { id: "AD_GROUPS", label: "2. Grupos (4)" },
              { id: "SEARCH_TERMS", label: "3. Termos Reais" },
              { id: "CONVERSIONS", label: "4. Raio-X Conversões & GTM" },
              { id: "OPTIMIZATIONS", label: "5. Travas & Negativas" },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => setSectionView(sec.id as any)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  sectionView === sec.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Segunda Linha de Filtros: Grupo de Anúncios, Correspondência, Flags e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="lg:col-span-4">
            <select
              value={adGroupFilter}
              onChange={(e) => setAdGroupFilter(e.target.value)}
              aria-label="Filtrar por Grupo de Anúncios"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Todos os Grupos de Anúncios (01 a 04)</option>
              <option value="03 - Gastronomia">03 - Gastronomia, Mercados e Clínicas (Líder)</option>
              <option value="04 - Revenda">04 - Revenda, Automação e Software House</option>
              <option value="01 - Gabinete">01 - Gabinete para Totem (Só Gabinete ou Kit)</option>
              <option value="02 - Monte">02 - Monte Seu Próprio Totem (-50%)</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={matchTypeFilter}
              onChange={(e) => setMatchTypeFilter(e.target.value)}
              aria-label="Filtrar por Tipo de Correspondência"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Correspondência: Todas</option>
              <option value="EXACT">Exata [EXACT]</option>
              <option value="PHRASE">Frase &quot;PHRASE&quot;</option>
            </select>
          </div>

          <div className="lg:col-span-3 flex items-center gap-3 px-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyConversions}
                onChange={(e) => setOnlyConversions(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              <span>Só c/ Conversão</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyClicks}
                onChange={(e) => setOnlyClicks(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <span>Só Cliques &gt; 0</span>
            </label>
          </div>

          <div className="lg:col-span-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar termo, cidade (SP, Descalvado)..."
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 8 KPIS EXECUTIVOS GOOGLE ADS (COM DELTA HOJE VS ONTEM)            */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Impressões */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Impressões Qualificadas
            </span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">{summary.impressions}</span>
            {yesterday && today && dateFilter === "ALL" && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                {yesterday.impressions} ➔ {today.impressions} (+119%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Buscas B2B de alta intenção na Rede de Pesquisa
          </p>
        </div>

        {/* 2. Cliques */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cliques nos Anúncios
            </span>
            <MousePointerClick className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-cyan-400">{summary.clicks}</span>
            {yesterday && today && dateFilter === "ALL" && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" />
                {yesterday.clicks} ➔ {today.clicks} (+250%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            100% qualificados (zero buscas públicas/gov)
          </p>
        </div>

        {/* 3. CTR */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              CTR (Taxa de Cliques)
            </span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-400">{summary.ctr}%</span>
            {yesterday && today && (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Hoje: {today.ctr}% (+60%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Acima do benchmark B2B (Anúncio A G04 bateu 14,29%!)
          </p>
        </div>

        {/* 4. CPC Médio */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              CPC Médio & Meta Pós-Trava
            </span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">{formatBRL(summary.avgCpc)}</span>
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" />
              Meta: R$ 1,60–1,90
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Lances CPC Máx reduzidos em ~30% (R$ 1,75 a R$ 2,20)
          </p>
        </div>

        {/* 5. Investimento */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Investimento no Período
            </span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-300">{formatBRL(summary.cost)}</span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Teto R$ 35/dia ativo
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Ontem: R$ 24,13 | Hoje: R$ 93,72* (Overdelivery travado)
          </p>
        </div>

        {/* 6. Conversões Principais */}
        <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Conversões Principais (GTM)
            </span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-400">
              {summary.conversions.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              1 Carrinho + 1 WhatsApp
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Ambas acionadas no Grupo 03 (&quot;totem de autoatendimento&quot;)
          </p>
        </div>

        {/* 7. Valor em Carrinho / Conversão */}
        <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              Valor Gerado em Conversão
            </span>
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white">
              {formatBRL(summary.conversionValue)}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ROAS Intenção: {summary.roas}x
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            R$ 1.290,00 (Gabinete Configurado) + R$ 1,00 (Lead simbólico)
          </p>
        </div>

        {/* 8. Cruzamento Ads x Funil Geral */}
        <div className="bg-slate-900/80 border border-indigo-500/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              CPA & Sinergia com Funil Site
            </span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-300">
              {summary.cpa > 0 ? formatBRL(summary.cpa) : "—"}
            </span>
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
              Custo / Conv.
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Site Total: {organicFunnelSummary?.totalSessions || 0} sessões |{" "}
            {organicFunnelSummary?.addToCartCount || 0} carrinhos
          </p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* RECOMENDAÇÕES EXECUTIVAS AUTOMÁTICAS DE TOMADA DE DECISÃO         */}
      {/* ================================================================= */}
      {data?.executiveInsights && data.executiveInsights.length > 0 && (
        <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Diagnóstico Automático & Tomada de Decisão de Alto Nível (IA Google Ads)
            </h4>
            <span className="text-[11px] text-slate-400">
              Gerado automaticamente a partir dos indicadores da campanha
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {data.executiveInsights.map((ins: any) => (
              <div
                key={ins.id}
                className={`p-4 rounded-xl border space-y-1.5 ${
                  ins.severity === "warning"
                    ? "bg-amber-950/25 border-amber-500/30"
                    : ins.severity === "opportunity"
                    ? "bg-indigo-950/30 border-indigo-500/30"
                    : "bg-emerald-950/25 border-emerald-500/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900/90 text-cyan-300 border border-slate-700">
                    {ins.category}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {ins.metricBadge}
                  </span>
                </div>
                <h5 className="text-xs sm:text-sm font-bold text-white">{ins.title}</h5>
                <p className="text-xs text-slate-300 leading-relaxed">{ins.diagnosis}</p>
                <div className="pt-1 text-[11px] text-emerald-300 font-semibold flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Decisão Recomendada: {ins.recommendedDecision}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SEÇÃO 1: EVOLUÇÃO DE HOJE (26/10) VS. ONTEM (25/10) & OVERDELIVERY */}
      {/* ================================================================= */}
      {(sectionView === "ALL" || sectionView === "DAILY") && yesterday && today && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                📊 1. Evolução de Hoje (26/10) vs. Ontem (25/10) & Acumulado
              </h4>
              <p className="text-xs text-slate-400">
                Comparativo diário direto da campanha {campaign?.id} e controle de Superfornecimento (Overdelivery).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-bold">Métrica</th>
                  <th className="py-3 px-4 font-bold">Ontem (Dom, 25/10)</th>
                  <th className="py-3 px-4 font-bold text-cyan-300">Hoje (Seg, 26/10 até 21h27)</th>
                  <th className="py-3 px-4 font-bold text-emerald-300">Acumulado Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                <tr className="hover:bg-slate-950/40">
                  <td className="py-3 px-4 font-bold text-white">Impressões</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{yesterday.impressions}</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {today.impressions}{" "}
                    <span className="text-[10px] text-emerald-400 ml-1">(+118,8%)</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-300">
                    {yesterday.impressions + today.impressions}
                  </td>
                </tr>
                <tr className="hover:bg-slate-950/40">
                  <td className="py-3 px-4 font-bold text-white">Cliques</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{yesterday.clicks}</td>
                  <td className="py-3 px-4 font-mono font-bold text-cyan-300">
                    {today.clicks} <span className="text-[10px] text-emerald-400 ml-1">(+250%)</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-300">
                    {yesterday.clicks + today.clicks}
                  </td>
                </tr>
                <tr className="hover:bg-slate-950/40">
                  <td className="py-3 px-4 font-bold text-white">CTR (Taxa de Cliques)</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{yesterday.ctr}%</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {today.ctr}% <span className="text-[10px] text-emerald-300 ml-1">(+60%)</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-300">6,99%</td>
                </tr>
                <tr className="hover:bg-slate-950/40">
                  <td className="py-3 px-4 font-bold text-white">CPC Médio</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{formatBRL(yesterday.avgCpc)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">{formatBRL(today.avgCpc)}</td>
                  <td className="py-3 px-4 font-mono font-extrabold text-slate-200">R$ 2,62</td>
                </tr>
                <tr className="hover:bg-slate-950/40">
                  <td className="py-3 px-4 font-bold text-white">Investimento</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{formatBRL(yesterday.cost)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-300">
                    {formatBRL(today.cost)}*
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-amber-300">
                    {formatBRL(yesterday.cost + today.cost)}
                  </td>
                </tr>
                <tr className="hover:bg-slate-950/40 bg-emerald-950/15">
                  <td className="py-3 px-4 font-bold text-emerald-300">Conversões Principais</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{yesterday.conversions}</td>
                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-400">
                    {today.conversions.toFixed(1)} Conversões
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-400">
                    {(yesterday.conversions + today.conversions).toFixed(1)} Conversões
                  </td>
                </tr>
                <tr className="hover:bg-slate-950/40 bg-emerald-950/15">
                  <td className="py-3 px-4 font-bold text-emerald-300">
                    Valor em Carrinho / Conversão
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {formatBRL(yesterday.conversionValue)}
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-white">
                    {formatBRL(today.conversionValue)}
                  </td>
                  <td className="py-3 px-4 font-mono font-extrabold text-white">
                    {formatBRL(yesterday.conversionValue + today.conversionValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota Técnica de Superfornecimento (Overdelivery) */}
          <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/30 text-xs text-amber-200/90 space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                *Nota sobre o gasto de hoje (R$ 93,72) e Trava Anti-Superfornecimento aplicada:
              </span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Como ontem (domingo) a campanha gastou apenas <strong>R$ 24,13</strong> dos R$ 50,00,
              hoje (segunda-feira de pico comercial) o Google Ads usou a regra padrão de{" "}
              <strong>Superfornecimento Diário (Overdelivery)</strong>, que permite compensar o saldo
              não gasto do dia anterior gastando até ~2x num dia de alta procura. Para impedir que o
              Google compense dessa forma nos próximos dias úteis e manter o gasto efetivo cravado na
              faixa de <strong>R$ 35,00 a R$ 50,00/dia</strong>, já foi aplicada a trava no orçamento
              nominal (<strong>R$ 35,00/dia</strong>) e redução de 30% nos lances de CPC Máximo.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SEÇÃO 2: DESEMPENHO POR GRUPO DE ANÚNCIOS (AD GROUPS)             */}
      {/* ================================================================= */}
      {(sectionView === "ALL" || sectionView === "AD_GROUPS") && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-base font-extrabold text-white">
              🏆 2. Desempenho por Grupo de Anúncios & Tetos de CPC Máximo
            </h4>
            <p className="text-xs text-slate-400">
              Comparativo de eficiência, conversões e recalibragem de lances (-30%) por segmento B2B.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-bold">Grupo de Anúncios</th>
                  <th className="py-3 px-3 font-bold text-right">Impr.</th>
                  <th className="py-3 px-3 font-bold text-right">Cliques</th>
                  <th className="py-3 px-3 font-bold text-right">CTR</th>
                  <th className="py-3 px-3 font-bold text-right">Custo</th>
                  <th className="py-3 px-3 font-bold text-right">CPC Médio</th>
                  <th className="py-3 px-3 font-bold text-center">Teto CPC Máx (Antes ➔ Agora)</th>
                  <th className="py-3 px-4 font-bold">Conversões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {(data?.adGroups || []).map((ag: any) => (
                  <React.Fragment key={ag.id}>
                    <tr className="hover:bg-slate-950/50">
                      <td className="py-3 px-4 font-bold text-white">{ag.adGroupName}</td>
                      <td className="py-3 px-3 font-mono text-right text-slate-300">
                        {ag.impressions}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-cyan-300">
                        {ag.clicks}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-emerald-400">
                        {ag.ctr.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-amber-300">
                        {formatBRL(ag.cost)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-slate-200">
                        {ag.clicks > 0 ? formatBRL(ag.avgCpc) : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-center">
                        {ag.maxCpcBefore ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-[11px]">
                            <span className="line-through text-slate-500">
                              {formatBRL(ag.maxCpcBefore)}
                            </span>
                            <span className="text-indigo-300 font-bold">
                              ➔ {formatBRL(ag.maxCpcCurrent)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-indigo-300 font-bold">
                            {formatBRL(ag.maxCpcCurrent)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {ag.conversions > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px]">
                            {ag.conversionBreakdownText || `${ag.conversions} conv.`}
                          </span>
                        ) : (
                          <span className="text-slate-500">0,0</span>
                        )}
                      </td>
                    </tr>
                    {ag.highlightNote && (
                      <tr className="bg-slate-950/30">
                        <td colSpan={8} className="py-2 px-4 text-[11px] text-slate-400">
                          <span className="text-cyan-400 font-semibold mr-1">Destaque:</span>
                          {ag.highlightNote}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SEÇÃO 3: TERMOS REAIS PESQUISADOS (100% QUALIFICADOS)             */}
      {/* ================================================================= */}
      {(sectionView === "ALL" || sectionView === "SEARCH_TERMS") && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-extrabold text-white">
                🔍 3. Termos Reais Pesquisados ({data?.searchTerms?.length || 0} termos exibidos)
              </h4>
              <p className="text-xs text-slate-400">
                Buscas reais dos compradores que acionaram seus anúncios, com CTR, CPC e conversões por termo.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold self-start sm:self-auto">
              100% Intenção Comercial B2B
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-bold">Termo Pesquisado / Palavra-Chave</th>
                  <th className="py-3 px-3 font-bold">Grupo de Anúncios</th>
                  <th className="py-3 px-2 font-bold text-center">Tipo</th>
                  <th className="py-3 px-3 font-bold text-right">Impr.</th>
                  <th className="py-3 px-3 font-bold text-right">Cliques</th>
                  <th className="py-3 px-3 font-bold text-right">CTR</th>
                  <th className="py-3 px-3 font-bold text-right">CPC Médio</th>
                  <th className="py-3 px-4 font-bold">Conversões & Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {(data?.searchTerms || []).map((st: any) => (
                  <tr
                    key={st.id}
                    className={`hover:bg-slate-950/50 ${
                      st.conversions > 0 ? "bg-emerald-950/15" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white">{st.term}</div>
                      {st.subQueriesNote && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{st.subQueriesNote}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300 text-[11px]">{st.adGroupName}</td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          st.matchType === "EXACT"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                        }`}
                      >
                        {st.matchType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-slate-300">
                      {st.impressions}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-right text-cyan-300">
                      {st.clicks}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-right">
                      <span
                        className={
                          st.ctr >= 10
                            ? "text-emerald-400 font-extrabold"
                            : "text-slate-300"
                        }
                      >
                        {st.ctr.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-right text-slate-200">
                      {st.clicks > 0 ? formatBRL(st.avgCpc) : "—"}
                    </td>
                    <td className="py-3 px-4">
                      {st.conversions > 0 ? (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[11px]">
                            {st.conversions.toFixed(1)} Conv. ({formatBRL(st.conversionValue)})
                          </span>
                          {st.conversionNote && (
                            <p className="text-[11px] text-emerald-200/90">{st.conversionNote}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SEÇÃO 4: RAIO-X DAS CONVERSÕES & MATRIZ DAS 5 AÇÕES DO GTM         */}
      {/* ================================================================= */}
      {(sectionView === "ALL" || sectionView === "CONVERSIONS") && (
        <div className="space-y-5">
          {/* Raio-X Detalhado de cada Conversão */}
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                🎯 4. Raio-X Completo das Conversões Principais (Auditoria GTM-W4N3KKL7)
              </h4>
              <p className="text-xs text-slate-400">
                Detalhamento técnico extraído da API do Google Ads sobre quem converteu, de qual cidade, dispositivo, palavra-chave e o passo a passo no site.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(data?.conversionDetails || []).map((conv: any, index: number) => (
                <div
                  key={conv.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Conversão #{index + 1} • Action ID: {conv.actionId}
                        </span>
                        <h5 className="text-sm font-extrabold text-white mt-1.5 flex items-center gap-1.5">
                          {conv.actionId === "7871297265" ? (
                            <ShoppingCart className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <span>{conv.actionName}</span>
                        </h5>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-emerald-400 block">
                          {formatBRL(conv.value)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {conv.isSymbolicValue ? "Valor simbólico Lead" : "Valor real carrinho"}
                        </span>
                      </div>
                    </div>

                    {/* Metadados Técnicos */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>
                          <strong>Local:</strong> {conv.city} - {conv.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        {conv.device === "MOBILE" ? (
                          <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        ) : (
                          <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                        <span>
                          <strong>Dispositivo:</strong>{" "}
                          {conv.device === "MOBILE" ? "Celular (MOBILE)" : "Computador (DESKTOP)"}
                        </span>
                      </div>
                      <div className="col-span-2 text-slate-300">
                        <strong>Grupo:</strong> {conv.adGroupName}
                      </div>
                      <div className="col-span-2 text-slate-300">
                        <strong>Palavra-chave acionadora:</strong>{" "}
                        <span className="font-mono text-emerald-300">&quot;{conv.keyword}&quot;</span>{" "}
                        <span className="text-[10px] text-slate-400">({conv.matchType})</span>
                      </div>
                      <div className="col-span-2 text-slate-400 text-[11px] font-mono">
                        Anúncio ID: {conv.adId} ({conv.landingUrl})
                      </div>
                    </div>

                    {/* Jornada Passo a Passo */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">
                        O que o visitante fez passo a passo no site:
                      </span>
                      <ol className="space-y-1.5 text-xs text-slate-300 list-decimal list-inside">
                        {(conv.stepsJourney || []).map((step: string, i: number) => (
                          <li key={i} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matriz Oficial das 5 Ações de Conversão GTM */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-white">
                📊 Resumo das 5 Ações de Funil Rastreadas pelo GTM (GTM-W4N3KKL7) na Coluna &quot;Conversões&quot;
              </h4>
              <p className="text-xs text-slate-400">
                Mapeamento oficial entre os eventos do site e as ações de conversão da conta Google Ads.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <th className="py-3 px-4 font-bold">Ordem no Funil</th>
                    <th className="py-3 px-4 font-bold">Nome da Conversão no Google Ads</th>
                    <th className="py-3 px-4 font-bold">Quando é disparada no site</th>
                    <th className="py-3 px-4 font-bold">Valor enviado ao Google Ads</th>
                    <th className="py-3 px-4 font-bold text-center">Status Hoje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(data?.gtmActionsCatalog || []).map((item: any) => (
                    <tr
                      key={item.actionId}
                      className={item.conversionsToday > 0 ? "bg-emerald-950/15" : ""}
                    >
                      <td className="py-3 px-4 font-bold text-indigo-300">{item.stageLabel}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{item.actionName}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Action ID: {item.actionId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{item.triggerDescription}</td>
                      <td className="py-3 px-4 text-slate-300">{item.valueRule}</td>
                      <td className="py-3 px-4 text-center font-mono font-extrabold">
                        {item.conversionsToday > 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {item.conversionsToday.toFixed(1)} ✅
                          </span>
                        ) : (
                          <span className="text-slate-500">0,0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SEÇÃO 5: RECALIBRAGEM APLICADA, TRAVAS & 67 PALAVRAS NEGATIVAS     */}
      {/* ================================================================= */}
      {(sectionView === "ALL" || sectionView === "OPTIMIZATIONS") && (
        <div className="space-y-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-white">
                  🛠️ 5. Histórico de Recalibragens, Travas de Orçamento e Lances Aplicados
                </h4>
                <p className="text-xs text-slate-400">
                  Registro auditável de todas as decisões de otimização tomadas na campanha para controle de CPC e orçamento.
                </p>
              </div>
              <button
                onClick={() => setIsOptModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Otimização</span>
              </button>
            </div>

            <div className="space-y-3">
              {(data?.optimizations || []).map((opt: any) => (
                <div
                  key={opt.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {opt.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{opt.date}</span>
                      <span className="text-xs font-semibold text-cyan-300">
                        • {opt.targetScope}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteOptimization(opt.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remover registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h5 className="text-sm font-extrabold text-white">{opt.title}</h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Configuração Anterior:
                      </span>
                      <span className="text-rose-300 font-mono">{opt.beforeValue}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Nova Configuração Aplicada:
                      </span>
                      <span className="text-emerald-300 font-mono font-bold">{opt.afterValue}</span>
                    </div>
                  </div>

                  {opt.expectedImpact && (
                    <p className="text-xs text-emerald-300 font-medium">
                      <strong>Resultado Esperado:</strong> {opt.expectedImpact}
                    </p>
                  )}
                  {opt.technicalReason && (
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                      {opt.technicalReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blindagem de Palavras Negativas */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Blindagem de Palavras Negativas ({campaign?.negativeKeywordsCount || 67} ativas na campanha)
                </h4>
                <p className="text-xs text-slate-400">
                  Inclui as 5 novas negativas de Órgãos Públicos adicionadas após 1 impressão sem clique para &quot;totem de autoatendimento gov&quot;.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {(campaign?.recentNegativeKeywords || ["gov", "poupatempo", "detran", "inss", "prefeitura"]).map(
                (kw: string) => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold"
                  >
                    -{kw} (Nova • Órgão Público)
                  </span>
                )
              )}
              {(campaign?.allNegativeKeywords || [])
                .filter(
                  (kw: string) =>
                    !(campaign?.recentNegativeKeywords || []).includes(kw)
                )
                .map((kw: string) => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-xs font-mono"
                  >
                    -{kw}
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: REGISTRAR NOVA RECALIBRAGEM / TRAVA GOOGLE ADS              */}
      {/* ================================================================= */}
      {isOptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-extrabold text-white text-base">
                Registrar Ajuste / Recalibragem Google Ads
              </h4>
              <button
                onClick={() => setIsOptModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar ✕
              </button>
            </div>

            <form onSubmit={handleSaveOptimization} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Data</label>
                  <input
                    type="date"
                    value={optForm.date}
                    onChange={(e) => setOptForm({ ...optForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Categoria</label>
                  <select
                    value={optForm.category}
                    onChange={(e) => setOptForm({ ...optForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="BID_REDUCTION">Ajuste de Lance CPC</option>
                    <option value="BUDGET_GUARD">Trava de Orçamento Diário</option>
                    <option value="NEGATIVE_KEYWORDS">Palavras Negativas</option>
                    <option value="AD_COPY">Anúncios & CTR</option>
                    <option value="CONVERSION_GOAL">Meta de Conversão GTM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Título da Decisão / Trava</label>
                <input
                  type="text"
                  required
                  value={optForm.title}
                  onChange={(e) => setOptForm({ ...optForm, title: e.target.value })}
                  placeholder="Ex: Redução de CPC Máx no Grupo 03 para R$ 1,75"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Valor Anterior</label>
                  <input
                    type="text"
                    value={optForm.beforeValue}
                    onChange={(e) => setOptForm({ ...optForm, beforeValue: e.target.value })}
                    placeholder="Ex: CPC Máx R$ 2,50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Novo Valor Aplicado</label>
                  <input
                    type="text"
                    value={optForm.afterValue}
                    onChange={(e) => setOptForm({ ...optForm, afterValue: e.target.value })}
                    placeholder="Ex: CPC Máx R$ 1,75"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Impacto Esperado</label>
                <input
                  type="text"
                  value={optForm.expectedImpact}
                  onChange={(e) => setOptForm({ ...optForm, expectedImpact: e.target.value })}
                  placeholder="Ex: Manter 25-30 cliques/dia pagando R$ 1,60 a R$ 1,90"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Justificativa Técnica</label>
                <textarea
                  rows={3}
                  value={optForm.technicalReason}
                  onChange={(e) => setOptForm({ ...optForm, technicalReason: e.target.value })}
                  placeholder="Detalhes técnicos da alteração..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {isSaving ? "Salvando..." : "Salvar no Histórico"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: IMPORTAR / COLAR RELATÓRIO DE ANÁLISE GOOGLE ADS            */}
      {/* ================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-extrabold text-white text-base">
                Importar e Arquivar Relatório Google Ads
              </h4>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Fechar ✕
              </button>
            </div>

            <form onSubmit={handleImportReport} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Data de Referência</label>
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">
                  Cole o Relatório / Análise da Campanha
                </label>
                <textarea
                  rows={8}
                  required
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Cole aqui o texto ou tabela do relatório do Google Ads para arquivamento permanente..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {isSaving ? "Arquivando..." : "Salvar Relatório na Base"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
