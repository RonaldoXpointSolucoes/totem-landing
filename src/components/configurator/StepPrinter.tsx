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
          <span className="text-[11px] sm:text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Não altera o preço padrão (+ R$ 0)
          </span>
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
          Qual impressora será utilizada?
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
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
              className="p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-600/30 text-indigo-300"
                      : "border-slate-800 bg-slate-950 text-slate-400"
                  }`}
                >
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {printer.brand}
                  </span>
                  <h3 className="text-sm font-semibold text-white">{printer.displayName}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bobina: {printer.paperWidthMm}mm • {printer.technicalCode}
                  </p>
                </div>
              </div>

              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
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
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 underline underline-offset-4 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Utiliza outro modelo de impressora térmica? Solicite personalização
        </button>
      </div>
    </div>
  );
};
