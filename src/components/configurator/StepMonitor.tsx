"use client";

import React, { useState } from "react";
import { MonitorOption } from "@/types/catalog";
import { Card, Input } from "@/components/ui";
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
    <div className="space-y-3 sm:space-y-4">
      <div className="text-center sm:text-left space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
            Qual monitor será instalado no Totem?
          </h2>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Furação Homologada (+ R$ 0)
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Usinamos o rasgo frontal e furação VESA na medida exata do seu display.
        </p>
      </div>

      {/* Busca Rápida Compacta */}
      <div className="relative">
        <Input
          placeholder="Pesquisar modelo ou marca (ex: Elgin, Gertec, 21.5)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900/80 border-black/15 dark:border-slate-800 text-[#1d1d1f] dark:text-white placeholder:text-slate-400 shadow-sm"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
      </div>

      {/* Grid com Scroll Interno Seguro para Manter Viewport sem Estouro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] lg:max-h-[250px] overflow-y-auto pr-1">
        {filteredMonitors.map((mon) => {
          const isSelected = selectedMonitor?.id === mon.id;
          return (
            <Card
              key={mon.id}
              interactive
              selected={isSelected}
              onClick={() => onSelectMonitor(mon)}
              className="p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "border-[#0071e3] bg-blue-50 dark:bg-indigo-600/30 text-[#0071e3] dark:text-indigo-300"
                      : "border-black/10 dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-950 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Tv className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#0071e3] dark:text-cyan-400 uppercase tracking-wider">
                      {mon.brand}
                    </span>
                    {mon.sizeInches && (
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold bg-black/5 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                        {mon.sizeInches}"
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#1d1d1f] dark:text-white truncate">{mon.displayName}</h3>
                  {mon.vesaPattern && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      VESA: {mon.vesaPattern}
                    </p>
                  )}
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

      {/* Link Discreto para Personalização Especial */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={onRequestCustomization}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#0071e3] dark:text-slate-400 dark:hover:text-indigo-300 underline underline-offset-4 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" />
          Não encontrou seu monitor? Solicite furação sob medida
        </button>
      </div>
    </div>
  );
};
