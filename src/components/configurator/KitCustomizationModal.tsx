"use client";

import React, { useState, useEffect } from "react";
import { KitSubItem } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Modal, Button, Badge } from "@/components/ui";
import {
  Boxes,
  Check,
  Tv,
  Printer,
  QrCode,
  Cable,
  PackageCheck,
  RotateCcw,
  Info,
  AlertTriangle,
  Package,
  XCircle,
} from "lucide-react";

interface KitCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: KitSubItem[];
  onSave: (updatedItems: KitSubItem[]) => void;
  onRemoveKit?: () => void;
  cabinetName?: string;
  cabinetBasePixCents?: number;
  cabinetBaseCardCents?: number;
}

export const KitCustomizationModal: React.FC<KitCustomizationModalProps> = ({
  isOpen,
  onClose,
  initialItems,
  onSave,
  onRemoveKit,
  cabinetName = "Gabinete Totem Pro",
  cabinetBasePixCents = 110000,
  cabinetBaseCardCents = 133000,
}) => {
  const [items, setItems] = useState<KitSubItem[]>(initialItems);

  // Sincronizar sempre que abrir com os itens fornecidos
  useEffect(() => {
    if (isOpen) {
      setItems(initialItems.map((item) => ({ ...item })));
    }
  }, [isOpen, initialItems]);

  const handleToggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = (select: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleResetToDefault = () => {
    setItems(initialItems.map((item) => ({ ...item, selected: true })));
  };

  const currentTotalCents = items
    .filter((i) => i.selected)
    .reduce((acc, i) => acc + (i.priceCents || 0), 0);

  const selectedCount = items.filter((i) => i.selected).length;

  const handleConfirm = () => {
    if (selectedCount === 0 && onRemoveKit) {
      onRemoveKit();
      onClose();
      return;
    }
    onSave(items);
    onClose();
  };

  const handleChooseCabinetOnly = () => {
    if (onRemoveKit) {
      onRemoveKit();
    }
    onClose();
  };

  const getItemIcon = (category: string) => {
    switch (category) {
      case "monitor":
        return Tv;
      case "printer":
        return Printer;
      case "reader":
        return QrCode;
      case "accessory":
        return Cable;
      default:
        return Boxes;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "monitor":
        return "Display Touchscreen + PC";
      case "printer":
        return "Impressora Térmica 80mm";
      case "reader":
        return "Leitor 2D / QR Code";
      case "accessory":
        return "Refrigeração & Elétrica";
      default:
        return "Componente";
    }
  };

  const totalPixWithCabinet = cabinetBasePixCents + currentTotalCents;
  const totalCardWithCabinet = cabinetBaseCardCents + currentTotalCents;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl sm:max-w-2xl p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Cabeçalho Didático de Confirmação */}
        <div className="space-y-2 pb-3 border-b border-black/10 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#1d1d1f] dark:text-white tracking-tight leading-snug">
                  Você deseja adicionar o Kit de Montagem junto com o Gabinete?
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Entenda a diferença antes de confirmar para escolher exatamente o que precisa:
                </p>
              </div>
            </div>
            <Badge variant="primary" className="text-[10px] uppercase font-bold tracking-wider">
              Escolha Didática
            </Badge>
          </div>

          {/* Comparativo Visual Direto: Só Gabinete vs Gabinete + Kit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Card Explicativo A: Só o Gabinete */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-black/10 dark:border-slate-800 flex flex-col justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Opção A: Quero SÓ o Gabinete
                  </span>
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                    {formatBRL(cabinetBasePixCents)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  Receba <strong>apenas a estrutura física</strong> do {cabinetName}. A furação CNC para a sua tela e impressora já está inclusa (<strong>+ R$ 0,00</strong>).
                </p>
              </div>
              {onRemoveKit && (
                <button
                  type="button"
                  onClick={handleChooseCabinetOnly}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-black/15 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Quero Apenas o Gabinete (Sem Kit)</span>
                </button>
              )}
            </div>

            {/* Card Explicativo B: Gabinete + Kit */}
            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-indigo-950/40 border-2 border-[#0071e3]/50 dark:border-indigo-500/50 flex flex-col justify-between gap-1.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#0071e3] dark:text-cyan-400 flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 shrink-0" />
                    Opção B: Gabinete + Kit
                  </span>
                  <span className="text-[11px] font-black text-[#0071e3] dark:text-cyan-400">
                    + {formatBRL(currentTotalCents)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                  Receba o <strong>Gabinete + os equipamentos marcados abaixo</strong> (PC All-in-One Touch, Impressora, Coolers, Botão Liga/Desliga, Régua e Cabos).
                </p>
              </div>
              <div className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-300 bg-white/80 dark:bg-slate-900/70 px-2 py-1 rounded-md border border-blue-200/70 dark:border-indigo-800">
                ✓ Você pode marcar ou desmarcar qualquer peça abaixo:
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-semibold">
            Peças adicionais selecionadas: <strong>{selectedCount}</strong> de <strong>{items.length}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[11px] font-bold text-[#0071e3] hover:underline cursor-pointer"
            >
              Marcar Todas
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
            >
              Desmarcar Todas
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Kit Completo
            </button>
          </div>
        </div>

        {/* Lista de Sub-Itens */}
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = getItemIcon(item.category);
            return (
              <div
                key={item.id}
                onClick={() => handleToggleItem(item.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  item.selected
                    ? "bg-blue-50/70 dark:bg-indigo-950/30 border-[#0071e3]/40 shadow-sm"
                    : "bg-white dark:bg-slate-900/60 border-black/10 dark:border-slate-800 opacity-60 hover:opacity-90"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Foto Real do Sub-Item */}
                  <div
                    className={`w-13 h-13 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-slate-950 transition-all ${
                      item.selected
                        ? "border-[#0071e3]/30 shadow-xs"
                        : "border-black/10 dark:border-slate-800 grayscale"
                    }`}
                  >
                    {item.image && item.image !== ".webp" ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain drop-shadow-sm"
                        loading="lazy"
                      />
                    ) : (
                      <Icon className="w-6 h-6 text-[#0071e3]" />
                    )}
                  </div>

                  {/* Informações Textuais */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0071e3] dark:text-cyan-400">
                        {getCategoryLabel(item.category)}
                      </span>
                      {item.selected ? (
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-500/20">
                          ✓ Vai ser enviado junto
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                          Não incluir
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1d1d1f] dark:text-white leading-tight">
                      {item.name}
                    </h4>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Preço e Checkbox */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs sm:text-sm font-black transition-colors ${
                        item.selected
                          ? "text-[#0071e3] dark:text-cyan-400"
                          : "text-slate-400 line-through"
                      }`}
                    >
                      + {formatBRL(item.priceCents)}
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      {item.selected ? "adicional ao gabinete" : "removido"}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      item.selected
                        ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                        : "border-black/20 dark:border-slate-700 bg-black/5 dark:bg-slate-800"
                    }`}
                  >
                    {item.selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo Didático da Soma (Gabinete + Peças Selecionadas do Kit) */}
        {selectedCount === 0 ? (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong>Nenhuma peça do Kit está marcada (+ R$ 0,00).</strong>
              <p className="text-[11px] mt-0.5 text-amber-800 dark:text-amber-300">
                Ao clicar em confirmar abaixo, seu pedido ficará configurado <strong>apenas com o {cabinetName} ({formatBRL(cabinetBasePixCents)} no PIX)</strong>, sem peças eletrônicas extras.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-black/10 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>1. Estrutura Física ({cabinetName}):</span>
              <strong className="text-slate-900 dark:text-white">{formatBRL(cabinetBasePixCents)} (no PIX)</strong>
            </div>
            <div className="flex items-center justify-between text-[#0071e3] dark:text-cyan-400">
              <span>2. + Peças do Kit marcadas acima ({selectedCount} {selectedCount === 1 ? "item" : "itens"}):</span>
              <strong>+ {formatBRL(currentTotalCents)}</strong>
            </div>
            <div className="pt-1.5 border-t border-black/10 dark:border-slate-800 flex items-center justify-between">
              <span className="font-extrabold text-[#1d1d1f] dark:text-white">
                Valor Final (Gabinete + Peças Selecionadas):
              </span>
              <div className="text-right">
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatBRL(totalPixWithCabinet)} no PIX
                </span>
                <span className="block text-[10px] text-slate-500">
                  ou {formatBRL(totalCardWithCabinet)} em até 10x no cartão
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé Fixo do Modal com Botões Claros */}
        <div className="pt-2 border-t border-black/10 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {onRemoveKit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleChooseCabinetOnly}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <XCircle className="w-4 h-4 mr-1.5 shrink-0" />
              Não quero o Kit (Comprar só o Gabinete)
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              Cancelar
            </Button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            className="text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25"
          >
            <PackageCheck className="w-4 h-4 mr-1.5 shrink-0" />
            {selectedCount === 0
              ? `Seguir Apenas com o Gabinete (${formatBRL(cabinetBasePixCents)})`
              : `Sim! Quero Gabinete + Kit (+ ${formatBRL(currentTotalCents)})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
