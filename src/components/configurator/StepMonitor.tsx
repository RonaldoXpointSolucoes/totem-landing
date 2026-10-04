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
    <div className="space-y-5 sm:space-y-6">
      <div className="text-center sm:text-left space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="accent" className="text-xs">
            Etapa 03 de 06
          </Badge>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Não altera o preço padrão (+ R$ 0)
          </span>
        </div>
        <h2 className="text-xl sm:text-3xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Qual monitor será instalado no Totem?
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Essa informação serve para cortarmos a chapa frontal com a furação VESA e a abertura exatas da sua tela.
        </p>
      </div>

      {/* Busca Rápida de Monitores com altura ergonômica */}
      <div className="relative">
        <Input
          placeholder="Pesquisar por modelo ou fabricante (ex: Elgin, Gertec, 21.5)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12 text-sm rounded-2xl bg-white dark:bg-slate-900/80 border-black/15 dark:border-slate-800 text-[#1d1d1f] dark:text-white placeholder:text-slate-400 shadow-sm"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4 pointer-events-none" />
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
                  <Tv className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                      {mon.brand}
                    </span>
                    {mon.sizeInches && (
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold bg-black/5 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {mon.sizeInches}"
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#1d1d1f] dark:text-white truncate mt-0.5">{mon.displayName}</h3>
                  {mon.vesaPattern && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      VESA: {mon.vesaPattern} • {mon.technicalCode}
                    </p>
                  )}
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

      {/* Link Discreto para Personalização Especial */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0071e3] dark:text-slate-400 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Não encontrou seu monitor? Solicite uma personalização especial
        </button>
      </div>
    </div>
  );
};
