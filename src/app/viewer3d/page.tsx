"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

interface HotspotData {
  id: string;
  title: string;
  description: string;
  position: THREE.Vector3;
}

export default function Viewer3DPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelType, setModelType] = useState<string>("cabinet-floor");
  const [colorHex, setColorHex] = useState<string>("#1e293b"); // Slate industrial padrão
  const [colorName, setColorName] = useState<string>("Preto Industrial");
  const [isDoorOpen, setIsDoorOpen] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeHotspot, setActiveHotspot] = useState<HotspotData | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);

  // Referências Three.js mantidas no ciclo de vida
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const totemGroupRef = useRef<THREE.Group | null>(null);
  const doorPivotRef = useRef<THREE.Group | null>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Controles de rotação manual (touch & mouse)
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0.1, y: 0.4 });
  const currentRotationRef = useRef<{ x: number; y: number }>({ x: 0.1, y: 0.4 });
  const targetZoomRef = useRef<number>(5.5);
  const currentZoomRef = useRef<number>(5.5);

  // Lista de Hotspots Informativos conforme o modelo
  const getHotspotsForModel = (type: string): HotspotData[] => {
    if (type === "cabinet-countertop") {
      return [
        {
          id: "monitor",
          title: "Monitor Touchscreen Angulado",
          description: "Abertura e furação VESA produzida conforme seu modelo homologado (15.6\" a 21.5\"). Ângulo ergonômico de 45°.",
          position: new THREE.Vector3(0, 0.4, 0.45),
        },
        {
          id: "printer",
          title: "Guilhotina Térmica Integrada",
          description: "Compartimento e guilhotina ajustados para impressoras térmicas de 58mm ou 80mm com troca rápida de bobina.",
          position: new THREE.Vector3(0, -0.15, 0.55),
        },
        {
          id: "rear_door",
          title: "Gaveta de Manutenção Traseira",
          description: "Acesso técnico traseiro com ventilação passiva e fechadura de segurança para mini PCs e cabeamento.",
          position: new THREE.Vector3(0, 0.1, -0.45),
        },
      ];
    }

    if (type === "cabinet-wall") {
      return [
        {
          id: "monitor",
          title: "Display Touchscreen de Parede",
          description: "Abertura e furação VESA milimétrica para fixação segura do display com perfil ultracompacto.",
          position: new THREE.Vector3(0, 0.6, 0.35),
        },
        {
          id: "printer",
          title: "Módulo Frontal de Impressão",
          description: "Acesso frontal articulado para reabastecimento de papel térmico sem desmontar o totem da parede.",
          position: new THREE.Vector3(0, -0.2, 0.35),
        },
        {
          id: "rear_door",
          title: "Suporte de Ancoragem Estrutural",
          description: "Gabarito de furação técnica para fixação em alvenaria ou drywall reforçado com passagem oculta de fiação.",
          position: new THREE.Vector3(0, 0.2, -0.32),
        },
      ];
    }

    // Default: Totem de Piso (cabinet-floor)
    return [
      {
        id: "monitor",
        title: "Display Touchscreen Central",
        description: "Abertura e furação VESA produzida sob medida conforme seu monitor homologado (15.6\" a 21.5\").",
        position: new THREE.Vector3(0, 1.1, 0.38),
      },
      {
        id: "printer",
        title: "Boca de Saída da Impressora",
        description: "Compartimento e guilhotina ajustados para o equipamento homologado com trilho interno para bobinas de 80mm.",
        position: new THREE.Vector3(0, 0.25, 0.4),
      },
      {
        id: "rear_door",
        title: "Porta de Acesso Técnico & Manutenção",
        description: "Acesso técnico com ventilação e fechadura de segurança.",
        position: new THREE.Vector3(0, 0.1, -0.38),
      },
    ];
  };

  // Construção Procedural do Modelo 3D
  const buildTotemGeometry = useCallback(
    (scene: THREE.Scene, type: string, color: string) => {
      // Limpa modelos anteriores
      if (totemGroupRef.current) {
        scene.remove(totemGroupRef.current);
        totemGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }

      const totemGroup = new THREE.Group();
      totemGroupRef.current = totemGroup;

      // Material Primário com a Cor Selecionada (Chapa Naval / MDF / Aço)
      const primaryMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.4,
        metalness: 0.25,
      });
      bodyMaterialRef.current = primaryMaterial;

      // Materiais de Apoio
      const darkTrimMaterial = new THREE.MeshStandardMaterial({
        color: 0x090a0f,
        roughness: 0.7,
        metalness: 0.1,
      });

      const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.1,
        metalness: 0.9,
      });

      const metalChrome = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.2,
        metalness: 0.8,
      });

      const accentGlow = new THREE.MeshBasicMaterial({
        color: 0x6366f1, // Indigo LED glow
      });

      if (type === "cabinet-floor") {
        // --- TOTEM DE PISO ---
        // 1. Base Estabilizadora de Piso (Pés de Aço)
        const baseGeom = new THREE.BoxGeometry(1.4, 0.08, 1.2);
        const baseMesh = new THREE.Mesh(baseGeom, darkTrimMaterial);
        baseMesh.position.y = -1.96;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        totemGroup.add(baseMesh);

        // 2. Coluna Principal do Gabinete
        const bodyGeom = new THREE.BoxGeometry(0.9, 3.6, 0.65);
        const bodyMesh = new THREE.Mesh(bodyGeom, primaryMaterial);
        bodyMesh.position.y = -0.12;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        totemGroup.add(bodyMesh);

        // Moldura Frontal Chanfrada
        const frameGeom = new THREE.BoxGeometry(0.82, 3.45, 0.06);
        const frameMesh = new THREE.Mesh(frameGeom, primaryMaterial);
        frameMesh.position.set(0, -0.12, 0.34);
        totemGroup.add(frameMesh);

        // 3. Moldura do Monitor Touchscreen
        const screenBezelGeom = new THREE.BoxGeometry(0.68, 0.95, 0.05);
        const screenBezel = new THREE.Mesh(screenBezelGeom, darkTrimMaterial);
        screenBezel.position.set(0, 1.1, 0.37);
        totemGroup.add(screenBezel);

        const screenDisplayGeom = new THREE.BoxGeometry(0.62, 0.88, 0.02);
        const screenDisplay = new THREE.Mesh(screenDisplayGeom, glassMaterial);
        screenDisplay.position.set(0, 1.1, 0.4);
        totemGroup.add(screenDisplay);

        // 4. Guilhotina da Impressora Térmica
        const printerSlotGeom = new THREE.BoxGeometry(0.35, 0.04, 0.08);
        const printerSlot = new THREE.Mesh(printerSlotGeom, darkTrimMaterial);
        printerSlot.position.set(0, 0.25, 0.38);
        totemGroup.add(printerSlot);

        const paperRollIndicatorGeom = new THREE.BoxGeometry(0.32, 0.015, 0.04);
        const paperIndicator = new THREE.Mesh(paperRollIndicatorGeom, metalChrome);
        paperIndicator.position.set(0, 0.25, 0.41);
        totemGroup.add(paperIndicator);

        // 5. Janela do Leitor de Código de Barras / QR Code
        const scannerBezelGeom = new THREE.BoxGeometry(0.24, 0.16, 0.04);
        const scannerBezel = new THREE.Mesh(scannerBezelGeom, darkTrimMaterial);
        scannerBezel.position.set(0, -0.1, 0.38);
        totemGroup.add(scannerBezel);

        const scannerLensGeom = new THREE.BoxGeometry(0.18, 0.1, 0.02);
        const scannerLens = new THREE.Mesh(scannerLensGeom, accentGlow);
        scannerLens.position.set(0, -0.1, 0.4);
        totemGroup.add(scannerLens);

        // 6. Porta Traseira com Eixo de Articulação (Pivot)
        const doorPivot = new THREE.Group();
        doorPivot.position.set(-0.43, -0.1, -0.33); // Dobradiça esquerda na parte traseira
        doorPivotRef.current = doorPivot;

        const doorGeom = new THREE.BoxGeometry(0.86, 3.2, 0.04);
        const doorMesh = new THREE.Mesh(doorGeom, primaryMaterial);
        doorMesh.position.set(0.43, 0, 0); // Desloca para o pivô girar na borda
        doorMesh.castShadow = true;
        doorPivot.add(doorMesh);

        // Fechadura da Porta
        const lockGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 16);
        const lockMesh = new THREE.Mesh(lockGeom, metalChrome);
        lockMesh.rotation.x = Math.PI / 2;
        lockMesh.position.set(0.8, 0.2, -0.02);
        doorPivot.add(lockMesh);

        totemGroup.add(doorPivot);
      } else if (type === "cabinet-wall") {
        // --- TOTEM DE PAREDE ---
        // 1. Chapa de Fixação Traseira
        const wallPlateGeom = new THREE.BoxGeometry(0.9, 2.2, 0.06);
        const wallPlate = new THREE.Mesh(wallPlateGeom, darkTrimMaterial);
        wallPlate.position.set(0, 0.1, -0.3);
        totemGroup.add(wallPlate);

        // 2. Caixa do Gabinete
        const bodyGeom = new THREE.BoxGeometry(0.85, 2.0, 0.55);
        const bodyMesh = new THREE.Mesh(bodyGeom, primaryMaterial);
        bodyMesh.position.set(0, 0.1, 0);
        bodyMesh.castShadow = true;
        totemGroup.add(bodyMesh);

        // 3. Monitor
        const screenBezelGeom = new THREE.BoxGeometry(0.66, 0.9, 0.04);
        const screenBezel = new THREE.Mesh(screenBezelGeom, darkTrimMaterial);
        screenBezel.position.set(0, 0.6, 0.29);
        totemGroup.add(screenBezel);

        const screenDisplay = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.84, 0.02),
          glassMaterial
        );
        screenDisplay.position.set(0, 0.6, 0.32);
        totemGroup.add(screenDisplay);

        // 4. Impressora
        const printerSlot = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.04, 0.06),
          darkTrimMaterial
        );
        printerSlot.position.set(0, -0.2, 0.29);
        totemGroup.add(printerSlot);

        // 5. Porta Articulada Frontal
        const doorPivot = new THREE.Group();
        doorPivot.position.set(0, -0.85, 0.28); // Eixo inferior
        doorPivotRef.current = doorPivot;

        const doorGeom = new THREE.BoxGeometry(0.78, 0.55, 0.03);
        const doorMesh = new THREE.Mesh(doorGeom, primaryMaterial);
        doorMesh.position.set(0, 0.275, 0);
        doorPivot.add(doorMesh);
        totemGroup.add(doorPivot);
      } else {
        // --- TOTEM DE BALCÃO ---
        // 1. Base Angular de Mesa
        const baseGeom = new THREE.BoxGeometry(0.9, 0.1, 0.85);
        const baseMesh = new THREE.Mesh(baseGeom, darkTrimMaterial);
        baseMesh.position.y = -0.7;
        baseMesh.castShadow = true;
        totemGroup.add(baseMesh);

        // 2. Corpo Inclinado (45 graus para balcão)
        const bodyGeom = new THREE.BoxGeometry(0.8, 1.2, 0.6);
        const bodyMesh = new THREE.Mesh(bodyGeom, primaryMaterial);
        bodyMesh.position.set(0, -0.05, 0);
        bodyMesh.rotation.x = -0.35; // Inclinação ergonômica
        bodyMesh.castShadow = true;
        totemGroup.add(bodyMesh);

        // 3. Monitor
        const screenBezelGeom = new THREE.BoxGeometry(0.66, 0.85, 0.04);
        const screenBezel = new THREE.Mesh(screenBezelGeom, darkTrimMaterial);
        screenBezel.position.set(0, 0.25, 0.22);
        screenBezel.rotation.x = -0.35;
        totemGroup.add(screenBezel);

        const screenDisplay = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.78, 0.02),
          glassMaterial
        );
        screenDisplay.position.set(0, 0.25, 0.25);
        screenDisplay.rotation.x = -0.35;
        totemGroup.add(screenDisplay);

        // 4. Impressora na base
        const printerSlot = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.035, 0.06),
          darkTrimMaterial
        );
        printerSlot.position.set(0, -0.35, 0.38);
        totemGroup.add(printerSlot);

        // 5. Porta / Gaveta Técnica
        const doorPivot = new THREE.Group();
        doorPivot.position.set(0, -0.05, -0.3);
        doorPivotRef.current = doorPivot;

        const doorMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.8, 0.04),
          primaryMaterial
        );
        doorMesh.position.set(0, 0, 0);
        doorPivot.add(doorMesh);
        totemGroup.add(doorPivot);
      }

      scene.add(totemGroup);
    },
    []
  );

  // Inicialização da Cena Three.js
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090a0f); // Fundo escuro do Design System

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.5, currentZoomRef.current);
    cameraRef.current = camera;

    // 3. Renderer com Antialias e Sombras Suaves
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Remove canvas anterior se houver
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Iluminação de Estúdio Industrial
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(4, 6, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 1.0); // Luz azulada de preenchimento
    fillLight.position.set(-5, 3, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8); // Rim light ciano
    rimLight.position.set(0, 5, -6);
    scene.add(rimLight);

    // Piso com Grid Sutil de Engenharia
    const gridHelper = new THREE.GridHelper(10, 20, 0x312e81, 0x1e293b);
    gridHelper.position.y = -2.0;
    scene.add(gridHelper);

    // Sombra de Piso Suave
    const groundGeom = new THREE.PlaneGeometry(10, 10);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -2.01;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 5. Constrói o modelo inicial
    buildTotemGeometry(scene, modelType, colorHex);

    // 6. Loop de Animação e Renderização
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      // Auto-rotação suave se não estiver arrastando
      if (autoRotate && !isDraggingRef.current) {
        targetRotationRef.current.y += 0.004;
      }

      // Interpolação suave de rotação (amortecimento inercial)
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.08;
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * 0.1;

      if (totemGroupRef.current) {
        totemGroupRef.current.rotation.x = currentRotationRef.current.x;
        totemGroupRef.current.rotation.y = currentRotationRef.current.y;
      }

      if (cameraRef.current) {
        cameraRef.current.position.z = currentZoomRef.current;
      }

      // Animação da Porta Aberta / Fechada
      if (doorPivotRef.current) {
        const targetDoorAngle = isDoorOpen ? -Math.PI / 2.2 : 0;
        doorPivotRef.current.rotation.y += (targetDoorAngle - doorPivotRef.current.rotation.y) * 0.1;
      }

      renderer.render(scene, camera);
    };

    animate();
    setIsReady(true);

    // Notifica a janela mãe via postMessage que o visualizador 3D está ativo
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "VIEWER_READY",
          version: "1.0",
        },
        "*"
      );
    }

    // Redimensionamento responsivo
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, [buildTotemGeometry]);

  // Atualiza modelo quando muda modelType ou colorHex
  useEffect(() => {
    if (sceneRef.current) {
      buildTotemGeometry(sceneRef.current, modelType, colorHex);
    }
  }, [modelType, colorHex, buildTotemGeometry]);

  // Listener de Mensagens Bidirecionais `postMessage` da Janela Mãe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      // Evento de Atualização do Totem
      if (data.type === "UPDATE_TOTEM") {
        if (data.model && data.model !== modelType) {
          setModelType(data.model);
        }
        if (data.colorHex) {
          setColorHex(data.colorHex);
          if (bodyMaterialRef.current) {
            bodyMaterialRef.current.color.set(data.colorHex);
          }
        }
        if (data.colorName) {
          setColorName(data.colorName);
        }
        if (typeof data.isDoorOpen === "boolean") {
          setIsDoorOpen(data.isDoorOpen);
        }
      }

      // Evento de Alternar Porta
      if (data.type === "TOGGLE_DOOR") {
        setIsDoorOpen((prev) => !prev);
      }

      // Evento de Resetar Câmera
      if (data.type === "RESET_VIEW") {
        targetRotationRef.current = { x: 0.1, y: 0.4 };
        targetZoomRef.current = 5.5;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [modelType]);

  // Controles de Toque e Mouse (Drag to Rotate 360°)
  const handlePointerDown = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    const deltaX = clientX - previousMousePositionRef.current.x;
    const deltaY = clientY - previousMousePositionRef.current.y;

    targetRotationRef.current.y += deltaX * 0.008;
    targetRotationRef.current.x += deltaY * 0.005;

    // Limites de inclinação vertical para evitar inversão
    targetRotationRef.current.x = Math.max(-0.6, Math.min(0.6, targetRotationRef.current.x));

    previousMousePositionRef.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    targetZoomRef.current += e.deltaY * 0.005;
    targetZoomRef.current = Math.max(3.5, Math.min(8.5, targetZoomRef.current));
  };

  // Disparo de Hotspot para o Pai
  const handleSelectHotspot = (hotspot: HotspotData) => {
    setActiveHotspot(hotspot);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "HOTSPOT_CLICKED",
          hotspotId: hotspot.id,
          title: hotspot.title,
          description: hotspot.description,
        },
        "*"
      );
    }
  };

  const hotspots = getHotspotsForModel(modelType);

  return (
    <div
      className="relative w-full h-full min-h-screen bg-[#090a0f] text-slate-100 overflow-hidden select-none touch-none"
      onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={(e) => {
        if (e.touches.length === 1) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Canvas 3D */}
      <div ref={containerRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Header Superior Flutuante: Status e Modelo */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md pointer-events-auto shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-200">
            {modelType === "cabinet-floor"
              ? "Totem Slim Piso"
              : modelType === "cabinet-wall"
              ? "Totem Parede Compact"
              : "Totem Balcão Express"}
          </span>
          <span className="text-slate-600 text-[10px]">•</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full border border-slate-600"
              style={{ background: colorHex }}
            />
            <span className="text-[10px] text-slate-400">{colorName}</span>
          </div>
        </div>

        <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold pointer-events-auto">
          3D WebGL 360°
        </div>
      </div>

      {/* Botões dos Hotspots 3D Interativos */}
      <div className="absolute left-3 top-16 flex flex-col gap-2 pointer-events-auto">
        {hotspots.map((h, i) => (
          <button
            key={h.id}
            onClick={() => handleSelectHotspot(h)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all flex items-center gap-2 shadow-lg ${
              activeHotspot?.id === h.id
                ? "bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/30 scale-105"
                : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>{h.title.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* Card Flutuante de Detalhes do Hotspot Clicado */}
      {activeHotspot && (
        <div className="absolute top-16 right-3 max-w-[280px] p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 backdrop-blur-xl shadow-2xl animate-fade-in pointer-events-auto space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
              Gabarito & Usinagem CNC
            </span>
            <button
              onClick={() => setActiveHotspot(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
          <h4 className="font-extrabold text-white text-sm leading-tight">
            {activeHotspot.title}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {activeHotspot.description}
          </p>
        </div>
      )}

      {/* Barra Inferior de Controles 3D */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Botão Abrir / Fechar Porta Técnica */}
          <button
            onClick={() => {
              const newState = !isDoorOpen;
              setIsDoorOpen(newState);
              if (window.parent && window.parent !== window) {
                window.parent.postMessage(
                  { type: "DOOR_STATE_CHANGED", isDoorOpen: newState },
                  "*"
                );
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border backdrop-blur-md transition-all flex items-center gap-1.5 shadow-lg ${
              isDoorOpen
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <span>{isDoorOpen ? "🚪 Fechar Porta" : "🚪 Abrir Porta Técnica"}</span>
          </button>

          {/* Botão Auto-Rotação */}
          <button
            onClick={() => setAutoRotate((prev) => !prev)}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold border backdrop-blur-md transition-all ${
              autoRotate
                ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/30"
                : "bg-slate-900/80 text-slate-400 border-slate-800"
            }`}
            title="Pausar / Retomar rotação automática"
          >
            {autoRotate ? "⏸️ 360°" : "▶️ 360°"}
          </button>
        </div>

        {/* Dica de Toque Mobile */}
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          Arraste para girar • Scroll para zoom
        </span>
      </div>
    </div>
  );
}
