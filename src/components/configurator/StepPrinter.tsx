"use client";

import React from "react";
import { PrinterOption } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card } from "@/components/ui";
import { Check, Printer, HelpCircle, Boxes } from "lucide-react";

interface StepPrinterProps {
  printers: PrinterOption[];
  selectedPrinter: PrinterOption | null;
  onSelectPrinter: (printer: PrinterOption) => void;
  onRequestCustomization: () => void;
  isKitWithoutPrinter?: boolean;
  cabinetName?: string;
}

export const StepPrinter: React.FC<StepPrinterProps> = ({
  printers,
  selectedPrinter,
  onSelectPrinter,
  onRequestCustomization,
  isKitWithoutPrinter = false,
  cabinetName = "Gabinete Totem Pro",
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left space-y-1">
        {isKitWithoutPrinter && (
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
              <Printer className="w-3 h-3" />
              Passo Obrigatório • Kit Sem Impressora
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-indigo-950/60 text-[#0071e3] dark:text-cyan-300 border border-blue-200 dark:border-indigo-800 text-[10px] font-bold">
              <Boxes className="w-3 h-3" />
              Kit Parcial Ativo
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            {isKitWithoutPrinter
              ? `Qual é a impressora que você vai usar no seu ${cabinetName}?`
              : "Qual impressora será utilizada?"}
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            {!isKitWithoutPrinter && selectedPrinter && (selectedPrinter.priceAdjustmentCents || 0) > 0
              ? `Item Cobrado (+ ${formatBRL(selectedPrinter.priceAdjustmentCents || 0)})`
              : "Berço CNC Homologado (+ R$ 0,00)"}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {isKitWithoutPrinter ? (
            <>
              Como você desabilitou a impressora dentro do <strong>Kit de Montagem</strong>, informe abaixo qual será a <u>sua impressora térmica</u> para fazermos o berço e o recorte de saída de papel exato no gabinete (<strong className="text-emerald-600 dark:text-emerald-400">+ R$ 0,00</strong>):
            </>
          ) : (
            "Usinamos o rasgo de saída de papel e o suporte interno na medida da sua impressora."
          )}
        </p>
      </div>

      {!selectedPrinter && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs animate-in fade-in duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-bold">
            {isKitWithoutPrinter
              ? "Seleção obrigatória: escolha abaixo qual é a impressora que você vai usar com o gabinete (+ R$ 0,00)."
              : "Selecione abaixo o modelo da sua impressora térmica para avançar."}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {printers.map((printer) => {
          const isSelected = selectedPrinter?.id === printer.id;
          return (
            <Card
              key={printer.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectPrinter(printer)}
              className="p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden transition-all ${
                    isSelected
                      ? "border-[#0071e3] bg-white dark:bg-slate-900 shadow-sm ring-2 ring-[#0071e3]/30"
                      : "border-black/10 dark:border-slate-800 bg-white dark:bg-slate-950"
                  }`}
                >
                  {printer.image ? (
                    <img
                      src={printer.image}
                      alt={printer.displayName}
                      className="w-full h-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <Printer className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                      {printer.brand}
                    </span>
                    {(printer.priceAdjustmentCents || 0) > 0 && (
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                        + {formatBRL(printer.priceAdjustmentCents || 0)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{printer.displayName}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    Bobina: {printer.paperWidthMm}mm • {printer.technicalCode}
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                    : "border-black/15 dark:border-slate-700 bg-black/5 dark:bg-slate-800"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Link de Customização Especial */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#0071e3] dark:text-slate-400 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" />
          Utiliza outro modelo de impressora térmica? Solicite berço sob medida
        </button>
      </div>
    </div>
  );
};
