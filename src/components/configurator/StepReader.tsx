"use client";

import React from "react";
import { BarcodeReaderOption } from "@/types/catalog";
import { Card, Badge } from "@/components/ui";
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
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <div className="flex items-center justify-between">
          <Badge variant="accent" className="text-xs">
            Etapa 05 de 05
          </Badge>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Não altera o preço padrão (+ R$ 0)
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Seu Totem utilizará leitor de código de barras?
        </h2>
        <p className="text-sm text-slate-400">
          Determine se o gabinete deve receber a janela frontal angular para embutir o leitor 2D de tickets e QR Code.
        </p>
      </div>

      {/* Opção Binária Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          interactive
          selected={!useReader}
          onClick={() => onToggleUseReader(false)}
          className="p-5 flex items-center gap-3.5"
        >
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              !useReader
                ? "border-indigo-500 bg-indigo-600/30 text-indigo-300"
                : "border-slate-800 bg-slate-950 text-slate-400"
            }`}
          >
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Não utilizarei leitor</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gabinete liso sem recorte frontal para leitor.
            </p>
          </div>
        </Card>

        <Card
          interactive
          selected={useReader}
          onClick={() => onToggleUseReader(true)}
          className="p-5 flex items-center gap-3.5"
        >
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
              useReader
                ? "border-indigo-500 bg-indigo-600/30 text-indigo-300"
                : "border-slate-800 bg-slate-950 text-slate-400"
            }`}
          >
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sim, incluirei leitor de código de barras</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Preparação física angular para leitor 1D/2D e QR Code.
            </p>
          </div>
        </Card>
      </div>

      {/* Lista de Leitores Homologados (se useReader === true) */}
      {useReader && (
        <div className="pt-2 space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Selecione o modelo do seu leitor:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {readers.map((reader) => {
              const isSelected = selectedReader?.id === reader.id;
              return (
                <Card
                  key={reader.id}
                  interactive
                  selected={isSelected}
                  onClick={() => onSelectReader(reader)}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-600/30 text-indigo-300"
                          : "border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-indigo-400 uppercase">
                        {reader.brand}
                      </span>
                      <h4 className="text-xs font-semibold text-white">{reader.displayName}</h4>
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
        </div>
      )}

      {/* Link de Customização Especial */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 underline underline-offset-4 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Precisa de suporte para outro leitor óptico? Solicite personalização
        </button>
      </div>
    </div>
  );
};
