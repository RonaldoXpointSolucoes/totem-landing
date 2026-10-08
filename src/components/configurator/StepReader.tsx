"use client";

import React from "react";
import { BarcodeReaderOption } from "@/types/catalog";
import { Card } from "@/components/ui";
import { Check, QrCode, Ban, HelpCircle } from "lucide-react";

interface StepReaderProps {
  readers: BarcodeReaderOption[];
  useReader: boolean;
  selectedReader: BarcodeReaderOption | null;
  onToggleUseReader: (use: boolean) => void;
  onSelectReader: (reader: BarcodeReaderOption) => void;
  onRequestCustomization: () => void;
}

export const StepReader: React.FC<StepReaderProps> = ({
  readers,
  useReader,
  selectedReader,
  onToggleUseReader,
  onSelectReader,
  onRequestCustomization,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Seu Totem utilizará leitor de código de barras?
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Janela Angular Homologada (+ R$ 0)
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Usinamos o suporte e o visor frontal inclinado para leitura de QR Code e tickets.
        </p>
      </div>

      {/* Opção Binária Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Card
          interactive
          selected={!useReader}
          onClick={() => onToggleUseReader(false)}
          className="p-3 sm:p-3.5 rounded-xl flex items-center gap-3"
        >
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
              !useReader
                ? "border-[#0071e3] bg-blue-50 dark:bg-indigo-600/30 text-[#0071e3] dark:text-indigo-300"
                : "border-black/10 dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-950 text-slate-500 dark:text-slate-400"
            }`}
          >
            <Ban className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white">Não utilizarei leitor</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Gabinete liso sem recorte frontal.
            </p>
          </div>
        </Card>

        <Card
          interactive
          selected={useReader}
          onClick={() => onToggleUseReader(true)}
          className="p-3 sm:p-3.5 rounded-xl flex items-center gap-3"
        >
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
              useReader
                ? "border-[#0071e3] bg-blue-50 dark:bg-indigo-600/30 text-[#0071e3] dark:text-indigo-300"
                : "border-black/10 dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-950 text-slate-500 dark:text-slate-400"
            }`}
          >
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white">Sim, incluirei leitor óptico</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Janela angular para leitor 1D/2D e QR Code.
            </p>
          </div>
        </Card>
      </div>

      {/* Lista de Leitores Homologados (se useReader === true) */}
      {useReader && (
        <div className="pt-1 space-y-2">
          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Selecione o modelo do leitor:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
            {readers.map((reader) => {
              const isSelected = selectedReader?.id === reader.id;
              return (
                <Card
                  key={reader.id}
                  interactive
                  selected={isSelected}
                  onClick={() => onSelectReader(reader)}
                  className="p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl border p-1 flex items-center justify-center shrink-0 overflow-hidden transition-all ${
                        isSelected
                          ? "border-[#0071e3] bg-white dark:bg-slate-900 shadow-sm ring-2 ring-[#0071e3]/30"
                          : "border-black/10 dark:border-slate-800 bg-white dark:bg-slate-950"
                      }`}
                    >
                      {reader.image ? (
                        <img
                          src={reader.image}
                          alt={reader.displayName}
                          className="w-full h-full object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <QrCode className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-[#0071e3] dark:text-cyan-400 uppercase">
                        {reader.brand}
                      </span>
                      <h4 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{reader.displayName}</h4>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-[#0071e3] bg-[#0071e3] text-white shadow-sm"
                        : "border-black/15 dark:border-slate-700 bg-black/5 dark:bg-slate-800"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Link de Customização Especial */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#0071e3] dark:text-slate-400 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" />
          Utiliza outro leitor óptico? Solicite janela sob medida
        </button>
      </div>
    </div>
  );
};
