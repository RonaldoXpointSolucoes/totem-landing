"use client";

import React, { useState, useEffect } from "react";
import { KitSubItem } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Modal, Button, Badge } from "@/components/ui";
import {
  Boxes,
  Check,
  CheckCircle2,
  Tv,
  Printer,
  QrCode,
  Cable,
  PackageCheck,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";

interface KitCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: KitSubItem[];
  onSave: (updatedItems: KitSubItem[]) => void;
}

export const KitCustomizationModal: React.FC<KitCustomizationModalProps> = ({
  isOpen,
  onClose,
  initialItems,
  onSave,
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
    onSave(items);
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
        return "Display Touchscreen";
      case "printer":
        return "Impressora Térmica";
      case "reader":
        return "Leitor 2D / QR Code";
      case "accessory":
        return "Conexões & Elétrica";
      default:
        return "Componente";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl sm:max-w-2xl p-4 sm:p-6"
    >
      <div className="space-y-4">
        {/* Cabeçalho Customizado */}
        <div className="space-y-1.5 pb-3 border-b border-black/10 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Boxes className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-[#1d1d1f] dark:text-white tracking-tight">
                Personalizar Sub-Itens do Kit de Montagem
              </h3>
            </div>
            <Badge variant="primary" className="text-[10px] uppercase font-bold tracking-wider">
              Combo Hardware
            </Badge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Adicione ou remova componentes do seu kit de instalação industrial. Cada alteração recalcula dinamicamente o valor total em tempo real.
          </p>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            <strong>{selectedCount}</strong> de <strong>{items.length}</strong> itens inclusos no kit
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[11px] font-bold text-[#0071e3] hover:underline cursor-pointer"
            >
              Marcar Todos
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Padrão
            </button>
          </div>
        </div>

        {/* Lista de Sub-Itens */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
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
                    className={`w-14 h-14 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden bg-white dark:bg-slate-950 transition-all ${
                      item.selected
                        ? "border-[#0071e3]/30 shadow-xs"
                        : "border-black/10 dark:border-slate-800 grayscale"
                    }`}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain drop-shadow-sm"
                        loading="lazy"
                      />
                    ) : (
                      <Icon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  {/* Informações Textuais */}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0071e3] dark:text-cyan-400">
                        {getCategoryLabel(item.category)}
                      </span>
                      {item.selected && (
                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-500/20">
                          Incluso
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
                      {formatBRL(item.priceCents)}
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      {item.selected ? "somando no kit" : "removido"}
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

        {/* Alerta de Compatibilidade & Homologação CNC */}
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <span>
            Ao selecionar o <strong>Kit de Montagem</strong>, as etapas de <em>Impressora</em> e <em>Leitor</em> serão preenchidas automaticamente e avançadas direto para a Revisão com furações CNC 100% calibradas.
          </span>
        </div>

        {/* Rodapé Fixo do Modal com Totalizador e Botões */}
        <div className="pt-3 border-t border-black/10 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Total do Kit:
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#0071e3] dark:text-cyan-400">
              {formatBRL(currentTotalCents)}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/25"
            >
              <PackageCheck className="w-4 h-4 mr-1.5" />
              Confirmar e Aplicar Kit
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
