"use client";

import React, { useState } from "react";
import { useUrlParamState } from "@/lib/navigation/useUrlParamState";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { SellerOrderRecord } from "@/app/api/seller/orders/route";
import { buildTrackedCampaignLink } from "@/lib/vouchers/campaignTracker";
import {
  Tag,
  Copy,
  ExternalLink,
  DollarSign,
  TrendingUp,
  PackageCheck,
  CheckCircle2,
  Clock,
  Search,
  LogOut,
  CreditCard,
  Share2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Smartphone,
  Check,
  Video,
  MessageCircle,
  Globe,
  Sliders,
} from "lucide-react";

interface SellerDashboardProps {
  seller: {
    id: string;
    name: string;
    email: string;
    couponCode?: string;
    discountPercent: number;
    commissionPercent: number;
    pixKey?: string;
    phone?: string;
  };
  metrics: {
    totalCabinetsSold: number;
    totalSalesCents: number;
    totalCommissionCents: number;
    confirmedCommissionCents: number;
    approvedCommissionCents?: number;
    pendingCommissionCents: number;
  };
  orders: SellerOrderRecord[];
  onLogout: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  seller,
  metrics,
  orders,
  onLogout,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [search, setSearch] = useUrlParamState<string>("q", "");
  const [statusFilter, setStatusFilter] = useUrlParamState<"all" | "paid" | "pending">(
    "status",
    "all",
    {
      validValues: ["all", "paid", "pending"] as const,
      writeDefaultToUrl: true,
    }
  );

  // Estados do Construtor de Links Rastreados (Campaign Link Builder) sincronizados com URL
  const [selectedChannel, setSelectedChannel] = useUrlParamState<
    "instagram_stories" | "instagram_bio" | "tiktok" | "youtube" | "whatsapp" | "custom"
  >("canal", "instagram_stories", {
    validValues: [
      "instagram_stories",
      "instagram_bio",
      "tiktok",
      "youtube",
      "whatsapp",
      "custom",
    ] as const,
    writeDefaultToUrl: true,
  });
  const [selectedPath, setSelectedPath] = useUrlParamState<string>("destino", "/monte-seu-totem");
  const [customCampaignName, setCustomCampaignName] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://totempro.com.br";
  const couponCode = seller.couponCode || "VENDEDOR10";

  // Gera link dinâmico com UTMs
  const generatedLinkData = buildTrackedCampaignLink(origin, couponCode, {
    targetPath: selectedPath,
    channel: selectedChannel,
    customCampaign: customCampaignName.trim() || undefined,
  });

