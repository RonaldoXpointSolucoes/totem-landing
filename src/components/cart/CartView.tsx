"use client";

import React, { useState } from "react";
import { useCart } from "@/modules/cart/CartContext";
import { formatBRL, calculateTotemPrice } from "@/modules/pricing/pricingEngine";
import { Button, Card, Badge } from "@/components/ui";
import {
  Copy,
  Edit3,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  PlusCircle,
  Package,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Zap,
  Truck,
  Loader2,
  Check,
  CreditCard,
  Wrench,
} from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";
import { cn } from "@/lib/utils";

interface CartViewProps {
  onContinueShopping: () => void;
  onEditItem: (itemId: string) => void;
  onProceedToCheckout: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  onContinueShopping,
  onEditItem,
  onProceedToCheckout,
}) => {
  const {
    items,
    duplicateItem,
    removeItem,
    updateQuantity,
    totalPriceCents,
    totalItems,
    appliedCoupon,
    couponDiscountCents,
    couponError,
    isApplyingCoupon,
    eligibleCabinetsSubtotalCents,
    ineligibleSubtotalCents,
    finalTotalPriceCents,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");

  // Estados de Frete Antecipado por CEP no Carrinho
  const [shippingCep, setShippingCep] = useState("");
  const [shippingQuotes, setShippingQuotes] = useState<any[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingRetryAttempt, setShippingRetryAttempt] = useState(0);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const calculateShippingForCep = React.useCallback(
    async (rawCep: string) => {
      const cleanCep = rawCep.replace(/\D/g, "");
      if (cleanCep.length !== 8 || items.length === 0) return;

      setIsLoadingShipping(true);
      setShippingError(null);
      setShippingRetryAttempt(0);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("totem_shipping_cep", cleanCep);
      }

      const payloadItems = items.map((i) => {
        const p = calculateTotemPrice({
          cabinet: i.configuration.model,
          color: i.configuration.color,
          monitor: i.configuration.monitor,
          printer: i.configuration.printer,
          barcodeReader: i.configuration.barcodeReader,
          includeAssemblyService: i.configuration.includeAssemblyService,
        });
        return {
          modelId: i.configuration.model.id,
          quantity: i.quantity,
          unitPriceCents: p.cardTotalPriceCents,
          declaredValueCents: p.cardTotalPriceCents,
        };
      });

      const MAX_ATTEMPTS = 3;
      let lastErr = "Serviço dos Correios temporariamente indisponível.";

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setShippingRetryAttempt(attempt);
        try {
          const res = await fetch("/api/shipping/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destinationCep: cleanCep,
              items: payloadItems,
            }),
          });

          const data = await res.json();
          if (res.ok && data.ok && Array.isArray(data.quotes) && data.quotes.length > 0) {
            setShippingQuotes(data.quotes);
            setShippingError(null);
            setShippingRetryAttempt(0);
            const available = data.quotes.filter((q: any) => q.isAvailable);
            if (available.length > 0) {
              setSelectedShippingId((prev) => {
                const savedOpt =
                  typeof window !== "undefined"
                    ? sessionStorage.getItem("totem_shipping_option_id")
                    : null;
                const preferred = prev || savedOpt;
                const stillValid = available.find((q: any) => q.id === preferred);
                const chosen = stillValid ? stillValid.id : available[0].id;
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("totem_shipping_option_id", chosen);
                }
                return chosen;
              });
            }
            setIsLoadingShipping(false);
            return;
          }

          lastErr = data?.error || "Serviço de cotação temporariamente indisponível.";
          // Se for erro de CEP inválido (400), não precisa tentar 3 vezes
          if (res.status === 400 && lastErr.toLowerCase().includes("cep")) {
            break;
          }
        } catch {
          lastErr = "Erro de comunicação ao consultar os Correios.";
        }

        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        }
      }

      setShippingError(`${lastErr} (Tentamos ${MAX_ATTEMPTS} vezes)`);
      setShippingQuotes([]);
      setSelectedShippingId(null);
      setShippingRetryAttempt(0);
      setIsLoadingShipping(false);
    },
    [items]
  );

  // Recupera CEP persistido em sessão
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCep = sessionStorage.getItem("totem_shipping_cep");
      if (savedCep) {
        const clean = savedCep.replace(/\D/g, "");
        setShippingCep(clean.length === 8 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : savedCep);
      }
    }
  }, []);

  // Recalcula automaticamente o frete sempre que a quantidade ou itens mudarem e já houver CEP válido
  React.useEffect(() => {
    const cleanCep = shippingCep.replace(/\D/g, "");
    if (cleanCep.length === 8 && items.length > 0) {
      calculateShippingForCep(cleanCep);
    }
  }, [items, shippingCep, calculateShippingForCep]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.length > 8) raw = raw.slice(0, 8);
    if (raw.length > 5) {
      setShippingCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    } else {
      setShippingCep(raw);
    }
  };

  const handleCalculateShipping = async () => {
    const cleanCep = shippingCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setShippingError("Digite um CEP válido com 8 dígitos.");
      return;
    }
    await calculateShippingForCep(cleanCep);
  };

  const selectedShippingQuote = shippingQuotes.find(
    (q) => q.id === selectedShippingId && q.isAvailable
  ) || null;
  const shippingCents = selectedShippingQuote ? selectedShippingQuote.priceCents : 0;

  const rawPixTotalCents = items.reduce((acc, it) => {
    const p = calculateTotemPrice({
      cabinet: it.configuration.model,
      color: it.configuration.color,
      monitor: it.configuration.monitor,
      printer: it.configuration.printer,
      barcodeReader: it.configuration.barcodeReader,
      includeAssemblyService: it.configuration.includeAssemblyService,
    });
    return acc + p.pixTotalPriceCents * it.quantity;
  }, 0);

  const rawCardTotalCents = items.reduce((acc, it) => {
    const p = calculateTotemPrice({
      cabinet: it.configuration.model,
      color: it.configuration.color,
      monitor: it.configuration.monitor,
      printer: it.configuration.printer,
      barcodeReader: it.configuration.barcodeReader,
      includeAssemblyService: it.configuration.includeAssemblyService,
    });
    return acc + p.cardTotalPriceCents * it.quantity;
  }, 0);

  const cartPixSavings = Math.max(0, rawCardTotalCents - rawPixTotalCents);
  const finalPixTotal = Math.max(0, rawPixTotalCents - couponDiscountCents);
  const finalCardTotal = Math.max(0, rawCardTotalCents - couponDiscountCents);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-900/80 border border-black/10 dark:border-slate-800 text-slate-500 mx-auto flex items-center justify-center shadow-md dark:shadow-xl">
          <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#1d1d1f] dark:text-white">Seu carrinho está vazio</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Você ainda não configurou nenhum Totem. Comece escolhendo o modelo ideal para seu negócio.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onContinueShopping}
          className="shadow-blue-500/25 shadow-xl bg-[#0071e3] hover:bg-[#0077ed]"
        >
          Montar meu Primeiro Totem <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Cabeçalho do Carrinho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-slate-800">
        <div>
          <Badge variant="accent" className="text-xs mb-1.5">
            Carrinho de Compras Multicomponentes
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white">
            Seus Totens Configurados ({totalItems} {totalItems === 1 ? "unidade" : "unidades"})
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onContinueShopping}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4 mr-1.5 text-[#0071e3]" />
          Configurar Outro Totem
        </Button>
      </div>

      {/* Grid: Lista de Itens + Resumo do Pedido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Lista de Totens */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item, index) => {
            const { configuration, quantity, id } = item;
            const { model, color, monitor, printer, barcodeReader } = configuration;
            const itemPricing = calculateTotemPrice({
              cabinet: model,
              color,
              monitor,
              printer,
              barcodeReader,
              includeAssemblyService: configuration.includeAssemblyService,
            });
            const itemPixUnitCents = itemPricing.pixTotalPriceCents;
            const itemPixSubtotalCents = itemPixUnitCents * quantity;
            const itemCardSubtotalCents = itemPricing.cardTotalPriceCents * quantity;

            return (
              <Card
                key={id}
                className="p-5 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur-xl flex flex-col sm:flex-row gap-5 shadow-sm dark:shadow-xl"
              >
                {/* Imagem do Gabinete */}
                <div className="relative aspect-[3/4] w-24 sm:w-28 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-black/10 dark:border-slate-800 p-2 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                  <img
                    src={model.mainImage}
                    alt={model.name}
                    className="h-full w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  />
                  <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-xs font-bold flex items-center justify-center border border-black/10 dark:border-slate-700">
                    {index + 1}
                  </span>
                </div>

                {/* Detalhes Técnicos do Item */}
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white">{model.name}</h3>
                      <div className="sm:text-right space-y-0.5">
                        <div className="flex items-baseline sm:justify-end gap-1.5 flex-wrap">
                          <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatBRL(itemPixSubtotalCents)}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 whitespace-nowrap">
                            <Zap className="w-2.5 h-2.5 fill-emerald-500 shrink-0" />
                            <span>no PIX</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center sm:justify-end gap-1">
                          <CreditCard className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>
                            ou em até{" "}
                            <strong className="text-slate-700 dark:text-slate-300 font-bold">
                              10x de {formatBRL(Math.round(itemCardSubtotalCents / 10))}
                            </strong>{" "}
                            no cartão
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Especificação dos Componentes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-slate-600 shrink-0"
                          style={{ background: color.hexReference }}
                        />
                        <span className="truncate">Cor: <strong className="text-slate-900 dark:text-slate-200">{color.name}</strong></span>
                      </div>
                      <div className="truncate">
                        Tela: <strong className="text-slate-900 dark:text-slate-200">{monitor?.displayName || "Nenhum"}</strong>
                      </div>
                      <div className="truncate">
                        Impressora: <strong className="text-slate-900 dark:text-slate-200">{printer?.displayName || "Nenhuma"}</strong>
                      </div>
                      <div className="truncate">
                        Leitor: <strong className="text-slate-900 dark:text-slate-200">{barcodeReader ? barcodeReader.displayName : "Sem leitor"}</strong>
                      </div>
                      {configuration.includeAssemblyService && (
                        <div className="col-span-full flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 pt-1">
                          <Wrench className="w-3.5 h-3.5 shrink-0" />
                          <span>Totem 100% Montado de Fábrica (+ R$ 999,00)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra Inferior do Card: Quantidade e Ações */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/10 dark:border-slate-800/80">
                    {/* Seletor de Quantidade (+/-) */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 mr-1">Qtd:</span>
                      <div className="flex items-center border border-black/15 dark:border-slate-700/80 rounded-lg bg-slate-50 dark:bg-slate-950">
                        <button
                          onClick={() => updateQuantity(id, quantity - 1)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white select-none">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(id, quantity + 1)}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        ({formatBRL(itemPixUnitCents)} un. no PIX)
                      </span>
                    </div>

                    {/* Ações: Duplicar, Editar, Excluir */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          duplicateItem(id);
                          trackEvent(ANALYTICS_EVENTS.DUPLICATE_ITEM, {
                            itemId: id,
                            modelId: model.id,
                            modelName: model.name,
                          });
                        }}
                        title="Duplicar configuração para compra em lote"
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1 text-cyan-600 dark:text-cyan-400" />
                        Duplicar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditItem(id)}
                        title="Editar configurações deste totem"
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1 text-[#0071e3] dark:text-indigo-400" />
                        Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeItem(id);
                          trackEvent(ANALYTICS_EVENTS.REMOVE_FROM_CART, {
                            itemId: id,
                            modelId: model.id,
                            modelName: model.name,
                            totalPriceCents: itemPixSubtotalCents,
                          });
                        }}
                        title="Remover do carrinho"
                        className="h-8 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Coluna Direita: Resumo do Pedido & Checkout */}
        <div className="lg:col-span-4 sticky top-24">
          <Card className="p-6 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-xl space-y-6 shadow-sm dark:shadow-xl">
            <h2 className="text-base font-bold text-[#1d1d1f] dark:text-white pb-3 border-b border-black/10 dark:border-slate-800">
              Resumo do Pedido
            </h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total de Totens:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {totalItems} {totalItems === 1 ? "unidade" : "unidades"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal dos Gabinetes:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  {formatBRL(eligibleCabinetsSubtotalCents)}
                </span>
              </div>

              {ineligibleSubtotalCents > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Kits & Periféricos (Integral):</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    {formatBRL(ineligibleSubtotalCents)}
                  </span>
                </div>
              )}

              {appliedCoupon && couponDiscountCents > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Desconto ({appliedCoupon.code} • {appliedCoupon.discountPercent}% no Gabinete):</span>
                  <span>-{formatBRL(couponDiscountCents)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Frete ({totalItems} {totalItems === 1 ? "volume" : "volumes"}):</span>
                {selectedShippingQuote ? (
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {shippingCents === 0 ? "Grátis" : formatBRL(shippingCents)}
                    </span>
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {selectedShippingQuote.name || selectedShippingQuote.serviceName || selectedShippingQuote.carrier}
                    </span>
                    {totalItems > 1 && shippingCents > 0 && selectedShippingQuote.unitPriceCents > 0 && (
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                        {totalItems}× {formatBRL(selectedShippingQuote.unitPriceCents)} (1 frete por unidade)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                    Calcular abaixo
                  </span>
                )}
              </div>

              {/* Bloco de Cálculo de Frete por CEP */}
              <div className="pt-3 border-t border-black/10 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#0071e3] dark:text-cyan-400" />
                    Calcular Frete e Prazo
                  </span>
                  {shippingQuotes.length > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {shippingQuotes.filter((q) => q.isAvailable).length} opções ({totalItems} {totalItems === 1 ? "vol." : "vols."})
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={shippingCep}
                    onChange={handleCepChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCalculateShipping();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800 rounded-xl text-xs font-mono placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCalculateShipping}
                    disabled={isLoadingShipping || shippingCep.replace(/\D/g, "").length !== 8}
                    className="h-auto py-1 px-3 text-xs font-bold shrink-0"
                  >
                    {isLoadingShipping ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {shippingRetryAttempt > 1 ? `Tentativa ${shippingRetryAttempt}/3` : "Cotando"}
                      </span>
                    ) : (
                      "Calcular"
                    )}
                  </Button>
                </div>

                {shippingError && (
                  <p className="text-[11px] text-rose-500 font-semibold">{shippingError}</p>
                )}

                {/* Lista de Opções de Frete (Correios, Transportadora e Retirada) */}
                {shippingQuotes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {shippingQuotes
                      .filter((q) => q.isAvailable)
                      .map((quote) => {
                        const isSelected = selectedShippingId === quote.id;
                        const daysText =
                          quote.deliveryDaysMin && quote.deliveryDaysMax
                            ? `${quote.deliveryDaysMin} a ${quote.deliveryDaysMax} dias úteis`
                            : `${quote.deliveryDays || quote.deliveryDaysMax || 5} dias úteis`;
                        return (
                          <div
                            key={quote.id}
                            onClick={() => {
                              setSelectedShippingId(quote.id);
                              if (typeof window !== "undefined") {
                                sessionStorage.setItem("totem_shipping_option_id", quote.id);
                              }
                            }}
                            className={cn(
                              "p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between gap-2 transition-all",
                              isSelected
                                ? "border-[#0071e3] bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-white font-semibold ring-1 ring-[#0071e3]/30"
                                : "border-black/10 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:border-black/20"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                                  isSelected
                                    ? "border-[#0071e3] bg-[#0071e3] text-white"
                                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                )}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#1d1d1f] dark:text-white leading-tight truncate">
                                  {quote.name || quote.serviceName || quote.carrier}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  Prazo: {daysText}
                                  {totalItems > 1 && quote.priceCents > 0 && quote.unitPriceCents
                                    ? ` • ${totalItems}× ${formatBRL(quote.unitPriceCents)}`
                                    : ""}
                                </div>
                              </div>
                            </div>
                            <span className="font-black text-[#0071e3] dark:text-cyan-400 shrink-0">
                              {quote.priceCents === 0 ? "Grátis" : formatBRL(quote.priceCents)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Bloco de Cupom de Desconto */}
              <div className="pt-3 border-t border-black/10 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#0071e3] dark:text-indigo-400" />
                    Cupom de Desconto
                  </span>
                  {appliedCoupon && (
                    <button
                      onClick={removeCoupon}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {appliedCoupon ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                          {appliedCoupon.code}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          {appliedCoupon.discountPercent}% OFF exclusivo no Gabinete
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      -{formatBRL(couponDiscountCents)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Código do cupom..."
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyCoupon(couponInput);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800 rounded-xl text-xs font-mono uppercase placeholder-slate-400 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyCoupon(couponInput)}
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        className="h-auto py-1 px-3 text-xs font-bold shrink-0"
                      >
                        {isApplyingCoupon ? "..." : "Aplicar"}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-rose-500 font-semibold">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-black/10 dark:border-slate-800 space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                      <Zap className="w-4 h-4 fill-emerald-500 text-emerald-600 shrink-0" />
                      <span>Total no PIX à vista:</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatBRL(finalPixTotal + shippingCents)}
                    </span>
                  </div>
                  {cartPixSavings > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      <span>Desconto à vista no PIX aplicado</span>
                      <span>Economia de {formatBRL(cartPixSavings)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>No Cartão:</span>
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Cartão em até 10x, com condições informadas pelo Mercado Pago
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      (Total no cartão: {formatBRL(finalCardTotal + shippingCents)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Garantia de Encaixe e Furação</span>
              </div>
              <p>
                Cada gabinete é inspecionado e usinado rigorosamente conforme os equipamentos declarados.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                const clean = shippingCep.replace(/\D/g, "");
                if (typeof window !== "undefined" && clean.length === 8) {
                  sessionStorage.setItem("totem_shipping_cep", clean);
                  if (selectedShippingId) {
                    sessionStorage.setItem("totem_shipping_option_id", selectedShippingId);
                  }
                }
                trackEvent(ANALYTICS_EVENTS.BEGIN_CHECKOUT, {
                  totalItems,
                  totalPriceCents,
                  shippingCents,
                });
                onProceedToCheckout();
              }}
              className="w-full font-bold shadow-blue-500/25 shadow-lg bg-[#0071e3] hover:bg-[#0077ed]"
            >
              Avançar para o Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
