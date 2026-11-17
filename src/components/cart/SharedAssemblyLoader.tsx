"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/modules/cart/CartContext";
import { HydratedSharedCartPayload } from "@/types/sharedCart";
import { formatBRL, calculateTotemPrice } from "@/modules/pricing/pricingEngine";
import { resolveKitEquipmentSummary } from "@/modules/catalog/kitDefaults";
import { Card, Button, Badge } from "@/components/ui";
import {
  Loader2,
  Share2,
  ShoppingCart,
  ArrowRight,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  Tag,
  CheckCircle2,
  Package,
  Zap,
} from "lucide-react";

interface SharedAssemblyLoaderProps {
  code: string;
  initialAssembly: HydratedSharedCartPayload | null;
  initialCheckedOnServer?: boolean;
}

export const SharedAssemblyLoader: React.FC<SharedAssemblyLoaderProps> = ({
  code,
  initialAssembly,
  initialCheckedOnServer = false,
}) => {
  const router = useRouter();
  const {
    items,
    totalItems,
    finalTotalPriceCents,
    isInitialized,
    activeSharedAssembly,
    replaceCartFromSharedAssembly,
    mergeCartFromSharedAssembly,
  } = useCart();

  const [assembly, setAssembly] = useState<HydratedSharedCartPayload | null>(initialAssembly);
  const [isFetching, setIsFetching] = useState<boolean>(!initialAssembly && !initialCheckedOnServer);
  const [notFoundError, setNotFoundError] = useState<string | null>(
    !initialAssembly && initialCheckedOnServer
      ? "Esta montagem compartilhada não foi encontrada ou expirou."
      : null
  );
  const [phase, setPhase] = useState<"checking" | "conflict" | "redirecting" | "not_found">(
    !initialAssembly && initialCheckedOnServer ? "not_found" : "checking"
  );

  const decisionMadeRef = useRef(false);

  // Caso não tenha vindo verificado pelo SSR, tenta carregar pela API pública
  useEffect(() => {
    if (initialAssembly || initialCheckedOnServer) return;
    let cancelled = false;
    setIsFetching(true);

    fetch(`/api/carts/share/${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.ok && json.assembly) {
          setAssembly(json.assembly);
          setNotFoundError(null);
        } else {
          setNotFoundError(json.error || "Esta montagem compartilhada não foi encontrada.");
          setPhase("not_found");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFoundError("Não foi possível carregar a montagem compartilhada.");
          setPhase("not_found");
        }
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code, initialAssembly]);

  // Decide fluxo automático vs pergunta de conflito assim que o CartContext terminar a hidratação
  useEffect(() => {
    if (isFetching || !isInitialized || decisionMadeRef.current) return;
    if (!assembly || assembly.items.length === 0) {
      setPhase("not_found");
      return;
    }

    const alreadySameAssembly =
      items.length > 0 && activeSharedAssembly?.shareCode === assembly.shareCode;

    if (items.length === 0 || alreadySameAssembly) {
      decisionMadeRef.current = true;
      setPhase("redirecting");
      if (items.length === 0) {
        replaceCartFromSharedAssembly(assembly.items, assembly.coupon, {
          shareCode: assembly.shareCode,
          title: assembly.title || undefined,
          loadedAt: new Date().toISOString(),
          unavailableWarnings: assembly.unavailableWarnings,
        });
      }
      router.replace(`/checkout?montagem=${encodeURIComponent(assembly.shareCode)}`);
      return;
    }

    // Visitante já possui outros itens no navegador: pergunta explicitamente
    setPhase("conflict");
  }, [
    isFetching,
    isInitialized,
    assembly,
    items.length,
    activeSharedAssembly?.shareCode,
    replaceCartFromSharedAssembly,
    router,
  ]);

  const currentCartPixTotal = useMemo(() => {
    if (finalTotalPriceCents > 0) return finalTotalPriceCents;
    return items.reduce((acc, it) => {
      const p = calculateTotemPrice({
        cabinet: it.configuration.model,
        color: it.configuration.color,
        monitor: it.configuration.monitor,
        printer: it.configuration.printer,
        barcodeReader: it.configuration.barcodeReader,
        includeAssemblyService: it.configuration.includeAssemblyService,
      });
      return acc + p.pixTotalPriceCents * Math.max(1, it.quantity);
    }, 0);
  }, [finalTotalPriceCents, items]);

  const handleDecision = (decision: "replace" | "merge") => {
    if (!assembly) return;
    decisionMadeRef.current = true;
    setPhase("redirecting");

    const meta = {
      shareCode: assembly.shareCode,
      title: assembly.title || undefined,
      loadedAt: new Date().toISOString(),
      unavailableWarnings: assembly.unavailableWarnings,
    };

    if (decision === "replace") {
      replaceCartFromSharedAssembly(assembly.items, assembly.coupon, meta);
    } else {
      mergeCartFromSharedAssembly(assembly.items, assembly.coupon, meta);
    }

    router.replace(`/checkout?montagem=${encodeURIComponent(assembly.shareCode)}`);
  };

  if (phase === "not_found") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <Badge variant="warning" className="text-xs">
            Link Indisponível
          </Badge>
          <h1 className="text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Montagem não encontrada
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {notFoundError ||
              "O código desta montagem pode estar incorreto ou os equipamentos selecionados saíram do catálogo."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-2">
          <Link href="/monte-seu-totem">
            <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold">
              Montar Novo Totem <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (phase !== "conflict" || !assembly) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#0071e3]/10 border border-[#0071e3]/25 text-[#0071e3] dark:text-cyan-400 mx-auto flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            {phase === "redirecting"
              ? "Montagem pronta! Abrindo Checkout..."
              : "Carregando montagem configurada..."}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Validando equipamentos e preços atualizados para o código{" "}
            <strong className="font-mono text-[#0071e3] dark:text-cyan-400">{code}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Tela Mobile-First de Conflito Explícito: Substituir vs Somar
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <Badge variant="accent" className="text-xs inline-flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          <span>Montagem Compartilhada • {assembly.shareCode}</span>
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          {assembly.title ? assembly.title : "Você já possui itens no seu carrinho"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Encontramos{" "}
          <strong>
            {totalItems} {totalItems === 1 ? "totem salvo" : "totens salvos"}
          </strong>{" "}
          neste navegador. Como deseja continuar com esta montagem compartilhada?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bloco A: Seu Carrinho Atual */}
        <Card className="p-4 sm:p-5 border-black/10 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/10 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-slate-400" />
              <span>Seu Carrinho Atual</span>
            </span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              {formatBRL(currentCartPixTotal)} PIX
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {items.map((it, idx) => (
              <div
                key={it.id || idx}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-black/5 dark:border-slate-800 text-xs"
              >
                <p className="font-bold text-[#1d1d1f] dark:text-white">
                  {it.quantity}x {it.configuration.model.name} ({it.configuration.color.name})
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatBRL(it.subtotalCents)} no PIX
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Bloco B: Montagem Recebida no Link */}
        <Card className="p-4 sm:p-5 border-[#0071e3]/40 bg-blue-50/40 dark:bg-indigo-950/25 space-y-3 shadow-md shadow-blue-500/5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#0071e3]/15 dark:border-indigo-800/60">
            <span className="text-xs font-black uppercase tracking-wider text-[#0071e3] dark:text-cyan-300 flex items-center gap-1.5">
              <Package className="w-4 h-4 shrink-0" />
              <span>Montagem do Link ({assembly.itemsCount} un.)</span>
            </span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-emerald-500" />
              {formatBRL(assembly.pixTotalCents)} PIX
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {assembly.items.map((it, idx) => {
              const eq = resolveKitEquipmentSummary({
                monitor: it.configuration.monitor,
                printerName: it.configuration.printer?.displayName,
                readerName: it.configuration.barcodeReader?.displayName,
              });
              return (
                <div
                  key={it.id || idx}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#0071e3]/20 dark:border-indigo-800/50 text-xs space-y-0.5"
                >
                  <p className="font-bold text-[#1d1d1f] dark:text-white">
                    {it.quantity}x {it.configuration.model.name} ({it.configuration.color.name})
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {eq.isKit
                      ? `Kit (${eq.selectedCount}/${eq.totalCount} itens)`
                      : "Só Gabinete CNC"}{" "}
                    • {eq.monitorDisplay}
                  </p>
                </div>
              );
            })}
          </div>

          {assembly.coupon && (
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>
                Inclui cupom {assembly.coupon.code} ({assembly.coupon.discountPercent}% OFF no gabinete)
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Botões de Ação */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => handleDecision("replace")}
            className="w-full font-bold bg-[#0071e3] hover:bg-[#0077ed] shadow-lg shadow-blue-500/20 text-xs sm:text-sm py-3.5 h-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2 shrink-0" />
            <span>Substituir meu carrinho por esta montagem</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => handleDecision("merge")}
            className="w-full font-bold border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm py-3.5 h-auto"
          >
            <PlusCircle className="w-4 h-4 mr-2 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Somar esta montagem ao meu carrinho</span>
          </Button>
        </div>

        <div className="text-center">
          <Link
            href="/carrinho"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white underline py-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Manter apenas meu carrinho atual</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
