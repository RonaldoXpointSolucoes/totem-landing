"use client";

import React, { useState, useEffect } from "react";
import {
  Monitor,
  Printer as PrinterIcon,
  QrCode,
  Cpu,
  Cable,
  Package,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Image as ImageIcon,
} from "lucide-react";
import { KitSubItem } from "@/types/catalog";
import { formatBRL } from "@/modules/pricing/pricingEngine";

export interface KitSubItemWithUid extends KitSubItem {
  _uid: string;
}

interface KitSubItemCardProps {
  subItem: KitSubItemWithUid;
  index: number;
  totalCount: number;
  onUpdate: (index: number, updates: Partial<KitSubItem>) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDuplicate: (index: number) => void;
}

const CATEGORY_META = {
  monitor: {
    label: "Display Touchscreen",
    shortLabel: "Touchscreen",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    accentColor: "cyan",
    icon: Monitor,
  },
  printer: {
    label: "Impressora Térmica",
    shortLabel: "Impressora",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    accentColor: "emerald",
    icon: PrinterIcon,
  },
  reader: {
    label: "Leitor 2D / QR Code",
    shortLabel: "Leitor 2D",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    accentColor: "amber",
    icon: QrCode,
  },
  pc: {
    label: "Mini PC / Computador",
    shortLabel: "Mini PC",
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    accentColor: "purple",
    icon: Cpu,
  },
  accessory: {
    label: "Conexões & Elétrica",
    shortLabel: "Acessório",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    accentColor: "indigo",
    icon: Cable,
  },
  other: {
    label: "Componente Geral",
    shortLabel: "Geral",
    badgeColor: "text-slate-300 bg-slate-800/80 border-slate-700",
    accentColor: "slate",
    icon: Package,
  },
};

