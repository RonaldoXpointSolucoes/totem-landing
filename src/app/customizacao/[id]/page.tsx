"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import {
  Wrench,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ShoppingCart,
  ChevronLeft,
  FileText,
  User,
  Phone,
  Mail,
  Copy,
} from "lucide-react";
import { useCart } from "@/modules/cart/CartContext";
import { CABINET_MODELS, COLOR_OPTIONS } from "@/modules/catalog/catalogData";

export default function CustomizationTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { addItem } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/customizations/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data) {
          setData(json.data);
        } else {
          setError(json.error || "Orçamento não encontrado.");
        }
      })
      .catch((err) => setError("Erro ao conectar com o servidor: " + err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleApproveAndAddToCart = () => {
    if (!data) return;
    const order = data.order;
    const sheet = data.sheet;

    // Localiza modelo e cor para o carrinho
    const model =
      CABINET_MODELS.find((m) => m.name === sheet?.cabinetModelName) ||
      CABINET_MODELS[0];
    const color =
      COLOR_OPTIONS.find((c) => c.name === sheet?.colorName) ||
      COLOR_OPTIONS[0];

    const customAdjustment = sheet?.engineeringAnalysis?.customAdjustmentCents || 0;
    const totalUnitCents = model.basePriceCents + color.priceAdjustmentCents + customAdjustment;

    addItem({
      model,
      color,
      monitor: null,
      printer: null,
      barcodeReader: null,
      customizationNotes: `PERSONALIZAÇÃO APROVADA: ${sheet?.equipmentBrand} ${sheet?.equipmentModel} (+${formatBRL(customAdjustment)}) - Parecer: ${sheet?.engineeringAnalysis?.engineeringParecer}`,
      calculatedPriceCents: totalUnitCents,
    });

    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Wrench className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Carregando detalhes do orçamento técnico...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">Solicitação Não Encontrada</h2>
          <p className="text-xs text-slate-400">{error || "Código de orçamento inválido ou expirado."}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all"
          >
            Voltar para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  const order = data.order;
  const sheet = data.sheet;
  const analysis = sheet?.engineeringAnalysis || {};
  const isApproved = order.status === "custom_approved";
  const isRejected = order.status === "custom_rejected";
  const isAwaiting = order.status === "awaiting_custom_analysis";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between antialiased">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar à Loja</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">Totem Pro</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
              Engenharia CNC
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Banner de Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Solicitação de Personalização Especial
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
                {order.order_number}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Criado em {new Date(order.$createdAt).toLocaleDateString("pt-BR")} às{" "}
                {new Date(order.$createdAt).toLocaleTimeString("pt-BR")}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              {isAwaiting && (
                <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Em Análise Técnica CNC</span>
                </div>
              )}
              {isApproved && (
                <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Orçamento Aprovado pela Engenharia</span>
                </div>
              )}
              {isRejected && (
                <div className="px-4 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Inviável Dimensionalmente</span>
                </div>
              )}

              <button
                onClick={handleCopyLink}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "Link copiado!" : "Copiar link de acompanhamento"}</span>
              </button>
            </div>
          </div>

          {/* Dados do Equipamento Fora de Padrão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                Equipamento Solicitado
              </span>
              <div className="text-white font-bold text-sm">
                {sheet?.equipmentBrand} {sheet?.equipmentModel}
              </div>
              <div className="text-slate-400 text-xs">
                Tipo: <strong className="text-slate-200 capitalize">{sheet?.equipmentType}</strong>
              </div>
              {sheet?.customerNotes && (
                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-slate-500 block">Observações do Cliente:</span>
                  {sheet.customerNotes}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 space-y-2 text-xs">
              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
                Totem Base Escolhido
              </span>
              <div className="text-white font-bold text-sm">{sheet?.cabinetModelName}</div>
              <div className="text-slate-400 text-xs">
                Acabamento: <strong className="text-slate-200">{sheet?.colorName}</strong>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Garantia de usinagem com tolerância +1.5mm</span>
              </div>
            </div>
          </div>

          {/* Parecer Técnico de Engenharia */}
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Wrench className="w-4 h-4" />
              <span>Parecer da Engenharia da Router CNC</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {analysis.engineeringParecer ||
                "Aguardando avaliação dimensional pelo corpo técnico. Prazo médio de análise: até 4 horas úteis."}
            </p>
          </div>

          {/* Composição Oficial de Preços */}
          <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
              Composição de Valores (Calculado pelo Servidor)
            </h3>
            <div className="space-y-2 text-xs sm:text-sm border-b border-slate-800 pb-3">
              <div className="flex justify-between text-slate-300">
                <span>Gabinete Base ({sheet?.cabinetModelName}):</span>
                <span className="font-bold text-white">{formatBRL(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Adicional de Engenharia e Furação CNC:</span>
                <span className="font-bold text-indigo-400">
                  {isApproved
                    ? `+ ${formatBRL(analysis.customAdjustmentCents || 0)}`
                    : "A definir pela Engenharia"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <div>
                <span className="text-xs text-slate-400 block font-bold">Total do Totem Customizado:</span>
                <span className="text-[11px] text-slate-500">Impostos e garantia industrial inclusos</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {isApproved ? formatBRL(order.total_cents) : "Sob Consulta"}
              </div>
            </div>
          </div>

          {/* Botão de Ação / Aprovação */}
          {isApproved && (
            <div className="pt-2">
              <button
                onClick={handleApproveAndAddToCart}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-2xl text-sm sm:text-base transition-all shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-3"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Aprovar Orçamento e Comprar via Pix</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-2">
                O produto será adicionado ao seu carrinho com o parecer técnico e a taxa autorizada.
              </p>
            </div>
          )}

          {isAwaiting && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">
                Você receberá o retorno desta análise por WhatsApp e e-mail.
              </p>
              <p className="text-[11px] text-slate-500">
                Salve o link desta página para acompanhar a liberação do seu pedido em tempo real.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-[11px] text-slate-500">
        Totem Pro Engenharia CNC • Usinagem de Alta Precisão Submilimétrica
      </footer>
    </div>
  );
}
