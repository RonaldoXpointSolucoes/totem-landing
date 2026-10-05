"use client";

import React, { useState } from "react";
import { CABINET_MODELS } from "@/modules/catalog/catalogData";
import { formatBRL } from "@/modules/pricing/pricingEngine";
import { Card, Button, Badge } from "@/components/ui";
import { ArrowRight, Maximize2, Shield, Wrench, Play } from "lucide-react";
import { InstagramVideoModal, InstagramGlyph } from "@/components/media";

interface ModelsSectionProps {
  onSelectModelToConfigure: (modelId: string) => void;
}

export const ModelsSection: React.FC<ModelsSectionProps> = ({
  onSelectModelToConfigure,
}) => {
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentModelName, setCurrentModelName] = useState("");

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
          {CABINET_MODELS.map((model) => {
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
                <div>
                  {/* Imagem do Modelo com Botão de Vídeo Instagram */}
                  <div className="relative aspect-[3/4] w-full rounded-2xl bg-[#f5f5f7] dark:bg-slate-950/70 border border-black/5 dark:border-slate-800/80 p-6 flex items-center justify-center mb-6 overflow-hidden group">
                    <img
                      src={model.mainImage}
                      alt={model.name}
                      className="h-full w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
                    />

                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-slate-900/90 border border-black/5 dark:border-slate-800 px-2.5 py-0.5 rounded-full shadow-sm">
                        {model.slug === "floor" ? "Mais Popular" : "Sob Medida"}
                      </span>
                    </div>

                    {/* Botão de Ver Vídeo Real do Instagram */}
                    {videoUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVideo(model.name, videoUrl);
                        }}
                        className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold shadow-lg flex items-center gap-1.5 border border-rose-500/40 backdrop-blur-md transition-all hover:scale-105 active:scale-95 z-10 cursor-pointer"
                        title="Assistir Reels do Produto"
                      >
                        <InstagramGlyph className="w-3.5 h-3.5 text-rose-400" />
                        <span>Ver Vídeo Real</span>
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
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 py-2 border-y border-black/5 dark:border-slate-800/60 mb-4">
                      <Maximize2 className="w-3.5 h-3.5 text-[#0071e3] dark:text-indigo-400" />
                      <span>
                        {model.dimensions.heightMm}mm (A) × {model.dimensions.widthMm}mm (L) ×{" "}
                        {model.dimensions.depthMm}mm (P)
                      </span>
                    </div>
                  )}
                </div>

                {/* Preço e Botão de Ação */}
                <div className="pt-2">
                  <div className="mb-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Preço inicial</span>
                    <p className="text-xl font-extrabold text-[#1d1d1f] dark:text-white">
                      {formatBRL(model.basePriceCents)}
                    </p>
                  </div>
                  <button
                    className="w-full py-3 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-bold flex items-center justify-between transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-95 group cursor-pointer"
                    onClick={() => onSelectModelToConfigure(model.id)}
                  >
                    <span>Configurar Este</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
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

