"use client";

import React, { useState, useRef } from "react";
import {
  Printer,
  FileText,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  resolveKitEquipmentSummary,
  buildOrderDeliveryChecklist,
  DeliveryChecklistItem,
} from "@/modules/catalog/kitDefaults";

export interface PrintableOrderItem {
  $id?: string;
  cabinet_name: string;
  color_name: string;
  quantity: number;
  monitor_name?: string | null;
  printer_name?: string | null;
  reader_name?: string | null;
  kit_items_snapshot?: any[] | null;
  delivery_checklist?: DeliveryChecklistItem[] | null;
}

export interface PrintableOrderData {
  $id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_whatsapp?: string | null;
  $createdAt: string;
  items?: PrintableOrderItem[];
  address?: {
    cep?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    customerNotes?: string | null;
    executionOrder?: {
      priority?: "normal" | "urgent" | string;
      assignedOperator?: string | null;
      technicianName?: string | null;
      targetDispatchDate?: string | null;
      deadlineDate?: string | null;
      plainSummary?: string | null;
    } | null;
  } | null;
  shipping?: {
    name?: string | null;
    carrier?: string | null;
    deliveryDaysMin?: number | null;
    deliveryDaysMax?: number | null;
  } | null;
  sheets?: any[] | null;
}

interface ProductionOrderPrintModalProps {
  order: PrintableOrderData;
  onClose: () => void;
  onSaveOrientations?: (data: {
    orientations: string;
    operator: string;
    priority: "normal" | "urgent";
    targetDate: string;
  }) => Promise<void> | void;
}

/**
 * Remove qualquer menção a valores monetários (ex: "R$ 1.100,00", "(+R$ 999)", etc.)
 * garantindo que a Ordem de Produção seja 100% isenta de preços.
 */
