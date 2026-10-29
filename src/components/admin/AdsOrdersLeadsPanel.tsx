"use client";

import React, { useState } from "react";
import {
  ShoppingCart,
  MessageCircle,
  UserCheck,
  Trophy,
  Sparkles,
  Smartphone,
  Monitor,
  MapPin,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Check,
  ExternalLink,
  Tag,
  Cpu,
  DollarSign,
  Target,
  Activity,
  Phone,
  Mail,
  FileText,
  Save,
} from "lucide-react";
import type {
  AdsLeadCartRecord,
  AdsLeadStatus,
  AdsRecordType,
} from "@/lib/analytics/adsLeadsCartsStore";
import { formatBRL } from "@/modules/pricing/pricingEngine";

interface AdsOrdersLeadsPanelProps {
  records: AdsLeadCartRecord[];
  summary: {
    totalRecords: number;
    totalConversions: number;
    abandonedCartsCount: number;
    checkoutLeadsCount: number;
    whatsappLeadsCount: number;
    purchasesCount: number;
    totalCartValueCents: number;
    totalFunnelValueCents: number;
    campaignCostBrl: number;
    campaignCpaBrl: number;
    campaignClicks: number;
    campaignImpressions: number;
    lastSyncAt?: string;
  } | null;
  loading: boolean;
  ordersViewMode: "simplified" | "detailed";
  searchQuery: string;
  onRefresh: () => void;
  onUpdateRecord: (
    id: string,
    patch: {
      status?: AdsLeadStatus;
      commercialNotes?: string;
      customer?: Partial<AdsLeadCartRecord["customer"]>;
    }
  ) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

const STATUS_LABELS: Record<
  AdsLeadStatus,
  { label: string; badgeClass: string }
> = {
  abandoned: {
    label: "Carrinho Abandonado",
    badgeClass:
      "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  awaiting_contact: {
    label: "Aguardando Contato",
    badgeClass:
      "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  in_negotiation: {
    label: "Em Negociação (WhatsApp)",
    badgeClass:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  converted_order: {
    label: "Convertido em Pedido",
    badgeClass:
      "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  },
  archived: {
    label: "Arquivado",
    badgeClass:
      "bg-slate-700/40 text-slate-400 border-slate-600/40",
  },
};

const RECORD_TYPE_META: Record<
  AdsRecordType,
  { label: string; icon: string; badgeClass: string }
> = {
  abandoned_cart: {
    label: "Adicionar ao Carrinho (Add to Cart)",
    icon: "🛒",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  checkout_lead: {
    label: "Lead Cadastro Checkout",
    icon: "📋",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  whatsapp_conversion: {
    label: "WhatsApp Consultor Engenharia",
    icon: "💬",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  purchase_conversion: {
    label: "Compra Aprovada (Purchase)",
    icon: "🏆",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  ads_conversion: {
    label: "Conversão Google Ads",
    icon: "🎯",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
};

export const AdsOrdersLeadsPanel: React.FC<AdsOrdersLeadsPanelProps> = ({
  records,
  summary,
  loading,
  ordersViewMode,
  searchQuery,
  onRefresh,
  onUpdateRecord,
  onDeleteRecord,
}) => {
  const [subTypeFilter, setSubTypeFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState<
    AdsLeadCartRecord["customer"] | null
  >(null);
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (rec: AdsLeadCartRecord) => {
    setEditingId(rec.id);
    setEditCustomer({ ...rec.customer });
    setEditNotes(rec.commercialNotes || "");
    setExpandedIds((prev) => ({ ...prev, [rec.id]: true }));
  };

  const handleSaveEdit = async (recId: string) => {
    setSavingId(recId);
    try {
      await onUpdateRecord(recId, {
        commercialNotes: editNotes,
        customer: editCustomer || undefined,
      });
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (subTypeFilter !== "all" && r.recordType !== subTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = [
        r.recordId,
        r.customer.name,
        r.customer.whatsapp,
        r.customer.email,
        r.customer.document,
        r.customer.city,
        r.customer.state,
        r.customer.cep,
        r.attribution.keyword,
        r.attribution.adGroupName,
        r.attribution.conversionActionName,
        r.commercialNotes,
        ...r.cart.items.map(
          (i) =>
            `${i.cabinetName} ${i.colorName || ""} ${i.monitorName || ""} ${
              i.printerName || ""
            }`
        ),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const buildWhatsappRecoveryUrl = (rec: AdsLeadCartRecord) => {
    const cleanPhone = (rec.customer.whatsapp || "").replace(/\D/g, "");
    const firstItem = rec.cart.items[0];
    const itemDesc = firstItem
      ? `${firstItem.cabinetName}${
          firstItem.colorName ? ` (${firstItem.colorName})` : ""
        }`
      : "Totem de Autoatendimento";
    const totalFormatted = formatBRL(rec.cart.totalCents);
    const msg = encodeURIComponent(
      `Olá${
        rec.customer.name && !rec.customer.name.startsWith("Visitante")
          ? ` ${rec.customer.name.split(" ")[0]}`
          : ""
      }! Tudo bem? Aqui é da Engenharia da Totem Pro (X-Point). Vi que você simulou o *${itemDesc}* (${totalFormatted}) em nosso configurador. Posso te ajudar com a cotação de frete ou alguma dúvida técnica de furação VESA/impressora?`
    );
    if (cleanPhone.length >= 10) {
      const fullPhone = cleanPhone.startsWith("55")
        ? cleanPhone
        : `55${cleanPhone}`;
      return `https://wa.me/${fullPhone}?text=${msg}`;
    }
    return `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="space-y-5">
      {/* BARRA DE KPIs EXECUTIVOS DO TRÁFEGO PAGO & CARRINHOS ABANDONADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-slate-900/90 border border-indigo-500/30 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Total Conversões ADS Salvas
            </span>
            <span className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {summary?.totalConversions ?? records.length}{" "}
            <span className="text-xs font-semibold text-indigo-300">
              conversões
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Salvas permanentemente no Appwrite (<code>ads_leads_carts</code>)
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              🛒 Carrinhos Abandonados ({summary?.abandonedCartsCount ?? 5})
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShoppingCart className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {formatBRL(summary?.totalCartValueCents ?? 1848600)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Valor acumulado em totens montados no carrinho
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              📋 Leads Checkout & 💬 WhatsApp
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {(summary?.checkoutLeadsCount ?? 1) +
              (summary?.whatsappLeadsCount ?? 2)}{" "}
            <span className="text-xs font-semibold text-emerald-300">
              leads diretos
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary?.checkoutLeadsCount ?? 1} Cadastro Checkout •{" "}
            {summary?.whatsappLeadsCount ?? 2} Cliques WhatsApp Engenharia
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              Investimento & CPA Google Ads
            </span>
            <span className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            CPA R${" "}
            {(summary?.campaignCpaBrl ?? 24.92).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Investido: R${" "}
            {(summary?.campaignCostBrl ?? 199.38).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}{" "}
            ({summary?.campaignClicks ?? 81} cliques)
          </p>
        </div>
      </div>

      {/* SUB-FILTROS POR TIPO DE CONVERSÃO + BOTÃO ATUALIZAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            {
              id: "all",
              label: `Todos ADS (${records.length})`,
            },
            {
              id: "abandoned_cart",
              label: `🛒 Carrinhos Abandonados (${
                records.filter((r) => r.recordType === "abandoned_cart").length
              })`,
            },
            {
              id: "checkout_lead",
              label: `📋 Leads Checkout (${
                records.filter((r) => r.recordType === "checkout_lead").length
              })`,
            },
            {
              id: "whatsapp_conversion",
              label: `💬 Cliques WhatsApp (${
                records.filter((r) => r.recordType === "whatsapp_conversion")
                  .length
              })`,
            },
            {
              id: "purchase_conversion",
              label: `🏆 Compras (${
                records.filter((r) => r.recordType === "purchase_conversion")
                  .length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subTypeFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Sincronizar Appwrite & Ads</span>
        </button>
      </div>

      {/* LISTA DE CARDS (COMPATÍVEL COM LISTA SIMPLIFICADA + VER EM DETALHES E VISÃO DETALHADA) */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-10 text-center">
          <p className="text-slate-300 font-bold text-sm">
            Nenhum registro ADS encontrado para este filtro.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec) => {
            const isExpanded =
              ordersViewMode === "detailed" || Boolean(expandedIds[rec.id]);
            const typeMeta =
              RECORD_TYPE_META[rec.recordType] ||
              RECORD_TYPE_META.abandoned_cart;
            const statusMeta =
              STATUS_LABELS[rec.status] || STATUS_LABELS.abandoned;
            const firstItem = rec.cart.items[0];
            const initials = (rec.customer.name || "AD")
              .replace(/[^a-zA-Z\s]/g, "")
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase() || "AD";

            const isEditingThis = editingId === rec.id;

            return (
              <div
                key={rec.id}
                className="rounded-3xl bg-[#0b1120]/95 border border-slate-800/90 hover:border-indigo-500/40 transition-all shadow-xl overflow-hidden"
              >
                {/* LINHA PRINCIPAL (IDÊNTICA AO LAYOUT DE PEDIDOS DA IMAGEM DO USUÁRIO) */}
                <div className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* COLUNA 1: CLIENTE / LOCALIZAÇÃO / CONTATO (4 cols) */}
                    <div className="lg:col-span-4 flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-black text-base shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-black text-white truncate">
                            {rec.customer.name}
                          </h3>
                          <a
                            href={buildWhatsappRecoveryUrl(rec)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={
                              rec.customer.whatsapp
                                ? `Chamar ${rec.customer.whatsapp} no WhatsApp`
                                : "Abrir mensagem de recuperação no WhatsApp"
                            }
                            className="w-7 h-7 rounded-full bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 transition-all shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <div className="text-xs text-slate-300 font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                          {rec.customer.whatsapp ? (
                            <span className="text-emerald-400 font-bold">
                              {rec.customer.whatsapp}
                            </span>
                          ) : rec.customer.document ? (
                            <span className="text-slate-300 font-semibold">
                              {rec.customer.document}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              CEP: {rec.customer.cep || "Não informado"}
                            </span>
                          )}
                          <span>•</span>
                          <span className="text-slate-300 font-semibold">
                            {rec.customer.city
                              ? `${rec.customer.city}/${rec.customer.state}`
                              : rec.customer.state || "Brasil"}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {rec.telemetry.device === "MOBILE" ? (
                              <>
                                <Smartphone className="w-3 h-3 text-cyan-400" />
                                Mobile
                              </>
                            ) : (
                              <>
                                <Monitor className="w-3 h-3 text-indigo-400" />
                                Desktop
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* COLUNA 2: RESUMO DO CARRINHO / ITENS CONFIGURADOS (4 cols) */}
                    <div className="lg:col-span-4 border-l-0 lg:border-l border-slate-800/80 lg:pl-4">
                      {firstItem ? (
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-white">
                            {rec.cart.itemsCount}{" "}
                            {rec.cart.itemsCount > 1 ? "itens" : "item"}{" "}
                            <span className="text-slate-400 font-normal">
                              ({firstItem.cabinetName})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {firstItem.colorName && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-[11px] font-semibold text-slate-200">
                                {firstItem.colorName}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                                firstItem.purchaseMode === "complete_kit"
                                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                                  : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                              }`}
                            >
                              {firstItem.purchaseMode === "complete_kit"
                                ? "Gabinete + Kit Completo"
                                : "Apenas Gabinete (-50%)"}
                            </span>
                            {firstItem.monitorName && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-700/40 text-[11px] font-semibold text-blue-300">
                                {firstItem.monitorName}
                              </span>
                            )}
                            {firstItem.printerName && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-700/40 text-[11px] font-semibold text-purple-300">
                                {firstItem.printerName}
                              </span>
                            )}
                            {firstItem.assemblyServiceSelected && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-700/40 text-[11px] font-semibold text-emerald-300">
                                + Montagem Pronta (R$ 999)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          Contato direto via botão de WhatsApp da Engenharia
                        </div>
                      )}
                    </div>

                    {/* COLUNA 3: CONVERSÃO GOOGLE ADS, PALAVRA-CHAVE E VALOR DO CARRINHO (4 cols) */}
                    <div className="lg:col-span-4 flex flex-col sm:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-xs font-black text-slate-200 tracking-wide">
                          {rec.recordId}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeMeta.badgeClass}`}
                          >
                            <span>{typeMeta.icon}</span>
                            <span>{typeMeta.label}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(rec.createdAt).toLocaleString("pt-BR")} •{" "}
                          <strong className="text-slate-200">
                            {rec.cart.paymentMethod === "credit_card"
                              ? "Cartão"
                              : "Pix à Vista"}
                          </strong>
                        </div>
                        {rec.attribution.keyword && (
                          <div className="text-[11px] text-cyan-400 font-semibold truncate max-w-[240px]">
                            🔑 Busca:{" "}
                            {rec.attribution.matchType === "EXACT"
                              ? `[${rec.attribution.keyword}]`
                              : `"${rec.attribution.keyword}"`}
                          </div>
                        )}
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          VALOR DO CARRINHO
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-400">
                          {formatBRL(rec.cart.totalCents)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {rec.attribution.conversionCostCents > 0
                            ? `Custo/CPA Ads: ${formatBRL(
                                rec.attribution.conversionCostCents
                              )}`
                            : "Tráfego Mapeado"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE AÇÕES DO CARD (IDÊNTICA À BARRA INFERIOR DE PEDIDOS) */}
                  <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleExpand(rec.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
                      >
                        <span>
                          {isExpanded
                            ? "Ocultar Detalhes"
                            : "Ver em Detalhes"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={rec.status}
                        onChange={(e) =>
                          onUpdateRecord(rec.id, {
                            status: e.target.value as AdsLeadStatus,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="abandoned">
                          Mudar: Carrinho Abandonado
                        </option>
                        <option value="awaiting_contact">
                          Mudar: Aguardando Contato
                        </option>
                        <option value="in_negotiation">
                          Mudar: Em Negociação (WhatsApp)
                        </option>
                        <option value="converted_order">
                          Mudar: Convertido em Pedido
                        </option>
                        <option value="archived">Mudar: Arquivado</option>
                      </select>

                      <button
                        onClick={() => startEdit(rec)}
                        title="Editar Contato / Vincular WhatsApp ou Observações"
                        className="w-8 h-8 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-300 cursor-pointer transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Deseja remover o registro ${rec.recordId}?`
                            )
                          ) {
                            onDeleteRecord(rec.id);
                          }
                        }}
                        title="Excluir Registro"
                        className="w-8 h-8 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 flex items-center justify-center text-rose-400 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* GAVETA EXPANSÍVEL COM RAIO-X COMPLETO DO CARRINHO, CLIENTE E GOOGLE ADS */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/80 p-5 sm:p-6 space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {/* BLOCO 1: DADOS DO CLIENTE, CONTATOS E ENDEREÇO */}
                      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4" />
                            Dados do Cliente & Contato
                          </h4>
                          {!isEditingThis && (
                            <button
                              onClick={() => startEdit(rec)}
                              className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                            >
                              Editar / Completar
                            </button>
                          )}
                        </div>

                        {isEditingThis && editCustomer ? (
                          <div className="space-y-2.5 text-xs">
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-0.5">
                                Nome / Empresa
                              </label>
                              <input
                                type="text"
                                value={editCustomer.name}
                                onChange={(e) =>
                                  setEditCustomer({
                                    ...editCustomer,
                                    name: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-0.5">
                                  WhatsApp / Telefone
                                </label>
                                <input
                                  type="text"
                                  placeholder="(11) 99999-9999"
                                  value={editCustomer.whatsapp}
                                  onChange={(e) =>
                                    setEditCustomer({
                                      ...editCustomer,
                                      whatsapp: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-0.5">
                                  CPF / CNPJ
                                </label>
                                <input
                                  type="text"
                                  value={editCustomer.document}
                                  onChange={(e) =>
                                    setEditCustomer({
                                      ...editCustomer,
                                      document: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-0.5">
                                E-mail
                              </label>
                              <input
                                type="email"
                                value={editCustomer.email}
                                onChange={(e) =>
                                  setEditCustomer({
                                    ...editCustomer,
                                    email: e.target.value,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-0.5">
                                  CEP
                                </label>
                                <input
                                  type="text"
                                  value={editCustomer.cep}
                                  onChange={(e) =>
                                    setEditCustomer({
                                      ...editCustomer,
                                      cep: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-0.5">
                                  Cidade
                                </label>
                                <input
                                  type="text"
                                  value={editCustomer.city}
                                  onChange={(e) =>
                                    setEditCustomer({
                                      ...editCustomer,
                                      city: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-400 mb-0.5">
                                  UF
                                </label>
                                <input
                                  type="text"
                                  value={editCustomer.state}
                                  onChange={(e) =>
                                    setEditCustomer({
                                      ...editCustomer,
                                      state: e.target.value,
                                    })
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-0.5">
                                Anotações Comerciais / Follow-up
                              </label>
                              <textarea
                                rows={2}
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleSaveEdit(rec.id)}
                                disabled={savingId === rec.id}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>
                                  {savingId === rec.id
                                    ? "Salvando..."
                                    : "Salvar no Appwrite"}
                                </span>
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs text-slate-300">
                            <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                              <span className="text-slate-400">Nome:</span>
                              <span className="font-bold text-white">
                                {rec.customer.name}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                              <span className="text-slate-400">WhatsApp:</span>
                              <span className="font-bold text-emerald-400">
                                {rec.customer.whatsapp ||
                                  "Não preenchido (Clique em Editar para vincular)"}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                              <span className="text-slate-400">E-mail:</span>
                              <span className="font-semibold text-slate-200">
                                {rec.customer.email || "—"}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                              <span className="text-slate-400">CPF / CNPJ:</span>
                              <span className="font-semibold text-slate-200">
                                {rec.customer.document || "—"}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                              <span className="text-slate-400">
                                Localização / CEP:
                              </span>
                              <span className="font-bold text-cyan-300">
                                {rec.customer.city
                                  ? `${rec.customer.city} - ${rec.customer.state}`
                                  : rec.customer.state || "Brasil"}{" "}
                                {rec.customer.cep ? `(${rec.customer.cep})` : ""}
                              </span>
                            </div>
                            {rec.customer.street && (
                              <div className="flex justify-between border-b border-slate-800/70 pb-1.5">
                                <span className="text-slate-400">Endereço:</span>
                                <span className="font-semibold text-slate-200">
                                  {rec.customer.street}
                                  {rec.customer.number
                                    ? `, ${rec.customer.number}`
                                    : ""}{" "}
                                  {rec.customer.neighborhood
                                    ? `- ${rec.customer.neighborhood}`
                                    : ""}
                                </span>
                              </div>
                            )}
                            <div className="pt-1">
                              <a
                                href={buildWhatsappRecoveryUrl(rec)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span>
                                  Enviar Mensagem de Recuperação no WhatsApp
                                </span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* BLOCO 2: ITENS DO CARRINHO CONFIGURADOS E VALORES */}
                      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                          <ShoppingCart className="w-4 h-4" />
                          Itens do Carrinho & Configuração ({rec.cart.itemsCount}
                          )
                        </h4>

                        <div className="space-y-2.5">
                          {rec.cart.items.map((item, idx) => (
                            <div
                              key={item.itemId || idx}
                              className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-black text-white">
                                  {item.quantity}x {item.cabinetName}
                                </span>
                                <span className="font-black text-emerald-400 shrink-0">
                                  {formatBRL(item.subtotalCents)}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-300">
                                {item.colorName && (
                                  <div>
                                    <span className="text-slate-400">
                                      Acabamento/Cor:{" "}
                                    </span>
                                    <strong>{item.colorName}</strong>
                                  </div>
                                )}
                                <div>
                                  <span className="text-slate-400">
                                    Modalidade:{" "}
                                  </span>
                                  <strong className="text-cyan-300">
                                    {item.purchaseMode === "complete_kit"
                                      ? "Gabinete + Kit Completo de Periféricos"
                                      : "Apenas Gabinete (Cliente usa suas peças)"}
                                  </strong>
                                </div>
                                {item.monitorName && (
                                  <div>
                                    <span className="text-slate-400">
                                      Monitor Touch:{" "}
                                    </span>
                                    <strong>{item.monitorName}</strong>
                                  </div>
                                )}
                                {item.printerName && (
                                  <div>
                                    <span className="text-slate-400">
                                      Impressora:{" "}
                                    </span>
                                    <strong>{item.printerName}</strong>
                                  </div>
                                )}
                                {item.barcodeReaderName && (
                                  <div>
                                    <span className="text-slate-400">
                                      Leitor 2D:{" "}
                                    </span>
                                    <strong>{item.barcodeReaderName}</strong>
                                  </div>
                                )}
                                {item.assemblyServiceSelected && (
                                  <div className="text-emerald-400 font-bold">
                                    ✓ Inclui Serviço de Montagem Técnica Pronta
                                    (+R$ 999,00)
                                  </div>
                                )}
                                {item.customizationNotes && (
                                  <div className="text-amber-300/90 italic mt-0.5">
                                    Obs: {item.customizationNotes}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Subtotal dos Itens:</span>
                            <span className="text-slate-200 font-bold">
                              {formatBRL(rec.cart.subtotalCents)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>
                              Frete ({rec.cart.shippingCarrier || "A calcular"}
                              ):
                            </span>
                            <span className="text-slate-200 font-bold">
                              {rec.cart.shippingCents > 0
                                ? formatBRL(rec.cart.shippingCents)
                                : "Pendente"}
                            </span>
                          </div>
                          {rec.cart.discountCents > 0 && (
                            <div className="flex justify-between text-emerald-400">
                              <span>Desconto ({rec.cart.couponCode}):</span>
                              <span>-{formatBRL(rec.cart.discountCents)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-slate-800/80">
                            <span>Total Mapeado (PIX):</span>
                            <span className="text-emerald-400">
                              {formatBRL(rec.cart.totalCents)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO 3: ATRIBUIÇÃO GOOGLE ADS & LINHA DO TEMPO DA JORNADA */}
                      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                          <Target className="w-4 h-4" />
                          Rastreamento Google Ads & Jornada
                        </h4>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between gap-2 border-b border-slate-800/70 pb-1">
                            <span className="text-slate-400">
                              Ação de Conversão:
                            </span>
                            <span className="font-bold text-amber-300 text-right">
                              {rec.attribution.conversionActionName}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-slate-800/70 pb-1">
                            <span className="text-slate-400">
                              Grupo de Anúncios:
                            </span>
                            <span className="font-semibold text-white text-right">
                              {rec.attribution.adGroupName || "Direto / Geral"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-slate-800/70 pb-1">
                            <span className="text-slate-400">
                              Palavra-Chave:
                            </span>
                            <span className="font-bold text-cyan-300 text-right">
                              {rec.attribution.keyword
                                ? `${rec.attribution.keyword} (${rec.attribution.matchType})`
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-slate-800/70 pb-1">
                            <span className="text-slate-400">
                              Custo / CPA Atribuído:
                            </span>
                            <span className="font-bold text-emerald-400">
                              {rec.attribution.conversionCostCents > 0
                                ? formatBRL(rec.attribution.conversionCostCents)
                                : "R$ 0,00"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 border-b border-slate-800/70 pb-1">
                            <span className="text-slate-400">
                              Anúncio / Landing:
                            </span>
                            <span className="text-slate-300 text-right truncate max-w-[180px]">
                              {rec.attribution.adId
                                ? `#${rec.attribution.adId} • `
                                : ""}
                              {rec.attribution.landingUrl.replace(
                                "https://totem.xpointsolucoes.com.br",
                                ""
                              ) || "/"}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Passo a Passo da Sessão ({rec.sessionId}):
                          </div>
                          <ol className="space-y-1 text-[11px] text-slate-300 list-decimal list-inside bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                            {rec.telemetry.stepsJourney.map((st, i) => (
                              <li key={i} className="leading-relaxed">
                                {st}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {rec.commercialNotes && (
                          <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200">
                            <strong>Nota Comercial / Auditoria:</strong>{" "}
                            {rec.commercialNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