  const copyCustomLink = () => {
    navigator.clipboard.writeText(generatedLinkData.url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyPixKey = () => {
    if (seller.pixKey) {
      navigator.clipboard.writeText(seller.pixKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (order.campaignChannel && order.campaignChannel.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "paid"
        ? order.isPaid
        : !order.isPaid;

    return matchesSearch && matchesStatus;
  });

  const channelsList = [
    { id: "instagram_stories", label: "Instagram Stories", icon: Smartphone },
    { id: "instagram_bio", label: "Link da Bio (Instagram)", icon: Share2 },
    { id: "tiktok", label: "TikTok Vídeo/Bio", icon: Video },
    { id: "youtube", label: "YouTube Descrição", icon: Video },
    { id: "whatsapp", label: "WhatsApp Direto", icon: MessageCircle },
    { id: "custom", label: "Campanha Personalizada", icon: Globe },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Topo / Header Executivo */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">Totem Pro</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Portal do Influenciador & Vendedor
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Painel Oficial de Vouchers, Rastreamento e Repasses PIX
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Informações do Vendedor */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <div className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center font-bold text-[11px]">
                {seller.name.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-xs">{seller.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{seller.email}</span>
              </div>
            </div>

            <a
              href="/"
              target="_blank"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Loja</span>
            </a>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Banner Destaque: Dados do Cupom & Repasse */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden space-y-5">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Parceria Oficial Ativa</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Divulgue seu cupom com links rastreados e acompanhe suas comissões
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Seus clientes recebem{" "}
                <strong className="text-cyan-300 font-bold">{seller.discountPercent}% de desconto exclusivo</strong> no
                gabinete usinado em CNC e você recebe{" "}
                <strong className="text-emerald-400 font-bold">{seller.commissionPercent}% de comissão soberana</strong> paga via PIX.
              </p>
            </div>

            {/* Caixa do Cupom & Chave PIX */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-3 shrink-0 sm:min-w-[280px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Seu Cupom Oficial
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                  ATIVO
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-cyan-400">
                {couponCode}
              </div>

              {seller.pixKey ? (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sua Chave PIX Cadastrada</span>
                    <span className="font-mono text-slate-300 text-[11px] font-semibold">{seller.pixKey}</span>
                  </div>
                  <button
                    onClick={copyPixKey}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copiar Chave PIX"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Cadastre sua chave PIX com a administração</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SEÇÃO MODERNA: GERADOR DE LINKS RASTREADOS COM UTM */}
        {/* ======================================================== */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                <span>Construtor de Links de Campanha (Link Tracking)</span>
              </div>
              <h3 className="text-base font-extrabold text-white mt-0.5">
                Crie links personalizados com rastreamento para suas redes sociais
              </h3>
              <p className="text-xs text-slate-400">
                Cada link incorpora seu cupom e parâmetros UTM automáticos para sabermos exatamente de qual campanha veio o cliente.
              </p>
            </div>
          </div>

          {/* Seletores de Canal */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {channelsList.map((ch) => {
              const Icon = ch.icon;
              const isSelected = selectedChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-500/60 text-white shadow-lg shadow-cyan-500/10"
                      : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                  <span className="text-xs font-bold block">{ch.label}</span>
                </button>
              );
            })}
          </div>

          {/* Opções de Destino e Campanha Customizada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Página de Destino
              </label>
              <select
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="/monte-seu-totem">Configurador 3D (/monte-seu-totem) - Recomendado</option>
                <option value="/modelos">Catálogo de Modelos (/modelos)</option>
                <option value="/checkout">Direto no Checkout (/checkout)</option>
                <option value="/">Página Inicial (/)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Nome Personalizado da Campanha (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: black_friday, promocao_outubro, stories_01"
                value={customCampaignName}
                onChange={(e) => setCustomCampaignName(e.target.value.replace(/\s+/g, "_").toLowerCase())}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Caixa de Exibição da URL Gerada */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="space-y-1 overflow-hidden">
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider block">
                Link Rastreado Pronto para Divulgação ({generatedLinkData.displayLabel})
              </span>
              <div className="font-mono text-xs text-slate-200 truncate select-all">
                {generatedLinkData.url}
              </div>
            </div>

            <button
              onClick={copyCustomLink}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Link Copiado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Link Rastreado</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Grade de KPIs Financeiros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Gabinetes Vendidos</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {metrics.totalCabinetsSold}{" "}
              <span className="text-xs font-normal text-slate-400">
                {metrics.totalCabinetsSold === 1 ? "totem" : "totens"}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Faturamento Elegível</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {formatBRL(metrics.totalSalesCents)}
            </div>
            <div className="text-[10px] text-slate-500">Base exclusiva de gabinetes CNC</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Comissões Recebidas (PIX)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {formatBRL(metrics.confirmedCommissionCents)}
            </div>
            <div className="text-[10px] text-slate-500">Total já transferido para sua conta</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Comissão Liberada / A Pagar</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {formatBRL(metrics.approvedCommissionCents || 0)}
            </div>
            {metrics.pendingCommissionCents > 0 && (
              <div className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold">
                <Clock className="w-3 h-3" />
                <span>{formatBRL(metrics.pendingCommissionCents)} aguardando Pix do pedido</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Vendas / Extrato do Vendedor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Extrato de Vendas Originadas pelo seu Cupom</h3>
              <p className="text-xs text-slate-400">
                Acompanhe em tempo real qual canal converteu, o valor do desconto do seu cliente e a sua comissão.
              </p>
            </div>

            {/* Filtros e Busca */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar pedido ou canal..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter("paid")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "paid" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Confirmados
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === "pending" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pendentes
                </button>
              </div>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Tag className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-white">Nenhuma venda registrada ainda</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Assim que um cliente utilizar seu cupom <strong>{couponCode}</strong> ou seu link rastreado, a venda aparecerá aqui instantaneamente!
              </p>
              <button
                onClick={copyCustomLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Copiar Link para Começar a Divulgar</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">Pedido / Data</th>
                    <th className="py-3 px-4">Canal / Origem</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Gabinete Elegível</th>
                    <th className="py-3 px-4">Desconto Cliente</th>
                    <th className="py-3 px-4">Sua Comissão</th>
                    <th className="py-3 px-4">Status do Repasse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white text-xs">#{order.orderNumber}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                          {order.campaignChannel || "Direto / Orgânico"}
                        </span>
                        {order.campaignName && (
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px]">
                            {order.campaignName}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {order.customerName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{formatBRL(order.cabinetSubtotalCents)}</div>
                        <div className="text-[10px] text-slate-500">{order.cabinetName}</div>
                      </td>

                      <td className="py-3.5 px-4 text-emerald-400 font-semibold font-mono">
                        -{formatBRL(order.discountCents)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold font-mono text-cyan-400 text-sm">
                          +{formatBRL(order.sellerCommissionCents)}
                        </span>
                        <div className="text-[10px] text-slate-500">({seller.commissionPercent}% do gabinete)</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {order.payoutStatus === "paid" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>PIX Liquidado</span>
                          </span>
                        ) : order.payoutStatus === "approved" || order.isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Liberado p/ PIX</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>Aguardando Pedido</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
