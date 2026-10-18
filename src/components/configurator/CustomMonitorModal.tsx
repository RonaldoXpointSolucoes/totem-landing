"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MonitorOption, CustomMonitorDimensions } from "@/types/catalog";
import {
  X,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Link2,
  Ruler,
  Monitor,
  Sparkles,
  Scan,
  Info,
  Wand2,
  Layers,
} from "lucide-react";

interface CustomMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonitor?: MonitorOption | null;
  onSave: (customMonitor: MonitorOption) => void;
}

const COMMON_BRANDS = [
  "Samsung",
  "LG",
  "AOC",
  "Dell",
  "Acer",
  "Asus",
  "Philips",
  "Elgin",
  "Gertec",
  "Bematech",
  "Positivo",
  "Prolan",
];

const COMMON_SIZES: {
  inches: number;
  outerW: number;
  outerH: number;
  screenW: number;
  screenH: number;
  bezelTop: number;
  bezelBottom: number;
  bezelSide: number;
  depth: number;
}[] = [
  { inches: 15.6, outerW: 36.5, outerH: 22.5, screenW: 34.5, screenH: 19.5, bezelTop: 1.0, bezelBottom: 2.0, bezelSide: 1.0, depth: 3.8 },
  { inches: 18.5, outerW: 43.0, outerH: 26.0, screenW: 41.0, screenH: 23.0, bezelTop: 1.0, bezelBottom: 2.0, bezelSide: 1.0, depth: 4.2 },
  { inches: 21.5, outerW: 49.6, outerH: 30.0, screenW: 47.6, screenH: 27.0, bezelTop: 1.0, bezelBottom: 2.0, bezelSide: 1.0, depth: 4.5 },
  { inches: 23.8, outerW: 54.0, outerH: 32.6, screenW: 52.0, screenH: 29.6, bezelTop: 1.0, bezelBottom: 2.0, bezelSide: 1.0, depth: 4.5 },
  { inches: 27.0, outerW: 61.8, outerH: 36.6, screenW: 59.8, screenH: 33.6, bezelTop: 1.0, bezelBottom: 2.0, bezelSide: 1.0, depth: 4.8 },
  { inches: 32.0, outerW: 72.8, outerH: 43.0, screenW: 70.8, screenH: 40.0, bezelTop: 1.0, bezelBottom: 2.0, bezelSide: 1.0, depth: 5.2 },
];

const COMMON_VESA = ["100x100", "75x75", "200x100", "200x200", "Sem VESA"];

type FocusZone = "all" | "outer" | "screen" | "bezel";

