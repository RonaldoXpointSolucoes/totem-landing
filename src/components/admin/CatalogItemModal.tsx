"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Trash2,
  Image as ImageIcon,
  Plus,
  Layers,
  Wrench,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
} from "lucide-react";

interface CatalogItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionType: "models" | "colors" | "monitors" | "printers" | "readers";
  initialItem?: any | null; // Se nulo, modo criação (+ Novo Elemento)
  onSave: (collectionType: string, docId: string | null, data: any) => Promise<boolean>;
  onDelete?: (collectionType: string, docId: string) => Promise<boolean>;
}

const PRESET_EPOXY_COLORS = [
  { name: "Branco Neve Industrial", hex: "#f8fafc" },
  { name: "Preto Fosco Titanium", hex: "#0f172a" },
  { name: "Cinza Grafite Acetinado", hex: "#334155" },
  { name: "Azul Cobalto Corporativo", hex: "#1e3a8a" },
  { name: "Vermelho Rubi Metálico", hex: "#991b1b" },
  { name: "Amarelo Segurança Canário", hex: "#eab308" },
  { name: "Dual-Tone Preto/Branco", hex: "linear-gradient(135deg, #0f172a 50%, #f8fafc 50%)" },
];

export function CatalogItemModal({
  isOpen,
  onClose,
  collectionType,
  initialItem,
  onSave,
  onDelete,
}: CatalogItemModalProps) {
  const isEditing = Boolean(initialItem?.$id);

  // Abas internas do Modal
  const [activeTab, setActiveTab] = useState<"general" | "media" | "engineering">("general");

  // Estados dos Campos
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newImageUrl, setNewImageUrl] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (initialItem) {
      // Carrega dados existentes
      let parsedDimensions: any = {};
      try {
        if (initialItem.dimensions_json) {
          parsedDimensions = JSON.parse(initialItem.dimensions_json);
        } else if (initialItem.dimensions) {
          parsedDimensions = initialItem.dimensions;
        }
      } catch (e) {
        parsedDimensions = {};
      }

      const existingGallery =
        parsedDimensions.images ||
        parsedDimensions.galleryImages ||
        (initialItem.main_image ? [initialItem.main_image] : []);

      setGalleryImages(Array.from(new Set(existingGallery)));

      setFormData({
        name: initialItem.name || initialItem.display_name || "",
        slug: initialItem.slug || "",
        description: initialItem.description || initialItem.notes || "",
        base_price_cents: initialItem.base_price_cents ?? 0,
        price_adjustment_cents: initialItem.price_adjustment_cents ?? 0,
        active: initialItem.active ?? true,
        sort_order: initialItem.sort_order ?? 1,
        main_image: initialItem.main_image || initialItem.image || "",
        hex_reference: initialItem.hex_reference || "#0f172a",
        brand: initialItem.brand || "",
        model: initialItem.model || "",
        display_name: initialItem.display_name || initialItem.name || "",
        technical_code: initialItem.technical_code || "",
        notes: initialItem.notes || "",
        vesa_pattern: initialItem.vesa_pattern || "100x100",
        paper_width_mm: initialItem.paper_width_mm || 80,
        is_2d: initialItem.is_2d ?? true,
        // Dimensões de engenharia
        heightMm: parsedDimensions.heightMm || 1650,
        widthMm: parsedDimensions.widthMm || 480,
        depthMm: parsedDimensions.depthMm || 380,
        steelGauge: parsedDimensions.steelGauge || "Chapa de Aço SAE 1020 1.5mm",
        weightKg: parsedDimensions.weightKg || 25,
      });
    } else {
      // Padrões para novo item
      setGalleryImages([]);
      setFormData({
        name: "",
        slug: "",
        description: "",
        base_price_cents: collectionType === "models" ? 129000 : 0,
        price_adjustment_cents: 0,
        active: true,
        sort_order: 10,
        main_image:
          collectionType === "models"
            ? "/models/cabinet-floor.svg"
            : "",
        hex_reference: "#0f172a",
        brand: "Totem Pro",
        model: "",
        display_name: "",
        technical_code: "TP-" + Math.floor(1000 + Math.random() * 9000),
        notes: "Usinagem CNC homologada e furação padronizada.",
        vesa_pattern: "100x100",
        paper_width_mm: 80,
        is_2d: true,
        heightMm: 1650,
        widthMm: 480,
        depthMm: 380,
        steelGauge: "Chapa de Aço SAE 1020 1.5mm",
        weightKg: 25,
      });
    }

    setConfirmDelete(false);
    setErrorMessage("");
    setActiveTab("general");
    setNewImageUrl("");
  }, [isOpen, initialItem, collectionType]);

  if (!isOpen) return null;

  // Auto-gerar slug a partir do nome
  const generateSlug = () => {
    const text = formData.name || formData.display_name || "";
    const clean = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData((prev) => ({ ...prev, slug: clean }));
  };

  // Adicionar imagem à galeria
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    if (!galleryImages.includes(url)) {
      const updated = [...galleryImages, url];
      setGalleryImages(updated);
      // Se não havia imagem principal, define essa como principal
      if (!formData.main_image) {
        setFormData((prev) => ({ ...prev, main_image: url }));
      }
    }
    setNewImageUrl("");
  };

  // Remover foto da galeria
  const handleRemoveImage = (indexToRemove: number) => {
    const updated = galleryImages.filter((_, idx) => idx !== indexToRemove);
    setGalleryImages(updated);
    if (galleryImages[indexToRemove] === formData.main_image) {
      setFormData((prev) => ({ ...prev, main_image: updated[0] || "" }));
    }
  };

  // Definir foto como Capa Principal
  const handleSetAsMainImage = (url: string) => {
    setFormData((prev) => ({ ...prev, main_image: url }));
  };

  // Salvar Item
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      // Monta payload de acordo com a coleção
      let payload: Record<string, any> = {};

      if (collectionType === "models") {
        if (!formData.name) throw new Error("O nome do modelo de gabinete é obrigatório.");
        if (!formData.slug) generateSlug();

        const dimensionsObj = {
          heightMm: Number(formData.heightMm) || 0,
          widthMm: Number(formData.widthMm) || 0,
          depthMm: Number(formData.depthMm) || 0,
          steelGauge: formData.steelGauge || "Chapa de Aço SAE 1020 1.5mm",
          weightKg: Number(formData.weightKg) || 0,
          vesaPattern: formData.vesa_pattern || "100x100",
          images: galleryImages.length > 0 ? galleryImages : [formData.main_image || "/models/cabinet-floor.svg"],
        };

        payload = {
          name: formData.name,
          slug: formData.slug || "modelo-" + Date.now(),
          description: formData.description || "",
          base_price_cents: Number(formData.base_price_cents) || 0,
          active: Boolean(formData.active),
          sort_order: Number(formData.sort_order) || 1,
          main_image: formData.main_image || galleryImages[0] || "/models/cabinet-floor.svg",
          dimensions_json: JSON.stringify(dimensionsObj),
        };
      } else if (collectionType === "colors") {
        if (!formData.name) throw new Error("O nome do acabamento/cor é obrigatório.");
        payload = {
          name: formData.name,
          slug: formData.slug || "cor-" + Date.now(),
          hex_reference: formData.hex_reference || "#0f172a",
          price_adjustment_cents: Number(formData.price_adjustment_cents) || 0,
          active: Boolean(formData.active),
          image: formData.main_image || "",
        };
      } else if (collectionType === "monitors") {
        payload = {
          brand: formData.brand || "Generico",
          model: formData.model || formData.name,
          display_name: formData.display_name || formData.name,
          vesa_pattern: formData.vesa_pattern || "100x100",
          technical_code: formData.technical_code || "",
          notes: formData.description || formData.notes || "",
          active: Boolean(formData.active),
          image: formData.main_image || "",
        };
      } else if (collectionType === "printers") {
        payload = {
          brand: formData.brand || "Generico",
          model: formData.model || formData.name,
          display_name: formData.display_name || formData.name,
          paper_width_mm: Number(formData.paper_width_mm) || 80,
          technical_code: formData.technical_code || "",
          notes: formData.description || formData.notes || "",
          active: Boolean(formData.active),
          image: formData.main_image || "",
        };
      } else if (collectionType === "readers") {
        payload = {
          brand: formData.brand || "Generico",
          model: formData.model || formData.name,
          display_name: formData.display_name || formData.name,
          is_2d: Boolean(formData.is_2d),
          technical_code: formData.technical_code || "",
          notes: formData.description || formData.notes || "",
          active: Boolean(formData.active),
          image: formData.main_image || "",
        };
      }

      const success = await onSave(
        collectionType,
        isEditing ? initialItem.$id : null,
        payload
      );

      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao salvar item.");
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir Item
  const handleDelete = async () => {
    if (!initialItem?.$id || !onDelete) return;
    setIsDeleting(true);
    try {
      const success = await onDelete(collectionType, initialItem.$id);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getTitle = () => {
    const typeLabel =
      collectionType === "models"
        ? "Modelo de Gabinete"
        : collectionType === "colors"
        ? "Cor & Acabamento"
        : collectionType === "monitors"
        ? "Monitor Homologado"
        : collectionType === "printers"
        ? "Impressora Homologada"
        : "Leitor Homologado";

    return isEditing ? `Editar ${typeLabel}` : `Novo ${typeLabel}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">{getTitle()}</h2>
              <span className="text-[11px] text-slate-400 font-medium">
                {isEditing ? `ID: ${initialItem.$id}` : "Preencha os dados técnicos e comerciais"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "general"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dados Comerciais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("media")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "media"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Fotos & Mídia</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-200">
              {galleryImages.length}
            </span>
          </button>

          {collectionType === "models" && (
            <button
              type="button"
              onClick={() => setActiveTab("engineering")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === "engineering"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Engenharia CNC & Dimensões</span>
            </button>
          )}
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário com Scroll Suave */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ======================================================== */}
          {/* ABA 1: DADOS COMERCIAIS */}
          {/* ======================================================== */}
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Nome e Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nome do Produto / Elemento *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || formData.display_name || ""}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        display_name: e.target.value,
                      });
                    }}
                    placeholder="Ex: Gabinete Pedestal Totem Floor Max"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Slug Identificador
                    </label>
                    <button
                      type="button"
                      onClick={generateSlug}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Gerar Automático
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="ex: totem-floor-max"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Preço e Ordem */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {collectionType === "models" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Preço Base (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={((formData.base_price_cents || 0) / 100).toFixed(2)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          base_price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/50 rounded-xl text-indigo-300 font-extrabold text-sm focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                )}

                {collectionType === "colors" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Acréscimo Comercial (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={((formData.price_adjustment_cents || 0) / 100).toFixed(2)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_adjustment_cents: Math.round(
                            parseFloat(e.target.value || "0") * 100
                          ),
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-indigo-500/50 rounded-xl text-indigo-300 font-extrabold text-sm focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value || "1", 10),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Menor número aparece primeiro na loja (ex: 1, 2, 3...)
                  </span>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Visibilidade na Vitrine
                  </label>
                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.active)}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                    <span className="text-xs font-bold text-white">
                      {formData.active ? "Ativo no Site" : "Inativo / Oculto"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Seletor de Cores Hexadecimal (Para Cores) */}
              {collectionType === "colors" && (
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Referência de Cor (Pintura Eletrostática Epóxi)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={
                        formData.hex_reference?.startsWith("#")
                          ? formData.hex_reference
                          : "#0f172a"
                      }
                      onChange={(e) =>
                        setFormData({ ...formData, hex_reference: e.target.value })
                      }
                      className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.hex_reference || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, hex_reference: e.target.value })
                      }
                      placeholder="#0f172a ou linear-gradient(...)"
                      className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                      Cores Industriais Rápidas:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_EPOXY_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              name: formData.name ? formData.name : c.name,
                              hex_reference: c.hex,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5 transition-all"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0"
                            style={{ background: c.hex }}
                          />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Descrição Comercial */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descrição Comercial / Apelo de Venda
                </label>
                <textarea
                  rows={3}
                  value={formData.description || formData.notes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Descreva as características de acabamento, ergonomia, fechaduras de segurança e diferenciais..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 2: GALERIA DE MÚLTIPLAS IMAGENS */}
          {/* ======================================================== */}
          {activeTab === "media" && (
            <div className="space-y-5">
              {/* Adicionar Foto por URL */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Adicionar Foto à Galeria (URL de Imagem, Render 3D ou SVG)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/fotos/totem-angulo-frontal.jpg ou /models/cabinet-floor.svg"
                    className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Sugestões rápidas:</span>
                  <button
                    type="button"
                    onClick={() => setNewImageUrl("/models/cabinet-floor.svg")}
                    className="hover:text-indigo-400 underline"
                  >
                    Pedestal Floor SVG
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setNewImageUrl("/models/cabinet-wall.svg")}
                    className="hover:text-indigo-400 underline"
                  >
                    Parede Wall SVG
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setNewImageUrl("/models/cabinet-countertop.svg")}
                    className="hover:text-indigo-400 underline"
                  >
                    Balcão Countertop SVG
                  </button>
                </div>
              </div>

              {/* Grid de Imagens Cadastradas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Fotos Cadastradas ({galleryImages.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Clique em "Definir Capa" para escolher a imagem principal da vitrine
                  </span>
                </div>

                {galleryImages.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-2">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-xs">Nenhuma foto adicionada à galeria deste item ainda.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryImages.map((url, idx) => {
                      const isMain = url === formData.main_image;
                      return (
                        <div
                          key={idx}
                          className={`relative group bg-slate-950 rounded-2xl border overflow-hidden p-2 flex flex-col justify-between transition-all ${
                            isMain
                              ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10"
                              : "border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {/* Miniatura */}
                          <div className="w-full h-32 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-2 mb-2">
                            <img
                              src={url}
                              alt={`Foto ${idx + 1}`}
                              className="max-h-full max-w-full object-contain filter drop-shadow-md"
                              onError={(e) => {
                                (e.target as any).src =
                                  "https://placehold.co/400x400/0f172a/ffffff?text=Sem+Foto";
                              }}
                            />
                          </div>

                          {/* Badges e Ações */}
                          <div className="space-y-1.5">
                            {isMain ? (
                              <div className="w-full py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Foto de Capa</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetAsMainImage(url)}
                                className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-semibold transition-all"
                              >
                                Definir Capa
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="w-full py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: ENGENHARIA CNC & DIMENSÕES */}
          {/* ======================================================== */}
          {activeTab === "engineering" && collectionType === "models" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Cotas Milimétricas de Fabricação (Corte a Laser CNC)
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Altura (mm)</label>
                    <input
                      type="number"
                      value={formData.heightMm || 1650}
                      onChange={(e) =>
                        setFormData({ ...formData, heightMm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Largura (mm)</label>
                    <input
                      type="number"
                      value={formData.widthMm || 480}
                      onChange={(e) =>
                        setFormData({ ...formData, widthMm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Profundidade (mm)</label>
                    <input
                      type="number"
                      value={formData.depthMm || 380}
                      onChange={(e) =>
                        setFormData({ ...formData, depthMm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Especificação do Aço
                  </label>
                  <input
                    type="text"
                    value={formData.steelGauge || "Chapa de Aço SAE 1020 1.5mm"}
                    onChange={(e) =>
                      setFormData({ ...formData, steelGauge: e.target.value })
                    }
                    placeholder="Chapa de Aço SAE 1020 1.5mm"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Peso Estimado (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.weightKg || 25}
                    onChange={(e) =>
                      setFormData({ ...formData, weightKg: Number(e.target.value) })
                    }
                    placeholder="25"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Furação Padrão VESA Suportada
                </label>
                <input
                  type="text"
                  value={formData.vesa_pattern || "75x75 e 100x100"}
                  onChange={(e) =>
                    setFormData({ ...formData, vesa_pattern: e.target.value })
                  }
                  placeholder="75x75 e 100x100"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {isEditing && onDelete && (
                <div>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Item</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar no Appwrite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
