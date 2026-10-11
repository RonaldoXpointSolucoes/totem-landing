"use client";

import React, { useState } from "react";
import { CustomerAccount } from "@/types/customer";
import { OrderDetails, CartItem } from "@/types/order";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card, Button, Badge } from "@/components/ui";
import {
  Package,
  Clock,
  CheckCircle2,
  Wrench,
  Truck,
  AlertCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Boxes,
  QrCode,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface CustomerDashboardProps {
  customer: CustomerAccount;
  orders: OrderDetails[];
  onLogout: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  awaiting_payment: {
    label: "Aguardando Pix",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-500 dark:text-amber-400",
    icon: Clock,
  },
  paid: {
    label: "Pago / Confirmado",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  in_production: {
    label: "Em Produção CNC",
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    icon: Wrench,
  },
  ready: {
    label: "Pronto para Expedição",
    bg: "bg-purple-500/10 border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    icon: Package,
  },
  shipped: {
    label: "Despachado / Em Trânsito",
    bg: "bg-indigo-500/10 border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    icon: Truck,
  },
  delivered: {
    label: "Entregue",
    bg: "bg-teal-500/10 border-teal-500/30",
    text: "text-teal-600 dark:text-teal-400",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-rose-500/10 border-rose-500/30",
    text: "text-rose-500 dark:text-rose-400",
    icon: AlertCircle,
  },
};

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  customer,
  orders,
  onLogout,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderDetails | null>(null);

  // Totais
  const totalOrders = orders.length;
  const activeOrders = orders.filter(
    (o) => o.status === "in_production" || o.status === "paid" || o.status === "ready"
  ).length;
  const totalSpentCents = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((acc, o) => acc + (o.totalCents || 0), 0);

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "pending") return o.status === "awaiting_payment";
    if (filterStatus === "production") return o.status === "in_production" || o.status === "paid";
    if (filterStatus === "shipped") return o.status === "shipped" || o.status === "delivered";
    return true;
  });

  const handleCopyPix = (orderNumber: string, pixCode: string) => {
    navigator.clipboard.writeText(pixCode);
    setCopiedPixId(orderNumber);
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-[#1d1d1f] dark:text-slate-100 transition-colors">
      {/* Top Banner do Cliente */}
      <div className="bg-white dark:bg-slate-900 border-b border-black/5 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-cyan-500 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              {customer.name ? customer.name.slice(0, 2).toUpperCase() : "TP"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Olá, {customer.name || "Cliente"}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0071e3] dark:text-cyan-400 border border-blue-200 dark:border-blue-900">
                  Cliente Verificado
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                {customer.whatsappFormatted && <span>WhatsApp: {customer.whatsappFormatted}</span>}
                {customer.whatsappFormatted && customer.email && <span>•</span>}
                {customer.email && <span>{customer.email}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/monte-seu-totem">
              <Button variant="primary" size="sm" className="font-bold text-xs gap-1.5 shadow-md shadow-blue-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Montar Novo Totem</span>
              </Button>
            </Link>

            <button
              onClick={onLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-black/10 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-500 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-white dark:bg-slate-900/80 border-black/5 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Pedidos</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalOrders}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0071e3] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-5 bg-white dark:bg-slate-900/80 border-black/5 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Em Fabricação CNC</p>
              <p className="text-2xl font-black text-blue-600 dark:text-cyan-400 mt-1">{activeOrders}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </Card>

          <Card className="p-5 bg-white dark:bg-slate-900/80 border-black/5 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total em Compras</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatBRL(totalSpentCents)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </Card>
        </div>

        {/* Listagem de Compras */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/5 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0071e3]" />
                <span>Minhas Compras & Totens</span>
              </h2>
              <p className="text-xs text-slate-500">Histórico de pedidos e status de fabricação em tempo real</p>
            </div>

            {/* Filtros rápidos */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "all", label: "Todos" },
                { id: "pending", label: "Aguardando Pix" },
                { id: "production", label: "Em Produção" },
                { id: "shipped", label: "Enviados" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === f.id
                      ? "bg-[#0071e3] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-black/5 dark:border-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vazio */}
          {filteredOrders.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-slate-900/60 border-dashed border-2 border-black/10 dark:border-slate-800 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-slate-800 text-[#0071e3] flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhum pedido encontrado</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Você ainda não possui pedidos com este filtro. Personalize seu totem sob medida e receba direto da fábrica!
                </p>
              </div>
              <Link href="/monte-seu-totem">
                <Button variant="primary" size="md" className="font-bold text-xs shadow-md">
                  Montar meu Primeiro Totem
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const statusMeta = STATUS_CONFIG[order.status] || STATUS_CONFIG.awaiting_payment;
                const StatusIcon = statusMeta.icon;
                const isPendingPix = order.status === "awaiting_payment";

                return (
                  <Card
                    key={order.id || order.orderNumber}
                    className="p-5 sm:p-6 bg-white dark:bg-slate-900/90 border-black/10 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow space-y-4"
                  >
                    {/* Topo do Pedido */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-slate-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.bg} ${statusMeta.text}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{statusMeta.label}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Realizado em:{" "}
                            {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 uppercase font-bold block">Total do Pedido</span>
                        <span className="text-lg sm:text-xl font-black text-[#0071e3] dark:text-cyan-400">
                          {formatBRL(order.totalCents)}
                        </span>
                      </div>
                    </div>

                    {/* Lista dos Totens inclusos */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Totens Configurados no Pedido:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {order.items?.map((item: CartItem, idx: number) => (
                          <div
                            key={item.id || idx}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-black/5 dark:border-slate-800/80 flex items-start gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-[#0071e3] dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {item.configuration?.model?.name || "Totem Pro"}
                              </p>
                              <div className="text-[11px] text-slate-500 space-y-0.5">
                                <p>
                                  Acabamento:{" "}
                                  <strong className="text-slate-700 dark:text-slate-300">
                                    {item.configuration?.color?.name}
                                  </strong>
                                </p>
                                {item.configuration?.monitor && (
                                  <p className="truncate">
                                    Display: {item.configuration.monitor.displayName}
                                  </p>
                                )}
                                <div className="flex items-center justify-between pt-1">
                                  <span>Qtd: {item.quantity}</span>
                                  <span className="font-bold text-slate-900 dark:text-slate-200">
                                    {formatBRL(item.subtotalCents)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Caixa de Ação Rápida Pix (Se Pendente) */}
                    {isPendingPix && order.payment?.pixCode && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              Aguardando Pagamento Pix para Entrada em Produção
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                            2ª Via Disponível
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={order.payment.pixCode}
                            className="w-full text-xs font-mono p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-amber-500/30 text-slate-700 dark:text-slate-300 truncate"
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyPix(order.orderNumber, order.payment!.pixCode)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>
                              {copiedPixId === order.orderNumber ? "Copiado!" : "Copiar Chave Pix"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Linha de Ações e Informações Adicionais */}
                    <div className="pt-2 border-t border-black/5 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {order.deliveryAddress ? (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Entrega: {order.deliveryAddress.city}/{order.deliveryAddress.state || "SP"} • CEP{" "}
                            {order.deliveryAddress.cep}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        {/* Suporte Técnico WhatsApp com Pedido Referenciado */}
                        <a
                          href={`https://wa.me/5511991649959?text=Ol%C3%A1%2C%20sou%20o%20cliente%20${encodeURIComponent(
                            customer.name || ""
                          )}%20e%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20meu%20pedido%20${
                            order.orderNumber
                          }`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Acompanhar com Engenharia</span>
                        </a>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
