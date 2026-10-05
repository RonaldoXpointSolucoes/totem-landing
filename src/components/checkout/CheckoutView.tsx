"use client";

import React, { useState, useEffect } from "react";
import { useCart } from "@/modules/cart/CartContext";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { CustomerInfo, DeliveryAddress, OrderDetails, ManufacturingSpec } from "@/types/order";
import { ShippingQuote, ShippingOptionId } from "@/types/shipping";
import { Card, Button, Input, Badge } from "@/components/ui";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Clock,
  QrCode,
  Printer,
  Sparkles,
  Building2,
  User,
  Truck,
  CreditCard,
  AlertCircle,
  Cpu,
  FileText,
  Wrench,
  Check,
  MapPin,
  Package,
  Loader2,
} from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

interface CheckoutViewProps {
  onBackToCart: () => void;
  onOrderCompleted: () => void;
}

// Máscaras de entrada
function maskCPF(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{4})$/, "$1-$2");
}

function maskCEP(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  onBackToCart,
  onOrderCompleted,
}) => {
  const { items, totalPriceCents, clearCart } = useCart();

  // Estados do Fluxo
  const [step, setStep] = useState<"form" | "awaiting_pix" | "paid">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  // Estados do Formulário
  const [personType, setPersonType] = useState<"individual" | "company">("individual");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepSuccess, setCepSuccess] = useState(false);

  // Estados Pix
  const [copied, setCopied] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(1800); // 30 minutos

  // Estados de Frete & Entrega
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<ShippingOptionId | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Timer decrescente para a tela de Pix
  useEffect(() => {
    if (step !== "awaiting_pix") return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Live polling automático em tempo real para detectar compensação do Pix via Webhook
  useEffect(() => {
    if (step !== "awaiting_pix" || !orderDetails?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?orderId=${orderDetails.id}`);
        const data = await res.json();
        if (data.ok && data.isPaid) {
          trackEvent(ANALYTICS_EVENTS.PURCHASE, {
            orderId: orderDetails.id,
            orderNumber: orderDetails.orderNumber,
            totalPriceCents: orderDetails.totalCents,
            totalCents: orderDetails.totalCents,
            source: "webhook_polling",
          });
          setOrderDetails((prev) =>
            prev
              ? {
                  ...prev,
                  status: "paid",
                  payment: {
                    ...prev.payment,
                    status: "paid",
                    paidAt: data.paidAt || new Date().toISOString(),
                  },
                }
              : null
          );
          setStep("paid");
          clearCart();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (err) {
        // Silencioso em caso de oscilação transitória
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [step, orderDetails?.id, clearCart]);

  // Formatação MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Cotação unificada de frete (Correios, Transportadora e Retirada)
  const fetchShippingQuotes = async (targetCep: string) => {
    const cleanCep = targetCep.replace(/\D/g, "");
    if (cleanCep.length !== 8 || items.length === 0) return;

    setIsLoadingShipping(true);
    setShippingError(null);
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationCep: cleanCep,
          items: items.map((i) => ({
            modelId: i.configuration.model.id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.quotes)) {
        setShippingQuotes(data.quotes);
        setSelectedShippingId((prev) => {
          const currentValid = data.quotes.find((q: ShippingQuote) => q.id === prev && q.isAvailable);
          if (currentValid) return prev;
          const firstAvailable = data.quotes.find((q: ShippingQuote) => q.isAvailable);
          return firstAvailable ? firstAvailable.id : null;
        });
      } else {
        setShippingError(data.error || "Não foi possível obter opções de frete.");
      }
    } catch (err: any) {
      console.error("Erro ao cotar frete:", err);
      setShippingError("Erro de comunicação ao calcular frete.");
    } finally {
      setIsLoadingShipping(false);
    }
  };

  // Recota automaticamente se itens do carrinho forem modificados e já houver CEP
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8 && items.length > 0) {
      fetchShippingQuotes(cleanCep);
    }
  }, [items]);

  const selectedShippingQuote =
    shippingQuotes.find((q) => q.id === selectedShippingId && q.isAvailable) || null;
  const shippingCents = selectedShippingQuote ? selectedShippingQuote.priceCents : 0;
  const finalTotalCents = totalPriceCents + shippingCents;

  // Busca automática de CEP com alta resiliência (Timeout ViaCEP + Fallback BrasilAPI)
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const masked = maskCEP(rawVal);
    setCep(masked);
    setCepSuccess(false);

    const cleanCep = rawVal.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      setErrorMsg(null);

      // Dispara cotação de frete em paralelo
      fetchShippingQuotes(cleanCep);

      try {
        let foundData: { logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null = null;

        // 1. Tentativa ViaCEP com timeout de 2.5s via AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        try {
          const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (!data.erro) {
              foundData = {
                logradouro: data.logradouro || "",
                bairro: data.bairro || "",
                localidade: data.localidade || "",
                uf: data.uf || "",
              };
            }
          }
        } catch {
          clearTimeout(timeoutId);
        }

        // 2. Fallback imediato: BrasilAPI se o ViaCEP demorar ou falhar
        if (!foundData) {
          try {
            const resFallback = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
            if (resFallback.ok) {
              const dataFallback = await resFallback.json();
              foundData = {
                logradouro: dataFallback.street || "",
                bairro: dataFallback.neighborhood || "",
                localidade: dataFallback.city || "",
                uf: dataFallback.state || "",
              };
            }
          } catch {
            // Falha silenciosa no fallback
          }
        }

        if (foundData) {
          setStreet(foundData.logradouro || "");
          setNeighborhood(foundData.bairro || "");
          setCity(foundData.localidade || "");
          setState(foundData.uf || "");
          setCepSuccess(true);
        } else {
          setErrorMsg("CEP não encontrado nas bases oficiais. Por favor, preencha o endereço manualmente.");
        }
      } catch (err) {
        console.error("Erro na consulta de CEP:", err);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  // Envio do Pedido para o Backend (com recálculo server-side)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validações básicas
    if (!name.trim()) return setErrorMsg("Por favor, preencha o Nome Completo ou Razão Social.");
    if (!document.trim()) return setErrorMsg("Por favor, preencha o CPF ou CNPJ.");
    if (!email.trim() || !email.includes("@")) return setErrorMsg("Por favor, informe um e-mail válido.");
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, "").length < 10) {
      return setErrorMsg("Por favor, informe um WhatsApp válido com DDD.");
    }
    if (!cep.trim() || !street.trim() || !number.trim() || !city.trim()) {
      return setErrorMsg("Por favor, preencha o endereço de entrega completo.");
    }
    if (shippingQuotes.some((q) => q.isAvailable) && !selectedShippingId) {
      return setErrorMsg("Por favor, selecione uma modalidade de frete ou retirada na fábrica.");
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer: {
          personType,
          name: name.trim(),
          document: document.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.trim(),
        },
        deliveryAddress: {
          cep: cep.trim(),
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim(),
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim(),
        },
        shippingOptionId: selectedShippingId,
        shippingCents,
        items: items.map((i) => ({
          id: i.id,
          modelId: i.configuration.model.id,
          colorId: i.configuration.color.id,
          monitorId: i.configuration.monitor?.id || null,
          printerId: i.configuration.printer?.id || null,
          hasScanner: !!i.configuration.barcodeReader,
          customizationNotes: i.configuration.customizationNotes || "",
          quantity: i.quantity,
        })),
      };

      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível gerar a ordem de pedido.");
      }

      trackEvent(ANALYTICS_EVENTS.LEAD_SUBMITTED, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        personType,
        city: city.trim(),
        state: state.trim(),
        totalPriceCents: data.order.totalCents,
      });

      setOrderDetails(data.order);
      trackEvent(ANALYTICS_EVENTS.PIX_GENERATED, {
        orderId: data.order.id,
        orderNumber: data.order.orderNumber,
        totalPriceCents: data.order.totalCents,
        totalCents: data.order.totalCents,
        itemCount: data.order.items.length,
        paymentMethod: "pix",
      });
      setStep("awaiting_pix");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      setErrorMsg(err.message || "Erro inesperado ao gerar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação de Copiar Código Pix
  const handleCopyPix = () => {
    if (!orderDetails?.payment.pixCode) return;
    navigator.clipboard.writeText(orderDetails.payment.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Simulação de Pagamento Confirmado (MVP 0)
  const handleSimulatePaymentConfirmation = () => {
    if (!orderDetails) return;
    trackEvent(ANALYTICS_EVENTS.PURCHASE, {
      orderId: orderDetails.id,
      orderNumber: orderDetails.orderNumber,
      totalPriceCents: orderDetails.totalCents,
      totalCents: orderDetails.totalCents,
      source: "manual_simulation",
    });
    setOrderDetails({
      ...orderDetails,
      status: "paid",
      payment: {
        ...orderDetails.payment,
        status: "paid",
        paidAt: new Date().toISOString(),
      },
    });
    setStep("paid");
    clearCart(); // Esvazia o carrinho após confirmação de compra
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ----------------------------------------------------
  // TELA 3: PAGAMENTO CONFIRMADO & FICHA TÉCNICA CNC
  // ----------------------------------------------------
  if (step === "paid" && orderDetails) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in-50 duration-500">
        {/* Banner de Sucesso */}
        <Card className="p-6 md:p-8 border-emerald-500/30 bg-gradient-to-b from-emerald-50 via-white to-slate-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950 text-center space-y-4 shadow-sm dark:shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-xl shadow-emerald-500/20 animate-in zoom-in-75">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <Badge variant="success" className="mx-auto text-xs py-1 px-3">
            PAGAMENTO PIX CONFIRMADO ✓
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
            Ordem de Fabricação Liberada!
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            Seu pagamento foi autenticado com sucesso. A ordem de produção já foi enviada à nossa
            fábrica com as medidas milimétricas e cortes técnicos para início imediato na Router CNC.
          </p>

          <div className="pt-2 flex flex-wrap justify-center items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
            <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-black/10 dark:border-slate-800">
              Protocolo: <strong className="text-emerald-600 dark:text-emerald-400">{orderDetails.orderNumber}</strong>
            </span>
            <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-black/10 dark:border-slate-800">
              Data: <strong className="text-slate-900 dark:text-slate-200">{new Date(orderDetails.payment.paidAt || Date.now()).toLocaleString("pt-BR")}</strong>
            </span>
            <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/80 border border-black/10 dark:border-slate-800">
              Total Pago: <strong className="text-[#0071e3] dark:text-white">{formatBRL(orderDetails.totalCents)}</strong>
            </span>
          </div>

          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => window.print()}
              className="font-semibold text-xs border-black/10 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
            >
              <Printer className="w-4 h-4 mr-2 text-cyan-600 dark:text-cyan-400" />
              Imprimir Ficha Técnica de Produção
            </Button>
            <Button
              variant="outline"
              onClick={onOrderCompleted}
              className="font-semibold text-xs border-black/15 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Voltar ao Início / Novo Totem
            </Button>
          </div>
        </Card>

        {/* Ficha Técnica de Fabricação para CNC (Print-friendly) */}
        <div id="ficha-tecnica-cnc" className="space-y-6">
          <div className="flex items-center justify-between border-b border-black/10 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-indigo-600/30 border border-blue-200 dark:border-indigo-500/40 flex items-center justify-center text-[#0071e3] dark:text-indigo-400">
                <Wrench className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight">
                Ficha Técnica de Engenharia & Usinagem CNC
              </h2>
            </div>
            <span className="text-xs font-mono text-[#0071e3] dark:text-indigo-400 bg-blue-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded border border-blue-200 dark:border-indigo-800/50 font-bold">
              STATUS: LIBERADO PARA CORTE
            </span>
          </div>

          {/* Dados do Cliente e Local de Entrega */}
          <Card className="p-5 border-black/10 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs shadow-sm dark:shadow-xl">
            <div>
              <span className="text-slate-500 uppercase tracking-wider font-bold block mb-1">
                Destinatário / Empresa
              </span>
              <p className="font-bold text-[#1d1d1f] dark:text-white text-sm">{orderDetails.customer.name}</p>
              <p className="text-slate-600 dark:text-slate-400">
                {orderDetails.customer.personType === "individual" ? "CPF" : "CNPJ"}: {orderDetails.customer.document}
              </p>
              <p className="text-slate-600 dark:text-slate-400">WhatsApp: {orderDetails.customer.whatsapp}</p>
              <p className="text-slate-600 dark:text-slate-400">E-mail: {orderDetails.customer.email}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider font-bold block mb-1">
                Endereço de Expedição
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {orderDetails.deliveryAddress.street}, {orderDetails.deliveryAddress.number}
                {orderDetails.deliveryAddress.complement ? ` - ${orderDetails.deliveryAddress.complement}` : ""}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {orderDetails.deliveryAddress.neighborhood} — {orderDetails.deliveryAddress.city}/{orderDetails.deliveryAddress.state}
              </p>
              <p className="text-slate-600 dark:text-slate-400">CEP: {orderDetails.deliveryAddress.cep}</p>
            </div>
          </Card>

          {/* Detalhamento de Cada Totem para a Fábrica */}
          <div className="space-y-4">
            {orderDetails.manufacturingSheets.map((sheet) => (
              <Card
                key={sheet.itemIndex}
                className="p-5 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-950/70 space-y-4 shadow-sm dark:shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-100 dark:bg-indigo-600/30 text-[#0071e3] dark:text-indigo-300 text-xs font-mono font-bold flex items-center justify-center border border-blue-200 dark:border-indigo-500/40">
                      #{sheet.itemIndex}
                    </span>
                    <h3 className="text-base font-bold text-[#1d1d1f] dark:text-white">{sheet.cabinetModelName}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    Cor: {sheet.colorName}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Chassi e Dimensões */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-black/10 dark:border-slate-800/60 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#0071e3] dark:text-indigo-400" />
                      Dimensões Externas do Gabinete:
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      Altura: <strong>{sheet.dimensionsMm.heightMm} mm</strong> | Largura: <strong>{sheet.dimensionsMm.widthMm} mm</strong> | Profundidade: <strong>{sheet.dimensionsMm.depthMm} mm</strong>
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Acabamento: {sheet.finishType}
                    </p>
                  </div>

                  {/* Recorte do Monitor */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-black/10 dark:border-slate-800/60 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      Recorte da Tela / Berço do Monitor:
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{sheet.screenSpecs.monitorName}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      Rasgo: {sheet.screenSpecs.screenCutoutMm}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      Fixação: {sheet.screenSpecs.vesaPattern}
                    </p>
                  </div>

                  {/* Recorte da Impressora */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-black/10 dark:border-slate-800/60 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      Abertura da Impressora Térmica:
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{sheet.printerSpecs.printerName}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      Saída: {sheet.printerSpecs.slotOpeningMm}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      Capacidade: {sheet.printerSpecs.rollSize}
                    </p>
                  </div>

                  {/* Scanner & Fechamento */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-black/10 dark:border-slate-800/60 space-y-1.5">
                    <div className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Leitor Óptico & Segurança:
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{sheet.scannerSpecs.scannerName}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {sheet.scannerSpecs.windowSpecs}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {sheet.securityLock}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 font-mono flex items-center justify-between">
                  <span>Ventilação: {sheet.ventilationSpecs}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Homologado CNC</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // TELA 2: AGUARDANDO PAGAMENTO PIX
  // ----------------------------------------------------
  if (step === "awaiting_pix" && orderDetails) {
    // QR Code autêntico gerado pelo Gateway Pix (Data URL ou fallback)
    const qrCodeUrl =
      orderDetails.payment.qrCodeUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(
        orderDetails.payment.pixCode
      )}`;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-in fade-in-50 duration-500">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep("form")}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Voltar e alterar dados
        </Button>

        <Card className="p-6 md:p-8 border-black/10 dark:border-indigo-500/30 bg-white dark:bg-slate-900/90 backdrop-blur-xl space-y-6 text-center shadow-md dark:shadow-xl">
          {/* Header do Pix */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              Aguardando Pagamento Pix — Expira em: {formatTimer(timeLeftSeconds)}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">
              Pague com Pix para Iniciar a Fabricação
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Pedido <strong className="text-[#0071e3] dark:text-indigo-400 font-mono">{orderDetails.orderNumber}</strong> • Escaneie o QR Code abaixo no app do seu banco ou utilize o código Copia e Cola.
            </p>
          </div>

          {/* Valor em Destaque */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
              Valor Total do Pix
            </span>
            <span className="text-3xl sm:text-4xl font-black text-[#0071e3] dark:text-indigo-400 mt-1">
              {formatBRL(orderDetails.totalCents)}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              Beneficiário: TOTEM PRO ENGENHARIA CNC (X-Point)
            </span>
          </div>

          {/* QR Code Gráfico */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-white rounded-2xl shadow-xl shadow-blue-900/10 dark:shadow-indigo-950/50 border-4 border-slate-200 dark:border-slate-800 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR Code Pix"
                width={220}
                height={220}
                className="w-48 h-48 sm:w-56 sm:h-56 block object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>Detecção em Tempo Real Ativa (compensação sem refresh)</span>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Aponte a câmera do seu aplicativo bancário
            </span>
          </div>

          {/* Pix Copia e Cola */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Código Pix Copia e Cola
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={orderDetails.payment.pixCode}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-black/15 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-400 select-all focus:outline-none"
              />
              <Button
                variant={copied ? "primary" : "secondary"}
                onClick={handleCopyPix}
                className="shrink-0 h-10 px-4 font-bold text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5 text-emerald-500 dark:text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5 text-[#0071e3] dark:text-cyan-400" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Bloco de Simulação / Homologação (MVP 0) */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-gradient-to-r dark:from-amber-950/30 dark:to-indigo-950/30 border border-amber-300 dark:border-amber-500/30 text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-white uppercase tracking-wider">
                  Ambiente de Simulação de Pagamento (MVP 0)
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-slate-300 mt-0.5 leading-relaxed">
                  Para validar o fluxo de ponta a ponta sem efetuar cobrança bancária real nesta fase,
                  clique no botão abaixo para simular a liquidação imediata do Pix e gerar a Ficha Técnica de Fabricação para a Router CNC.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleSimulatePaymentConfirmation}
              className="w-full font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
            >
              ⚡ Simular Pagamento Pix Confirmado
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------
  // TELA 1: FORMULÁRIO ENXUTO DE CHECKOUT
  // ----------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToCart}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Voltar ao Carrinho
        </Button>

        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Checkout Seguro SSL & Pix Direto</span>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
          Finalização do Pedido
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Informe seus dados de faturamento e o endereço de entrega para gerarmos a ordem de fabricação.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Dados do Cliente e Endereço */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Tipo de Comprador e Dados */}
          <Card className="p-5 sm:p-6 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl space-y-5 shadow-sm dark:shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-slate-800">
              <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#0071e3] dark:text-indigo-400" />
                1. Dados do Comprador
              </h2>

              {/* Seletor PF / PJ */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-black/10 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPersonType("individual");
                    setDocument("");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    personType === "individual"
                      ? "bg-[#0071e3] dark:bg-indigo-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-slate-200"
                  }`}
                >
                  Pessoa Física
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPersonType("company");
                    setDocument("");
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    personType === "company"
                      ? "bg-[#0071e3] dark:bg-indigo-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-slate-200"
                  }`}
                >
                  Pessoa Jurídica
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {personType === "individual" ? "Nome Completo" : "Razão Social da Empresa"} *
                </label>
                <Input
                  type="text"
                  placeholder={personType === "individual" ? "Ex: João da Silva" : "Ex: X-Point Soluções Tecnológicas Ltda"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    {personType === "individual" ? "CPF" : "CNPJ"} *
                  </label>
                  <Input
                    type="text"
                    placeholder={personType === "individual" ? "000.000.000-00" : "00.000.000/0000-00"}
                    value={document}
                    onChange={(e) =>
                      setDocument(personType === "individual" ? maskCPF(e.target.value) : maskCNPJ(e.target.value))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    WhatsApp para Acompanhamento *
                  </label>
                  <Input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  E-mail Corporativo / Faturamento *
                </label>
                <Input
                  type="email"
                  placeholder="contato@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Card 2: Endereço de Entrega */}
          <Card className="p-5 sm:p-6 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl space-y-5 shadow-sm dark:shadow-xl">
            <div className="pb-3 border-b border-black/10 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                2. Endereço de Entrega da Carga
              </h2>
              {isLoadingCep ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0071e3] text-xs font-semibold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Consultando CEP...</span>
                </span>
              ) : cepSuccess ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Endereço preenchido</span>
                </span>
              ) : null}
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">CEP *</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={handleCepChange}
                      required
                      className={isLoadingCep ? "pr-9 border-[#0071e3] ring-1 ring-[#0071e3]/20" : ""}
                    />
                    {isLoadingCep && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-4 h-4 text-[#0071e3] animate-spin" />
                      </div>
                    )}
                    {!isLoadingCep && cepSuccess && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in zoom-in" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <span className="text-[11px] text-slate-500 mb-2">
                    Preenchimento automático via ViaCEP ao digitar 8 números.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Logradouro / Rua *</label>
                  <Input
                    type="text"
                    placeholder={isLoadingCep ? "Buscando logradouro..." : "Ex: Av. Paulista"}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    required
                    className={isLoadingCep ? "animate-pulse bg-blue-50/30" : ""}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Número *</label>
                  <Input
                    type="text"
                    placeholder="Ex: 1000"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Complemento</label>
                  <Input
                    type="text"
                    placeholder="Sala 402, Bloco B"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bairro *</label>
                  <Input
                    type="text"
                    placeholder={isLoadingCep ? "Buscando bairro..." : "Bela Vista"}
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    required
                    className={isLoadingCep ? "animate-pulse bg-blue-50/30" : ""}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Cidade / UF *</label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={isLoadingCep ? "Buscando cidade..." : "São Paulo"}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className={`flex-1 ${isLoadingCep ? "animate-pulse bg-blue-50/30" : ""}`}
                    />
                    <Input
                      type="text"
                      placeholder="SP"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className="w-14 text-center uppercase"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 3: Opções de Frete e Retirada */}
          <Card className="p-5 sm:p-6 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl space-y-4 shadow-sm dark:shadow-xl">
            <div className="pb-3 border-b border-black/10 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#0071e3] dark:text-indigo-400" />
                3. Modalidade de Envio & Frete
              </h2>
              {isLoadingShipping && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0071e3] text-xs font-semibold animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculando opções oficiais...</span>
                </span>
              )}
            </div>

            {shippingError && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-600/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{shippingError}</span>
              </div>
            )}

            {/* Estado 1: Nenhum CEP digitado ainda */}
            {cep.replace(/\D/g, "").length !== 8 && shippingQuotes.length === 0 && !isLoadingShipping ? (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-dashed border-black/15 dark:border-slate-800 text-center text-xs text-slate-500">
                <Truck className="w-8 h-8 mx-auto mb-2 text-slate-400 stroke-[1.5]" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Informe o CEP de entrega no campo acima
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                  O sistema calculará automaticamente os prazos e taxas oficiais para Correios (SEDEX / PAC com contrato), Transportadora Rodoviária Especial e Retirada Grátis.
                </p>
              </div>
            ) : isLoadingShipping && shippingQuotes.length === 0 ? (
              /* Estado 2: Loading Inicial com Skeletons Dinâmicos */
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0071e3] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1d1d1f]">Calculando Melhores Opções de Envio</span>
                      <span className="text-[10px] font-semibold text-[#0071e3] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                        Auditando ECT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Consultando tabelas dos Correios (SEDEX / PAC) e rotas industriais para o CEP {cep}...
                    </p>
                  </div>
                </div>

                {/* Skeletons animados das opções */}
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-black/10 bg-slate-50/50 space-y-2 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-slate-200" />
                        <div className="h-4 bg-slate-200 rounded w-36" />
                      </div>
                      <div className="h-4 bg-blue-100 rounded w-20" />
                    </div>
                    <div className="h-3 bg-slate-100 rounded w-48 ml-6" />
                  </div>
                ))}
              </div>
            ) : (
              /* Estado 3: Cotações Carregadas com Sucesso */
              <div className="space-y-3">
                {isLoadingShipping && shippingQuotes.length > 0 && (
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-[#0071e3] text-xs font-semibold flex items-center gap-2 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recalculando cotações com base no novo endereço...</span>
                  </div>
                )}

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>Proteção Antifalha Ativa:</strong> Valores calculados e auditados sem estimativas fictícias (Contrato ECT 9912722993 — 99.93% de precisão comprovada).
                  </span>
                </div>

                {shippingQuotes.map((quote) => {
                  const isSelected = selectedShippingId === quote.id;
                  const isAvailable = quote.isAvailable;

                  return (
                    <div
                      key={quote.id}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedShippingId(quote.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all select-none ${
                        !isAvailable
                          ? "opacity-60 bg-slate-50/60 dark:bg-slate-950/40 border-black/10 dark:border-slate-800/60 cursor-not-allowed"
                          : isSelected
                          ? "border-[#0071e3] bg-blue-50/60 dark:bg-blue-950/20 shadow-sm ring-1 ring-[#0071e3] cursor-pointer"
                          : "border-black/10 dark:border-slate-800 hover:border-black/20 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              !isAvailable
                                ? "border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-400"
                                : isSelected
                                ? "border-[#0071e3] bg-[#0071e3] text-white"
                                : "border-black/20 dark:border-slate-600 bg-white dark:bg-slate-800"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-[#1d1d1f] dark:text-white">
                                {quote.name}
                              </span>
                              {quote.badge && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0071e3] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {quote.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              {quote.description}
                            </p>
                            {isAvailable ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>
                                    Prazo estimado: {quote.deliveryDaysMin} a {quote.deliveryDaysMax} dias úteis
                                  </span>
                                </div>
                                {quote.provenance && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                                    <ShieldCheck className="w-3 h-3 shrink-0" />
                                    <span>
                                      Auditado ({quote.provenance.antiFailureChecksum}) • {quote.provenance.source === "correios_live_cws_api" ? "Online Cws" : "Contrato ECT"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                {quote.unavailableReason}
                              </p>
                            )}
                          </div>
                        </div>


                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm sm:text-base font-extrabold ${
                              quote.priceCents === 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isSelected
                                ? "text-[#0071e3] dark:text-indigo-400"
                                : "text-[#1d1d1f] dark:text-white"
                            }`}
                          >
                            {quote.priceCents === 0 ? "Grátis" : formatBRL(quote.priceCents)}
                          </span>
                          <span className="block text-[10px] text-slate-400 uppercase font-mono">
                            {quote.carrier}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna Direita: Resumo do Pedido & Botão de Pagamento */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <Card className="p-6 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-xl space-y-5 shadow-sm dark:shadow-xl">
            <h2 className="text-base font-bold text-[#1d1d1f] dark:text-white pb-3 border-b border-black/10 dark:border-slate-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0071e3] dark:text-indigo-400" />
              Resumo da Compra
            </h2>

            {/* Lista dos Totens do Pedido */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-black/10 dark:border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{item.configuration.model.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.configuration.color.name} • Qtd: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-[#0071e3] dark:text-indigo-300 shrink-0">
                    {formatBRL(item.subtotalCents)}
                  </span>
                </div>
              ))}
            </div>

            {/* Valores Financeiros */}
            <div className="space-y-2 pt-3 border-t border-black/10 dark:border-slate-800 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal dos Gabinetes:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{formatBRL(totalPriceCents)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 items-center">
                <span>Frete / Entrega:</span>
                <span className="font-semibold">
                  {isLoadingShipping ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#0071e3] font-semibold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Calculando...
                    </span>
                  ) : selectedShippingQuote ? (
                    selectedShippingQuote.priceCents === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Grátis (Retirada)</span>
                    ) : (
                      <span className="text-slate-900 dark:text-slate-200">
                        {formatBRL(selectedShippingQuote.priceCents)}{" "}
                        <span className="text-[10px] text-slate-500 font-normal">({selectedShippingQuote.carrier})</span>
                      </span>
                    )
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-[11px]">Informe o CEP</span>
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-black/10 dark:border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#1d1d1f] dark:text-white">Total a Pagar (Pix):</span>
                <span className="text-2xl font-black text-[#0071e3] dark:text-indigo-400">
                  {formatBRL(finalTotalCents)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-black/10 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Garantia de Recálculo Confiável</span>
              </div>
              <p>
                Os preços foram recalculados diretamente pelos nossos servidores conforme especificações de engenharia CNC.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || items.length === 0}
              className="w-full font-bold shadow-blue-500/25 shadow-lg text-sm bg-[#0071e3] hover:bg-[#0077ed]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processando Pedido e Gerando Pix...</span>
                </span>
              ) : (
                <>
                  Gerar Pix & Concluir Pedido
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </>
              )}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
};
