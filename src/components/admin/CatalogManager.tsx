"use client";

import React, { useState } from "react";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Sparkles,
  Monitor,
  Printer,
  QrCode,
  Tag,
  Maximize2,
} from "lucide-react";
import { CatalogItemModal } from "./CatalogItemModal";
import { CatalogPhotoLightbox } from "./CatalogPhotoLightbox";

interface CatalogManagerProps {
  catalogData: any;
  isLoading: boolean;
  onReload: () => void;
  addAuditLog: (action: string, target: string, details: string) => void;
  onShowNotification: (msg: string) => void;
}

export function CatalogManager({
  catalogData,
  isLoading,
  onReload,
  addAuditLog,
  onShowNotification,
}: CatalogManagerProps) {
  // Sub-abas
  const [subTab, setSubTab] = useState<"models" | "colors" | "peripherals">("models");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de Edição / Criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCollectionType, setModalCollectionType] = useState<
    "models" | "colors" | "monitors" | "printers" | "readers"
  >("models");
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Lightbox de Imagens
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);

  // Edição rápida de preço in-line
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlinePriceCents, setInlinePriceCents] = useState<number>(0);

  // Helper para extrair fotos de um modelo
  const getModelImages = (model: any): string[] => {
    let list: string[] = [];
    if (model.main_image) list.push(model.main_image);
    try {
      if (model.dimensions_json) {
        const parsed = JSON.parse(model.dimensions_json);
        if (Array.isArray(parsed.images)) {
          list = [...list, ...parsed.images];
        } else if (Array.isArray(parsed.galleryImages)) {
          list = [...list, ...parsed.galleryImages];
        }
      }
    } catch (e) {
      // Ignora erro de parse
    }
    return Array.from(new Set(list));
  };

  // Abrir Lightbox
  const handleOpenLightbox = (title: string, images: string[]) => {
    setLightboxTitle(title);
    setLightboxImages(images);
    setLightboxOpen(true);
  };

  // Abrir Modal para Criar Novo
  const handleCreateNew = (
    type: "models" | "colors" | "monitors" | "printers" | "readers"
  ) => {
    setModalCollectionType(type);
    setEditingItem(null);
    setIsModalOpen(true);
  };

  // Abrir Modal para Editar Item
  const handleEditItem = (
    type: "models" | "colors" | "monitors" | "printers" | "readers",
    item: any
  ) => {
    setModalCollectionType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Salvar Item (Criar ou Atualizar)
  const handleSaveItem = async (
    collectionType: string,
    docId: string | null,
    data: any
  ): Promise<boolean> => {
    try {
      if (docId) {
        // Atualização (PATCH)
        const res = await fetch("/api/admin/catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionType,
            documentId: docId,
            updates: data,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Falha ao atualizar item");

        addAuditLog(
          "Edição Completa de Catálogo",
          `${collectionType.toUpperCase()} #${docId}`,
          `Item "${data.name || data.display_name || docId}" atualizado com sucesso`
        );
        onShowNotification("Elemento do catálogo atualizado com sucesso!");
      } else {
        // Criação (POST)
        const res = await fetch("/api/admin/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collectionType,
            data,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Falha ao cadastrar item");

        addAuditLog(
          "Novo Elemento de Catálogo",
          `${collectionType.toUpperCase()}`,
          `Novo item "${data.name || data.display_name}" cadastrado no Appwrite`
        );
        onShowNotification("Novo elemento cadastrado com sucesso no catálogo!");
      }

      onReload();
      return true;
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
      return false;
    }
  };

  // Excluir Item (DELETE)
  const handleDeleteItem = async (
    collectionType: string,
    docId: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionType,
          documentId: docId,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao excluir item");

      addAuditLog(
        "Exclusão de Catálogo",
        `${collectionType.toUpperCase()} #${docId}`,
        "Elemento removido do Appwrite"
      );
      onShowNotification("Elemento removido do catálogo com sucesso!");
      onReload();
      return true;
    } catch (err: any) {
      alert("Erro ao excluir: " + err.message);
      return false;
    }
  };

  // Reordenar Ordem de Exibição (Subir/Descer)
  const handleMoveOrder = async (
    collectionType: string,
    item: any,
    delta: number
  ) => {
    const currentOrder = item.sort_order ?? 1;
    const newOrder = Math.max(1, currentOrder + delta);
    if (newOrder === currentOrder) return;

    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionType,
          documentId: item.$id,
          updates: { sort_order: newOrder },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addAuditLog(
          "Ordem de Exibição",
          `${item.name || item.$id}`,
          `Ordem alterada de ${currentOrder} para ${newOrder}`
        );
        onReload();
      }
    } catch (e) {
      console.error("Erro ao reordenar:", e);
    }
  };

  // Alternar Status Ativo / Inativo
  const handleToggleActive = async (collectionType: string, item: any) => {
    const newActive = !item.active;
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionType,
          documentId: item.$id,
          updates: { active: newActive },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addAuditLog(
          "Visibilidade de Catálogo",
          `${item.name || item.$id}`,
          newActive ? "Ativado na vitrine da loja" : "Inativado / Ocultado"
        );
        onReload();
      }
    } catch (e) {
      console.error("Erro ao alterar visibilidade:", e);
    }
  };

  // Salvar Preço Rápido In-line
  const handleSaveInlinePrice = async (
    collectionType: string,
    docId: string,
    field: string
  ) => {
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionType,
          documentId: docId,
          updates: { [field]: inlinePriceCents },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        addAuditLog(
          "Ajuste Rápido de Preço",
          `${collectionType} #${docId}`,
          `Preço ajustado para ${formatBRL(inlinePriceCents)}`
        );
        setInlineEditingId(null);
        onReload();
        onShowNotification("Preço atualizado com sucesso!");
      }
    } catch (e) {
      console.error("Erro ao salvar preço:", e);
    }
  };

  // Filtragem
  const query = searchQuery.toLowerCase().trim();

  const filteredModels = (catalogData?.models || []).filter((m: any) => {
    if (!query) return true;
    return (
      m.name?.toLowerCase().includes(query) ||
      m.slug?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
    );
  });

  const filteredColors = (catalogData?.colors || []).filter((c: any) => {
    if (!query) return true;
    return (
      c.name?.toLowerCase().includes(query) ||
      c.slug?.toLowerCase().includes(query) ||
      c.hex_reference?.toLowerCase().includes(query)
    );
  });

  const filteredMonitors = (catalogData?.monitors || []).filter((m: any) => {
    if (!query) return true;
    return (
      m.display_name?.toLowerCase().includes(query) ||
      m.brand?.toLowerCase().includes(query) ||
      m.technical_code?.toLowerCase().includes(query)
    );
  });

  const filteredPrinters = (catalogData?.printers || []).filter((p: any) => {
    if (!query) return true;
    return (
      p.display_name?.toLowerCase().includes(query) ||
      p.brand?.toLowerCase().includes(query) ||
      p.technical_code?.toLowerCase().includes(query)
    );
  });

  const filteredReaders = (catalogData?.readers || []).filter((r: any) => {
    if (!query) return true;
    return (
      r.display_name?.toLowerCase().includes(query) ||
      r.brand?.toLowerCase().includes(query) ||
      r.technical_code?.toLowerCase().includes(query)
    );
  });

  // Métricas rápidas
  const totalModels = catalogData?.models?.length || 0;
  const activeModels = (catalogData?.models || []).filter((m: any) => m.active).length;
  const totalColors = catalogData?.colors?.length || 0;
  const totalPeripherals =
    (catalogData?.monitors?.length || 0) +
    (catalogData?.printers?.length || 0) +
    (catalogData?.readers?.length || 0);

  const avgPriceCents =
    activeModels > 0
      ? Math.round(
          (catalogData?.models || [])
            .filter((m: any) => m.active)
            .reduce((acc: number, m: any) => acc + (m.base_price_cents || 0), 0) / activeModels
        )
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ======================================================== */}
      {/* 1. CARDS DE KPI DE CATÁLOGO & ENGENHARIA */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Modelos de Totem</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalModels}</span>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              {activeModels} ativos
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Pintura Epóxi</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalColors}</span>
            <span className="text-[11px] text-slate-400">cores padrão</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Periféricos CNC</span>
            <Monitor className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalPeripherals}</span>
            <span className="text-[11px] text-slate-400">homologados</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Ticket Médio Base</span>
            <Tag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              {formatBRL(avgPriceCents)}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BARRA DE CONTROLE: SUB-ABAS, BUSCA E NOVO ELEMENTO */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        {/* Sub-abas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSubTab("models")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              subTab === "models"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Modelos de Gabinete ({catalogData?.models?.length || 0})</span>
          </button>

          <button
            onClick={() => setSubTab("colors")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              subTab === "colors"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cores & Acabamentos ({catalogData?.colors?.length || 0})</span>
          </button>

          <button
            onClick={() => setSubTab("peripherals")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              subTab === "peripherals"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Equipamentos Homologados ({totalPeripherals})</span>
          </button>
        </div>

        {/* Busca e Botão Novo Elemento */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no catálogo..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => {
              if (subTab === "models") handleCreateNew("models");
              else if (subTab === "colors") handleCreateNew("colors");
              else handleCreateNew("monitors");
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/25 shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Elemento</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. CONTEÚDO PRINCIPAL: MODELOS DE GABINETE */}
      {/* ======================================================== */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm font-semibold">Carregando catálogo do Appwrite...</span>
        </div>
      ) : (
        <>
          {subTab === "models" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredModels.map((model: any) => {
                const images = getModelImages(model);
                const isInlineEditing = inlineEditingId === model.$id;

                let dimensions: any = {};
                try {
                  dimensions = model.dimensions_json ? JSON.parse(model.dimensions_json) : {};
                } catch (e) {
                  dimensions = {};
                }

                return (
                  <div
                    key={model.$id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl backdrop-blur-sm transition-all group"
                  >
                    <div className="space-y-3.5">
                      {/* Imagem de Capa com Badges Flutuantes */}
                      <div className="relative w-full h-48 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 p-3 flex items-center justify-center">
                        <img
                          src={model.main_image || "/models/cabinet-floor.svg"}
                          alt={model.name}
                          className="max-h-full max-w-full object-contain filter drop-shadow-xl transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as any).src = "/models/cabinet-floor.svg";
                          }}
                        />

                        {/* Badge de Ordem de Exibição */}
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-700 text-xs font-mono font-bold text-white shadow-md">
                          <span>#{model.sort_order ?? 1}</span>
                          <div className="flex flex-col ml-1 border-l border-slate-700 pl-1">
                            <button
                              onClick={() => handleMoveOrder("models", model, -1)}
                              title="Subir ordem na loja"
                              className="hover:text-indigo-400 p-0.5"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => handleMoveOrder("models", model, 1)}
                              title="Descer ordem na loja"
                              className="hover:text-indigo-400 p-0.5"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        {/* Badge de Status Ativo/Inativo */}
                        <button
                          onClick={() => handleToggleActive("models", model)}
                          title="Clique para alternar visibilidade no site"
                          className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all shadow-md ${
                            model.active
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              model.active ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                            }`}
                          />
                          <span>{model.active ? "Ativo no Site" : "Inativo"}</span>
                        </button>

                        {/* Botão de Ver Fotos Ampliadas */}
                        {images.length > 0 && (
                          <button
                            onClick={() => handleOpenLightbox(model.name, images)}
                            className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all active:scale-95"
                          >
                            <ImageIcon className="w-3 h-3 text-indigo-400" />
                            <span>📷 {images.length} fotos</span>
                            <Maximize2 className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                          </button>
                        )}
                      </div>

                      {/* Miniaturas de Outras Imagens (se houver mais de uma) */}
                      {images.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {images.slice(0, 4).map((imgUrl, i) => (
                            <button
                              key={i}
                              onClick={() => handleOpenLightbox(model.name, images)}
                              className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 hover:border-indigo-500 transition-all p-1"
                            >
                              <img
                                src={imgUrl}
                                alt="Thumb"
                                className="w-full h-full object-contain"
                              />
                            </button>
                          ))}
                          {images.length > 4 && (
                            <button
                              onClick={() => handleOpenLightbox(model.name, images)}
                              className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-700 hover:text-white"
                            >
                              +{images.length - 4}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Título e Slug */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-black text-white text-base tracking-tight">
                            {model.name}
                          </h3>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                            /{model.slug}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {model.description || "Sem descrição comercial cadastrada."}
                        </p>
                      </div>

                      {/* Especificações de Engenharia CNC */}
                      <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                            Dimensões CNC
                          </span>
                          <span className="font-mono font-semibold">
                            {dimensions.heightMm || 1650}x{dimensions.widthMm || 480}x
                            {dimensions.depthMm || 380} mm
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">
                            Chapa de Aço
                          </span>
                          <span className="font-semibold truncate block">
                            {dimensions.steelGauge || "SAE 1020 1.5mm"}
                          </span>
                        </div>
                      </div>

                      {/* Bloco de Preço */}
                      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                            Preço Base de Venda
                          </span>
                          {isInlineEditing ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                step="0.01"
                                value={(inlinePriceCents / 100).toFixed(2)}
                                onChange={(e) =>
                                  setInlinePriceCents(
                                    Math.round(parseFloat(e.target.value || "0") * 100)
                                  )
                                }
                                className="w-24 px-2 py-1 bg-slate-900 border border-indigo-500 rounded-lg text-white font-bold text-xs"
                              />
                              <button
                                onClick={() =>
                                  handleSaveInlinePrice(
                                    "models",
                                    model.$id,
                                    "base_price_cents"
                                  )
                                }
                                className="p-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setInlineEditingId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-400 text-xs hover:text-white"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <div className="text-xl font-extrabold text-indigo-400">
                              {formatBRL(model.base_price_cents)}
                            </div>
                          )}
                        </div>

                        {!isInlineEditing && (
                          <button
                            onClick={() => {
                              setInlineEditingId(model.$id);
                              setInlinePriceCents(model.base_price_cents);
                            }}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-all border border-slate-800"
                            title="Editar Preço Rápido"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleEditItem("models", model)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Editar Detalhes & Fotos</span>
                      </button>

                      <button
                        onClick={() => handleDeleteItem("models", model.$id)}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                        title="Excluir Modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. CONTEÚDO: CORES & ACABAMENTOS */}
          {/* ======================================================== */}
          {subTab === "colors" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredColors.map((color: any) => {
                const isInlineEditing = inlineEditingId === color.$id;

                return (
                  <div
                    key={color.$id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl backdrop-blur-sm transition-all"
                  >
                    <div className="space-y-4">
                      {/* Amostra Visual da Cor com Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div
                            className="w-12 h-12 rounded-2xl border-2 border-slate-600 shadow-inner shrink-0"
                            style={{ background: color.hex_reference }}
                          />
                          <div>
                            <h3 className="font-black text-white text-base tracking-tight">
                              {color.name}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-500">
                              {color.slug} • {color.hex_reference}
                            </span>
                          </div>
                        </div>

                        {/* Status Ativo */}
                        <button
                          onClick={() => handleToggleActive("colors", color)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 transition-all ${
                            color.active
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              color.active ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                            }`}
                          />
                          <span>{color.active ? "Ativo" : "Inativo"}</span>
                        </button>
                      </div>

                      {/* Acréscimo Comercial */}
                      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                            Acréscimo Comercial (Pintura Epóxi)
                          </span>
                          {isInlineEditing ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                step="0.01"
                                value={(inlinePriceCents / 100).toFixed(2)}
                                onChange={(e) =>
                                  setInlinePriceCents(
                                    Math.round(parseFloat(e.target.value || "0") * 100)
                                  )
                                }
                                className="w-24 px-2 py-1 bg-slate-900 border border-indigo-500 rounded-lg text-white font-bold text-xs"
                              />
                              <button
                                onClick={() =>
                                  handleSaveInlinePrice(
                                    "colors",
                                    color.$id,
                                    "price_adjustment_cents"
                                  )
                                }
                                className="p-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setInlineEditingId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-400 text-xs hover:text-white"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <div className="text-lg font-extrabold text-indigo-400">
                              {color.price_adjustment_cents === 0
                                ? "Sem acréscimo (Padrão)"
                                : `+ ${formatBRL(color.price_adjustment_cents)}`}
                            </div>
                          )}
                        </div>

                        {!isInlineEditing && (
                          <button
                            onClick={() => {
                              setInlineEditingId(color.$id);
                              setInlinePriceCents(color.price_adjustment_cents);
                            }}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-all border border-slate-800"
                            title="Ajustar Acréscimo Rápido"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleEditItem("colors", color)}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar Acabamento</span>
                      </button>

                      <button
                        onClick={() => handleDeleteItem("colors", color.$id)}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                        title="Excluir Cor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. CONTEÚDO: EQUIPAMENTOS HOMOLOGADOS */}
          {/* ======================================================== */}
          {subTab === "peripherals" && (
            <div className="space-y-6">
              {/* Monitores */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span>Monitores Homologados com Padrão VESA ({filteredMonitors.length})</span>
                  </h3>
                  <button
                    onClick={() => handleCreateNew("monitors")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Monitor</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMonitors.map((m: any) => (
                    <div
                      key={m.$id}
                      className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl text-xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-white text-sm">{m.display_name}</span>
                          <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                            VESA {m.vesa_pattern}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">{m.notes}</p>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Cód Técnico: {m.technical_code}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                        <button
                          onClick={() => handleEditItem("monitors", m)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteItem("monitors", m.$id)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impressoras */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Impressoras Térmicas Homologadas ({filteredPrinters.length})</span>
                  </h3>
                  <button
                    onClick={() => handleCreateNew("printers")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Impressora</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPrinters.map((p: any) => (
                    <div
                      key={p.$id}
                      className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl text-xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-white text-sm">{p.display_name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            {p.paper_width_mm}mm
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">{p.notes}</p>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Cód Técnico: {p.technical_code}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                        <button
                          onClick={() => handleEditItem("printers", p)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteItem("printers", p.$id)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leitores de Código de Barras / QR Code */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-400" />
                    <span>Leitores Ópticos de Código de Barras / QR Code ({filteredReaders.length})</span>
                  </h3>
                  <button
                    onClick={() => handleCreateNew("readers")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Leitor</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredReaders.map((r: any) => (
                    <div
                      key={r.$id}
                      className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl text-xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-white text-sm">{r.display_name}</span>
                          <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                            {r.is_2d ? "1D / 2D QR Code" : "1D Linear"}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">{r.notes}</p>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Cód Técnico: {r.technical_code}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                        <button
                          onClick={() => handleEditItem("readers", r)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteItem("readers", r.$id)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL DE EDIÇÃO E CRIAÇÃO */}
      {/* ======================================================== */}
      <CatalogItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        collectionType={modalCollectionType}
        initialItem={editingItem}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />

      {/* ======================================================== */}
      {/* LIGHTBOX DE FOTOS EM ALTA RESOLUÇÃO */}
      {/* ======================================================== */}
      <CatalogPhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={lightboxTitle}
        images={lightboxImages}
      />
    </div>
  );
}
