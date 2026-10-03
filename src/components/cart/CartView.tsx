"use client";

import React from "react";
import { useCart } from "@/modules/cart/CartContext";
import { formatBRL } from "@/modules/pricing/pricingEngine";
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
} from "lucide-react";

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
  const { items, duplicateItem, removeItem, updateQuantity, totalPriceCents, totalItems } =
    useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-slate-900/80 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center shadow-xl">
          <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Seu carrinho está vazio</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Você ainda não configurou nenhum Totem. Comece escolhendo o modelo ideal para seu negócio.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={onContinueShopping}
          className="shadow-indigo-600/30 shadow-xl"
        >
          Montar meu Primeiro Totem <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Cabeçalho do Carrinho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Badge variant="accent" className="text-xs mb-1.5">
            Carrinho de Compras Multicomponentes
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Seus Totens Configurados ({totalItems} {totalItems === 1 ? "unidade" : "unidades"})
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onContinueShopping}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Configurar Outro Totem
        </Button>
      </div>

      {/* Grid: Lista de Itens + Resumo do Pedido */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Lista de Totens */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item, index) => {
            const { configuration, quantity, unitPriceCents, subtotalCents, id } = item;
            const { model, color, monitor, printer, barcodeReader } = configuration;

            return (
              <Card
                key={id}
                className="p-5 border-slate-800 bg-slate-900/70 backdrop-blur-xl flex flex-col sm:flex-row gap-5"
              >
                {/* Imagem do Gabinete */}
                <div className="relative aspect-[3/4] w-24 sm:w-28 rounded-xl bg-slate-950/80 border border-slate-800 p-2 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                  <img
                    src={model.mainImage}
                    alt={model.name}
                    className="h-full w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  />
                  <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center border border-slate-700">
                    {index + 1}
                  </span>
                </div>

                {/* Detalhes Técnicos do Item */}
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <h3 className="text-base font-bold text-white">{model.name}</h3>
                      <span className="text-base font-extrabold text-indigo-400">
                        {formatBRL(subtotalCents)}
                      </span>
                    </div>

                    {/* Especificação dos Componentes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-600 shrink-0"
                          style={{ background: color.hexReference }}
                        />
                        <span className="truncate">Cor: <strong className="text-slate-200">{color.name}</strong></span>
                      </div>
                      <div className="truncate">
                        Tela: <strong className="text-slate-200">{monitor?.displayName || "Nenhum"}</strong>
                      </div>
                      <div className="truncate">
                        Impressora: <strong className="text-slate-200">{printer?.displayName || "Nenhuma"}</strong>
                      </div>
                      <div className="truncate">
                        Leitor: <strong className="text-slate-200">{barcodeReader ? barcodeReader.displayName : "Sem leitor"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Barra Inferior do Card: Quantidade e Ações */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                    {/* Seletor de Quantidade (+/-) */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 mr-1">Qtd:</span>
                      <div className="flex items-center border border-slate-700/80 rounded-lg bg-slate-950">
                        <button
                          onClick={() => updateQuantity(id, quantity - 1)}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-white select-none">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(id, quantity + 1)}
                          className="p-1.5 text-slate-400 hover:text-white transition-colors"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        ({formatBRL(unitPriceCents)} un.)
                      </span>
                    </div>

                    {/* Ações: Duplicar, Editar, Excluir */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => duplicateItem(id)}
                        title="Duplicar configuração para compra em lote"
                        className="h-8 px-2.5 text-xs text-slate-300"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                        Duplicar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditItem(id)}
                        title="Editar configurações deste totem"
                        className="h-8 px-2.5 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                        Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(id)}
                        title="Remover do carrinho"
                        className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
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
          <Card className="p-6 border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-6">
            <h2 className="text-base font-bold text-white pb-3 border-b border-slate-800">
              Resumo do Pedido
            </h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Total de Totens:</span>
                <span className="font-semibold text-slate-200">
                  {totalItems} {totalItems === 1 ? "unidade" : "unidades"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Subtotal dos Gabinetes:</span>
                <span className="font-semibold text-slate-200">
                  {formatBRL(totalPriceCents)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Frete Especial (Transportadora):</span>
                <span className="text-emerald-400 font-semibold">Calculado no Checkout</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white">Total Estimado:</span>
                <span className="text-2xl font-black text-indigo-400">
                  {formatBRL(totalPriceCents)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Garantia de Encaixe e Furação</span>
              </div>
              <p>
                Cada gabinete é inspecionado e usinado rigorosamente conforme os equipamentos declarados.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={onProceedToCheckout}
              className="w-full font-bold shadow-indigo-600/30 shadow-lg"
            >
              Avançar para o Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
