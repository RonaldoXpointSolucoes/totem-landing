"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Upload,
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlertTriangle,
  CheckSquare,
  Square,
  Sparkles,
  Link as LinkIcon,
  Maximize2,
  X,
  Printer,
  Wrench,
  Film,
  Camera,
  ClipboardCheck,
  RefreshCw,
  CheckCircle2,
  Heading2,
  Table,
  Highlighter,
  ExternalLink,
} from "lucide-react";

export interface ExecutionAttachment {
  id: string;
  type: "image" | "video" | "document";
  url: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  caption: string;
  createdAt: string;
}

export interface ExecutionChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface OrderExecutionData {
  priority: "normal" | "high" | "urgent";
  technicianName: string;
  deadlineDate: string;
  technicalHtml: string;
  technicalSummary: string;
  attachments: ExecutionAttachment[];
  checklist: ExecutionChecklistItem[];
  updatedAt: string;
}

export const DEFAULT_EXECUTION_CHECKLIST: ExecutionChecklistItem[] = [
  { id: "chk-1", text: "Conferir modelo do gabinete, cor do MDF e medidas externas", done: false },
  { id: "chk-2", text: "Validar medidas exatas do monitor (área visual da tela vs. carcaça total)", done: false },
  { id: "chk-3", text: "Verificar rasgo e berço interno da impressora térmica e leitor", done: false },
  { id: "chk-4", text: "Revisar fotos/vídeos enviados pelo cliente antes da usinagem Router CNC", done: false },
];

export function createDefaultExecutionOrder(existing?: Partial<OrderExecutionData> | null): OrderExecutionData {
  return {
    priority: existing?.priority || "normal",
    technicianName: existing?.technicianName || "",
    deadlineDate: existing?.deadlineDate || "",
    technicalHtml: existing?.technicalHtml || "",
    technicalSummary: existing?.technicalSummary || "",
    attachments: Array.isArray(existing?.attachments) ? existing!.attachments : [],
    checklist:
      Array.isArray(existing?.checklist) && existing!.checklist.length > 0
        ? existing!.checklist
        : DEFAULT_EXECUTION_CHECKLIST.map((c) => ({ ...c })),
    updatedAt: existing?.updatedAt || new Date().toISOString(),
  };
}

export function hasExecutionOrderContent(exec?: Partial<OrderExecutionData> | null): boolean {
  if (!exec) return false;
  const strippedHtml = (exec.technicalHtml || "").replace(/<[^>]*>/g, "").trim();
  const hasText = strippedHtml.length > 0 || Boolean(exec.technicalSummary && exec.technicalSummary.trim().length > 0);
  const hasAttachments = Array.isArray(exec.attachments) && exec.attachments.length > 0;
  const hasCheckedItems = Array.isArray(exec.checklist) && exec.checklist.some((c) => c.done);
  const hasTechOrDate = Boolean(exec.technicianName?.trim() || exec.deadlineDate?.trim());
  return hasText || hasAttachments || hasCheckedItems || hasTechOrDate;
}

interface OrderExecutionEditorProps {
  orderNumber: string;
  value: OrderExecutionData;
  onChange: (next: OrderExecutionData) => void;
}