function stripMonetaryValues(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/\(\s*[+-]?\s*R\$\s*[\d.,]+\s*\)/gi, "")
    .replace(/[+-]?\s*R\$\s*[\d.,]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function ProductionOrderPrintModal({
  order,
  onClose,
  onSaveOrientations,
}: ProductionOrderPrintModalProps) {
  const exec = order.address?.executionOrder || null;
  const initialNotes = [
    order.address?.customerNotes ? stripMonetaryValues(order.address.customerNotes) : "",
    exec?.plainSummary ? stripMonetaryValues(exec.plainSummary) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const [orientations, setOrientations] = useState<string>(initialNotes);
  const [operatorName, setOperatorName] = useState<string>(
    exec?.technicianName || exec?.assignedOperator || ""
  );
  const [priority, setPriority] = useState<"normal" | "urgent">(
    exec?.priority === "urgent" ? "urgent" : "normal"
  );
  const [targetDate, setTargetDate] = useState<string>(
    exec?.deadlineDate || exec?.targetDispatchDate || ""
  );
  const [blankLinesCount, setBlankLinesCount] = useState<number>(3);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const printableRef = useRef<HTMLDivElement>(null);

  const handleQuickAddOrientation = (snippet: string) => {
    setOrientations((prev) => (prev.trim() ? `${prev.trim()}\n• ${snippet}` : `• ${snippet}`));
  };

  const handleSaveOnly = async () => {
    if (!onSaveOrientations) return;
    setIsSaving(true);
    try {
      await onSaveOrientations({
        orientations: orientations.trim(),
        operator: operatorName.trim(),
        priority,
        targetDate,
      });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSheet = async () => {
    if (onSaveOrientations) {
      try {
        setIsSaving(true);
        await onSaveOrientations({
          orientations: orientations.trim(),
          operator: operatorName.trim(),
          priority,
          targetDate,
        });
      } catch {
        // Prossegue para impressão mesmo se falhar salvamento opcional
      } finally {
        setIsSaving(false);
      }
    }

    const contentHtml = printableRef.current?.innerHTML;
    if (!contentHtml) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=1024,height=920");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>O.P. ${order.order_number} — ${order.customer_name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm 7mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.28;
    }
    .op-sheet {
      width: 100%;
      max-width: 196mm;
      margin: 0 auto;
    }
    @media print {
      html, body {
        height: 284mm;
      }
      .op-sheet {
        page-break-after: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="op-sheet">
    ${contentHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 220);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const sheets = Array.isArray(order.sheets) ? order.sheets : [];
  const addr = order.address || {};
  const ship = order.shipping || {};

  const cncProductionChecks = [
    "1. Chapas cortadas na Router CNC conforme modelo e cor MDF",
    "2. Recorte VESA da tela e rasgo da impressora conferidos no gabarito",
    "3. Furação de botão Liga/Desliga, tomada, passa-cabos e 2 coolers",
    "4. Montagem estrutural, limpeza de bordas MDF e acabamento revisados",
    "5. Fechadura tubular instalada e testada com par de chaves (2 un.)",
    "6. Todos os itens do Checklist abaixo conferidos antes de lacrar a caixa",
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-[1380px] w-full max-h-[96dvh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        {/* Cabeçalho Compacto do Modal */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" />
              <span>Ficha A4 Única (1 Página) • Sem Preços</span>
            </span>
            <h2 className="text-sm sm:text-lg font-black text-white font-mono">
              O.P. {order.order_number} — {order.customer_name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveOrientations && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveOnly}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savedFeedback ? "Orientações Salvas!" : "Salvar Orientações"}</span>
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handlePrintSheet}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ Imprimir em 1 Folha A4 Agora</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo em 2 Colunas: Esquerda (Controles Rápidos) | Direita (Folha A4 Completa Visível) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* COLUNA ESQUERDA (4 COLS): CONFIGURAÇÃO & ORIENTAÇÕES PARA A FÁBRICA */}
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs lg:sticky lg:top-0">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <span className="font-black text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Configurar Ficha & Orientações</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400">
                Cabimento: 1 Folha A4
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Prioridade na Fábrica
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "normal" | "urgent")}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs"
                >
                  <option value="normal">🟢 Normal (Fila Padrão)</option>
                  <option value="urgent">🔴 URGENTE / Prioridade</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Meta de Expedição
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Responsável CNC / Bancada
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Ex: Equipe Router CNC"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Linhas p/ Escrita à Caneta
                </label>
                <select
                  value={blankLinesCount}
                  onChange={(e) => setBlankLinesCount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs"
                >
                  <option value={2}>2 linhas pautadas (Compacto A4)</option>
                  <option value={3}>3 linhas pautadas (Ideal A4)</option>
                  <option value={4}>4 linhas pautadas</option>
                  <option value={0}>Sem linhas em branco</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-amber-200 font-bold text-[11px] mb-1">
                ✍️ Orientações Impressas no Pedido:
              </label>
              <textarea
                rows={3}
                value={orientations}
                onChange={(e) => setOrientations(e.target.value)}
                placeholder="Digite orientações específicas para corte CNC, furação, elétrica ou embalagem..."
                className="w-full px-3 py-2 bg-slate-900 border border-amber-500/40 rounded-xl text-white placeholder-slate-500 font-semibold text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                Atalhos Rápidos (Clique para adicionar):
              </span>
              <div className="flex flex-col gap-1">
                {[
                  "ATENÇÃO: Conferir itens removidos do Kit para NÃO enviar peça a mais por engano.",
                  "Testar coolers 12V, botão liga/desliga, régua de energia e chicotes antes de embalar.",
                  "Conferir medida exata do rasgo da impressora e furação VESA do monitor.",
                  "Reforçar proteção de cantoneiras e plástico bolha para transporte.",
                ].map((txt) => (
                  <button
                    key={txt}
                    type="button"
                    onClick={() => handleQuickAddOrientation(txt)}
                    className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold text-[10px] cursor-pointer transition-colors"
                  >
                    + {txt}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={handlePrintSheet}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ Imprimir Ficha A4 Completa</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* COLUNA DIREITA (8 COLS): FOLHA A4 ÚNICA OTIMIZADA                         */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 bg-white text-slate-950 rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-slate-300">
            <div ref={printableRef}>
              {/* ================================================================= */}
              {/* CABEÇALHO UNIFICADO: PEDIDO + DESTINATÁRIO + LOGÍSTICA (COMPACTO) */}
              {/* ================================================================= */}
              <div
                style={{
                  border: "2px solid #0f172a",
                  borderRadius: "6px",
                  overflow: "hidden",
                  marginBottom: "7px",
                }}
              >
                {/* Faixa Superior Escura/Destaque */}
                <div
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    padding: "6px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        letterSpacing: "0.3px",
                        textTransform: "uppercase",
                      }}
                    >
                      ORDEM DE PRODUÇÃO CNC & CHECKLIST DE EXPEDIÇÃO
                    </div>
                    <div style={{ fontSize: "9px", color: "#cbd5e1", fontWeight: 700 }}>
                      TOTEM PRO ENGENHARIA • DOCUMENTO INTERNO DE FÁBRICA (SEM VALORES COMERCIAIS)
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        background: priority === "urgent" ? "#dc2626" : "#334155",
                        color: "#ffffff",
                        padding: "3px 7px",
                        borderRadius: "4px",
                        fontWeight: 900,
                        fontSize: "9.5px",
                        textTransform: "uppercase",
                      }}
                    >
                      {priority === "urgent" ? "🚨 PRIORIDADE URGENTE" : "FILA PADRÃO"}
                    </span>
                    <span
                      style={{
                        fontFamily: "Consolas, monospace",
                        fontSize: "14px",
                        fontWeight: 900,
                        background: "#ffffff",
                        color: "#0f172a",
                        padding: "3px 9px",
                        borderRadius: "4px",
                      }}
                    >
                      {order.order_number}
                    </span>
                  </div>
                </div>

                {/* Grade de Dados Essenciais do Pedido, Cliente e Entrega */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.15fr 1.25fr 0.9fr",
                    gap: "8px",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    fontSize: "9.8px",
                  }}
                >
                  <div style={{ borderRight: "1px solid #cbd5e1", paddingRight: "8px" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 900, color: "#475569", textTransform: "uppercase" }}>
                      CLIENTE / DESTINATÁRIO
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 900, color: "#0f172a", marginTop: "1px" }}>
                      {order.customer_name}
                    </div>
                    <div style={{ color: "#1e293b", marginTop: "1px" }}>
                      <strong>CPF/CNPJ:</strong> {order.customer_document || "—"} •{" "}
                      <strong>Tel:</strong> {order.customer_whatsapp || "—"}
                    </div>
                  </div>

                  <div style={{ borderRight: "1px solid #cbd5e1", paddingRight: "8px" }}>
                    <div style={{ fontSize: "8.5px", fontWeight: 900, color: "#475569", textTransform: "uppercase" }}>
                      DESTINO & ENDEREÇO DE ENTREGA
                    </div>
                    <div style={{ fontWeight: 800, color: "#0f172a", marginTop: "1px" }}>
                      {addr.street ? `${addr.street}, nº ${addr.number || "S/N"}` : "Endereço não informado"}
                      {addr.complement ? ` (${addr.complement})` : ""}
                    </div>
                    <div style={{ color: "#1e293b", marginTop: "1px" }}>
                      <strong>Cidade/UF:</strong> {addr.city || "—"}/{addr.state || "SP"} •{" "}
                      <strong>CEP:</strong> {addr.cep || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "8.5px", fontWeight: 900, color: "#475569", textTransform: "uppercase" }}>
                      LOGÍSTICA & CONTROLE CNC
                    </div>
                    <div style={{ fontWeight: 900, color: "#0f172a", marginTop: "1px" }}>
                      Envio: {stripMonetaryValues(ship.name || "A Definir")}
                    </div>
                    <div style={{ color: "#1e293b", marginTop: "1px" }}>
                      <strong>Data:</strong>{" "}
                      {new Date(order.$createdAt).toLocaleDateString("pt-BR")} •{" "}
                      <strong>Meta:</strong>{" "}
                      {targetDate
                        ? new Date(targetDate + "T12:00:00").toLocaleDateString("pt-BR")
                        : "___/___/26"}
                    </div>
                    <div style={{ color: "#1e293b", marginTop: "1px" }}>
                      <strong>Operador:</strong> {operatorName.trim() || "____________________"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* POR ITEM: ESPECIFICAÇÃO TÉCNICA + CHECKLIST COMPLETO EM 2 COLUNAS */}
              {/* ================================================================= */}
              {items.map((it, idx) => {
                const sheet = sheets[idx] || null;
                const itemQty = Math.max(1, Number(it.quantity) || 1);
                const kitSnapshot =
                  it.kit_items_snapshot || sheet?.kitItemsSnapshot || null;
                const resolvedEq = resolveKitEquipmentSummary({
                  kitItemsSnapshot: kitSnapshot,
                  monitorName: it.monitor_name,
                  printerName: it.printer_name,
                  readerName: it.reader_name,
                });

                const hasAssembly = Boolean(
                  sheet?.assemblyService?.includes("Montagem Especializada") ||
                    sheet?.includeAssemblyService ||
                    it.monitor_name?.includes("100% Montado")
                );

                const itemChecklist: DeliveryChecklistItem[] =
                  Array.isArray(it.delivery_checklist) && it.delivery_checklist.length > 0
                    ? it.delivery_checklist
                    : Array.isArray(sheet?.deliveryChecklist) &&
                      sheet.deliveryChecklist.length > 0
                    ? sheet.deliveryChecklist
                    : buildOrderDeliveryChecklist({
                        cabinetName: it.cabinet_name,
                        colorName: it.color_name,
                        quantity: itemQty,
                        kitItemsSnapshot: kitSnapshot,
                        monitorName: it.monitor_name,
                        printerName: it.printer_name,
                        readerName: it.reader_name,
                        includeAssemblyService: hasAssembly,
                      });

                const checklistToDeliver = itemChecklist.filter((c) => c.included);
                const checklistNotToDeliver = itemChecklist.filter((c) => !c.included);

                return (
                  <div key={it.$id || idx} style={{ marginBottom: "7px" }}>
                    {/* 1. ESPECIFICAÇÃO TÉCNICA DO GABINETE & PERIFÉRICOS */}
                    <div
                      style={{
                        border: "2px solid #0f172a",
                        borderRadius: "6px",
                        padding: "6px 9px",
                        marginBottom: "7px",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1.5px solid #0f172a",
                          paddingBottom: "4px",
                          marginBottom: "6px",
                          fontSize: "10.5px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        <span>
                          1. ESPECIFICAÇÃO DE USINAGEM CNC #{idx + 1}: {itemQty}x{" "}
                          {stripMonetaryValues(it.cabinet_name)} — COR: {stripMonetaryValues(it.color_name)}
                        </span>
                        <span
                          style={{
                            background: "#e2e8f0",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontSize: "9.5px",
                          }}
                        >
                          {hasAssembly
                            ? "⚙️ ENTREGAR 100% MONTADO"
                            : resolvedEq.isKit
                            ? `📦 KIT (${resolvedEq.selectedCount}/${resolvedEq.totalCount} ITENS)`
                            : "📦 SOMENTE GABINETE"}
                        </span>
                      </div>

                      {/* 3 Caixas Lado a Lado: Tela/Recorte • Impressora/Rasgo • Medidas/Leitor */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.15fr 1.15fr 0.9fr",
                          gap: "6px",
                          fontSize: "9.8px",
                        }}
                      >
                        {/* TELA / MONITOR */}
                        <div
                          style={{
                            border:
                              resolvedEq.isKit && !resolvedEq.hasMonitorInKit
                                ? "2px solid #dc2626"
                                : "1px solid #475569",
                            borderRadius: "5px",
                            padding: "4px 7px",
                            background:
                              resolvedEq.isKit && !resolvedEq.hasMonitorInKit
                                ? "#fff1f2"
                                : "#f8fafc",
                          }}
                        >
                          <div style={{ fontSize: "8.5px", fontWeight: 900, color: "#334155", textTransform: "uppercase" }}>
                            TELA / MONITOR & RECORTE CNC:
                          </div>
                          <div style={{ fontWeight: 900, fontSize: "10px", marginTop: "1px", color: "#0f172a" }}>
                            {resolvedEq.isKit && !resolvedEq.hasMonitorInKit
                              ? "🚫 REMOVIDO PELO CLIENTE (NÃO ENVIAR TELA)"
                              : stripMonetaryValues(resolvedEq.monitorDisplay || it.monitor_name)}
                          </div>
                          <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>
                            <strong>Corte:</strong>{" "}
                            {stripMonetaryValues(
                              sheet?.screenSpecs?.screenCutoutMm ||
                                'Abertura padrão tela 23.8" (+1.5mm)'
                            )}
                          </div>
                        </div>

                        {/* IMPRESSORA TÉRMICA */}
                        <div
                          style={{
                            border:
                              resolvedEq.isKit && !resolvedEq.hasPrinterInKit
                                ? "2px solid #dc2626"
                                : "1px solid #475569",
                            borderRadius: "5px",
                            padding: "4px 7px",
                            background:
                              resolvedEq.isKit && !resolvedEq.hasPrinterInKit
                                ? "#fff1f2"
                                : "#f8fafc",
                          }}
                        >
                          <div style={{ fontSize: "8.5px", fontWeight: 900, color: "#334155", textTransform: "uppercase" }}>
                            IMPRESSORA TÉRMICA & RASGO CNC:
                          </div>
                          <div style={{ fontWeight: 900, fontSize: "10px", marginTop: "1px", color: "#0f172a" }}>
                            {resolvedEq.isKit && !resolvedEq.hasPrinterInKit
                              ? "🚫 REMOVIDA PELO CLIENTE (NÃO ENVIAR IMPR.)"
                              : stripMonetaryValues(resolvedEq.printerDisplay || it.printer_name)}
                          </div>
                          <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>
                            <strong>Rasgo:</strong>{" "}
                            {stripMonetaryValues(
                              sheet?.printerSpecs?.slotOpeningMm ||
                                "Rasgo frontal padrão 80mm c/ berço"
                            )}
                          </div>
                        </div>

                        {/* DIMENSÕES & LEITOR */}
                        <div
                          style={{
                            border: "1px solid #475569",
                            borderRadius: "5px",
                            padding: "4px 7px",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ fontSize: "8.5px", fontWeight: 900, color: "#334155", textTransform: "uppercase" }}>
                            MEDIDAS EXTERNAS & LEITOR:
                          </div>
                          <div style={{ fontWeight: 900, fontSize: "10px", marginTop: "1px", color: "#0f172a" }}>
                            {sheet?.dimensionsMm?.heightMm
                              ? `${sheet.dimensionsMm.heightMm} × ${sheet.dimensionsMm.widthMm} × ${sheet.dimensionsMm.depthMm} mm`
                              : "Gabarito Homologado CNC"}
                          </div>
                          <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>
                            <strong>Leitor:</strong>{" "}
                            {resolvedEq.hasReader
                              ? stripMonetaryValues(resolvedEq.readerDisplay)
                              : stripMonetaryValues(it.reader_name || "Sem leitor")}
                          </div>
                        </div>
                      </div>

                      {sheet?.customizationNotes && (
                        <div
                          style={{
                            marginTop: "5px",
                            padding: "4px 7px",
                            border: "1.5px solid #d97706",
                            background: "#fef3c7",
                            borderRadius: "4px",
                            fontWeight: 800,
                            fontSize: "9.8px",
                          }}
                        >
                          ⚠️ NOTA TÉCNICA DO ITEM: {stripMonetaryValues(sheet.customizationNotes)}
                        </div>
                      )}
                    </div>

                    {/* ================================================================= */}
                    {/* 2. CHECKLIST DE SEPARAÇÃO & ENTREGA EM 2 COLUNAS (TODOS OS ITENS) */}
                    {/* ================================================================= */}
                    <div
                      style={{
                        border: "2px solid #0f172a",
                        borderRadius: "6px",
                        padding: "6px 9px",
                        marginBottom: "7px",
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1.5px solid #0f172a",
                          paddingBottom: "3px",
                          marginBottom: "5px",
                          fontSize: "10.5px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        <span>
                          2. CHECKLIST DE SEPARAÇÃO & EXPEDIÇÃO — O QUE COLOCAR NA CAIXA (MARCAR [ ✓ ] À CANETA)
                        </span>
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#065f46",
                            border: "1px solid #059669",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontSize: "9px",
                          }}
                        >
                          ENVIAR: {checklistToDeliver.length} ITENS OBRIGATÓRIOS
                        </span>
                      </div>

                      {/* Grade em 2 Colunas Lado a Lado para Economizar Metade da Altura da Página A4 */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "4px 8px",
                        }}
                      >
                        {checklistToDeliver.map((chk, cIdx) => (
                          <div
                            key={chk.id || cIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              border: "1px solid #64748b",
                              borderRadius: "4px",
                              padding: "3.5px 6px",
                              background: cIdx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                              <span
                                style={{
                                  width: "15px",
                                  height: "15px",
                                  border: "2px solid #0f172a",
                                  borderRadius: "3px",
                                  display: "inline-block",
                                  flexShrink: 0,
                                  background: "#ffffff",
                                }}
                              />
                              <span
                                style={{
                                  fontFamily: "Consolas, monospace",
                                  fontWeight: 900,
                                  fontSize: "10.5px",
                                  color: "#0f172a",
                                  flexShrink: 0,
                                }}
                              >
                                {chk.quantity}x
                              </span>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: "10px",
                                  color: "#0f172a",
                                }}
                              >
                                {stripMonetaryValues(chk.name)}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: "8.5px",
                                fontWeight: 800,
                                color: "#475569",
                                borderLeft: "1px dashed #94a3b8",
                                paddingLeft: "5px",
                                marginLeft: "4px",
                                flexShrink: 0,
                              }}
                            >
                              Visto: _____
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* AUDITORIA DE BLOQUEIO: ITENS REMOVIDOS PELO CLIENTE (NÃO ENVIAR) */}
                      {checklistNotToDeliver.length > 0 && (
                        <div
                          style={{
                            marginTop: "6px",
                            padding: "5px 7px",
                            border: "2px solid #dc2626",
                            borderRadius: "5px",
                            background: "#fff1f2",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              color: "#991b1b",
                              marginBottom: "4px",
                            }}
                          >
                            🚫 ATENÇÃO — ITENS REMOVIDOS PELO CLIENTE (MARCAR [ ✓ ] CONFIRMANDO QUE NÃO FORAM COLOCADOS NA CAIXA):
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "4px 8px",
                            }}
                          >
                            {checklistNotToDeliver.map((rem, rIdx) => (
                              <div
                                key={rem.id || rIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  border: "1px solid #f87171",
                                  borderRadius: "4px",
                                  padding: "3px 6px",
                                  background: "#ffffff",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span
                                    style={{
                                      width: "14px",
                                      height: "14px",
                                      border: "2px solid #991b1b",
                                      borderRadius: "3px",
                                      display: "inline-block",
                                      flexShrink: 0,
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      fontSize: "9.8px",
                                      textDecoration: "line-through",
                                      color: "#881337",
                                    }}
                                  >
                                    {stripMonetaryValues(rem.name)}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    fontSize: "8.5px",
                                    fontWeight: 900,
                                    color: "#991b1b",
                                    flexShrink: 0,
                                  }}
                                >
                                  🚫 NÃO ENVIAR
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ================================================================= */}
              {/* 3. CHECKLIST DE USINAGEM CNC & ESTRUTURA (EM 2 COLUNAS COMPACTAS) */}
              {/* ================================================================= */}
              <div
                style={{
                  border: "2px solid #0f172a",
                  borderRadius: "6px",
                  padding: "6px 9px",
                  marginBottom: "7px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1.5px solid #0f172a",
                    paddingBottom: "3px",
                    marginBottom: "5px",
                    fontSize: "10.5px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  <span>3. CHECKLIST DE USINAGEM CNC, ACABAMENTO & MONTAGEM (MARCAR [ ✓ ] À CANETA)</span>
                  <span style={{ fontSize: "9px", color: "#334155" }}>CONTROLE DE QUALIDADE CNC</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4px 8px",
                  }}
                >
                  {cncProductionChecks.map((stepText, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        padding: "3.5px 6px",
                        background: "#f8fafc",
                      }}
                    >
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid #0f172a",
                          borderRadius: "3px",
                          display: "inline-block",
                          flexShrink: 0,
                          background: "#ffffff",
                        }}
                      />
                      <span style={{ fontWeight: 700, fontSize: "9.5px", color: "#0f172a" }}>
                        {stepText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================================================================= */}
              {/* 4. ORIENTAÇÕES TÉCNICAS & LINHAS PAUTADAS PARA CANETA             */}
              {/* ================================================================= */}
              {(orientations.trim() || blankLinesCount > 0) && (
                <div
                  style={{
                    border: "2px solid #0f172a",
                    background: "#fffbeb",
                    borderRadius: "6px",
                    padding: "6px 9px",
                    marginBottom: "7px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #f59e0b",
                      paddingBottom: "3px",
                      marginBottom: "4px",
                      fontSize: "10px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    <span>4. ORIENTAÇÕES DE PRODUÇÃO & ANOTAÇÕES MANUAIS NA BANCADA</span>
                    <span style={{ fontSize: "8.5px", color: "#78350f" }}>OBSERVAÇÕES DE FÁBRICA</span>
                  </div>

                  {orientations.trim() && (
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#0f172a",
                        whiteSpace: "pre-wrap",
                        background: "#ffffff",
                        border: "1px solid #0f172a",
                        borderRadius: "4px",
                        padding: "5px 7px",
                        marginBottom: blankLinesCount > 0 ? "4px" : "0",
                      }}
                    >
                      {stripMonetaryValues(orientations)}
                    </div>
                  )}

                  {blankLinesCount > 0 && (
                    <div>
                      {Array.from({ length: blankLinesCount }).map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderBottom: "1px dashed #475569",
                            height: "17px",
                            width: "100%",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* 5. ASSINATURAS DE RESPONSABILIDADE EM 3 COLUNAS                   */}
              {/* ================================================================= */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                  marginTop: "4px",
                }}
              >
                {[
                  "1. OPERADOR ROUTER CNC / ESTRUTURA",
                  "2. SEPARAÇÃO DE KIT & ELÉTRICA",
                  "3. AUDITORIA FINAL EXPEDIÇÃO (100% OK)",
                ].map((sigTitle) => (
                  <div
                    key={sigTitle}
                    style={{
                      border: "1.5px solid #334155",
                      borderRadius: "6px",
                      padding: "5px 8px",
                      textAlign: "center",
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        borderBottom: "1.5px solid #0f172a",
                        height: "20px",
                        marginBottom: "3px",
                      }}
                    />
                    <div style={{ fontWeight: 900, fontSize: "9px", textTransform: "uppercase" }}>
                      {sigTitle}
                    </div>
                    <div style={{ fontSize: "8.5px", color: "#475569", marginTop: "1px" }}>
                      Data: ___/___/2026 • Hora: ___:___
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
