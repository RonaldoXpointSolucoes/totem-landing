"use client";

import React, { useState } from "react";
import { ColorOption } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card } from "@/components/ui";
import { Check, Sparkles, ZoomIn, X, ShieldCheck, Layers, Maximize2 } from "lucide-react";
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
  // Estado para controlar qual cor está sendo inspecionada na Lupa de Textura (Modal Macro Zoom)
  const [zoomedColorId, setZoomedColorId] = useState<string | null>(null);

  const zoomedColor = colors.find((c) => c.id === zoomedColorId) || null;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 lg:gap-4 relative">
        {colors.map((color) => {
          const isSelected = selectedColor.id === color.id;
          const hasAdjustment = color.priceAdjustmentCents > 0;

          // Detecção robusta do acabamento por slug ou nome
          const nameLower = (color.name || "").toLowerCase();
          const slugLower = (color.slug || "").toLowerCase();
          const isDual = slugLower.includes("dual") || slugLower.includes("black-white") || nameLower.includes("dual");
          const isWhite = !isDual && (slugLower.includes("white") || slugLower.includes("branco") || nameLower.includes("branco"));
          const isBlack = !isDual && (slugLower.includes("black") || slugLower.includes("preto") || nameLower.includes("preto"));

          return (
            <div key={color.id} className="relative">
              <Card
                interactive
                selected={isSelected}
                onClick={() => onSelectColor(color)}
                className={cn(
                  "p-4 rounded-2xl flex flex-col justify-between transition-all duration-300 relative overflow-hidden",
                  isSelected
                    ? "border-2 border-[#0071e3] dark:border-blue-500 bg-gradient-to-b from-blue-50/70 via-white to-blue-50/20 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 shadow-xl shadow-blue-500/10 ring-2 ring-[#0071e3]/20"
                    : "border-black/10 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/80"
                )}
              >
                <div>
                  {/* Cabeçalho do Card: Amostra com Lupa + Nome do Acabamento + Radio Check */}
                  <div className="flex items-center gap-3 mb-3">
                    {/* Amostra visual de cor com borda de MDF 15mm e botão de Lupa */}
                    <div
                      className="relative group/swatch cursor-pointer shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedColorId(color.id);
                      }}
                      title="Clique para ver a textura com zoom 2.5x e especificações"
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl transition-all duration-300 relative overflow-hidden flex items-center justify-center",
                          isSelected
                            ? "ring-2 ring-[#0071e3] ring-offset-2 ring-offset-white dark:ring-offset-slate-900 shadow-md scale-[1.02]"
                            : "border border-black/15 dark:border-slate-700 shadow-sm hover:scale-105"
                        )}
                        style={{
                          background: color.image ? `url(${color.image}) center/cover no-repeat` : color.hexReference,
                          boxShadow: isWhite
                            ? "inset 0 1px 3px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.06)"
                            : isBlack
                            ? "inset 0 1px 2px rgba(255,255,255,0.15), 0 3px 8px rgba(0,0,0,0.25)"
                            : "inset 0 0 0 1px rgba(0,0,0,0.15), 0 3px 8px rgba(0,0,0,0.15)",
                        }}
                      >
                        {/* Textura sutil de microporos para o Branco TX */}
                        {isWhite && !color.image && (
                          <div
                            className="absolute inset-0 opacity-40 pointer-events-none"
                            style={{
                              backgroundImage: "radial-gradient(#94a3b8 0.75px, transparent 0.75px)",
                              backgroundSize: "4px 4px",
                            }}
                          />
                        )}

                        {/* Textura para o Preto TX */}
                        {isBlack && !color.image && (
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

                      {/* Botão de Lupa integrado na amostra */}
                      <div
                        className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 shadow-md hover:bg-[#0071e3] hover:text-white hover:border-blue-600 transition-all duration-200 group-hover/swatch:scale-115 flex items-center justify-center"
                        title="Ampliar textura (Zoom 2.5x)"
                      >
                        <ZoomIn className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    {/* Informações de Título e Subtítulo protegidos contra quebra */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#1d1d1f] dark:text-white truncate tracking-tight">
                        {color.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {isWhite ? "Clássico Clean • Branco TX" : isBlack ? "Sóbrio & Corporativo • Preto TX" : "Bicolor • Branco e Preto"}
                      </p>
                    </div>

                    {/* Radio Check Circular */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                        isSelected
                          ? "bg-[#0071e3] text-white shadow-sm ring-2 ring-blue-500/20"
                          : "border-2 border-slate-300 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Descrição Técnica do Acabamento */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {isWhite
                      ? "Padrão texturizado Branco TX 15mm com microporos foscos, ideal para saúde, clínicas e varejo clean."
                      : isBlack
                      ? "Padrão texturizado Preto TX resistente a riscos, com estética corporativa sóbria e moderna."
                      : "Combinação bicolor unindo painéis Branco TX e Preto TX com encaixes de alta precisão milimétrica."}
                  </p>
                </div>

                {/* Rodapé com Status e Badge de Preço Perfeitamente Contido */}
                <div className="mt-3 pt-2.5 border-t border-black/10 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider",
                      isSelected ? "text-[#0071e3] dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {isSelected ? "Selecionado" : "Selecionar"}
                  </span>

                  {/* Badge de Preço/Acréscimo alinhado à direita com borda e contraste */}
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                      hasAdjustment
                        ? "bg-blue-50 dark:bg-indigo-500/20 text-[#0071e3] dark:text-indigo-300 border-blue-200 dark:border-indigo-500/30"
                        : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                    )}
                  >
                    {hasAdjustment ? `+ ${formatBRL(color.priceAdjustmentCents)}` : "Incluso (R$ 0,00)"}
                  </span>
                </div>
              </Card>
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

      {/* MODAL DE LUPA DE TEXTURA EM MACRO ZOOM 2.5X */}
      {zoomedColor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setZoomedColorId(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border-2 border-[#0071e3]/40 dark:border-blue-500/40 rounded-3xl shadow-2xl p-5 sm:p-6 w-full max-w-md animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-black/10 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#0071e3] dark:text-blue-400">
                  <ZoomIn className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-[#1d1d1f] dark:text-white tracking-tight">
                    {zoomedColor.name}
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Lupa de Inspeção de Textura • Zoom Macro 2.5x
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZoomedColorId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Fechar Lupa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lente de Alta Resolução */}
            <div
              className="w-full h-44 sm:h-52 rounded-2xl relative overflow-hidden border-2 border-black/10 dark:border-slate-700 shadow-inner flex items-center justify-center mb-4"
              style={{
                background: zoomedColor.image
                  ? `url(${zoomedColor.image}) center/cover no-repeat`
                  : zoomedColor.hexReference,
              }}
            >
              {/* Textura ampliada caso não seja imagem externa */}
              {!zoomedColor.image && (
                <div
                  className="absolute inset-0 opacity-50 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#94a3b8 1.5px, transparent 1.5px)",
                    backgroundSize: "8px 8px",
                  }}
                />
              )}

              {/* Reflexo especular simulando luz rasante industrial */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/40 pointer-events-none" />

              {/* Selo Central da Lente */}
              <div className="relative z-10 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xl text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Textura Real • 15mm BP</span>
              </div>

              {/* Indicador de Espessura e Selo */}
              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[10px] font-black tracking-wider backdrop-blur-xs flex items-center gap-1.5">
                <Maximize2 className="w-3 h-3 text-blue-400" />
                <span>Zoom 2.5x</span>
              </div>
            </div>

            {/* Informações Técnicas da Chapa */}
            <div className="space-y-2 text-xs mb-5">
              <div className="flex items-center gap-1.5 font-bold text-[#1d1d1f] dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>MaDeFibra BP Arauco/Duratex 15mm</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Superfície melamínica termofundida com proteção anti-risco, resistente a produtos de higienização frequente (álcool 70%) e umidade moderada.
              </p>
              <div className="pt-2 border-t border-black/5 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Borda de Proteção:</span>
                <strong className="text-slate-800 dark:text-slate-200">Fita de PVC 1mm usinada em Router CNC</strong>
              </div>
            </div>

            {/* Botão de Confirmação e Seleção */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectColor(zoomedColor);
                  setZoomedColorId(null);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar e Selecionar Este Acabamento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