export function OrderExecutionEditor({
  orderNumber,
  value,
  onChange,
}: OrderExecutionEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [mediaCaptionInput, setMediaCaptionInput] = useState("");
  const [mediaTypeInput, setMediaTypeInput] = useState<"image" | "video">("image");
  const [newCheckItemText, setNewCheckItemText] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<ExecutionAttachment | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Inicializa o conteúdo HTML do editor quando aberto ou quando o pedido muda
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value.technicalHtml || "")) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value.technicalHtml || "";
      }
    }
  }, [value.technicalHtml, orderNumber]);

  const syncEditorContent = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const plain = editorRef.current.innerText || "";
    onChange({
      ...value,
      technicalHtml: html,
      technicalSummary: plain.trim(),
      updatedAt: new Date().toISOString(),
    });
  };

  const execCommand = (command: string, arg?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    syncEditorContent();
  };

  const insertHtmlAtCursor = (htmlSnippet: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      document.execCommand("insertHTML", false, htmlSnippet);
    } else {
      editorRef.current.innerHTML += htmlSnippet;
    }
    syncEditorContent();
  };

  // Templates Técnicos de 1 Clique para Ordem de Produção CNC
  const insertTechnicalTemplate = (templateKey: "monitor" | "printer" | "cables" | "alert") => {
    const templates: Record<string, string> = {
      monitor: `
        <div style="margin: 10px 0; padding: 12px; border-radius: 10px; background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6, 182, 212, 0.4);">
          <strong style="color: #67e8f9; text-transform: uppercase; font-size: 11px; display: block; margin-bottom: 6px;">📐 FICHA TÉCNICA DE CORTE DO MONITOR (SOB MEDIDA)</strong>
          <ul style="margin: 0; padding-left: 18px; color: #f1f5f9; font-size: 12px;">
            <li><strong>Marca / Modelo do Monitor:</strong> [Preencher]</li>
            <li><strong>Medida Externa Total (Carcaça L × A × P):</strong> [Ex: 49,5 cm × 30,2 cm × 4,5 cm]</li>
            <li><strong>Área Ativa Visual da Tela (Recorte CNC L × A):</strong> [Ex: 47,6 cm × 26,8 cm]</li>
            <li><strong>Bordas do Monitor:</strong> Superior: [1,0 cm] | Inferior: [2,4 cm] | Laterais: [1,0 cm]</li>
            <li><strong>Fixação VESA / Suporte Interno:</strong> [VESA 75×75 / 100×100 mm com batente traseiro]</li>
          </ul>
        </div><p><br/></p>`,
      printer: `
        <div style="margin: 10px 0; padding: 12px; border-radius: 10px; background: rgba(99, 102, 241, 0.14); border: 1px solid rgba(99, 102, 241, 0.4);">
          <strong style="color: #a5b4fc; text-transform: uppercase; font-size: 11px; display: block; margin-bottom: 6px;">🖨️ ESPECIFICAÇÃO DE BERÇO & SAÍDA DA IMPRESSORA</strong>
          <ul style="margin: 0; padding-left: 18px; color: #f1f5f9; font-size: 12px;">
            <li><strong>Modelo da Impressora:</strong> [Ex: Elgin i9 / Epson TM-T20X / Custom]</li>
            <li><strong>Posição do Rasgo Frontal:</strong> [Padrão Centralizado / Deslocado]</li>
            <li><strong>Dimensões da Bandeja Interna:</strong> [L × P × A livre para abertura da tampa de bobina]</li>
            <li><strong>Observação de Fiação:</strong> [Passa-cabo inferior de 35mm]</li>
          </ul>
        </div><p><br/></p>`,
      cables: `
        <div style="margin: 10px 0; padding: 12px; border-radius: 10px; background: rgba(168, 85, 247, 0.14); border: 1px solid rgba(168, 85, 247, 0.4);">
          <strong style="color: #d8b4fe; text-transform: uppercase; font-size: 11px; display: block; margin-bottom: 6px;">🔌 FURAÇÃO ESPECIAL / PINPAD / SUPORTES ADICIONAIS</strong>
          <ul style="margin: 0; padding-left: 18px; color: #f1f5f9; font-size: 12px;">
            <li><strong>Suporte de Pinpad / Máquina de Cartão:</strong> [Sim / Não — Lado Direito]</li>
            <li><strong>Furação de Passagem de Cabos:</strong> [Saída pela base / Saída pela parede traseira]</li>
            <li><strong>Ventilação e Fechadura:</strong> [Padrão com 2 chaves]</li>
          </ul>
        </div><p><br/></p>`,
      alert: `
        <div style="margin: 10px 0; padding: 12px; border-radius: 10px; background: rgba(245, 158, 11, 0.2); border: 2px solid #fbbf24;">
          <strong style="color: #fde68a; text-transform: uppercase; font-size: 11px; display: block; margin-bottom: 4px;">⚠️ ATENÇÃO OPERADOR CNC / INSTRUÇÃO CRÍTICA DO CLIENTE:</strong>
          <p style="margin: 0; color: #ffffff; font-weight: 700; font-size: 13px;">[Descreva aqui a alteração obrigatória solicitada pelo cliente para que não passe despercebida na produção]</p>
        </div><p><br/></p>`,
    };

    insertHtmlAtCursor(templates[templateKey]);
  };

  // Upload real de múltiplos arquivos (Imagens ou Vídeos)
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const uploadedAttachments: ExecutionAttachment[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgressText(`Enviando arquivo ${i + 1} de ${fileArray.length} (${file.name})...`);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("orderNumber", orderNumber || "OS");
        formData.append("caption", file.name);

        const res = await fetch("/api/admin/orders/media", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();

        if (json.ok && json.attachment) {
          uploadedAttachments.push(json.attachment);

          // Também insere o bloco visual diretamente no documento técnico se o usuário desejar
          if (json.attachment.type === "image") {
            const imgHtml = `
              <figure style="margin: 12px 0; padding: 8px; background: #090d16; border: 1px solid #334155; border-radius: 12px; display: inline-block; max-width: 100%;">
                <img src="${json.attachment.url}" alt="${json.attachment.caption}" style="max-height: 320px; width: auto; max-width: 100%; border-radius: 8px; display: block;" />
                <figcaption style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-family: monospace;">📷 ${json.attachment.caption}</figcaption>
              </figure><p><br/></p>`;
            if (editorRef.current) {
              editorRef.current.innerHTML += imgHtml;
            }
          } else if (json.attachment.type === "video") {
            const vidHtml = `
              <div style="margin: 12px 0; padding: 8px; background: #090d16; border: 1px solid #334155; border-radius: 12px; max-width: 480px;">
                <video src="${json.attachment.url}" controls style="width: 100%; max-height: 300px; border-radius: 8px; background: #000;"></video>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-family: monospace;">🎬 ${json.attachment.caption}</div>
              </div><p><br/></p>`;
            if (editorRef.current) {
              editorRef.current.innerHTML += vidHtml;
            }
          }
        } else {
          alert(json.error || `Falha ao enviar arquivo ${file.name}`);
        }
      }

      if (uploadedAttachments.length > 0) {
        const html = editorRef.current ? editorRef.current.innerHTML : value.technicalHtml;
        const plain = editorRef.current ? editorRef.current.innerText : value.technicalSummary;
        onChange({
          ...value,
          technicalHtml: html,
          technicalSummary: plain.trim(),
          attachments: [...(value.attachments || []), ...uploadedAttachments],
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      alert("Erro no upload de mídia: " + (err?.message || "Verifique sua conexão"));
    } finally {
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  // Suporte a Colar Imagem/Vídeo direto do Clipboard (Ctrl+V do WhatsApp Web / Print Screen)
  const handlePasteInEditor = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    const mediaFiles: File[] = [];
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
        const file = item.getAsFile();
        if (file) {
          const ext = item.type.split("/")[1] || "png";
          const namedFile = new File(
            [file],
            `colado-whatsapp-${new Date().toLocaleTimeString("pt-BR").replace(/:/g, "")}.${ext}`,
            { type: item.type }
          );
          mediaFiles.push(namedFile);
        }
      }
    }

    if (mediaFiles.length > 0) {
      e.preventDefault();
      await handleUploadFiles(mediaFiles);
    }
  };

  // Adicionar mídia por URL externa (link direto de foto/vídeo)
  const handleAddMediaByUrl = () => {
    const cleanUrl = mediaUrlInput.trim();
    if (!cleanUrl) return;

    const isVid =
      mediaTypeInput === "video" ||
      /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(cleanUrl) ||
      cleanUrl.includes("youtube.com") ||
      cleanUrl.includes("youtu.be") ||
      cleanUrl.includes("instagram.com");

    const newAtt: ExecutionAttachment = {
      id: `url_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: isVid ? "video" : "image",
      url: cleanUrl,
      fileName: mediaCaptionInput.trim() || (isVid ? "Vídeo de Referência Técnica" : "Foto de Referência Técnica"),
      caption: mediaCaptionInput.trim() || (isVid ? "Vídeo de Referência Técnica" : "Foto de Referência Técnica"),
      createdAt: new Date().toISOString(),
    };

    if (!isVid && editorRef.current) {
      editorRef.current.innerHTML += `
        <figure style="margin: 12px 0; padding: 8px; background: #090d16; border: 1px solid #334155; border-radius: 12px; display: inline-block; max-width: 100%;">
          <img src="${newAtt.url}" alt="${newAtt.caption}" style="max-height: 320px; width: auto; max-width: 100%; border-radius: 8px; display: block;" />
          <figcaption style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-family: monospace;">📷 ${newAtt.caption}</figcaption>
        </figure><p><br/></p>`;
    }

    onChange({
      ...value,
      technicalHtml: editorRef.current ? editorRef.current.innerHTML : value.technicalHtml,
      technicalSummary: editorRef.current ? editorRef.current.innerText.trim() : value.technicalSummary,
      attachments: [...(value.attachments || []), newAtt],
      updatedAt: new Date().toISOString(),
    });

    setMediaUrlInput("");
    setMediaCaptionInput("");
    setUrlInputOpen(false);
  };

  const handleUpdateAttachmentCaption = (id: string, newCaption: string) => {
    onChange({
      ...value,
      attachments: value.attachments.map((a) => (a.id === id ? { ...a, caption: newCaption } : a)),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveAttachment = (id: string) => {
    onChange({
      ...value,
      attachments: value.attachments.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleChecklist = (id: string) => {
    onChange({
      ...value,
      checklist: value.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddChecklistItem = () => {
    const text = newCheckItemText.trim();
    if (!text) return;
    onChange({
      ...value,
      checklist: [
        ...(value.checklist || []),
        { id: `chk_${Date.now()}`, text, done: false },
      ],
      updatedAt: new Date().toISOString(),
    });
    setNewCheckItemText("");
  };

  const handleRemoveChecklistItem = (id: string) => {
    onChange({
      ...value,
      checklist: value.checklist.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const imageCount = (value.attachments || []).filter((a) => a.type === "image").length;
  const videoCount = (value.attachments || []).filter((a) => a.type === "video").length;
  const completedTasks = (value.checklist || []).filter((c) => c.done).length;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 border-2 border-indigo-500/40 space-y-4 shadow-xl">
      {/* Cabeçalho da Ordem de Execução & Dados Técnicos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ordem de Execução & Ficha Técnica Multimídia (O.S. CNC)</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
              📷 {imageCount} Foto(s) • 🎬 {videoCount} Vídeo(s) • ☑ {completedTasks}/{value.checklist?.length || 0} Checklist
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Prepare a ordem de produção com texto formatado, medidas especiais, fotos enviadas pelo cliente (você pode colar com{" "}
            <strong className="text-white font-mono">Ctrl+V</strong> direto do WhatsApp) e vídeos explicativos.
          </p>
        </div>

        {/* Metadados Rápidos da O.S. (Prioridade, Operador, Prazo) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
              Prioridade na Fábrica
            </label>
            <select
              value={value.priority}
              onChange={(e) =>
                onChange({
                  ...value,
                  priority: e.target.value as "normal" | "high" | "urgent",
                  updatedAt: new Date().toISOString(),
                })
              }
              className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-extrabold border focus:outline-none ${
                value.priority === "urgent"
                  ? "bg-rose-950/60 border-rose-500 text-rose-300"
                  : value.priority === "high"
                  ? "bg-amber-950/60 border-amber-500 text-amber-300"
                  : "bg-slate-900 border-slate-700 text-slate-200"
              }`}
            >
              <option value="normal">🟢 Normal (Fila Padrão)</option>
              <option value="high">🟡 Alta Prioridade</option>
              <option value="urgent">🔴 URGENTE / Fora do Padrão</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
              Responsável / Operador CNC
            </label>
            <input
              type="text"
              value={value.technicianName}
              onChange={(e) =>
                onChange({
                  ...value,
                  technicianName: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              placeholder="Ex: Equipe Router CNC"
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
              Meta de Expedição
            </label>
            <input
              type="date"
              value={value.deadlineDate}
              onChange={(e) =>
                onChange({
                  ...value,
                  deadlineDate: e.target.value,
                  updatedAt: new Date().toISOString(),
                })
              }
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* Inputs Ocultos de Upload de Foto e Vídeo */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* BARRA DE FERRAMENTAS POTENTE DO EDITOR TÉCNICO */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2 space-y-2">
        {/* Linha 1: Formatação de Texto + Blocos Técnicos Prontos */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => execCommand("formatBlock", "H3")}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
            title="Título de Seção Técnica"
          >
            <Heading2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Título</span>
          </button>

          <button
            type="button"
            onClick={() => execCommand("bold")}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer active:scale-95"
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("italic")}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer active:scale-95"
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("underline")}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer active:scale-95"
            title="Sublinhado (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("insertUnorderedList")}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer active:scale-95"
            title="Lista de Tópicos"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => execCommand("insertOrderedList")}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer active:scale-95"
            title="Passo a Passo Numerado"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Templates de Engenharia CNC em 1 clique */}
          <span className="text-[10px] font-bold uppercase text-slate-400 px-1">Inserir Gabarito:</span>
          <button
            type="button"
            onClick={() => insertTechnicalTemplate("monitor")}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <span>📐 Medidas Monitor</span>
          </button>
          <button
            type="button"
            onClick={() => insertTechnicalTemplate("printer")}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <span>🖨️ Berço Impressora</span>
          </button>
          <button
            type="button"
            onClick={() => insertTechnicalTemplate("cables")}
            className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <span>🔌 Furação / Pinpad</span>
          </button>
          <button
            type="button"
            onClick={() => insertTechnicalTemplate("alert")}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-extrabold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>⚠️ Caixa de Alerta</span>
          </button>
        </div>

        {/* Linha 2: Botões de Upload de Imagens, Vídeos e Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => imageInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>+ Anexar Foto(s) do Cliente / Projeto</span>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => videoInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95 transition-all"
            >
              <Film className="w-4 h-4" />
              <span>+ Anexar Vídeo Técnico (MP4/WebM)</span>
            </button>

            <button
              type="button"
              onClick={() => setUrlInputOpen(!urlInputOpen)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inserir por Link / URL</span>
            </button>
          </div>

          {isUploading && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-bold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{uploadProgressText || "Enviando arquivo para o servidor..."}</span>
            </div>
          )}
        </div>

        {/* Sub-painel para inserir imagem ou vídeo por URL */}
        {urlInputOpen && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end animate-fade-in">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Tipo de Mídia</label>
              <select
                value={mediaTypeInput}
                onChange={(e) => setMediaTypeInput(e.target.value as "image" | "video")}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
              >
                <option value="image">📷 Foto / Imagem</option>
                <option value="video">🎬 Vídeo</option>
              </select>
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">
                Link Direto da Foto ou Vídeo (URL)
              </label>
              <input
                type="url"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 mb-1">
                Legenda Técnica / Descrição
              </label>
              <input
                type="text"
                value={mediaCaptionInput}
                onChange={(e) => setMediaCaptionInput(e.target.value)}
                placeholder="Ex: Foto da traseira do monitor"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div className="sm:col-span-2 flex gap-1.5">
              <button
                type="button"
                onClick={handleAddMediaByUrl}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => setUrlInputOpen(false)}
                className="py-2 px-2.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ÁREA DE EDIÇÃO RICA (CONTENTEDITABLE + DRAG & DROP + PASTE CTRL+V) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleUploadFiles(e.dataTransfer.files);
            }
          }}
          className={`relative rounded-xl border transition-all ${
            isDraggingOver
              ? "border-2 border-emerald-400 bg-emerald-950/20"
              : "border-slate-700/80 bg-slate-950"
          }`}
        >
          {(!value.technicalHtml || value.technicalHtml.replace(/<[^>]*>/g, "").trim() === "") &&
            !value.technicalHtml?.includes("<img") &&
            !value.technicalHtml?.includes("<video") && (
              <div className="pointer-events-none absolute top-3 left-3.5 right-3.5 text-slate-500 text-xs leading-relaxed select-none">
                Digite aqui todos os detalhes da <strong>Ordem de Execução / Produção CNC</strong>, medidas especiais enviadas pelo cliente, furações extras ou cole fotos diretamente com{" "}
                <strong className="text-slate-400">Ctrl + V</strong>...
              </div>
            )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncEditorContent}
            onBlur={syncEditorContent}
            onPaste={handlePasteInEditor}
            className="min-h-[180px] max-h-[420px] overflow-y-auto p-3.5 text-xs sm:text-sm text-slate-100 focus:outline-none prose prose-invert max-w-none leading-relaxed"
          />
        </div>
      </div>

      {/* GALERIA DE ANEXOS TÉCNICOS (FOTOS & VÍDEOS COM LEGENDA EDITÁVEL) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>
              Galeria de Anexos Técnicos do Pedido ({value.attachments?.length || 0} arquivo/s)
            </span>
          </span>
          <span className="text-[10px] text-slate-400">
            Arraste fotos ou vídeos para a área acima ou use os botões verdes/azuis
          </span>
        </div>

        {!value.attachments || value.attachments.length === 0 ? (
          <div
            onClick={() => imageInputRef.current?.click()}
            className="p-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 hover:border-indigo-500/50 transition-all text-center cursor-pointer"
          >
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-300">
              Nenhuma foto ou vídeo técnico anexado ainda
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Clique aqui para enviar fotos do monitor/impressora do cliente, desenhos de corte ou vídeos explicativos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {value.attachments.map((att) => (
              <div
                key={att.id}
                className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2 shadow-md"
              >
                <div className="relative rounded-xl overflow-hidden bg-black h-40 flex items-center justify-center group border border-slate-800">
                  {att.type === "video" ? (
                    <video
                      src={att.url}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <>
                      <img
                        src={att.url}
                        alt={att.caption}
                        className="w-full h-full object-contain cursor-pointer transition-transform duration-200 group-hover:scale-105"
                        onClick={() => setPreviewAttachment(att)}
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewAttachment(att)}
                        className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/75 text-white text-[10px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Ampliar</span>
                      </button>
                    </>
                  )}

                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                      att.type === "video"
                        ? "bg-indigo-600/90 text-white"
                        : "bg-emerald-600/90 text-white"
                    }`}
                  >
                    {att.type === "video" ? "🎬 VÍDEO" : "📷 FOTO"}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow cursor-pointer"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                    Legenda / Explicação Técnica do Anexo:
                  </label>
                  <input
                    type="text"
                    value={att.caption}
                    onChange={(e) => handleUpdateAttachmentCaption(att.id, e.target.value)}
                    placeholder="Ex: Foto da furação traseira do monitor..."
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CHECKLIST DE EXECUÇÃO E CONFERÊNCIA DE PRODUÇÃO CNC */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4" />
            <span>
              Checklist de Execução & Qualidade na Fábrica ({completedTasks}/{value.checklist?.length || 0} concluídos)
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(value.checklist || []).map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                item.done
                  ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                  : "bg-slate-950 border-slate-800 text-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggleChecklist(item.id)}
                className="flex items-center gap-2 text-left flex-1 cursor-pointer"
              >
                {item.done ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={`text-xs font-semibold ${item.done ? "line-through opacity-80" : ""}`}>
                  {item.text}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveChecklistItem(item.id)}
                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                title="Remover etapa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={newCheckItemText}
            onChange={(e) => setNewCheckItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddChecklistItem();
              }
            }}
            placeholder="Adicionar nova etapa técnica ao checklist (ex: Furar suporte lateral para Pinpad)..."
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
          />
          <button
            type="button"
            onClick={handleAddChecklistItem}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Etapa</span>
          </button>
        </div>
      </div>

      {/* Lightbox para Ampliar Foto em Tela Cheia */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-cyan-400 block">
                  Anexo Técnico da Ordem de Execução
                </span>
                <h4 className="text-sm font-bold text-white">{previewAttachment.caption}</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[75dvh] overflow-auto">
              {previewAttachment.type === "video" ? (
                <video
                  src={previewAttachment.url}
                  controls
                  autoPlay
                  className="max-h-[70dvh] w-auto max-w-full rounded-xl"
                />
              ) : (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.caption}
                  className="max-h-[70dvh] w-auto max-w-full object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrderExecutionViewerProps {
  orderNumber: string;
  customerName: string;
  executionOrder?: Partial<OrderExecutionData> | null;
  onEditClick?: () => void;
  compact?: boolean;
}

export function OrderExecutionViewer({
  orderNumber,
  customerName,
  executionOrder,
  onEditClick,
  compact = false,
}: OrderExecutionViewerProps) {
  const [lightboxAtt, setLightboxAtt] = useState<ExecutionAttachment | null>(null);

  if (!executionOrder || !hasExecutionOrderContent(executionOrder)) {
    return null;
  }

  const priorityConfig = {
    normal: {
      label: "PRIORIDADE NORMAL",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    },
    high: {
      label: "ALTA PRIORIDADE",
      badgeClass: "bg-amber-500/25 text-amber-300 border-amber-400",
    },
    urgent: {
      label: "🚨 URGENTE / FORA DO PADRÃO",
      badgeClass: "bg-rose-500/25 text-rose-300 border-rose-400 animate-pulse",
    },
  }[executionOrder.priority || "normal"];

  const attachments = Array.isArray(executionOrder.attachments) ? executionOrder.attachments : [];
  const checklist = Array.isArray(executionOrder.checklist) ? executionOrder.checklist : [];
  const doneCount = checklist.filter((c) => c.done).length;

  const handlePrintExecutionOrder = () => {
    const win = window.open("", "_blank", "width=960,height=800");
    if (!win) return;

    const attachmentsHtml = attachments
      .map((a) =>
        a.type === "image"
          ? `<div style="border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:12px; page-break-inside:avoid;">
               <img src="${a.url}" style="max-height:280px; max-width:100%; object-fit:contain; display:block; margin:0 auto 8px;" />
               <div style="font-size:12px; font-weight:bold; color:#1e293b; text-align:center;">📷 ${a.caption}</div>
             </div>`
          : `<div style="border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:12px;">
               <div style="font-size:12px; font-weight:bold; color:#1e293b;">🎬 Vídeo Técnico Anexado: ${a.caption}</div>
               <div style="font-size:11px; color:#475569; word-break:break-all;">Link: ${a.url}</div>
             </div>`
      )
      .join("");

    const checklistHtml = checklist
      .map(
        (c) =>
          `<li style="margin-bottom:6px; font-size:13px;">
             <strong>${c.done ? "[ ✓ ]" : "[   ]"}</strong> ${c.text}
           </li>`
      )
      .join("");

    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Ordem de Execução CNC - ${orderNumber}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 24px; line-height: 1.5; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; border: 1px solid #0f172a; }
            .section { border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
            .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #334155; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div style="font-size:11px; font-weight:bold; text-transform:uppercase; color:#475569;">TOTEM PRO ENGENHARIA CNC — ORDEM DE EXECUÇÃO TÉCNICA</div>
              <h1 style="margin:4px 0; font-size:22px;">Pedido: ${orderNumber}</h1>
              <div style="font-size:14px;">Cliente: <strong>${customerName}</strong></div>
            </div>
            <div style="text-align:right;">
              <div class="badge">${priorityConfig.label}</div>
              ${executionOrder.technicianName ? `<div style="font-size:12px; margin-top:6px;">Responsável: <strong>${executionOrder.technicianName}</strong></div>` : ""}
              ${executionOrder.deadlineDate ? `<div style="font-size:12px;">Meta Expedição: <strong>${executionOrder.deadlineDate}</strong></div>` : ""}
            </div>
          </div>

          ${
            executionOrder.technicalHtml
              ? `<div class="section">
                   <div class="section-title">1. Instruções Técnicas & Especificações de Produção</div>
                   <div style="font-size:13px;">${executionOrder.technicalHtml}</div>
                 </div>`
              : ""
          }

          ${
            checklist.length > 0
              ? `<div class="section">
                   <div class="section-title">2. Checklist de Conferência na Fábrica (${doneCount}/${checklist.length})</div>
                   <ul style="list-style:none; padding-left:0; margin:0;">${checklistHtml}</ul>
                 </div>`
              : ""
          }

          ${
            attachments.length > 0
              ? `<div class="section">
                   <div class="section-title">3. Fotos & Anexos Técnicos (${attachments.length})</div>
                   <div>${attachmentsHtml}</div>
                 </div>`
              : ""
          }
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/95 to-slate-950 border-2 border-indigo-500/50 space-y-3 shadow-lg">
      {/* Topo da Ordem de Execução */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-indigo-500/30">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>📋 ORDEM DE EXECUÇÃO & DADOS TÉCNICOS DE PRODUÇÃO</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${priorityConfig.badgeClass}`}>
            {priorityConfig.label}
          </span>
          {executionOrder.technicianName && (
            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-[10px] font-bold">
              👷 {executionOrder.technicianName}
            </span>
          )}
          {executionOrder.deadlineDate && (
            <span className="px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
              📅 Meta: {executionOrder.deadlineDate}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrintExecutionOrder}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] flex items-center gap-1 border border-slate-700 cursor-pointer"
            title="Imprimir Ordem de Execução para a Fábrica"
          >
            <Printer className="w-3 h-3 text-cyan-400" />
            <span>Imprimir O.S.</span>
          </button>
          {onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <span>Editar O.S. / Anexos</span>
            </button>
          )}
        </div>
      </div>

      {/* Texto Rico / Especificações Técnicas */}
      {executionOrder.technicalHtml && executionOrder.technicalHtml.replace(/<[^>]*>/g, "").trim().length > 0 && (
        <div
          className={`p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-100 prose prose-invert max-w-none leading-relaxed overflow-x-auto ${
            compact ? "max-h-64 overflow-y-auto" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: executionOrder.technicalHtml }}
        />
      )}

      {/* Galeria de Fotos e Vídeos Anexados */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 block">
            📎 Mídias e Referências Anexadas ({attachments.length}):
          </span>
          <div className={`grid grid-cols-1 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-2.5`}>
            {attachments.map((att) => (
              <div
                key={att.id}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
              >
                <div className="relative rounded-lg overflow-hidden bg-black h-36 flex items-center justify-center">
                  {att.type === "video" ? (
                    <video
                      src={att.url}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={att.url}
                      alt={att.caption}
                      onClick={() => setLightboxAtt(att)}
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                    />
                  )}
                  <span
                    className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      att.type === "video" ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"
                    }`}
                  >
                    {att.type === "video" ? "🎬 VÍDEO" : "📷 FOTO"}
                  </span>
                  {att.type === "image" && (
                    <button
                      type="button"
                      onClick={() => setLightboxAtt(att)}
                      className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 text-white text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-2.5 h-2.5" />
                      <span>Ver Grande</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] font-bold text-slate-200 px-1 truncate" title={att.caption}>
                  {att.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo do Checklist */}
      {checklist.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
            <span className="font-bold uppercase text-emerald-400">
              Checklist de Execução ({doneCount}/{checklist.length} etapas concluídas)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {checklist.map((c) => (
              <div
                key={c.id}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                  c.done
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-950/70 border-slate-800 text-slate-300"
                }`}
              >
                {c.done ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className={c.done ? "line-through opacity-80" : "font-medium"}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox de Visualização em Tela Cheia */}
      {lightboxAtt && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxAtt(null)}
        >
          <div
            className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase text-cyan-400 block">
                  Anexo da Ordem de Execução — {orderNumber}
                </span>
                <h4 className="text-sm font-bold text-white">{lightboxAtt.caption}</h4>
              </div>
              <button
                type="button"
                onClick={() => setLightboxAtt(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-black flex items-center justify-center max-h-[78dvh] overflow-auto">
              <img
                src={lightboxAtt.url}
                alt={lightboxAtt.caption}
                className="max-h-[72dvh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
