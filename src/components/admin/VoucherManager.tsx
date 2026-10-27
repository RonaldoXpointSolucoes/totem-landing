"use client";

import React, { useState, useEffect } from "react";
import { useUrlParamState } from "@/lib/navigation/useUrlParamState";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import {
  VoucherUsageRecord,
  VoucherSummaryMetrics,
  VoucherPayoutStatus,
} from "@/types/voucher";
import {
  Tag,
  Search,
  Filter,
  RefreshCw,
  Copy,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Smartphone,
  Monitor,
  Tablet,
  Share2,
  FileText,
  CreditCard,
  X,
  Sparkles,
  ShieldCheck,
  Check,
  Info,
} from "lucide-react";

export const VoucherManager: React.FC = () => {
  const [usages, setUsages] = useState<VoucherUsageRecord[]>([]);
  const [metrics, setMetrics] = useState<VoucherSummaryMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useUrlParamState<string>("voucherSearch", "");
  const [statusFilter, setStatusFilter] = useUrlParamState<VoucherPayoutStatus | "all">(
    "voucherStatus",
    "all",
    { writeDefaultToUrl: true }
  );
  const [sourceFilter, setSourceFilter] = useUrlParamState<string>("voucherSource", "all", {
    writeDefaultToUrl: true,
  });

  // Modais
  const [inspectUsage, setInspectUsage] = useState<VoucherUsageRecord | null>(null);
  const [payoutModalUsage, setPayoutModalUsage] = useState<VoucherUsageRecord | null>(null);
  const [payoutProof, setPayoutProof] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState("");

  // Feedback de Cópia
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadVouchers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers");
      const data = await res.json();
      if (data.ok) {
        setUsages(data.usages || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error("Erro ao carregar vouchers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalUsage) return;

    setIsProcessingPayout(true);
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payoutModalUsage.id,
          payoutStatus: "paid",
          payoutProof: payoutProof.trim() || undefined,
          payoutNotes: payoutNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setPayoutSuccessMsg("Repasse PIX registrado com sucesso!");
        setTimeout(() => {
          setPayoutSuccessMsg("");
          setPayoutModalUsage(null);
          setPayoutProof("");
          setPayoutNotes("");
        }, 1800);
        loadVouchers();
      } else {
        alert(data.error || "Erro ao registrar repasse financeiro.");
      }
    } catch (err: any) {
      alert("Erro de comunicação: " + err.message);
    } finally {
      setIsProcessingPayout(false);
    }
  };

  const filteredUsages = usages.filter((item) => {
    if (statusFilter !== "all" && item.financials.payoutStatus !== statusFilter) {
      return false;
    }
    if (sourceFilter !== "all") {
      const src = item.campaignTracking?.utmSource?.toLowerCase() || "direto";
      if (!src.includes(sourceFilter.toLowerCase())) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        item.voucherCode.toLowerCase().includes(q) ||
        item.orderNumber.toLowerCase().includes(q) ||
        item.customer.name.toLowerCase().includes(q) ||
        item.customer.email.toLowerCase().includes(q) ||
        item.influencer.name.toLowerCase().includes(q) ||
        (item.campaignTracking.utmCampaign &&
          item.campaignTracking.utmCampaign.toLowerCase().includes(q)) ||
        (item.campaignTracking.utmSource &&
          item.campaignTracking.utmSource.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const getSourceBadge = (source?: string) => {
    const s = source?.toLowerCase() || "direto";
    if (s.includes("instagram")) {
      return { label: "Instagram", bg: "bg-pink-500/10 text-pink-400 border-pink-500/20" };
    }
    if (s.includes("tiktok")) {
      return { label: "TikTok", bg: "bg-teal-500/10 text-teal-300 border-teal-500/20" };
    }
    if (s.includes("youtube")) {
      return { label: "YouTube", bg: "bg-red-500/10 text-red-400 border-red-500/20" };
    }
    if (s.includes("whatsapp")) {
      return { label: "WhatsApp", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }
    if (s.includes("google")) {
      return { label: "Google Ads", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    }
    return { label: source || "Direto / Orgânico", bg: "bg-slate-800 text-slate-300 border-slate-700" };
  };

  const getStatusBadge = (status: VoucherPayoutStatus) => {
    switch (status) {
      case "approved":
        return {
          label: "Liberado p/ PIX",
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold animate-pulse",
        };
      case "paid":
        return {
          label: "PIX Liquidado",
          badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-semibold",
        };
      case "pending":
        return {
          label: "Aguardando Pedido",
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30 font-medium",
        };
      case "cancelled":
        return {
          label: "Cancelado",
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30 font-medium",
        };
    }
  };

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Header Executivo da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auditoria e Rastreabilidade Soberana</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Gestão Financeira de Vouchers & Repasses a Influenciadores
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Rastreamento de cada utilização de cupom em tempo real: origem do link (UTM / Redes Sociais), cliente comprador, abatimento seletivo em chassi CNC e controle rigoroso de comissões PIX a pagar.
          </p>
        </div>

        <button
          onClick={loadVouchers}
          disabled={isLoading}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* KPI Cards Financeiros e Métricas Executivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Utilizações */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cupons Utilizados
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {metrics?.totalUsages ?? usages.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-slate-300 font-semibold">
              {formatBRL(metrics?.totalCabinetSalesCents || 0)}
            </span>{" "}
            em base de gabinetes
          </div>
        </div>

        {/* Card 2: Descontos Concedidos aos Clientes */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Descontos aos Clientes
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-cyan-400">
            {formatBRL(metrics?.totalDiscountCents || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            Calculados estritamente sobre os gabinetes CNC
          </div>
        </div>

        {/* Card 3: Comissões Liberadas p/ PIX */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              A Pagar aos Influencers (PIX)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {formatBRL(metrics?.approvedCommissionCents || 0)}
          </div>
          <div className="text-[11px] text-emerald-300/80 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Pedidos pagos prontos para transferência
          </div>
        </div>

        {/* Card 4: Comissões Já Liquidadas */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Comissões Liquidadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-200">
            {formatBRL(metrics?.paidCommissionCents || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            Total transferido via PIX com comprovante
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Pesquisa e Origens de Campanha */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cupom, cliente, pedido, influencer ou UTM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filtros de Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Todos ({usages.length})
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "approved"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-emerald-400"
              }`}
            >
              Liberados p/ PIX
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-amber-400"
              }`}
            >
              Aguardando Pedido
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "paid" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Pagos
            </button>
          </div>

          {/* Filtro Rápido de Canais */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas as Origens</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="google">Google Ads</option>
            <option value="direto">Direto / Outros</option>
          </select>
        </div>
      </div>

      {/* Tabela de Vouchers Auditados */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
            <span className="text-xs">Carregando livro-razão de vouchers...</span>
          </div>
        ) : filteredUsages.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Tag className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">Nenhum registro de voucher encontrado</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nenhuma transação corresponde aos filtros informados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Voucher & Influencer</th>
                  <th className="py-3.5 px-4">Data & Hora</th>
                  <th className="py-3.5 px-4">Comprador</th>
                  <th className="py-3.5 px-4">Link Track & Origem</th>
                  <th className="py-3.5 px-4">Raio-X Financeiro</th>
                  <th className="py-3.5 px-4">Comissão & PIX</th>
                  <th className="py-3.5 px-4 text-right">Ação Financeira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsages.map((item) => {
                  const sourceBadge = getSourceBadge(item.campaignTracking.utmSource);
                  const statusBadge = getStatusBadge(item.financials.payoutStatus);
                  const DeviceIcon =
                    item.campaignTracking.device === "mobile"
                      ? Smartphone
                      : item.campaignTracking.device === "tablet"
                      ? Tablet
                      : Monitor;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* 1. Voucher & Influencer */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono font-black text-xs tracking-wider">
                              {item.voucherCode}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{item.orderNumber}
                            </span>
                          </div>
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span>{item.influencer.name}</span>
                          </div>
                          {item.influencer.pixKey && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="font-mono text-[10px] text-slate-300 truncate max-w-[140px]">
                                PIX: {item.influencer.pixKey}
                              </span>
                              <button
                                onClick={() => handleCopy(item.influencer.pixKey!, `pix_${item.id}`)}
                                title="Copiar chave PIX do influenciador"
                                className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                              >
                                {copiedKey === `pix_${item.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Data & Hora */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="text-slate-200 font-medium">
                          {formatDateTime(item.usedAt)}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Auditado no checkout</span>
                        </div>
                      </td>

                      {/* 3. Comprador */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white text-xs">{item.customer.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.customer.email}</div>
                          <div className="flex items-center gap-2 pt-0.5">
                            {item.customer.whatsapp && (
                              <a
                                href={`https://wa.me/55${item.customer.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] transition-colors"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{item.customer.whatsapp}</span>
                              </a>
                            )}
                            <span className="text-[10px] text-slate-500">
                              {item.customer.city}/{item.customer.state}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Link Track & Origem */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${sourceBadge.bg}`}
                            >
                              <DeviceIcon className="w-3 h-3" />
                              <span>{sourceBadge.label}</span>
                            </span>
                          </div>

                          {item.campaignTracking.utmCampaign && (
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                              Camp: <strong className="text-slate-300">{item.campaignTracking.utmCampaign}</strong>
                            </div>
                          )}

                          <button
                            onClick={() => setInspectUsage(item)}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline underline-offset-2"
                          >
                            <span>Ver Trilha do Link</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 5. Raio-X Financeiro */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-400">
                            Base Gabinete:{" "}
                            <span className="text-slate-200 font-bold">
                              {formatBRL(item.financials.eligibleCabinetBaseCents)}
                            </span>
                          </div>
                          <div className="text-[11px] text-rose-400 font-semibold">
                            Desconto ({item.financials.discountPercent}%):{" "}
                            <span>-{formatBRL(item.financials.discountCents)}</span>
                          </div>
                          <div className="text-[11px] text-slate-300 pt-0.5 font-bold">
                            Total Pedido: {formatBRL(item.financials.finalOrderTotalCents)}
                          </div>
                        </div>
                      </td>

                      {/* 6. Comissão & PIX */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-sm font-black text-cyan-400">
                            {formatBRL(item.financials.influencerCommissionCents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Taxa: {item.influencer.commissionPercent}% no gabinete
                          </div>
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] border inline-block ${statusBadge.badge}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 7. Ação Financeira */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        {item.financials.payoutStatus === "paid" ? (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Transferido</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setPayoutModalUsage(item);
                              setPayoutProof("");
                              setPayoutNotes("");
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 ml-auto ${
                              item.financials.payoutStatus === "approved"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
                                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pagar PIX</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: LIQUIDAÇÃO FINANCEIRA DE REPASSE PIX */}
      {/* ======================================================== */}
      {payoutModalUsage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setPayoutModalUsage(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Transferência PIX ao Influencer</h3>
                <p className="text-xs text-slate-400">
                  Liquidação financeira de comissão por venda auditada
                </p>
              </div>
            </div>

            {payoutSuccessMsg ? (
              <div className="p-6 text-center space-y-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">{payoutSuccessMsg}</h4>
                <p className="text-xs text-slate-400">O status foi alterado para PIX Liquidado.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmPayout} className="space-y-4 pt-1">
                {/* Dados da Chave PIX */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Favorecido / Influencer
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {payoutModalUsage.voucherCode}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {payoutModalUsage.influencer.name}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {payoutModalUsage.influencer.email}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500">Chave PIX Cadastrada</div>
                      <div className="text-xs font-mono font-bold text-cyan-400">
                        {payoutModalUsage.influencer.pixKey || "Não informada no cadastro"}
                      </div>
                    </div>
                    {payoutModalUsage.influencer.pixKey && (
                      <button
                        type="button"
                        onClick={() => handleCopy(payoutModalUsage.influencer.pixKey!, "modal_pix")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedKey === "modal_pix" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Chave</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Valor a Pagar */}
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Valor Exato da Comissão</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {formatBRL(payoutModalUsage.financials.influencerCommissionCents)}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <div>Pedido: <strong className="text-slate-200">{payoutModalUsage.orderNumber}</strong></div>
                    <div>Cliente: <strong className="text-slate-200">{payoutModalUsage.customer.name}</strong></div>
                  </div>
                </div>

                {/* Código / Comprovante do PIX */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ID / Código de Autenticação do PIX (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: E123456782026101100000000000"
                    value={payoutProof}
                    onChange={(e) => setPayoutProof(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Observações Internas Financeiras
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Transferido via Itaú Empresas pelo Ronaldo"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayoutModalUsage(null)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayout}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessingPayout ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Gravando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar Pagamento PIX</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: INSPEÇÃO COMPLETA DE LINK TRACK & AUDITORIA UTM */}
      {/* ======================================================== */}
      {inspectUsage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInspectUsage(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  Trilha do Link & Parâmetros de Campanha
                </span>
                <h3 className="text-lg font-extrabold text-white font-mono">
                  {inspectUsage.voucherCode} • {inspectUsage.orderNumber}
                </h3>
              </div>
            </div>

            {/* Parâmetros de Atribuição */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3 text-xs">
              <h4 className="font-bold text-slate-300 uppercase text-[11px] tracking-wider">
                Origem & Variáveis UTM
              </h4>

              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">utm_source:</span>
                  <span className="font-bold text-white font-mono">
                    {inspectUsage.campaignTracking.utmSource || "Nenhum / Direto"}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">utm_medium:</span>
                  <span className="font-bold text-white font-mono">
                    {inspectUsage.campaignTracking.utmMedium || "Nenhum"}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">utm_campaign:</span>
                  <span className="font-bold text-white font-mono">
                    {inspectUsage.campaignTracking.utmCampaign || "Nenhum"}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Dispositivo:</span>
                  <span className="font-bold text-white uppercase font-mono">
                    {inspectUsage.campaignTracking.device || "desktop"}
                  </span>
                </div>
              </div>

              {inspectUsage.campaignTracking.referrer && (
                <div className="pt-2">
                  <span className="text-slate-500 block text-[10px]">HTTP Referrer:</span>
                  <span className="text-slate-300 font-mono text-[11px] break-all">
                    {inspectUsage.campaignTracking.referrer}
                  </span>
                </div>
              )}

              {inspectUsage.campaignTracking.landingUrl && (
                <div className="pt-1">
                  <span className="text-slate-500 block text-[10px]">Landing URL de Entrada:</span>
                  <span className="text-slate-300 font-mono text-[11px] break-all bg-slate-900 p-2 rounded-lg block mt-1">
                    {inspectUsage.campaignTracking.landingUrl}
                  </span>
                </div>
              )}
            </div>

            {/* Ficha da Utilização */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <h4 className="font-bold text-slate-300 uppercase text-[11px] tracking-wider">
                Auditoria de Data & Comprador
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Data de Utilização:</span>{" "}
                  {formatDateTime(inspectUsage.usedAt)}
                </div>
                <div>
                  <span className="text-slate-500">Cliente:</span> {inspectUsage.customer.name}
                </div>
                <div>
                  <span className="text-slate-500">E-mail:</span> {inspectUsage.customer.email}
                </div>
                <div>
                  <span className="text-slate-500">WhatsApp:</span> {inspectUsage.customer.whatsapp}
                </div>
                <div>
                  <span className="text-slate-500">Local de Entrega:</span>{" "}
                  {inspectUsage.customer.city}/{inspectUsage.customer.state}
                </div>
                <div>
                  <span className="text-slate-500">Documento:</span>{" "}
                  {inspectUsage.customer.document || "Não informado"}
                </div>
              </div>
            </div>

            {/* Repasse & Comprovante se Pago */}
            {inspectUsage.financials.payoutProof && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs space-y-1">
                <span className="text-emerald-400 font-bold block">Comprovante de Transferência PIX:</span>
                <span className="font-mono text-slate-200">{inspectUsage.financials.payoutProof}</span>
                {inspectUsage.financials.paidAt && (
                  <span className="text-slate-400 text-[10px] block">
                    Pago em: {formatDateTime(inspectUsage.financials.paidAt)}
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectUsage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
