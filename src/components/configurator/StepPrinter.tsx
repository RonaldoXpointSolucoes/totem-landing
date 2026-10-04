"use client";

import React from "react";
import { PrinterOption } from "@/types/catalog";
import { Card, Badge } from "@/components/ui";
import { Check, Printer, HelpCircle } from "lucide-react";

interface StepPrinterProps {
  printers: PrinterOption[];
  selectedPrinter: PrinterOption | null;
  onSelectPrinter: (printer: PrinterOption) => void;
  onRequestCustomization: () => void;
}

export const StepPrinter: React.FC<StepPrinterProps> = ({
  printers,
  selectedPrinter,
  onSelectPrinter,
  onRequestCustomization,
}) => {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="accent" className="text-xs">
            Etapa 04 de 06
          </Badge>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Não altera o preço padrão (+ R$ 0)
          </span>
        </div>
        <h2 className="text-xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Qual impressora será utilizada?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          O gabinete será usinado com o rasgo de saída de papel e o berço interno específico para sua impressora.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {printers.map((printer) => {
          const isSelected = selectedPrinter?.id === printer.id;
          return (
            <Card
              key={printer.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectPrinter(printer)}
              className="p-4 sm:p-4.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "border-[#0071e3] bg-blue-50 dark:bg-indigo-600/30 text-[#0071e3] dark:text-indigo-300"
                      : "border-black/10 dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-950 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Printer className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                    {printer.brand}
                  </span>
                  <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white truncate mt-0.5">{printer.displayName}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Bobina: {printer.paperWidthMm}mm • {printer.technicalCode}
                  </p>
                </div>
              </div>

              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "border-[#0071e3] bg-[#0071e3] text-white shadow-md shadow-blue-500/25"
                    : "border-black/15 dark:border-slate-700 bg-black/5 dark:bg-slate-800"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Link de Customização Especial */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0071e3] dark:text-slate-400 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Utiliza outro modelo de impressora térmica? Solicite personalização
        </button>
      </div>
    </div>
  );
};
