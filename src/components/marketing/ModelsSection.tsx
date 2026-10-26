"use client";

import React, { useState, useEffect } from "react";
import { CABINET_MODELS } from "@/modules/catalog/catalogData";
import { CabinetModel } from "@/types/catalog";
import { Card, Badge } from "@/components/ui";
import { ArrowRight, Maximize2 } from "lucide-react";
import { InstagramVideoModal, InstagramGlyph, ModelImageCarousel } from "@/components/media";
import { PriceTag } from "@/components/pricing/PriceTag";

interface ModelsSectionProps {
  onSelectModelToConfigure: (modelId: string) => void;
}

export const ModelsSection: React.FC<ModelsSectionProps> = ({
  onSelectModelToConfigure,
}) => {
  const [models, setModels] = useState<CabinetModel[]>(CABINET_MODELS);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentModelName, setCurrentModelName] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicCatalog() {
      try {
        const res = await fetch("/api/catalog");
        const json = await res.json();
        if (
          isMounted &&
          json.ok &&
          Array.isArray(json.data?.cabinetModels) &&
          json.data.cabinetModels.length > 0
        ) {
          setModels((prevModels) =>
            json.data.cabinetModels.map((serverModel: CabinetModel) => {
              const localModel = prevModels.find(
                (m) => m.id === serverModel.id || m.slug === serverModel.slug
              );
              if (!localModel) return serverModel;

              // Extrai os vídeos do servidor (Appwrite) ou mantém os locais
              const serverVideos =
                (Array.isArray(serverModel.videoUrls) && serverModel.videoUrls.length > 0
                  ? serverModel.videoUrls
                  : Array.isArray(serverModel.instagramVideos) && serverModel.instagramVideos.length > 0
                  ? serverModel.instagramVideos
                  : Array.isArray(serverModel.dimensions?.videoUrls) && serverModel.dimensions.videoUrls.length > 0
                  ? serverModel.dimensions.videoUrls
                  : Array.isArray(serverModel.dimensions?.instagramVideos) && serverModel.dimensions.instagramVideos.length > 0
                  ? serverModel.dimensions.instagramVideos
                  : null);

              const localVideos =
                localModel.videoUrls && localModel.videoUrls.length > 0
                  ? localModel.videoUrls
                  : localModel.instagramVideos || [];

              const effectiveVideos = serverVideos && serverVideos.length > 0 ? serverVideos : localVideos;

              return {
                ...localModel,
                ...serverModel,
                // Preserva fotos reais em alta resolução se o servidor tiver apenas SVG provisório
                mainImage:
                  serverModel.mainImage && !serverModel.mainImage.endsWith(".svg")
                    ? serverModel.mainImage
                    : localModel.mainImage || serverModel.mainImage,
                images:
                  Array.isArray(serverModel.images) &&
                  serverModel.images.length > 0 &&
                  !serverModel.images[0].endsWith(".svg")
                    ? serverModel.images
                    : localModel.images || serverModel.images,
                videoUrls: effectiveVideos,
                instagramVideos: effectiveVideos,
              };
            })
          );
        }
      } catch (err) {
        console.warn("Falha ao carregar catálogo dinâmico em ModelsSection:", err);
      }
    }
    loadDynamicCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenVideo = (name: string, url: string) => {
    setCurrentModelName(name);
    setCurrentVideoUrl(url);
    setVideoModalOpen(true);
  };

  return (
    <section id="modelos" className="py-16 md:py-24 border-t border-black/5 dark:border-slate-800/80 bg-[#fbfbfd] dark:bg-[#090a0f] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="primary" className="text-xs">
            Modelos de Linha
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight">
            Escolha o formato ideal para seu espaço
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Três plataformas projetadas com padrões industriais, rigidez estrutural e fácil manutenção.
          </p>
        </div>

        {/* Grid dos Modelos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {models.map((model) => {
            const videoUrl =
              model.videoUrls?.[0] ||
              model.instagramVideos?.[0] ||
              model.dimensions?.videoUrls?.[0] ||
              model.dimensions?.instagramVideos?.[0] ||
              "";

            return (
              <Card
                key={model.id}
                interactive
                className="flex flex-col justify-between p-6 rounded-[28px] border border-black/5 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-lg dark:shadow-2xl transition-all hover:shadow-xl dark:hover:border-slate-700"
              >
                {/* Imagem do Modelo com Carrossel de Fotos Reais */}
                <div className="relative aspect-[3/4] w-full rounded-2xl bg-[#f5f5f7] dark:bg-slate-950/70 border border-black/5 dark:border-slate-800/80 p-3 sm:p-5 flex items-center justify-center mb-6 overflow-hidden group">
                  <ModelImageCarousel
                    images={
                      Array.isArray(model.images) && model.images.length > 0
                        ? model.images
                        : [model.mainImage]
                    }
                    alt={model.name}
                    intervalMs={10000}
                    className="h-full w-full"
                    showDots={true}
                    showArrows={true}
                    showCounter={true}
                  />

                  <span className="absolute top-3 right-3 z-20 pointer-events-none text-[11px] font-bold text-slate-800 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 border border-black/10 dark:border-slate-700 px-2.5 py-0.5 rounded-full shadow-sm">
                    {model.slug === "floor" || model.id === "cabinet-floor" ? "Mais Popular" : "Sob Medida"}
                  </span>

                  {/* Botão de Ver Vídeo Real do Instagram */}
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenVideo(model.name, videoUrl);
                      }}
                      className="absolute bottom-2.5 left-3 px-3 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5 border border-rose-500/40 transition-all hover:scale-105 active:scale-95 z-20 cursor-pointer"
                      title="Assistir Reels do Produto"
                    >
                      <InstagramGlyph className="w-3.5 h-3.5 text-rose-400" />
                      Ver Vídeo Real
                    </button>
                  )}
                </div>

                {/* Título e Descrição */}
                <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-white mb-2">{model.name}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {model.description}
                </p>

                {/* Especificações Rápidas */}
                {model.dimensions && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 py-2 border-y border-black/5 dark:border-slate-800/60 mb-4">
                    <Maximize2 className="w-3.5 h-3.5 text-[#0058b6] dark:text-indigo-400" />
                    {model.dimensions.heightMm}mm (A) × {model.dimensions.widthMm}mm (L) ×{" "}
                    {model.dimensions.depthMm}mm (P)
                  </div>
                )}

                {/* Preço e Botão de Ação */}
                <PriceTag
                  pixPriceCents={
                    model.pixPriceCents ||
                    (model.basePriceCents >= 120000
                      ? Math.round(model.basePriceCents * 0.825)
                      : model.basePriceCents)
                  }
                  cardPriceCents={model.basePriceCents}
                  anchorPriceCents={model.anchorPriceCents}
                  installments={model.maxInstallments || 10}
                  size="md"
                  className="mt-auto mb-4 pt-2"
                />

                <button
                  className="w-full py-3 px-4 rounded-full bg-[#0062cc] hover:bg-[#0051a8] text-white text-xs font-bold flex items-center justify-between transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-95 group cursor-pointer"
                  onClick={() => onSelectModelToConfigure(model.id)}
                >
                  Configurar Este
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal de Vídeo do Instagram */}
      <InstagramVideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoUrl={currentVideoUrl}
        productName={currentModelName}
      />
    </section>
  );
};