export const KitSubItemCard = React.memo(function KitSubItemCard({
  subItem,
  index,
  totalCount,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: KitSubItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Estado local para o input de preço, permitindo digitação fluida sem cursor pulando
  const [priceInput, setPriceInput] = useState<string>(() => {
    return ((subItem.priceCents || 0) / 100).toFixed(2);
  });

  // Sincroniza o input quando o priceCents for alterado externamente (ex: carregar padrões ou duplicar)
  useEffect(() => {
    const currentParsed = Math.round(parseFloat(priceInput.replace(",", ".") || "0") * 100);
    if (currentParsed !== subItem.priceCents) {
      setPriceInput(((subItem.priceCents || 0) / 100).toFixed(2));
    }
  }, [subItem.priceCents]);

  const catMeta = CATEGORY_META[subItem.category] || CATEGORY_META.other;
  const CatIcon = catMeta.icon;

  // Gerador de ID amigável baseado no nome
  const handleAutoGenerateId = () => {
    const raw = subItem.name || `item-${index + 1}`;
    const slug = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    onUpdate(index, { id: `kit-${slug}` });
  };

  const handleCopyId = () => {
    if (subItem.id) {
      navigator.clipboard?.writeText(subItem.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/90 shadow-xl backdrop-blur-md transition-all overflow-hidden group">
      {/* Barra de Acentos Superior Sutil */}
      <div
        className={`h-0.5 w-full bg-gradient-to-r ${
          subItem.category === "monitor"
            ? "from-cyan-500 via-indigo-500 to-transparent"
            : subItem.category === "printer"
            ? "from-emerald-500 via-teal-500 to-transparent"
            : subItem.category === "reader"
            ? "from-amber-500 via-orange-500 to-transparent"
            : subItem.category === "pc"
            ? "from-purple-500 via-pink-500 to-transparent"
            : "from-indigo-500 via-slate-600 to-transparent"
        }`}
      />

      {/* Header do Card com Controles de Posição, Categoria e Ações */}
      <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-950/50 border-b border-slate-800/80">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Botão de Expandir / Recolher */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
          >
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? "rotate-90 text-indigo-400" : ""
              }`}
            />
          </button>

          {/* Ordem Numérica com Botões de Reordenação */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-0.5 shadow-inner">
            <span className="px-2 py-0.5 text-xs font-mono font-black text-slate-300">
              #{index + 1}
            </span>
            <div className="flex flex-col border-l border-slate-800">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveUp(index)}
                className="px-1 py-0.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Mover para cima"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={index >= totalCount - 1}
                onClick={() => onMoveDown(index)}
                className="px-1 py-0.5 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Mover para baixo"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Badge da Categoria */}
          <span
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 shadow-sm ${catMeta.badgeColor}`}
          >
            <CatIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{catMeta.label}</span>
          </span>

          {/* Título Resumido quando recolhido */}
          {!isExpanded && (
            <span className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-xs">
              {subItem.name || "Componente sem nome"}
            </span>
          )}
        </div>

        {/* Lado Direito: Incluso por padrão, Preço e Botões */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Toggle Incluso no Kit Base */}
          <label className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs font-semibold text-slate-300 transition-all select-none">
            <input
              type="checkbox"
              checked={Boolean(subItem.selected)}
              onChange={(e) => onUpdate(index, { selected: e.target.checked })}
              className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-950 border-slate-700 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <span className="hidden sm:inline">
              {subItem.selected ? "Incluso na base" : "Opcional no pedido"}
            </span>
            <span className="sm:hidden">{subItem.selected ? "Incluso" : "Opcional"}</span>
          </label>

          {/* Badge de Preço */}
          <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/25 shadow-sm">
            {formatBRL(subItem.priceCents || 0)}
          </span>

          {/* Botão Duplicar */}
          <button
            type="button"
            onClick={() => onDuplicate(index)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all active:scale-95"
            title="Duplicar este componente"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Botão Excluir */}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all active:scale-95"
            title="Remover este componente do kit"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Corpo com Grid de Edição (Exibido quando isExpanded) */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Coluna Visual: Imagem / Foto do Componente */}
            <div className="lg:col-span-3 flex flex-col items-center justify-start gap-2.5">
              <div className="w-full aspect-square max-w-[140px] rounded-2xl bg-slate-950 border border-slate-800 p-2 overflow-hidden flex items-center justify-center relative shadow-inner group-hover:border-slate-700 transition-all">
                {subItem.image && !imgError ? (
                  <img
                    src={subItem.image}
                    alt={subItem.name || "Foto do Componente"}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    onError={() => setImgError(true)}
                    onLoad={() => setImgError(false)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-600 gap-1.5 p-2 text-center">
                    <CatIcon className="w-8 h-8 opacity-40 text-indigo-400" />
                    <span className="text-[10px] font-semibold text-slate-500">
                      {imgError ? "Erro no Link da Imagem" : "Sem foto anexada"}
                    </span>
                  </div>
                )}

                {/* Badge de Categoria Flutuante */}
                <div className="absolute top-1.5 left-1.5">
                  <span className="w-5 h-5 rounded-lg bg-slate-900/90 border border-slate-700/80 flex items-center justify-center shadow">
                    <CatIcon className="w-2.5 h-2.5 text-indigo-400" />
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Foto Visível no Configurador
                </span>
                <span className="text-[9px] text-slate-500">
                  Resolução recomendada: 800x800 transparente
                </span>
              </div>
            </div>

            {/* Coluna dos Campos de Edição */}
            <div className="lg:col-span-9 space-y-3.5">
              {/* Linha 1: Nome do Componente e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Nome do Componente *
                  </label>
                  <input
                    type="text"
                    required
                    value={subItem.name || ""}
                    onChange={(e) => onUpdate(index, { name: e.target.value })}
                    placeholder='Ex: Computador All-in-One Touch 23.8" Core i5'
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">
                    Categoria do Equipamento *
                  </label>
                  <select
                    value={subItem.category || "accessory"}
                    onChange={(e) =>
                      onUpdate(index, { category: e.target.value as any })
                    }
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="monitor">🖥️ Display Touchscreen / All-in-One</option>
                    <option value="printer">🖨️ Impressora Térmica Homologada</option>
                    <option value="reader">📷 Leitor de Código 2D / QR Code</option>
                    <option value="accessory">⚡ Conexões, Cabos & Filtro de Linha</option>
                    <option value="pc">💻 Mini PC / Computador Industrial</option>
                    <option value="other">📦 Outro Periférico / Acessório</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Valor Individual (R$) e Identificador Técnico (ID) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Valor Individual */}
                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                      Valor Individual (R$) *
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {formatBRL(subItem.priceCents || 0)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400 select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={priceInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setPriceInput(raw);
                        const normalized = raw.replace(",", ".");
                        const parsed = parseFloat(normalized);
                        if (!isNaN(parsed) && parsed >= 0) {
                          onUpdate(index, { priceCents: Math.round(parsed * 100) });
                        } else if (raw.trim() === "") {
                          onUpdate(index, { priceCents: 0 });
                        }
                      }}
                      onBlur={() => {
                        const normalized = priceInput.replace(",", ".");
                        const parsed = parseFloat(normalized);
                        if (isNaN(parsed) || parsed < 0) {
                          setPriceInput("0.00");
                          onUpdate(index, { priceCents: 0 });
                        } else {
                          setPriceInput(parsed.toFixed(2));
                          onUpdate(index, { priceCents: Math.round(parsed * 100) });
                        }
                      }}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-indigo-300 font-mono font-black text-xs focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Valor adicionado ao total quando o cliente mantiver este componente.
                  </span>
                </div>

                {/* Identificador Técnico (ID) */}
                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                      Identificador Técnico (ID) *
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleAutoGenerateId}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-all"
                        title="Gerar ID automático a partir do nome"
                      >
                        Auto-Gerar
                      </button>
                      {subItem.id && (
                        <>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={handleCopyId}
                            className="text-[10px] text-slate-400 hover:text-slate-200 transition-all flex items-center gap-0.5"
                            title="Copiar ID técnico"
                          >
                            {copiedId ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <span>Copiar</span>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={subItem.id || ""}
                    onChange={(e) => onUpdate(index, { id: e.target.value })}
                    placeholder="Ex: kit-impressora-vt8360"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Chave única no payload do pedido e na ordem de fabricação CNC.
                  </span>
                </div>
              </div>

              {/* Linha 3: URL da Imagem */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>URL da Foto / Imagem do Componente</span>
                  </label>
                  {subItem.image && (
                    <a
                      href={subItem.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-all"
                    >
                      <span>Abrir Imagem Externa</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={subItem.image || ""}
                    onChange={(e) => {
                      setImgError(false);
                      onUpdate(index, { image: e.target.value });
                    }}
                    placeholder="https://http2.mlstatic.com/... ou /images/totems/..."
                    className="w-full pl-3.5 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  {subItem.image && (
                    <button
                      type="button"
                      onClick={() => onUpdate(index, { image: "" })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 rounded transition-all text-xs"
                      title="Limpar URL"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Linha 4: Descrição Comercial & Técnica */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                    Descrição Comercial & Especificações Técnicas *
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {subItem.description?.length || 0} caracteres
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={subItem.description || ""}
                  onChange={(e) => onUpdate(index, { description: e.target.value })}
                  placeholder="Descreva as especificações do equipamento apresentadas ao cliente na modal..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-y transition-all placeholder:text-slate-600"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Aparece no configurador (/monte-seu-totem) quando o cliente clica em &quot;Ver Detalhes do Hardware&quot;.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
