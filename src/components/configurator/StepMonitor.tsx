"use client";

import React, { useState } from "react";
import { MonitorOption } from "@/types/catalog";
import { Card, Badge, Input } from "@/components/ui";
import { Check, Search, Tv, HelpCircle } from "lucide-react";

interface StepMonitorProps {
  monitors: MonitorOption[];
  selectedMonitor: MonitorOption | null;
  onSelectMonitor: (monitor: MonitorOption) => void;
  onRequestCustomization: () => void;
}

export const StepMonitor: React.FC<StepMonitorProps> = ({
  monitors,
  selectedMonitor,
  onSelectMonitor,
  onRequestCustomization,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMonitors = monitors.filter((m) =>
    `${m.brand} ${m.model} ${m.displayName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <div className="flex items-center justify-between">
          <Badge variant="accent" className="text-xs">
            Etapa 03 de 05
          </Badge>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Não altera o preço padrão (+ R$ 0)
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Qual monitor será instalado no Totem?
        </h2>
        <p className="text-sm text-slate-400">
          Essa informação serve para cortarmos a chapa frontal com a furação VESA e a abertura exatas da sua tela.
        </p>
      </div>

      {/* Busca Rápida de Monitores */}
      <div className="relative">
        <Input
          placeholder="Pesquisar por modelo ou fabricante (ex: Elgin, Gertec, 21.5)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
      </div>

      {/* Grid de Monitores Homologados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredMonitors.map((mon) => {
          const isSelected = selectedMonitor?.id === mon.id;
          return (
            <Card
              key={mon.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectMonitor(mon)}
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
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      {mon.brand}
                    </span>
                    {mon.sizeInches && (
                      <span className="text-[11px] text-slate-400 font-medium bg-slate-800 px-2 py-0.2 rounded">
                        {mon.sizeInches}"
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{mon.displayName}</h3>
                  {mon.vesaPattern && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Furação VESA: {mon.vesaPattern} • {mon.technicalCode}
                    </p>
                  )}
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

      {/* Link Discreto para Personalização Especial */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 underline underline-offset-4 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Não encontrou seu monitor? Solicite uma personalização especial
        </button>
      </div>
    </div>
  );
};
