"use client";

import React, { useState } from "react";
import { ColorOption } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card } from "@/components/ui";
import { Check, Sparkles, ZoomIn, X, ShieldCheck, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepColorProps {
  colors: ColorOption[];
  selectedColor: ColorOption;
  onSelectColor: (color: ColorOption) => void;
}

export const StepColor: React.FC<StepColorProps> = ({
  colors,
  selectedColor,
  onSelectColor,
}) => {
  // Estado para controlar qual cor está com a Lupa de Textura aberta
  const [zoomedColorId, setZoomedColorId] = useState<string | null>(null);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Cabeçalho da Etapa com tipografia e hierarquia claras */}
      <div className="text-center sm:text-left space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-[11px] font-bold text-[#0071e3] dark:text-blue-400 mb-1">
          <Layers className="w-3 h-3" />
          <span>Etapa 02 • Matéria-Prima de Alta Densidade</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-[#1d1d1f] dark:text-white tracking-tight">
          Escolha o acabamento em MaDeFibra BP
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Painéis de 15mm com proteção melamínica termofundida, usinados em Router CNC com fita de borda PVC de 1mm.
        </p>
      </div>

      {/* Grid de Cores e Acabamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 lg:gap-4 relative">
        {colors.map((color) => {
          const isSelected = selectedColor.id === color.id;
          const hasAdjustment = color.priceAdjustmentCents > 0;
          const isZoomed = zoomedColorId === color.id;

          const isWhite = color.slug === "white";
          const isBlack = color.slug === "black";
          const isDual = color.slug === "black-white";

          return (
            <div key={color.id} className="relative">
              <Card
                interactive
                selected={isSelected}
                onClick={() => onSelectColor(color)}
                className={cn(
                  "p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 relative",
                  isSelected
                    ? "border-2 border-[#0071e3] dark:border-blue-500 bg-gradient-to-b from-blue-50/70 via-white to-blue-50/20 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 shadow-xl shadow-blue-500/10 ring-2 ring-[#0071e3]/20"
                    : "border-black/10 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/80"
                )}
              >
                <div>
                  {/* Cabeçalho do Card: Amostra com Lupa + Check ao Lado + Badge de Preço */}
                  <div className="flex items-start justify-between gap-2.5 mb-3.5">
                    {/* Bloco Amostra + Indicador de Seleção ao Lado */}
                    <div className="flex items-center gap-3">
                      {/* Amostra visual de cor com borda de MDF 15mm e botão de Lupa */}
                      <div
                        className="relative group/swatch cursor-pointer"
                        onMouseEnter={() => setZoomedColorId(color.id)}
                        onMouseLeave={() => setZoomedColorId((prev) => (prev === color.id ? null : prev))}
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedColorId(isZoomed ? null : color.id);
                        }}
                        title="Passe o mouse ou clique para ver a textura com zoom"
                      >
                        <div
                          className={cn(
                            "w-12 h-12 sm:w-13 sm:h-13 rounded-2xl transition-all duration-300 relative overflow-hidden flex items-center justify-center",
                            isSelected
                              ? "ring-2 ring-[#0071e3] ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md scale-[1.02]"
                              : "border border-black/15 dark:border-slate-700 shadow-sm hover:scale-105"
                          )}
                          style={{
                            background: color.hexReference,
                            boxShadow: isWhite
                              ? "inset 0 1px 3px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.12), 0 3px 8px rgba(0,0,0,0.06)"
                              : isBlack
                              ? "inset 0 1px 2px rgba(255,255,255,0.15), 0 3px 8px rgba(0,0,0,0.25)"
                              : "inset 0 0 0 1px rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.15)",
                          }}
                        >
                          {/* Textura sutil de microporos para o Branco TX (elimina o efeito de tela vazia) */}
                          {isWhite && (
                            <div
                              className="absolute inset-0 opacity-40 pointer-events-none"
                              style={{
                                backgroundImage: "radial-gradient(#94a3b8 0.75px, transparent 0.75px)",
                                backgroundSize: "4px 4px",
                              }}
                            />
                          )}

                          {/* Textura para o Preto TX */}
                          {isBlack && (
                            <div
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{
                                backgroundImage: "radial-gradient(#64748b 0.75px, transparent 0.75px)",
                                backgroundSize: "4px 4px",
                              }}
                            />
                          )}

                          {/* Reflexo de luz rasante para acabamento premium */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/30 pointer-events-none" />
                        </div>

                        {/* Botão sutil de Lupa no cantinho da amostra */}
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 p-1 rounded-full border shadow-sm transition-all duration-200 flex items-center justify-center",
                            isZoomed
                              ? "bg-[#0071e3] text-white border-blue-600 scale-110 shadow-md"
                              : "bg-white/95 dark:bg-slate-800/95 text-slate-600 dark:text-slate-300 border-slate-200/90 dark:border-slate-700 hover:text-[#0071e3] hover:border-blue-400 group-hover/swatch:scale-110"
                          )}
                          title="Ampliar textura (Zoom 2.5x)"
                        >
                          <ZoomIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </div>
                      </div>

                      {/* Indicador de Seleção AO LADO da cor (nunca mais em cima dela) */}
                      <div className="flex flex-col gap-0.5 select-none">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200",
                              isSelected
                                ? "bg-[#0071e3] text-white shadow-sm ring-2 ring-blue-500/20"
                                : "border-2 border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70"
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span
                            className={cn(
                              "text-xs font-black uppercase tracking-wider transition-colors",
                              isSelected
                                ? "text-[#0071e3] dark:text-blue-400"
                                : "text-slate-500 dark:text-slate-400"
                            )}
                          >
                            {isSelected ? "Selecionado" : "Selecionar"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {isWhite ? "Clássico Clean" : isBlack ? "Sóbrio & Corporativo" : "Combinação Bicolor"}
                        </span>
                      </div>
                    </div>

                    {/* Badge de Acréscimo / Sem Acréscimo */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        hasAdjustment
                          ? "bg-blue-50 dark:bg-indigo-500/20 text-[#0071e3] dark:text-indigo-300 border-blue-200 dark:border-indigo-500/30"
                          : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                      }`}
                    >
                      {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "Sem Acréscimo"}
                    </span>
                  </div>

                  {/* Nome e Descrição do Acabamento */}
                  <h3 className="text-sm sm:text-base font-extrabold text-[#1d1d1f] dark:text-white mb-1 tracking-tight">
                    {color.name}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {isWhite
                      ? "Padrão texturizado Branco TX 15mm com microporos foscos, ideal para saúde, clínicas e varejo clean."
                      : isBlack
                      ? "Padrão texturizado Preto TX resistente a riscos, com estética corporativa sóbria e moderna."
                      : "Combinação bicolor unindo painéis Branco TX e Preto TX com encaixes de alta precisão milimétrica."}
                  </p>
                </div>

                {/* Rodapé com Ajuste de Preço */}
                <div className="mt-3.5 pt-2.5 border-t border-black/10 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-medium">Ajuste no Total:</span>
                  <span className="font-extrabold text-xs text-[#1d1d1f] dark:text-slate-100">
                    {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "R$ 0,00 (Incluso)"}
                  </span>
                </div>
              </Card>

              {/* LUPA INTERATIVA / POPOVER DE TEXTURA AMPLIADA (ZOOM 2.5X) */}
              {isZoomed && (
                <div
                  className="absolute z-50 bottom-[calc(100%+8px)] left-0 sm:left-auto right-0 sm:right-auto sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-[#0071e3]/40 dark:border-blue-500/40 rounded-3xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Cabeçalho da Lente */}
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-black/10 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0071e3] dark:text-blue-400">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-[#1d1d1f] dark:text-white tracking-tight">
                        Lupa de Textura • Zoom 2.5x
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomedColorId(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      title="Fechar lupa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lente Óptica Ampliada da Textura Física do Material */}
                  <div
                    className="w-full h-28 rounded-2xl relative overflow-hidden border-2 border-black/10 dark:border-slate-700 shadow-inner flex items-center justify-center mb-3"
                    style={{ background: color.hexReference }}
                  >
                    {/* Textura ampliada para Branco TX */}
                    {isWhite && (
                      <div
                        className="absolute inset-0 opacity-60 pointer-events-none"
                        style={{
                          backgroundImage: "radial-gradient(#94a3b8 1.5px, transparent 1.5px)",
                          backgroundSize: "8px 8px",
                          boxShadow: "inset 0 0 20px rgba(0,0,0,0.08)",
                        }}
                      />
                    )}

                    {/* Textura ampliada para Preto TX */}
                    {isBlack && (
                      <div
                        className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{
                          backgroundImage: "radial-gradient(#64748b 1.5px, transparent 1.5px)",
                          backgroundSize: "8px 8px",
                          boxShadow: "inset 0 0 25px rgba(0,0,0,0.5)",
                        }}
                      />
                    )}

                    {/* Divisão ampliada para Dual-Tone */}
                    {isDual && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-0.5 h-full bg-blue-500/60 rotate-45 shadow-lg" />
                      </div>
                    )}

                    {/* Reflexo especular simulando luz rasante industrial */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/40 pointer-events-none" />

                    {/* Selo Central da Lente */}
                    <div className="relative z-10 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg text-[10px] font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{color.name}</span>
                    </div>

                    {/* Indicador de Espessura no Canto */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold tracking-wider backdrop-blur-xs">
                      15mm BP
                    </div>
                  </div>

                  {/* Informações Técnicas da Chapa */}
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 font-semibold text-[#1d1d1f] dark:text-white">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>MaDeFibra BP Arauco/Duratex</span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                      Superfície melamínica termofundida com proteção anti-risco, resistente a produtos de limpeza (álcool 70%) e umidade moderada.
                    </p>
                    <div className="pt-1.5 border-t border-black/5 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Borda de Acabamento:</span>
                      <strong className="text-slate-700 dark:text-slate-200">Fita PVC 1mm em Router CNC</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Caixa Informativa com Estilo Glassmorphism: Personalização Sob Medida */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 dark:bg-indigo-950/30 border border-blue-200/80 dark:border-indigo-500/20 flex items-center gap-3 transition-colors">
        <div className="p-2 rounded-xl bg-[#0071e3]/10 dark:bg-indigo-600/20 text-[#0071e3] dark:text-indigo-400 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong className="text-[#1d1d1f] dark:text-white">Padrões Especiais Sob Encomenda:</strong> Usinamos sob medida em qualquer padrão MDF Arauco, Duratex ou Guararapes (madeirados, grafite, concreto) para projetos corporativos e redes de franquias.
        </p>
      </div>
    </div>
  );
};