export const CustomMonitorModal: React.FC<CustomMonitorModalProps> = ({
  isOpen,
  onClose,
  initialMonitor,
  onSave,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isDiagramExpanded, setIsDiagramExpanded] = useState(false);
  const [activeZone, setActiveZone] = useState<FocusZone>("all");

  // Dados de Identificação
  const [brand, setBrand] = useState("Samsung");
  const [model, setModel] = useState("");
  const [sizeInches, setSizeInches] = useState<number>(21.5);
  const [vesaPattern, setVesaPattern] = useState("100x100");
  const [productUrl, setProductUrl] = useState("");

  // 1. Medida Inteira do Monitor (Carcaça Externa em cm)
  const [outerWidthCm, setOuterWidthCm] = useState<number>(49.6);
  const [outerHeightCm, setOuterHeightCm] = useState<number>(30.0);
  const [depthCm, setDepthCm] = useState<number>(4.5);

  // 2. Medida da Tela Visível (Área de Corte Frontal em cm)
  const [screenWidthCm, setScreenWidthCm] = useState<number>(47.6);
  const [screenHeightCm, setScreenHeightCm] = useState<number>(27.0);

  // 3. Medida das 4 Barras / Bordas (Moldura entre a Tela e o Monitor em cm)
  const [bezelTopCm, setBezelTopCm] = useState<number>(1.0);
  const [bezelBottomCm, setBezelBottomCm] = useState<number>(2.0);
  const [bezelLeftCm, setBezelLeftCm] = useState<number>(1.0);
  const [bezelRightCm, setBezelRightCm] = useState<number>(1.0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const existing = initialMonitor?.customDimensions;
    const initInches = initialMonitor?.sizeInches || 21.5;
    const preset =
      COMMON_SIZES.find((s) => Math.abs(s.inches - initInches) < 0.5) || COMMON_SIZES[2];

    setBrand(initialMonitor?.brand || "Samsung");
    setModel(initialMonitor?.isCustom ? initialMonitor.model : "");
    setSizeInches(initInches);
    setVesaPattern(initialMonitor?.vesaPattern || "100x100");
    setProductUrl(existing?.productUrl || "");

    setOuterWidthCm(existing?.outerWidthCm ?? preset.outerW);
    setOuterHeightCm(existing?.outerHeightCm ?? preset.outerH);
    setDepthCm(existing?.depthCm ?? preset.depth);

    setScreenWidthCm(existing?.screenWidthCm ?? preset.screenW);
    setScreenHeightCm(existing?.screenHeightCm ?? preset.screenH);

    setBezelTopCm(existing?.bezelTopCm ?? preset.bezelTop);
    setBezelBottomCm(existing?.bezelBottomCm ?? preset.bezelBottom);
    setBezelLeftCm(existing?.bezelLeftCm ?? preset.bezelSide);
    setBezelRightCm(existing?.bezelRightCm ?? preset.bezelSide);
    setActiveZone("all");
    setIsDiagramExpanded(false);
  }, [isOpen, initialMonitor]);

  // Aplica preset ao clicar em um tamanho de polegadas
  const handleSelectSizePreset = (inches: number) => {
    setSizeInches(inches);
    const preset = COMMON_SIZES.find((s) => s.inches === inches);
    if (preset) {
      setOuterWidthCm(preset.outerW);
      setOuterHeightCm(preset.outerH);
      setScreenWidthCm(preset.screenW);
      setScreenHeightCm(preset.screenH);
      setBezelTopCm(preset.bezelTop);
      setBezelBottomCm(preset.bezelBottom);
      setBezelLeftCm(preset.bezelSide);
      setBezelRightCm(preset.bezelSide);
      setDepthCm(preset.depth);
    }
  };

  // Recalcula a área de corte da tela com base na medida inteira menos as 4 barras
  const handleSyncScreenFromBezels = () => {
    const calcW = Number(Math.max(10, outerWidthCm - bezelLeftCm - bezelRightCm).toFixed(1));
    const calcH = Number(Math.max(10, outerHeightCm - bezelTopCm - bezelBottomCm).toFixed(1));
    setScreenWidthCm(calcW);
    setScreenHeightCm(calcH);
    setActiveZone("screen");
  };

  // Recalcula a medida externa inteira somando a tela visível + as 4 barras
  const handleSyncOuterFromScreenAndBezels = () => {
    const calcOuterW = Number((screenWidthCm + bezelLeftCm + bezelRightCm).toFixed(1));
    const calcOuterH = Number((screenHeightCm + bezelTopCm + bezelBottomCm).toFixed(1));
    setOuterWidthCm(calcOuterW);
    setOuterHeightCm(calcOuterH);
    setActiveZone("outer");
  };

  // Aplica perfil rápido de bordas (barras) e recalcula a tela
  const handleApplyBezelProfile = (top: number, bottom: number, left: number, right: number) => {
    setBezelTopCm(top);
    setBezelBottomCm(bottom);
    setBezelLeftCm(left);
    setBezelRightCm(right);
    const calcW = Number(Math.max(10, outerWidthCm - left - right).toFixed(1));
    const calcH = Number(Math.max(10, outerHeightCm - top - bottom).toFixed(1));
    setScreenWidthCm(calcW);
    setScreenHeightCm(calcH);
    setActiveZone("bezel");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBrand = brand.trim() || "Sob Medida";
    const cleanModel = model.trim() || "Monitor Personalizado";
    const cleanInches = sizeInches || 21.5;
    const cleanVesa = vesaPattern.trim() || "100x100";
    const cleanUrl = productUrl.trim();

    const customDimensions: CustomMonitorDimensions = {
      outerWidthCm: Number(outerWidthCm) || 49.6,
      outerHeightCm: Number(outerHeightCm) || 30.0,
      depthCm: Number(depthCm) || 4.5,
      screenWidthCm: Number(screenWidthCm) || 47.6,
      screenHeightCm: Number(screenHeightCm) || 27.0,
      bezelTopCm: Number(bezelTopCm) ?? 1.0,
      bezelBottomCm: Number(bezelBottomCm) ?? 2.0,
      bezelLeftCm: Number(bezelLeftCm) ?? 1.0,
      bezelRightCm: Number(bezelRightCm) ?? 1.0,
      productUrl: cleanUrl || undefined,
    };

    const detailsSummary = [
      `Monitor Inteiro (Carcaça): ${customDimensions.outerWidthCm}x${customDimensions.outerHeightCm}cm (Prof: ${customDimensions.depthCm}cm)`,
      `Tela Visível (Área de Corte CNC): ${customDimensions.screenWidthCm}x${customDimensions.screenHeightCm}cm`,
      `Barras/Bordas: Cima ${customDimensions.bezelTopCm}cm | Baixo ${customDimensions.bezelBottomCm}cm | Esq ${customDimensions.bezelLeftCm}cm | Dir ${customDimensions.bezelRightCm}cm`,
      `VESA: ${cleanVesa}`,
      cleanUrl ? `Link: ${cleanUrl}` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    const customMonitor: MonitorOption = {
      id: `custom-mon-${Date.now()}`,
      brand: cleanBrand,
      model: cleanModel,
      displayName: `${cleanBrand} ${cleanModel} ${cleanInches}"`,
      sizeInches: cleanInches,
      vesaPattern: cleanVesa,
      technicalCode: `CNC-CUSTOM-${cleanInches.toString().replace(".", "")}-VESA`,
      notes: detailsSummary,
      active: true,
      isCustom: true,
      priceAdjustmentCents: 0,
      customDimensions,
    };

    onSave(customMonitor);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const fmtCm = (val: number) =>
    Number(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: val % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-3 md:p-5 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full h-dvh sm:h-auto sm:max-h-[94dvh] max-w-6xl bg-white dark:bg-slate-900 sm:rounded-3xl border-0 sm:border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* ============================================================ */}
        {/* CABEÇALHO FIXO DO MODAL */}
        {/* ============================================================ */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Ruler className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Outro Monitor — Medidas para Encaixe Perfeito no Gabinete
                </h2>
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Usinagem CNC Sob Medida (+ R$ 0,00)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Informe a medida inteira do monitor, a área visível da tela (corte frontal) e as bordas para prepararmos o gabinete com precisão milimétrica.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shrink-0 cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* CORPO COM SCROLL: DIAGRAMA VISUAL INTERATIVO + FORMULÁRIO */}
        {/* ============================================================ */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6">
            <div
              className={`grid grid-cols-1 ${
                isDiagramExpanded ? "lg:grid-cols-1" : "lg:grid-cols-12"
              } gap-5 lg:gap-6 items-start`}
            >
              {/* ======================================================== */}
              {/* COLUNA ESQUERDA / TOPO: DIAGRAMA TÉCNICO VISUAL GRANDE */}
              {/* ======================================================== */}
              <div
                className={`${
                  isDiagramExpanded ? "lg:col-span-1" : "lg:col-span-6 lg:sticky lg:top-0"
                } bg-slate-950 text-white rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 shadow-xl space-y-3.5`}
              >
                {/* Barra de Título do Diagrama + Botão Tela Grande */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase">
                      Mapa Visual de Corte e Alojamento CNC
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDiagramExpanded((prev) => !prev)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isDiagramExpanded ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Dividir Tela com Formulário</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Ampliar Desenho</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Seletores de Destaque Interativo (Toque para ver onde medir) */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] sm:text-[11px]">
                  <button
                    type="button"
                    onClick={() => setActiveZone(activeZone === "outer" ? "all" : "outer")}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      activeZone === "outer" || activeZone === "all"
                        ? "bg-indigo-600/25 border-indigo-400 text-indigo-200 shadow-sm"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="font-black text-indigo-300 block">1. Monitor Inteiro</span>
                    <span className="text-[10px] opacity-90">
                      {fmtCm(outerWidthCm)} × {fmtCm(outerHeightCm)} cm
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveZone(activeZone === "screen" ? "all" : "screen")}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      activeZone === "screen" || activeZone === "all"
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-sm"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="font-black text-emerald-300 block">2. Tela (Área Corte)</span>
                    <span className="text-[10px] opacity-90">
                      {fmtCm(screenWidthCm)} × {fmtCm(screenHeightCm)} cm
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveZone(activeZone === "bezel" ? "all" : "bezel")}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      activeZone === "bezel" || activeZone === "all"
                        ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="font-black text-amber-300 block">3. Barras (Bordas)</span>
                    <span className="text-[10px] opacity-90">
                      Cima {fmtCm(bezelTopCm)} | Baixo {fmtCm(bezelBottomCm)} cm
                    </span>
                  </button>
                </div>

                {/* ====================================================== */}
                {/* ILUSTRAÇÃO SVG DE ALTA PRECISÃO DO MONITOR E TELA */}
                {/* ====================================================== */}
                <div className="relative w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-2xl border border-slate-800/90 p-2 sm:p-4 flex items-center justify-center overflow-hidden">
                  <svg
                    viewBox="0 0 680 470"
                    className={`w-full ${
                      isDiagramExpanded ? "max-h-[540px]" : "max-h-[380px] sm:max-h-[420px]"
                    } h-auto select-none`}
                    role="img"
                    aria-label="Diagrama de medidas do monitor: largura e altura inteira do monitor, largura e altura da tela visível e espessura das 4 barras da moldura"
                  >
                    <defs>
                      <pattern id="cncGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path
                          d="M 20 0 L 0 0 0 20"
                          fill="none"
                          stroke="rgba(148, 163, 184, 0.08)"
                          strokeWidth="1"
                        />
                      </pattern>
                      <linearGradient id="screenGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#064e3b" stopOpacity="0.85" />
                        <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#022c22" stopOpacity="0.85" />
                      </linearGradient>
                    </defs>

                    {/* Fundo quadriculado estilo CAD */}
                    <rect x="0" y="0" width="680" height="470" fill="url(#cncGrid)" />

                    {/* ================================================== */}
                    {/* 1. COTA SUPERIOR: LARGURA INTEIRA DO MONITOR */}
                    {/* ================================================== */}
                    <g
                      opacity={activeZone === "all" || activeZone === "outer" ? 1 : 0.35}
                      className="transition-opacity duration-300 cursor-pointer"
                      onClick={() => setActiveZone("outer")}
                    >
                      {/* Linhas de chamada verticais */}
                      <line x1="95" y1="78" x2="95" y2="30" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 3" />
                      <line x1="545" y1="78" x2="545" y2="30" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 3" />
                      {/* Linha horizontal de ponta a ponta */}
                      <line x1="95" y1="42" x2="545" y2="42" stroke="#818cf8" strokeWidth="2.5" />
                      {/* Setas nas pontas */}
                      <polygon points="95,42 107,36 107,48" fill="#818cf8" />
                      <polygon points="545,42 533,36 533,48" fill="#818cf8" />
                      {/* Badge Central da Largura Total */}
                      <rect x="175" y="18" width="290" height="36" rx="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
                      <text x="320" y="34" textAnchor="middle" fill="#c7d2fe" fontSize="11" fontWeight="700">
                        1. LARGURA INTEIRA DO MONITOR (CARCAÇA)
                      </text>
                      <text x="320" y="48" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">
                        {fmtCm(outerWidthCm)} cm ({Math.round(outerWidthCm * 10)} mm)
                      </text>
                    </g>

                    {/* ================================================== */}
                    {/* 1. COTA DIREITA: ALTURA INTEIRA DO MONITOR */}
                    {/* ================================================== */}
                    <g
                      opacity={activeZone === "all" || activeZone === "outer" ? 1 : 0.35}
                      className="transition-opacity duration-300 cursor-pointer"
                      onClick={() => setActiveZone("outer")}
                    >
                      {/* Linhas de chamada horizontais */}
                      <line x1="545" y1="80" x2="615" y2="80" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 3" />
                      <line x1="545" y1="395" x2="615" y2="395" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 3" />
                      {/* Linha vertical de cima a baixo */}
                      <line x1="605" y1="80" x2="605" y2="395" stroke="#818cf8" strokeWidth="2.5" />
                      <polygon points="605,80 599,92 611,92" fill="#818cf8" />
                      <polygon points="605,395 599,383 611,383" fill="#818cf8" />
                      {/* Badge Lateral da Altura Total */}
                      <rect x="556" y="205" width="116" height="62" rx="10" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
                      <text x="614" y="223" textAnchor="middle" fill="#c7d2fe" fontSize="10" fontWeight="700">
                        ALTURA INTEIRA
                      </text>
                      <text x="614" y="236" textAnchor="middle" fill="#c7d2fe" fontSize="9" fontWeight="600">
                        (Sem o pé/base)
                      </text>
                      <text x="614" y="255" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">
                        {fmtCm(outerHeightCm)} cm
                      </text>
                    </g>

                    {/* ================================================== */}
                    {/* CARCAÇA EXTERNA DO MONITOR (MOLDURA PLÁSTICA) */}
                    {/* ================================================== */}
                    <rect
                      x="95"
                      y="80"
                      width="450"
                      height="315"
                      rx="12"
                      fill="#1e293b"
                      stroke={activeZone === "outer" ? "#818cf8" : activeZone === "bezel" ? "#fbbf24" : "#64748b"}
                      strokeWidth={activeZone === "outer" || activeZone === "bezel" ? "3.5" : "2.5"}
                    />

                    {/* Destaque colorido nas 4 Barras / Bordas quando "bezel" está ativo */}
                    <g opacity={activeZone === "all" || activeZone === "bezel" ? 1 : 0.35}>
                      {/* Barra Superior (Topo: y=80 até y=116 => 36px) */}
                      <rect
                        x="98"
                        y="83"
                        width="444"
                        height="33"
                        rx="6"
                        fill={activeZone === "bezel" ? "rgba(245, 158, 11, 0.28)" : "rgba(245, 158, 11, 0.12)"}
                      />
                      {/* Barra Inferior / Queixo mais alta (y=335 até y=392 => 57px) */}
                      <rect
                        x="98"
                        y="335"
                        width="444"
                        height="57"
                        rx="6"
                        fill={activeZone === "bezel" ? "rgba(245, 158, 11, 0.35)" : "rgba(245, 158, 11, 0.16)"}
                      />
                      {/* Barra Lateral Esquerda (x=98 até x=134) */}
                      <rect
                        x="98"
                        y="116"
                        width="36"
                        height="219"
                        fill={activeZone === "bezel" ? "rgba(245, 158, 11, 0.28)" : "rgba(245, 158, 11, 0.12)"}
                      />
                      {/* Barra Lateral Direita (x=506 até x=542) */}
                      <rect
                        x="506"
                        y="116"
                        width="36"
                        height="219"
                        fill={activeZone === "bezel" ? "rgba(245, 158, 11, 0.28)" : "rgba(245, 158, 11, 0.12)"}
                      />
                    </g>

                    {/* ================================================== */}
                    {/* 2. ÁREA VISÍVEL DA TELA (JANELA DE CORTE CNC) */}
                    {/* ================================================== */}
                    <g
                      opacity={activeZone === "all" || activeZone === "screen" ? 1 : 0.45}
                      className="transition-opacity duration-300 cursor-pointer"
                      onClick={() => setActiveZone("screen")}
                    >
                      <rect
                        x="134"
                        y="116"
                        width="372"
                        height="219"
                        rx="4"
                        fill="url(#screenGlow)"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray="8 4"
                      />

                      {/* Título Interno da Área de Corte */}
                      <rect x="210" y="130" width="220" height="24" rx="6" fill="rgba(6, 78, 59, 0.9)" stroke="#34d399" strokeWidth="1.2" />
                      <text x="320" y="146" textAnchor="middle" fill="#a7f3d0" fontSize="10.5" fontWeight="800">
                        ✂️ 2. ÁREA DE CORTE DA TELA (VISÍVEL)
                      </text>

                      {/* Seta Horizontal Interna: Largura da Tela */}
                      <line x1="144" y1="215" x2="496" y2="215" stroke="#34d399" strokeWidth="2.2" />
                      <polygon points="144,215 155,209 155,221" fill="#34d399" />
                      <polygon points="496,215 485,209 485,221" fill="#34d399" />

                      {/* Seta Vertical Interna: Altura da Tela */}
                      <line x1="320" y1="124" x2="320" y2="327" stroke="#34d399" strokeWidth="2.2" />
                      <polygon points="320,124 314,135 326,135" fill="#34d399" />
                      <polygon points="320,327 314,316 326,316" fill="#34d399" />

                      {/* Badge Central da Largura da Tela */}
                      <rect x="225" y="190" width="190" height="44" rx="10" fill="#022c22" stroke="#10b981" strokeWidth="2" />
                      <text x="320" y="207" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="700">
                        TELA VISÍVEL (JANELA FRONTAL)
                      </text>
                      <text x="320" y="225" textAnchor="middle" fill="#ffffff" fontSize="13.5" fontWeight="900">
                        {fmtCm(screenWidthCm)} × {fmtCm(screenHeightCm)} cm
                      </text>

                      {/* Etiqueta da Altura da Tela abaixo */}
                      <rect x="250" y="275" width="140" height="26" rx="7" fill="#064e3b" stroke="#34d399" strokeWidth="1.2" />
                      <text x="320" y="292" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontWeight="800">
                        Altura Tela: {fmtCm(screenHeightCm)} cm
                      </text>
                    </g>

                    {/* ================================================== */}
                    {/* 3. COTAS DAS 4 BARRAS (MOLDURA / BORDAS DO MONITOR) */}
                    {/* ================================================== */}
                    <g
                      opacity={activeZone === "all" || activeZone === "bezel" ? 1 : 0.4}
                      className="transition-opacity duration-300 cursor-pointer"
                      onClick={() => setActiveZone("bezel")}
                    >
                      {/* BARRA DE CIMA (TOPO) */}
                      <rect x="235" y="86" width="170" height="24" rx="6" fill="#451a03" stroke="#f59e0b" strokeWidth="1.8" />
                      <text x="320" y="102" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="900">
                        ▲ Barra Cima: {fmtCm(bezelTopCm)} cm
                      </text>

                      {/* BARRA DE BAIXO (QUEIXO / BASE MAIS LARGA — EX: 2 CM) */}
                      <rect x="195" y="346" width="250" height="36" rx="8" fill="#451a03" stroke="#f59e0b" strokeWidth="2" />
                      <text x="320" y="362" textAnchor="middle" fill="#fcd34d" fontSize="11" fontWeight="900">
                        ▼ Barra de Baixo (Inferior): {fmtCm(bezelBottomCm)} cm
                      </text>
                      <text x="320" y="376" textAnchor="middle" fill="#fde68a" fontSize="9.5" fontWeight="600">
                        (Geralmente maior onde fica a marca/botões)
                      </text>

                      {/* BARRA LATERAL ESQUERDA */}
                      <rect x="12" y="202" width="114" height="44" rx="8" fill="#451a03" stroke="#f59e0b" strokeWidth="1.8" />
                      <text x="69" y="220" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="800">
                        ◀ Barra Esq.
                      </text>
                      <text x="69" y="236" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
                        {fmtCm(bezelLeftCm)} cm
                      </text>
                      <line x1="126" y1="224" x2="134" y2="224" stroke="#f59e0b" strokeWidth="2" />

                      {/* BARRA LATERAL DIREITA */}
                      <rect x="466" y="399" width="128" height="34" rx="8" fill="#451a03" stroke="#f59e0b" strokeWidth="1.8" />
                      <text x="530" y="420" textAnchor="middle" fill="#fcd34d" fontSize="11" fontWeight="900">
                        Barra Dir.: {fmtCm(bezelRightCm)} cm ▶
                      </text>
                      <line x1="524" y1="399" x2="524" y2="335" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="3 2" />
                    </g>

                    {/* Rodapé explicativo dentro do próprio desenho */}
                    <text x="275" y="452" textAnchor="middle" fill="#94a3b8" fontSize="10.5" fontWeight="600">
                      Dica: Meça com uma régua ou trena em centímetros (cm). Ex: Barra de cima 1 cm, laterais 1 cm e barra de baixo 2 cm.
                    </text>
                  </svg>
                </div>

                {/* Explicação Didática das 3 Medidas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30">
                    <span className="font-black text-indigo-300 block">1. Monitor Inteiro</span>
                    <p className="text-slate-300 text-[10px] leading-relaxed mt-0.5">
                      Largura e altura por fora da carcaça (sem o pé). Define o espaço interno onde o monitor encaixa.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30">
                    <span className="font-black text-emerald-300 block">2. Medida da Tela</span>
                    <p className="text-slate-300 text-[10px] leading-relaxed mt-0.5">
                      Apenas a área onde aparece a imagem. É a janela que será cortada na frente do gabinete.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30">
                    <span className="font-black text-amber-300 block">3. Barras (Moldura)</span>
                    <p className="text-slate-300 text-[10px] leading-relaxed mt-0.5">
                      Altura da borda de cima, de baixo (ex: 2 cm) e laterais (ex: 1 cm) para alinhar o centro exato da tela.
                    </p>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* COLUNA DIREITA / BASE: CAMPOS DE PREENCHIMENTO */}
              {/* ======================================================== */}
              <div
                className={`${
                  isDiagramExpanded ? "lg:col-span-1" : "lg:col-span-6"
                } space-y-4`}
              >
                {/* BLOCO A: MARCA, MODELO, POLEGADAS E LINK DO MONITOR */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <Monitor className="w-4 h-4 text-[#0071e3]" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                      Dados do Monitor & Link de Referência
                    </h3>
                  </div>

                  {/* Polegadas com Auto-Preenchimento */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Tamanho do Monitor (Polegadas) *
                      </label>
                      <span className="text-[10px] text-[#0071e3] dark:text-cyan-400 font-semibold">
                        Toque em um tamanho para carregar medidas base
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_SIZES.map((s) => (
                        <button
                          key={s.inches}
                          type="button"
                          onClick={() => handleSelectSizePreset(s.inches)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                            sizeInches === s.inches
                              ? "bg-[#0071e3] text-white border-[#0071e3] shadow-sm"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#0071e3]"
                          }`}
                        >
                          {s.inches}"
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          step="0.1"
                          min="10"
                          max="65"
                          required
                          value={sizeInches || ""}
                          onChange={(e) => setSizeInches(parseFloat(e.target.value || "0"))}
                          className="w-20 h-8 px-2.5 text-xs font-black text-[#0071e3] dark:text-cyan-400 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-[#0071e3]"
                        />
                        <span className="text-xs font-bold text-slate-500">pol</span>
                      </div>
                    </div>
                  </div>

                  {/* Marca e Modelo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Marca do Monitor *
                      </label>
                      <input
                        type="text"
                        required
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Ex: Samsung, LG, AOC, Dell..."
                        className="w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {COMMON_BRANDS.slice(0, 7).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBrand(b)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                              brand.toLowerCase() === b.toLowerCase()
                                ? "bg-[#0071e3] text-white border-[#0071e3]"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-[#0071e3]"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Modelo do Monitor *
                      </label>
                      <input
                        type="text"
                        required
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Ex: T350, 24MK430H, P2422H..."
                        className="w-full h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                      />
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-500 font-semibold">VESA:</span>
                        {COMMON_VESA.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVesaPattern(v)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                              vesaPattern === v
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Link do Monitor (Opcional) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Link do Monitor na Internet (Opcional)
                    </label>
                    <div className="relative">
                      <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="url"
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        placeholder="Cole aqui o link do monitor (Mercado Livre, Amazon, Kabum, site da marca...)"
                        className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#0071e3]"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Se tiver o link de onde comprou ou viu o monitor, nossa engenharia também confere o manual técnico dele.
                    </span>
                  </div>
                </div>

                {/* ====================================================== */}
                {/* BLOCO 1: MEDIDA INTEIRA DO MONITOR (CARCAÇA EXTERNA) */}
                {/* ====================================================== */}
                <div
                  onFocus={() => setActiveZone("outer")}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    activeZone === "outer"
                      ? "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20"
                      : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                        1
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          Medida Inteira do Monitor (Por Fora da Moldura)
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Meça o monitor inteiro de ponta a ponta (sem o suporte/pé de mesa)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-1">
                        Largura Inteira (cm) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="15"
                          max="150"
                          required
                          value={outerWidthCm || ""}
                          onChange={(e) => setOuterWidthCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-3 pr-9 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-1">
                        Altura Inteira (cm) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="10"
                          max="120"
                          required
                          value={outerHeightCm || ""}
                          onChange={(e) => setOuterHeightCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-3 pr-9 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        Espessura / Prof. (cm)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="25"
                          value={depthCm || ""}
                          onChange={(e) => setDepthCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-3 pr-9 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ====================================================== */}
                {/* BLOCO 2: MEDIDA DA TELA VISÍVEL (ÁREA DE CORTE CNC) */}
                {/* ====================================================== */}
                <div
                  onFocus={() => setActiveZone("screen")}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    activeZone === "screen"
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                        2
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          Medida da Tela Visível (Área de Corte Visual)
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Meça apenas a tela interna onde aparece a imagem (recorte que ficará visível no gabinete)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncScreenFromBezels}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                      title="Calcula a medida da tela descontando as barras da medida inteira"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Calcular pelas bordas</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase mb-1">
                        Largura da Tela (cm) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="10"
                          max="145"
                          required
                          value={screenWidthCm || ""}
                          onChange={(e) => setScreenWidthCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-3 pr-9 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase mb-1">
                        Altura da Tela (cm) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="8"
                          max="115"
                          required
                          value={screenHeightCm || ""}
                          onChange={(e) => setScreenHeightCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-3 pr-9 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ====================================================== */}
                {/* BLOCO 3: ALTURA / LARGURA DAS 4 BARRAS (MOLDURAS) */}
                {/* ====================================================== */}
                <div
                  onFocus={() => setActiveZone("bezel")}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    activeZone === "bezel"
                      ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/20"
                      : "bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                        3
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          Espessura das Barras / Bordas do Monitor (cm)
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Ex: Barra de cima 1 cm, laterais 1 cm e barra de baixo 2 cm
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncOuterFromScreenAndBezels}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Atualizar medida inteira
                    </button>
                  </div>

                  {/* Atalhos Rápidos de Bordas */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyBezelProfile(1.0, 2.0, 1.0, 1.0)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-all cursor-pointer"
                    >
                      Padrão (Cima/Lat: 1 cm • Baixo: 2 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBezelProfile(0.8, 1.8, 0.8, 0.8)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 transition-all cursor-pointer"
                    >
                      Borda Fina (Cima/Lat: 0,8 cm • Baixo: 1,8 cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyBezelProfile(1.5, 1.5, 1.5, 1.5)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400 transition-all cursor-pointer"
                    >
                      Todas Iguais (1,5 cm)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase mb-1">
                        Barra de Cima *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="15"
                          required
                          value={bezelTopCm ?? ""}
                          onChange={(e) => setBezelTopCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-2.5 pr-8 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase mb-1">
                        Barra de Baixo *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="15"
                          required
                          value={bezelBottomCm ?? ""}
                          onChange={(e) => setBezelBottomCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-2.5 pr-8 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase mb-1">
                        Lateral Esq. *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="15"
                          required
                          value={bezelLeftCm ?? ""}
                          onChange={(e) => setBezelLeftCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-2.5 pr-8 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase mb-1">
                        Lateral Dir. *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="15"
                          required
                          value={bezelRightCm ?? ""}
                          onChange={(e) => setBezelRightCm(parseFloat(e.target.value || "0"))}
                          className="w-full h-9 px-2.5 pr-8 text-xs font-black rounded-xl bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-500/50 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          cm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RODAPÉ FIXO COM RESUMO DAS MEDIDAS E BOTÃO DE CONFIRMAÇÃO */}
          {/* ============================================================ */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold text-slate-900 dark:text-white">
                {brand || "Monitor"} {model || "Sob Medida"} ({sizeInches}")
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                Inteiro: {fmtCm(outerWidthCm)}×{fmtCm(outerHeightCm)} cm
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Tela (Corte): {fmtCm(screenWidthCm)}×{fmtCm(screenHeightCm)} cm
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Barras: Cima {fmtCm(bezelTopCm)} / Baixo {fmtCm(bezelBottomCm)} / Lat {fmtCm(bezelLeftCm)} cm
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Medidas do Monitor (+ R$ 0)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
