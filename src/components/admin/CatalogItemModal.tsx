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
  Monitor,
  Package,
  Cpu,
  Tv,
  Film,
  ExternalLink,
  Video,
} from "lucide-react";
import { InstagramVideoPlayer, InstagramGlyph } from "@/components/media";
import { parseInstagramUrl, isValidVideoUrl } from "@/lib/media/videoUtils";

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
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [instagramVideos, setInstagramVideos] = useState<string[]>([]);
  const [videoInputError, setVideoInputError] = useState("");
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

      // Imagem primária unificada (verifica tanto main_image quanto image)
      const primaryImage =
        initialItem.main_image ||
        initialItem.image ||
        (Array.isArray(parsedDimensions.images) && parsedDimensions.images[0]) ||
        "";

      // Galeria unificada
      let existingGallery: string[] = [];
      if (Array.isArray(parsedDimensions.images) && parsedDimensions.images.length > 0) {
        existingGallery = parsedDimensions.images;
      } else if (Array.isArray(parsedDimensions.galleryImages) && parsedDimensions.galleryImages.length > 0) {
        existingGallery = parsedDimensions.galleryImages;
      } else if (primaryImage) {
        existingGallery = [primaryImage];
      }

      setGalleryImages(Array.from(new Set(existingGallery)));

      // Vídeos do Instagram unificados
      let existingVideos: string[] = [];
      if (Array.isArray(parsedDimensions.videoUrls) && parsedDimensions.videoUrls.length > 0) {
        existingVideos = parsedDimensions.videoUrls;
      } else if (Array.isArray(parsedDimensions.instagramVideos) && parsedDimensions.instagramVideos.length > 0) {
        existingVideos = parsedDimensions.instagramVideos;
      } else if (Array.isArray(initialItem.videoUrls) && initialItem.videoUrls.length > 0) {
        existingVideos = initialItem.videoUrls;
      } else if (Array.isArray(initialItem.instagramVideos) && initialItem.instagramVideos.length > 0) {
        existingVideos = initialItem.instagramVideos;
      }
      setInstagramVideos(Array.from(new Set(existingVideos)));

      const loadedMaterial =
        parsedDimensions.material ||
        (parsedDimensions.steelGauge && !parsedDimensions.steelGauge.includes("SAE 1020")
          ? parsedDimensions.steelGauge
          : "MaDeFibra (MDF) BP 15mm");

      const loadedSizeInches =
        initialItem.sizeInches ||
        (initialItem.size ? parseFloat(initialItem.size) : 21.5);

      setFormData({
        name: initialItem.name || initialItem.display_name || "",
        display_name: initialItem.display_name || initialItem.name || "",
        slug: initialItem.slug || "",
        description: initialItem.description || initialItem.notes || "",
        notes: initialItem.notes || initialItem.description || "",
        base_price_cents: initialItem.base_price_cents ?? 0,
        price_adjustment_cents: initialItem.price_adjustment_cents ?? 0,
        active: initialItem.active ?? true,
        sort_order: initialItem.sort_order ?? 1,
        main_image: primaryImage,
        image: primaryImage,
        hex_reference: initialItem.hex_reference || "#0f172a",
        brand: initialItem.brand || "",
        model: initialItem.model || "",
        sizeInches: loadedSizeInches,
        size: initialItem.size || String(loadedSizeInches),
        technical_code: initialItem.technical_code || "",
        vesa_pattern: initialItem.vesa_pattern || "100x100",
        paper_width_mm: initialItem.paper_width_mm || 80,
        is_2d: initialItem.is_2d ?? true,
        // Dimensões de engenharia
        heightMm: parsedDimensions.heightMm || 1650,
        widthMm: parsedDimensions.widthMm || 480,
        depthMm: parsedDimensions.depthMm || 380,
        material: loadedMaterial,
        steelGauge: loadedMaterial,
        weightKg: parsedDimensions.weightKg || initialItem.weightKg || 25,
        packageHeightCm: parsedDimensions.package?.heightCm || 90,
        packageWidthCm: parsedDimensions.package?.widthCm || 48,
        packageDepthCm: parsedDimensions.package?.depthCm || 25,
        packageGrossWeightKg: parsedDimensions.package?.grossWeightKg || 16,
        supportedScreenSizes: parsedDimensions.supportedScreenSizes || "15.6\" a 23.8\"",
        printerSlot: parsedDimensions.printerSlot || "80mm / 58mm",
        readerSlot: parsedDimensions.readerSlot || "2D / QR Code",
      });
    } else {
      // Padrões para novo item
      const defaultImg =
        collectionType === "models"
          ? "/models/cabinet-floor.svg"
          : "";
      setGalleryImages(defaultImg ? [defaultImg] : []);
      setInstagramVideos([]);
      setFormData({
        name: "",
        display_name: "",
        slug: "",
        description: "",
        notes: "",
        base_price_cents: collectionType === "models" ? 129000 : 0,
        price_adjustment_cents: 0,
        active: true,
        sort_order: 1,
        main_image: defaultImg,
        image: defaultImg,
        hex_reference: "#0f172a",
        brand: collectionType === "monitors" ? "Elgin" : "Totem Pro",
        model: "",
        sizeInches: 21.5,
        size: "21.5",
        technical_code: "TP-" + Math.floor(1000 + Math.random() * 9000),
        vesa_pattern: "100x100",
        paper_width_mm: 80,
        is_2d: true,
        heightMm: 1650,
        widthMm: 480,
        depthMm: 380,
        material: "MaDeFibra (MDF) BP 15mm",
        steelGauge: "MaDeFibra (MDF) BP 15mm",
        weightKg: 25,
        packageHeightCm: 90,
        packageWidthCm: 48,
        packageDepthCm: 25,
        packageGrossWeightKg: 16,
        supportedScreenSizes: "15.6\" a 23.8\"",
        printerSlot: "80mm / 58mm",
        readerSlot: "2D / QR Code",
      });
    }

    setConfirmDelete(false);
    setErrorMessage("");
    setActiveTab("general");
    setNewImageUrl("");
    setNewVideoUrl("");
    setVideoInputError("");
  }, [isOpen, initialItem, collectionType]);

  if (!isOpen) return null;

  // Auto-gerar slug a partir do nome
  const generateSlug = () => {
    const raw =
      formData.slug ||
      formData.name ||
      formData.display_name ||
      (formData.brand && formData.model ? `${formData.brand}-${formData.model}` : "") ||
      "";
    const clean = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setFormData((prev) => ({ ...prev, slug: clean }));
    return clean;
  };

  // Adicionar imagem à galeria
  const handleAddImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (!galleryImages.includes(url)) {
      const updated = [...galleryImages, url];
      setGalleryImages(updated);
      setFormData((prev) => ({
        ...prev,
        main_image: prev.main_image || url,
        image: prev.image || url,
      }));
    }
    setNewImageUrl("");
  };

  // Remover foto da galeria
  const handleRemoveImage = (indexToRemove: number) => {
    const removedUrl = galleryImages[indexToRemove];
    const updated = galleryImages.filter((_, idx) => idx !== indexToRemove);
    setGalleryImages(updated);
    if (removedUrl === formData.main_image || removedUrl === formData.image) {
      const nextImg = updated[0] || "";
      setFormData((prev) => ({ ...prev, main_image: nextImg, image: nextImg }));
    }
  };

  // Definir foto como Capa Principal
  const handleSetAsMainImage = (url: string) => {
    setGalleryImages((prev) => [url, ...prev.filter((u) => u !== url)]);
    setFormData((prev) => ({ ...prev, main_image: url, image: url }));
  };

  // Adicionar Vídeo do Instagram
  const handleAddInstagramVideo = () => {
    const url = newVideoUrl.trim();
    if (!url) return;
    setVideoInputError("");

    if (!isValidVideoUrl(url)) {
      setVideoInputError("Insira um link válido do Instagram (Reels ou Post) ou link de arquivo de vídeo.");
      return;
    }

    if (!instagramVideos.includes(url)) {
      setInstagramVideos((prev) => [...prev, url]);
    }
    setNewVideoUrl("");
  };

  // Remover Vídeo do Instagram
  const handleRemoveInstagramVideo = (indexToRemove: number) => {
    setInstagramVideos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Salvar Item
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");

    try {
      // Se o usuário digitou uma URL no campo de nova foto mas não clicou em 'Adicionar' antes de salvar:
      let finalGallery = [...galleryImages];
      if (newImageUrl.trim() && !finalGallery.includes(newImageUrl.trim())) {
        finalGallery.push(newImageUrl.trim());
      }

      // Se o usuário digitou uma URL de vídeo mas não clicou em 'Adicionar':
      let finalVideos = [...instagramVideos];
      if (newVideoUrl.trim() && isValidVideoUrl(newVideoUrl.trim()) && !finalVideos.includes(newVideoUrl.trim())) {
        finalVideos.push(newVideoUrl.trim());
      }

      const primaryImg =
        formData.main_image ||
        formData.image ||
        finalGallery[0] ||
        "";

      const effectiveSlug =
        formData.slug?.trim() ||
        generateSlug() ||
        `${collectionType}-${Date.now()}`;

      // Monta payload de acordo com a coleção
      let payload: Record<string, any> = {};

      if (collectionType === "models") {
        if (!formData.name) throw new Error("O nome do modelo de gabinete é obrigatório.");

        const materialValue = formData.material || "MaDeFibra (MDF) BP 15mm";
        const dimensionsObj = {
          heightMm: Number(formData.heightMm) || 0,
          widthMm: Number(formData.widthMm) || 0,
          depthMm: Number(formData.depthMm) || 0,
          material: materialValue,
          steelGauge: materialValue,
          weightKg: Number(formData.weightKg) || 0,
          vesaPattern: formData.vesa_pattern || "100x100",
          supportedScreenSizes: formData.supportedScreenSizes || "15.6\" a 23.8\"",
          printerSlot: formData.printerSlot || "80mm / 58mm",
          readerSlot: formData.readerSlot || "2D / QR Code",
          package: {
            heightCm: Number(formData.packageHeightCm) || 90,
            widthCm: Number(formData.packageWidthCm) || 48,
            depthCm: Number(formData.packageDepthCm) || 25,
            grossWeightKg: Number(formData.packageGrossWeightKg) || 16,
          },
          images: finalGallery.length > 0 ? finalGallery : [primaryImg || "/models/cabinet-floor.svg"],
          videoUrls: finalVideos,
          instagramVideos: finalVideos,
        };

        payload = {
          name: formData.name,
          slug: effectiveSlug,
          description: formData.description || formData.notes || "",
          base_price_cents: Number(formData.base_price_cents) || 0,
          active: Boolean(formData.active),
          sort_order: Number(formData.sort_order) || 1,
          main_image: primaryImg || "/models/cabinet-floor.svg",
          dimensions_json: JSON.stringify(dimensionsObj),
        };
      } else if (collectionType === "colors") {
        if (!formData.name) throw new Error("O nome do acabamento/cor é obrigatório.");
        payload = {
          name: formData.name,
          slug: effectiveSlug,
          hex_reference: formData.hex_reference || "#0f172a",
          price_adjustment_cents: Number(formData.price_adjustment_cents) || 0,
          active: Boolean(formData.active),
          sort_order: Number(formData.sort_order) || 1,
          description: formData.description || formData.notes || "",
          image: primaryImg || "",
        };
      } else if (collectionType === "monitors") {
        const brand = formData.brand || "Generico";
        const model = formData.model || formData.name || "Display Padrão";
        const sizeInches = Number(formData.sizeInches) || Number(formData.size) || 21.5;
        const displayName = formData.display_name || formData.name || `${brand} ${model} ${sizeInches}"`;

        payload = {
          brand,
          model,
          display_name: displayName,
          slug: effectiveSlug,
          size: String(sizeInches),
          vesa_pattern: formData.vesa_pattern || "100x100",
          technical_code:
            formData.technical_code ||
            `${brand.substring(0, 3).toUpperCase()}-${model.replace(/[^a-zA-Z0-9]/g, "").substring(0, 5).toUpperCase() || "MON"}-V100`,
          notes: formData.description || formData.notes || "",
          active: Boolean(formData.active),
          sort_order: Number(formData.sort_order) || 1,
          image: primaryImg || "",
        };
      } else if (collectionType === "printers") {
        const brand = formData.brand || "Generico";
        const model = formData.model || formData.name || "Térmica Padrão";
        const displayName = formData.display_name || formData.name || `${brand} ${model}`;

        payload = {
          brand,
          model,
          display_name: displayName,
          slug: effectiveSlug,
          paper_width_mm: Number(formData.paper_width_mm) || 80,
          technical_code: formData.technical_code || "",
          notes: formData.description || formData.notes || "",
          active: Boolean(formData.active),
          sort_order: Number(formData.sort_order) || 1,
          image: primaryImg || "",
        };
      } else if (collectionType === "readers") {
        const brand = formData.brand || "Generico";
        const model = formData.model || formData.name || "Leitor 2D";
        const displayName = formData.display_name || formData.name || `${brand} ${model}`;

        payload = {
          brand,
          model,
          display_name: displayName,
          slug: effectiveSlug,
          is_2d: Boolean(formData.is_2d),
          technical_code: formData.technical_code || "",
          notes: formData.description || formData.notes || "",
          active: Boolean(formData.active),
          sort_order: Number(formData.sort_order) || 1,
          image: primaryImg || "",
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
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-200" title="Fotos">
                📷 {galleryImages.length}
              </span>
              {instagramVideos.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold" title="Vídeos Instagram">
                  🎬 {instagramVideos.length}
                </span>
              )}
            </div>
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

              {/* ======================================================== */}
              {/* CAMPOS ESPECÍFICOS: MONITORES HOMOLOGADOS */}
              {/* ======================================================== */}
              {collectionType === "monitors" && (
                <div className="p-4 bg-slate-950/90 rounded-2xl border border-indigo-500/40 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">
                          Especificações Técnicas do Display (Usinagem CNC)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Medidas e furação VESA para o rasgo milimétrico na Router CNC
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Furação Homologada (+ R$ 0)
                    </span>
                  </div>

                  {/* Marca e Modelo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Marca do Fabricante *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.brand || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, brand: e.target.value })
                        }
                        placeholder="Ex: Elgin, Gertec, Bematech, Prolan, Samsung, LG..."
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {["Elgin", "Gertec", "Bematech", "Prolan", "Samsung", "LG", "AOC", "Dell"].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setFormData({ ...formData, brand: b })}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                              formData.brand === b
                                ? "bg-indigo-600/30 text-indigo-300 border-indigo-500"
                                : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Modelo do Display *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.model || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                        placeholder="Ex: Aytek AIO-T5214, TS-150, Flatron..."
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Modelo comercial completo do aparelho
                      </span>
                    </div>
                  </div>

                  {/* Polegadas e Padrão VESA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Tamanho da Tela (Polegadas) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={formData.sizeInches || 21.5}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sizeInches: parseFloat(e.target.value || "21.5"),
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-indigo-500/50 rounded-xl text-indigo-300 font-extrabold text-sm focus:border-indigo-400 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[15.6, 18.5, 21.5, 23.8, 27.0, 32.0].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setFormData({ ...formData, sizeInches: sz })}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                              formData.sizeInches === sz
                                ? "bg-indigo-600/30 text-indigo-300 border-indigo-500"
                                : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                            }`}
                          >
                            {sz}"
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Padrão VESA (Furação) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.vesa_pattern || "100x100"}
                        onChange={(e) =>
                          setFormData({ ...formData, vesa_pattern: e.target.value })
                        }
                        placeholder="Ex: 75x75, 100x100..."
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {["75x75", "100x100", "200x100", "200x200"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setFormData({ ...formData, vesa_pattern: v })}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                              formData.vesa_pattern === v
                                ? "bg-indigo-600/30 text-indigo-300 border-indigo-500"
                                : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Código Técnico CNC
                      </label>
                      <input
                        type="text"
                        value={formData.technical_code || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, technical_code: e.target.value })
                        }
                        placeholder="Ex: ELG-M215-V100"
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Identificador da furação CNC
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS: IMPRESSORAS */}
              {collectionType === "printers" && (
                <div className="p-4 bg-slate-950/90 rounded-2xl border border-emerald-500/30 space-y-4">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Especificações da Impressora Térmica
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={formData.brand || ""}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="Ex: EPSON, Elgin, Bematech..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Largura da Bobina (mm)
                      </label>
                      <select
                        value={formData.paper_width_mm || 80}
                        onChange={(e) =>
                          setFormData({ ...formData, paper_width_mm: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                      >
                        <option value={80}>80mm (Padrão Guilhotina)</option>
                        <option value={58}>58mm (Compacta)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Código Técnico CNC
                      </label>
                      <input
                        type="text"
                        value={formData.technical_code || ""}
                        onChange={(e) => setFormData({ ...formData, technical_code: e.target.value })}
                        placeholder="Ex: EPS-T20X-CUT80"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                      const isMain =
                        url === formData.main_image ||
                        url === formData.image ||
                        (!formData.main_image && !formData.image && idx === 0);
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

              {/* ======================================================== */}
              {/* SEÇÃO EXCLUSIVA: VÍDEOS DO INSTAGRAM & DEMONSTRAÇÕES */}
              {/* ======================================================== */}
              <div className="pt-4 border-t border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-md shadow-rose-500/20 text-white">
                      <InstagramGlyph className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Vídeos do Instagram & Demonstrações Reais
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Carregue e reproduza Reels ou publicações diretamente no site ou com redirecionamento ao app
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                    Instagram Reels
                  </span>
                </div>

                {/* Campo de Inclusão de Vídeo */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-rose-500/30 space-y-3 shadow-inner">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Adicionar Link de Vídeo do Instagram (Reels, Post ou Vídeo)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newVideoUrl}
                      onChange={(e) => {
                        setNewVideoUrl(e.target.value);
                        if (videoInputError) setVideoInputError("");
                      }}
                      placeholder="https://www.instagram.com/reel/C-exemplo/ ou link do post"
                      className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddInstagramVideo}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/20 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Vídeo</span>
                    </button>
                  </div>

                  {videoInputError && (
                    <div className="text-rose-400 text-xs flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{videoInputError}</span>
                    </div>
                  )}

                  {/* Sugestões Rápidas de Vídeo */}
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400 items-center">
                    <span className="font-semibold text-slate-300">Sugestão de Reels Oficial:</span>
                    <button
                      type="button"
                      onClick={() => setNewVideoUrl("https://www.instagram.com/p/Dct5wckmKlZ/")}
                      className="hover:text-rose-400 underline font-medium text-rose-300/90"
                    >
                      Totem X-Point Oficial (Reels)
                    </button>
                  </div>
                </div>

                {/* Grid de Vídeos do Instagram Cadastrados */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Vídeos Vinculados ({instagramVideos.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Disponíveis no visualizador do configurador e na vitrine
                    </span>
                  </div>

                  {instagramVideos.length === 0 ? (
                    <div className="py-8 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-2">
                      <Film className="w-7 h-7 opacity-40 text-rose-400" />
                      <span className="text-xs">Nenhum vídeo do Instagram vinculado a este modelo ainda.</span>
                      <span className="text-[10px] text-slate-600">Adicione links de Reels acima para exibir vídeos em alta conversão.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {instagramVideos.map((videoUrl, vIdx) => {
                        const parsed = parseInstagramUrl(videoUrl);
                        return (
                          <div
                            key={vIdx}
                            className="bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 p-3 flex flex-col justify-between space-y-3 transition-all shadow-md group"
                          >
                            <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80">
                              <InstagramVideoPlayer
                                url={videoUrl}
                                compact={true}
                                showDirectButton={false}
                                className="h-full w-full"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  <InstagramGlyph className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Vídeo #{vIdx + 1}</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                                  {parsed.shortcode ? `ID: ${parsed.shortcode}` : "Vídeo Externo"}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono text-slate-500 truncate" title={videoUrl}>
                                {videoUrl}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <a
                                href={parsed.canonicalUrl || videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                              >
                                <span>Testar no Instagram</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveInstagramVideo(vIdx)}
                                className="py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
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
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: ENGENHARIA CNC & DIMENSÕES */}
          {/* ======================================================== */}
          {activeTab === "engineering" && collectionType === "models" && (
            <div className="space-y-4">
              {/* Material Estrutural */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Material Estrutural do Gabinete (CNC Router)
                  </span>
                  <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    Sustentável & Leve
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Material Base de Usinagem
                    </label>
                    <select
                      value={formData.material || "MaDeFibra (MDF) BP 15mm"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          material: e.target.value,
                          steelGauge: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="MaDeFibra (MDF) BP 15mm">MaDeFibra (MDF) BP 15mm (Padrão de Fábrica)</option>
                      <option value="MDF Ultra Hidrófugo 15mm">MDF Ultra Hidrófugo 15mm (Anti-umidade)</option>
                      <option value="Compensado Naval 15mm">Compensado Naval Calibrado 15mm</option>
                      <option value="Aço Carbono / Inox Especial">Aço Carbono / Inox Especial</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Peso Líquido do Totem (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weightKg || 14.5}
                      onChange={(e) =>
                        setFormData({ ...formData, weightKg: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cotas Milimétricas CNC */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Cotas Milimétricas de Fabricação (Router CNC de Precisão)
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Altura (mm)</label>
                    <input
                      type="number"
                      value={formData.heightMm || 900}
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
                      value={formData.widthMm || 420}
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
                      value={formData.depthMm || 210}
                      onChange={(e) =>
                        setFormData({ ...formData, depthMm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Embalagem & Logística para Frete */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Embalagem & Logística (Cálculo Autoritativo de Frete Correios / Transportadora)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Alt. Caixa (cm)</label>
                    <input
                      type="number"
                      value={formData.packageHeightCm || 90}
                      onChange={(e) =>
                        setFormData({ ...formData, packageHeightCm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Larg. Caixa (cm)</label>
                    <input
                      type="number"
                      value={formData.packageWidthCm || 48}
                      onChange={(e) =>
                        setFormData({ ...formData, packageWidthCm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Prof. Caixa (cm)</label>
                    <input
                      type="number"
                      value={formData.packageDepthCm || 25}
                      onChange={(e) =>
                        setFormData({ ...formData, packageDepthCm: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Peso Bruto (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.packageGrossWeightKg || 16.0}
                      onChange={(e) =>
                        setFormData({ ...formData, packageGrossWeightKg: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-amber-300 font-mono text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Compatibilidade de Periféricos & Furação */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Compatibilidade de Periféricos & Furação VESA
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Telas Suportadas
                    </label>
                    <input
                      type="text"
                      value={formData.supportedScreenSizes || "15.6\" a 23.8\""}
                      onChange={(e) =>
                        setFormData({ ...formData, supportedScreenSizes: e.target.value })
                      }
                      placeholder="15.6 a 23.8"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Furação Padrão VESA
                    </label>
                    <input
                      type="text"
                      value={formData.vesa_pattern || "75x75 e 100x100"}
                      onChange={(e) =>
                        setFormData({ ...formData, vesa_pattern: e.target.value })
                      }
                      placeholder="75x75 e 100x100"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Gaveta de Impressora Térmica
                    </label>
                    <input
                      type="text"
                      value={formData.printerSlot || "80mm / 58mm com guilhotina"}
                      onChange={(e) =>
                        setFormData({ ...formData, printerSlot: e.target.value })
                      }
                      placeholder="80mm / 58mm"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Berço de Leitor 2D / QR Code
                    </label>
                    <input
                      type="text"
                      value={formData.readerSlot || "2D / QR Code / Boletos"}
                      onChange={(e) =>
                        setFormData({ ...formData, readerSlot: e.target.value })
                      }
                      placeholder="2D / QR Code"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
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
