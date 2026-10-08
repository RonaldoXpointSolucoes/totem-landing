"use client";

import React from "react";
import { PrinterOption } from "@/types/catalog";
import { Card } from "@/components/ui";
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
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Qual impressora será utilizada?
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Berço CNC Homologado (+ R$ 0)
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Usinamos o rasgo de saída de papel e o suporte interno na medida da sua impressora.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] lg:max-h-[250px] overflow-y-auto pr-1">
        {printers.map((printer) => {
          const isSelected = selectedPrinter?.id === printer.id;
          return (
            <Card
              key={printer.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectPrinter(printer)}
              className="p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5"
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
                  <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                    {printer.brand}
                  </span>
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
