"use client";

import React, { useState, useRef } from "react";
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wrench,
  Save,
  Plus,
  Truck,
  User,
  Calendar,
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
  monitor_name: string;
  printer_name: string;
  reader_name: string;
  kit_items_snapshot?: any[] | null;
  delivery_checklist?: DeliveryChecklistItem[] | null;
}

export interface PrintableOrderData {
  $id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_document?: string;
  customer_email?: string;
  customer_whatsapp?: string;
  $createdAt: string;
  items?: PrintableOrderItem[];
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    customerNotes?: string;
    executionOrder?: {
      priority?: "normal" | "urgent";
      assignedOperator?: string;
      targetDispatchDate?: string;
      plainSummary?: string;
    } | null;
  } | null;
  shipping?: {
    name?: string;
    carrier?: string;
    deliveryDaysMin?: number;
    deliveryDaysMax?: number;
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
    .join("\n\n");

  const [orientations, setOrientations] = useState<string>(initialNotes);
  const [operatorName, setOperatorName] = useState<string>(exec?.assignedOperator || "");
  const [priority, setPriority] = useState<"normal" | "urgent">(exec?.priority || "normal");
  const [targetDate, setTargetDate] = useState<string>(exec?.targetDispatchDate || "");
  const [blankLinesCount, setBlankLinesCount] = useState<number>(5);
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

    const printWindow = window.open("", "_blank", "width=1024,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Ordem de Produção ${order.order_number} — ${order.customer_name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.35;
    }
    .op-sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .op-header {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #f8fafc;
    }
    .op-title {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 0;
      color: #0f172a;
    }
    .op-subtitle {
      font-size: 10px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .op-order-num {
      font-family: Consolas, monospace;
      font-size: 18px;
      font-weight: 900;
      background: #0f172a;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
    }
    .op-badge-urgent {
      background: #fee2e2;
      color: #991b1b;
      border: 2px solid #dc2626;
      padding: 3px 8px;
      border-radius: 5px;
      font-weight: 900;
      font-size: 10px;
      text-transform: uppercase;
      display: inline-block;
      margin-top: 4px;
    }
    .op-badge-normal {
      background: #e2e8f0;
      color: #1e293b;
      border: 1px solid #64748b;
      padding: 3px 8px;
      border-radius: 5px;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      display: inline-block;
      margin-top: 4px;
    }
    .op-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .op-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .op-box {
      border: 1.5px solid #334155;
      border-radius: 8px;
      padding: 8px 11px;
      margin-bottom: 10px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .op-box-header {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 7px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .op-orientations-box {
      border: 2px solid #0f172a;
      background: #fffbeb;
      border-radius: 8px;
      padding: 9px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .op-orientations-text {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      white-space: pre-wrap;
      background: #ffffff;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 8px;
      min-height: 36px;
    }
    .op-pen-line {
      border-bottom: 1px dashed #475569;
      height: 22px;
      width: 100%;
    }
    .op-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    .op-table th, .op-table td {
      border: 1.5px solid #334155;
      padding: 6px 8px;
      text-align: left;
      vertical-align: middle;
      font-size: 11px;
    }
    .op-table th {
      background: #e2e8f0;
      font-weight: 900;
      text-transform: uppercase;
      font-size: 10px;
      color: #0f172a;
    }
    .pen-checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid #0f172a;
      border-radius: 3px;
      display: inline-block;
      background: #ffffff;
    }
    .op-not-deliver-row td {
      background: #fff1f2;
      color: #881337;
    }
    .op-sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 14px;
      page-break-inside: avoid;
    }
    .op-sig-box {
      border: 1.5px solid #334155;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
      background: #f8fafc;
    }
    .op-sig-line {
      border-bottom: 1.5px solid #0f172a;
      height: 32px;
      margin-bottom: 5px;
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
      }, 250);
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

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-5xl w-full max-h-[95dvh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        {/* Cabeçalho do Modal de Impressão */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" />
                <span>Ordem de Produção & Checklist p/ Caneta (Sem Valores Monetários)</span>
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-white mt-1 font-mono">
              O.P. {order.order_number} — {order.customer_name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveOrientations && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveOnly}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savedFeedback ? "Orientações Salvas!" : "Salvar Orientações"}</span>
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handlePrintSheet}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ Imprimir Ordem de Produção A4 (Sem Preços)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 flex items-center justify-center text-slate-400 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo com Painel de Escrita de Orientações + Pré-visualização da Folha A4 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Painel de Configuração Rápida e Escrita de Orientações antes de imprimir */}
          <div className="p-4 rounded-2xl bg-slate-950 border-2 border-amber-500/40 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-black text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>
                  ✍️ Escrever Orientações para a Produção / Expedição (Aparecerá no Topo da Folha Impressa)
                </span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400">
                🔒 Todos os preços em R$ são ocultados automaticamente na folha impressa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Prioridade na Fábrica
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "normal" | "urgent")}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                >
                  <option value="normal">🟢 Normal (Fila Padrão)</option>
                  <option value="urgent">🔴 URGENTE / Prioridade Máxima</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Responsável Produção / CNC
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="Ex: Equipe Router CNC / Bancada"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Meta de Expedição / Envio
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Linhas p/ Escrita à Caneta
                </label>
                <select
                  value={blankLinesCount}
                  onChange={(e) => setBlankLinesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                >
                  <option value={3}>3 linhas pautadas na folha</option>
                  <option value={5}>5 linhas pautadas na folha</option>
                  <option value={8}>8 linhas pautadas na folha</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-amber-200 font-bold text-[11px] mb-1">
                Orientações Digitadas (ou deixe em branco para escrever tudo à caneta na folha impressa):
              </label>
              <textarea
                rows={3}
                value={orientations}
                onChange={(e) => setOrientations(e.target.value)}
                placeholder="Digite aqui qualquer orientação específica para o corte CNC, montagem elétrica, separação do kit ou embalagem..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-white placeholder-slate-500 font-semibold focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Atalhos rápidos de orientações de fábrica */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                Inserir Orientação Rápida:
              </span>
              {[
                "ATENÇÃO: Conferir itens removidos do Kit para NÃO enviar peça a mais por engano.",
                "Testar coolers 12V, botão liga/desliga, régua de energia e chicotes antes de embalar.",
                "Conferir medida exata do rasgo da impressora e furação VESA do monitor.",
                "Reforçar proteção de cantoneiras e plástico bolha para transporte via Correios/Transportadora.",
                "Incluir kit completo de parafusos, organizador de fios e par de chaves da fechadura.",
              ].map((txt) => (
                <button
                  key={txt}
                  type="button"
                  onClick={() => handleQuickAddOrientation(txt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 font-bold text-[10px] cursor-pointer"
                >
                  + {txt.slice(0, 48)}...
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRÉ-VISUALIZAÇÃO FIEL DA FOLHA A4 (EXATAMENTE O QUE SERÁ IMPRESSO)        */}
          {/* ========================================================================= */}
          <div className="bg-white text-slate-950 rounded-2xl p-5 sm:p-8 shadow-2xl border-4 border-slate-300">
            <div ref={printableRef}>
              {/* CABEÇALHO DA ORDEM DE PRODUÇÃO */}
              <div
                className="op-header"
                style={{
                  border: "2px solid #0f172a",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  background: "#f8fafc",
                }}
              >
                <div>
                  <h1
                    className="op-title"
                    style={{
                      fontSize: "17px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    ORDEM DE PRODUÇÃO & CHECKLIST DE EXPEDIÇÃO (100% ASSERTIVIDADE)
                  </h1>
                  <div
                    className="op-subtitle"
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "#334155",
                      textTransform: "uppercase",
                      marginTop: "3px",
                    }}
                  >
                    TOTEM PRO ENGENHARIA CNC • DOCUMENTO INTERNO DE FÁBRICA E CONFERÊNCIA À CANETA (SEM VALORES COMERCIAIS)
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#1e293b" }}>
                    <strong>Data do Pedido:</strong>{" "}
                    {new Date(order.$createdAt).toLocaleString("pt-BR")} •{" "}
                    <strong>Responsável CNC / Bancada:</strong>{" "}
                    {operatorName.trim() || "___________________________"} •{" "}
                    <strong>Meta Expedição:</strong>{" "}
                    {targetDate
                      ? new Date(targetDate + "T12:00:00").toLocaleDateString("pt-BR")
                      : "____/____/2026"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    className="op-order-num"
                    style={{
                      fontFamily: "Consolas, monospace",
                      fontSize: "17px",
                      fontWeight: 900,
                      background: "#0f172a",
                      color: "#ffffff",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      display: "inline-block",
                    }}
                  >
                    {order.order_number}
                  </div>
                  <div>
                    <span
                      className={priority === "urgent" ? "op-badge-urgent" : "op-badge-normal"}
                      style={{
                        background: priority === "urgent" ? "#fee2e2" : "#e2e8f0",
                        color: priority === "urgent" ? "#991b1b" : "#1e293b",
                        border: priority === "urgent" ? "2px solid #dc2626" : "1px solid #64748b",
                        padding: "2px 8px",
                        borderRadius: "5px",
                        fontWeight: 900,
                        fontSize: "10px",
                        textTransform: "uppercase",
                        display: "inline-block",
                        marginTop: "4px",
                      }}
                    >
                      {priority === "urgent" ? "🚨 PRIORIDADE URGENTE" : "FILA PADRÃO DE PRODUÇÃO"}
                    </span>
                  </div>
                </div>
              </div>

              {/* BLOCO 1: DADOS DO DESTINATÁRIO & LOGÍSTICA DE ENTREGA (SEM PREÇOS) */}
              <div
                className="op-box"
                style={{
                  border: "1.5px solid #334155",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  marginBottom: "10px",
                }}
              >
                <div
                  className="op-box-header"
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    borderBottom: "1.5px solid #cbd5e1",
                    paddingBottom: "4px",
                    marginBottom: "7px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>1. IDENTIFICAÇÃO DO CLIENTE & ENDEREÇO DE EXPEDIÇÃO</span>
                  <span>MODALIDADE DE ENVIO: {stripMonetaryValues(ship.name || "A Definir")}</span>
                </div>

                <div
                  className="op-grid-2"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "11px",
                  }}
                >
                  <div>
                    <div>
                      <strong>Cliente / Destinatário:</strong> {order.customer_name}
                    </div>
                    <div>
                      <strong>CPF / CNPJ:</strong> {order.customer_document || "—"}
                    </div>
                    <div>
                      <strong>Telefone / WhatsApp:</strong> {order.customer_whatsapp || "—"}
                    </div>
                  </div>
                  <div>
                    <div>
                      <strong>Endereço:</strong> {addr.street || "—"}, nº {addr.number || "S/N"}
                      {addr.complement ? ` (${addr.complement})` : ""}
                    </div>
                    <div>
                      <strong>Bairro:</strong> {addr.neighborhood || "—"} •{" "}
                      <strong>Cidade/UF:</strong> {addr.city || "—"}/{addr.state || "SP"}
                    </div>
                    <div>
                      <strong>CEP:</strong> {addr.cep || "—"} •{" "}
                      <strong>Transportadora:</strong> {ship.carrier || "Correios / Transportadora"}
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOCO 2: ORIENTAÇÕES DE PRODUÇÃO & ESPAÇO PAUTADO PARA ANOTAÇÕES À CANETA */}
              <div
                className="op-orientations-box"
                style={{
                  border: "2px solid #0f172a",
                  background: "#fffbeb",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  marginBottom: "12px",
                }}
              >
                <div
                  className="op-box-header"
                  style={{
                    fontSize: "11px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    borderBottom: "1.5px solid #f59e0b",
                    paddingBottom: "4px",
                    marginBottom: "7px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>2. ORIENTAÇÕES TÉCNICAS DE PRODUÇÃO, MONTAGEM & EXPEDIÇÃO</span>
                  <span>LEITURA OBRIGATÓRIA ANTES DE INICIAR</span>
                </div>

                {orientations.trim() ? (
                  <div
                    className="op-orientations-text"
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0f172a",
                      whiteSpace: "pre-wrap",
                      background: "#ffffff",
                      border: "1.5px solid #0f172a",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      marginBottom: "8px",
                    }}
                  >
                    {stripMonetaryValues(orientations)}
                  </div>
                ) : null}

                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color: "#334155",
                      marginBottom: "2px",
                    }}
                  >
                    ✍️ ORIENTAÇÕES / OBSERVAÇÕES MANUAIS À CANETA (BANCADA / USINAGEM / EXPEDIÇÃO):
                  </div>
                  {Array.from({ length: blankLinesCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="op-pen-line"
                      style={{
                        borderBottom: "1px dashed #475569",
                        height: "22px",
                        width: "100%",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* BLOCO 3 & 4: DETALHES TÉCNICOS DO PEDIDO + CHECKLIST DE CANETA POR ITEM (SEM VALORES) */}
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
                  <div key={it.$id || idx} style={{ marginBottom: "14px" }}>
                    {/* ESPECIFICAÇÕES TÉCNICAS DE USINAGEM CNC DO GABINETE */}
                    <div
                      className="op-box"
                      style={{
                        border: "2px solid #0f172a",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        className="op-box-header"
                        style={{
                          fontSize: "12px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          borderBottom: "2px solid #0f172a",
                          paddingBottom: "5px",
                          marginBottom: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          3. ESPECIFICAÇÃO TÉCNICA DO GABINETE #{idx + 1}: {itemQty}x{" "}
                          {stripMonetaryValues(it.cabinet_name)}
                        </span>
                        <span>
                          MODALIDADE:{" "}
                          {hasAssembly
                            ? "⚙️ ENTREGAR 100% MONTADO E TESTADO"
                            : resolvedEq.isKit
                            ? `📦 GABINETE + KIT (${resolvedEq.selectedCount} DE ${resolvedEq.totalCount} PEÇAS)`
                            : "📦 APENAS GABINETE FÍSICO"}
                        </span>
                      </div>

                      <div
                        className="op-grid-3"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "8px",
                          marginBottom: "8px",
                          fontSize: "11px",
                        }}
                      >
                        <div
                          style={{
                            border: "1px solid #64748b",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#475569" }}>
                            MODELO & QUANTIDADE
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 900, color: "#0f172a" }}>
                            {itemQty}x {stripMonetaryValues(it.cabinet_name)}
                          </div>
                        </div>

                        <div
                          style={{
                            border: "1px solid #64748b",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#475569" }}>
                            ACABAMENTO / COR MDF
                          </div>
                          <div style={{ fontSize: "13px", fontWeight: 900, color: "#0f172a" }}>
                            {stripMonetaryValues(it.color_name)}
                          </div>
                        </div>

                        <div
                          style={{
                            border: "1px solid #64748b",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#475569" }}>
                            DIMENSÕES EXTERNAS / CNC
                          </div>
                          <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a" }}>
                            {sheet?.dimensionsMm?.heightMm
                              ? `${sheet.dimensionsMm.heightMm} × ${sheet.dimensionsMm.widthMm} × ${sheet.dimensionsMm.depthMm} mm`
                              : "Padrão Homologado CNC"}
                          </div>
                        </div>
                      </div>

                      {/* QUADRO TÉCNICO DE MONITOR, IMPRESSORA E LEITOR / ACESSÓRIOS */}
                      <div
                        className="op-grid-3"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "8px",
                          fontSize: "11px",
                        }}
                      >
                        <div
                          style={{
                            border:
                              resolvedEq.isKit && !resolvedEq.hasMonitorInKit
                                ? "2px solid #dc2626"
                                : "1.5px solid #334155",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            background:
                              resolvedEq.isKit && !resolvedEq.hasMonitorInKit
                                ? "#fff1f2"
                                : "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>
                            TELA / MONITOR & RECORTE CNC:
                          </div>
                          <div style={{ fontWeight: 900, marginTop: "2px" }}>
                            {resolvedEq.isKit && !resolvedEq.hasMonitorInKit
                              ? "❌ REMOVIDO PELO CLIENTE (NÃO ENVIAR TELA)"
                              : stripMonetaryValues(resolvedEq.monitorDisplay || it.monitor_name)}
                          </div>
                          <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px" }}>
                            <strong>Corte CNC:</strong>{" "}
                            {stripMonetaryValues(
                              sheet?.screenSpecs?.screenCutoutMm ||
                                'Abertura usinada para tela 23.8" (tolerância +1.5mm)'
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            border:
                              resolvedEq.isKit && !resolvedEq.hasPrinterInKit
                                ? "2px solid #dc2626"
                                : "1.5px solid #334155",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            background:
                              resolvedEq.isKit && !resolvedEq.hasPrinterInKit
                                ? "#fff1f2"
                                : "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>
                            IMPRESSORA TÉRMICA & BERÇO:
                          </div>
                          <div style={{ fontWeight: 900, marginTop: "2px" }}>
                            {resolvedEq.isKit && !resolvedEq.hasPrinterInKit
                              ? "❌ REMOVIDA PELO CLIENTE (NÃO ENVIAR IMPRESSORA)"
                              : stripMonetaryValues(resolvedEq.printerDisplay || it.printer_name)}
                          </div>
                          <div style={{ fontSize: "10px", color: "#334155", marginTop: "3px" }}>
                            <strong>Rasgo CNC:</strong>{" "}
                            {stripMonetaryValues(
                              sheet?.printerSpecs?.slotOpeningMm ||
                                "Rasgo frontal padrão 80mm com berço interno"
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            border: "1.5px solid #334155",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            background: "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>
                            LEITOR 2D & ACESSÓRIOS DO KIT:
                          </div>
                          <div style={{ fontWeight: 800, marginTop: "2px" }}>
                            {resolvedEq.hasReader
                              ? stripMonetaryValues(resolvedEq.readerDisplay)
                              : resolvedEq.isKit
                              ? stripMonetaryValues(resolvedEq.accessoriesSummary)
                              : stripMonetaryValues(it.reader_name || "Sem leitor")}
                          </div>
                        </div>
                      </div>

                      {sheet?.customizationNotes && (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "6px 8px",
                            border: "1.5px solid #d97706",
                            background: "#fef3c7",
                            borderRadius: "6px",
                            fontWeight: 800,
                            fontSize: "11px",
                          }}
                        >
                          ⚠️ OBSERVAÇÃO ESPECÍFICA DESTE ITEM:{" "}
                          {stripMonetaryValues(sheet.customizationNotes)}
                        </div>
                      )}
                    </div>

                    {/* ==================================================================== */}
                    {/* 4.A — CHECKLIST DE CONFERÊNCIA DE USINAGEM & ESTRUTURA CNC (CANETA)   */}
                    {/* ==================================================================== */}
                    <div
                      className="op-box"
                      style={{
                        border: "2px solid #0f172a",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        className="op-box-header"
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          borderBottom: "1.5px solid #334155",
                          paddingBottom: "4px",
                          marginBottom: "6px",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          4.A — CHECKLIST DE PRODUÇÃO & USINAGEM CNC (MARCAR [ ✓ ] COM CANETA)
                        </span>
                        <span>VALIDAÇÃO DE FÁBRICA</span>
                      </div>

                      <table className="op-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ width: "42px", textAlign: "center" }}>Check</th>
                            <th>Etapa de Conferência Física & Usinagem CNC</th>
                            <th style={{ width: "130px" }}>Visto / Operador</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            `Chapas cortadas na Router CNC conforme modelo (${stripMonetaryValues(it.cabinet_name)}) e cor (${stripMonetaryValues(it.color_name)})`,
                            `Abertura da tela (${stripMonetaryValues(sheet?.screenSpecs?.screenCutoutMm || '23.8"')}) e suporte VESA conferidos com trena/gabarito`,
                            `Rasgo frontal de saída de papel e suporte interno da impressora conferidos`,
                            `Furação de botão Liga/Desliga, passagem de cabos, tomada de força e grelhas de ventilação (2 coolers) conferidos`,
                            `Montagem estrutural, limpeza de bordas MDF, fechadura tubular instalada e testada com 2 chaves`,
                          ].map((stepText, sIdx) => (
                            <tr key={sIdx}>
                              <td style={{ textAlign: "center" }}>
                                <span
                                  className="pen-checkbox"
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    border: "2px solid #0f172a",
                                    borderRadius: "3px",
                                    display: "inline-block",
                                  }}
                                />
                              </td>
                              <td style={{ fontWeight: 700 }}>{stepText}</td>
                              <td />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ==================================================================== */}
                    {/* 4.B — CHECKLIST DE SEPARAÇÃO E ENTREGA (TODOS OS ITENS DO PEDIDO)    */}
                    {/* ==================================================================== */}
                    <div
                      className="op-box"
                      style={{
                        border: "2px solid #0f172a",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        marginBottom: "10px",
                      }}
                    >
                      <div
                        className="op-box-header"
                        style={{
                          fontSize: "11px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          borderBottom: "2px solid #0f172a",
                          paddingBottom: "4px",
                          marginBottom: "6px",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          4.B — CHECKLIST DE SEPARAÇÃO & EXPEDIÇÃO: O QUE ENTREGAR JUNTO COM O GABINETE (MARCAR À CANETA)
                        </span>
                        <span>TOTAL: {checklistToDeliver.length} ITENS OBRIGATÓRIOS</span>
                      </div>

                      <table className="op-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ width: "42px", textAlign: "center" }}>Check</th>
                            <th style={{ width: "48px", textAlign: "center" }}>Qtd</th>
                            <th>Item / Peça / Acessório que DEVE ser Separado e Enviado</th>
                            <th style={{ width: "190px" }}>Instrução de Expedição</th>
                            <th style={{ width: "105px" }}>Conferido por</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checklistToDeliver.map((chk, cIdx) => (
                            <tr key={chk.id || cIdx}>
                              <td style={{ textAlign: "center" }}>
                                <span
                                  className="pen-checkbox"
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    border: "2px solid #0f172a",
                                    borderRadius: "3px",
                                    display: "inline-block",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  fontWeight: 900,
                                  fontFamily: "Consolas, monospace",
                                  fontSize: "12px",
                                }}
                              >
                                {chk.quantity}x
                              </td>
                              <td style={{ fontWeight: 800, fontSize: "11.5px" }}>
                                {stripMonetaryValues(chk.name)}
                              </td>
                              <td style={{ fontSize: "10px", fontWeight: 800, color: "#065f46" }}>
                                ✅ ENTREGAR JUNTO COM O GABINETE
                              </td>
                              <td />
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* 4.C — ITENS REMOVIDOS PELO CLIENTE (PARA CONFERIR QUE NÃO FORAM ENVIADOS POR ENGANO) */}
                      {checklistNotToDeliver.length > 0 && (
                        <div style={{ marginTop: "10px" }}>
                          <div
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              color: "#991b1b",
                              marginBottom: "4px",
                            }}
                          >
                            ❌ 4.C — AUDITORIA DE BLOQUEIO: ITENS REMOVIDOS PELO CLIENTE (MARCAR [ ✓ ] CONFIRMANDO QUE NÃO FORAM COLOCADOS NA CAIXA):
                          </div>
                          <table className="op-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th style={{ width: "42px", textAlign: "center" }}>Check</th>
                                <th>Item Removido pelo Cliente / Não Incluso no Pedido</th>
                                <th style={{ width: "240px" }}>Regra de Bloqueio na Expedição</th>
                              </tr>
                            </thead>
                            <tbody>
                              {checklistNotToDeliver.map((rem, rIdx) => (
                                <tr key={rem.id || rIdx} className="op-not-deliver-row">
                                  <td style={{ textAlign: "center" }}>
                                    <span
                                      className="pen-checkbox"
                                      style={{
                                        width: "18px",
                                        height: "18px",
                                        border: "2px solid #991b1b",
                                        borderRadius: "3px",
                                        display: "inline-block",
                                      }}
                                    />
                                  </td>
                                  <td
                                    style={{
                                      fontWeight: 800,
                                      textDecoration: "line-through",
                                      color: "#881337",
                                    }}
                                  >
                                    {stripMonetaryValues(rem.name)}
                                  </td>
                                  <td style={{ fontWeight: 900, fontSize: "10px", color: "#991b1b" }}>
                                    🚫 NÃO SEPARAR E NÃO ENVIAR
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* BLOCO 5: ASSINATURAS DE VALIDAÇÃO 100% DE ASSERTIVIDADE À CANETA */}
              <div
                className="op-sig-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <div
                  className="op-sig-box"
                  style={{
                    border: "1.5px solid #334155",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    textAlign: "center",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    className="op-sig-line"
                    style={{
                      borderBottom: "1.5px solid #0f172a",
                      height: "30px",
                      marginBottom: "5px",
                    }}
                  />
                  <div style={{ fontWeight: 900, fontSize: "10px", textTransform: "uppercase" }}>
                    1. OPERADOR ROUTER CNC / ESTRUTURA
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
                    Data: ____/____/2026 • Hora: ____:____
                  </div>
                </div>

                <div
                  className="op-sig-box"
                  style={{
                    border: "1.5px solid #334155",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    textAlign: "center",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    className="op-sig-line"
                    style={{
                      borderBottom: "1.5px solid #0f172a",
                      height: "30px",
                      marginBottom: "5px",
                    }}
                  />
                  <div style={{ fontWeight: 900, fontSize: "10px", textTransform: "uppercase" }}>
                    2. SEPARAÇÃO DE KIT & ELÉTRICA
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
                    Data: ____/____/2026 • Hora: ____:____
                  </div>
                </div>

                <div
                  className="op-sig-box"
                  style={{
                    border: "1.5px solid #334155",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    textAlign: "center",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    className="op-sig-line"
                    style={{
                      borderBottom: "1.5px solid #0f172a",
                      height: "30px",
                      marginBottom: "5px",
                    }}
                  />
                  <div style={{ fontWeight: 900, fontSize: "10px", textTransform: "uppercase" }}>
                    3. AUDITORIA FINAL EXPEDIÇÃO (100% OK)
                  </div>
                  <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
                    Data: ____/____/2026 • Hora: ____:____
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal de Impressão */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            Dica: Marque todos os itens com caneta na folha impressa antes de lacrar a embalagem do pedido{" "}
            <strong className="text-white font-mono">{order.order_number}</strong>.
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handlePrintSheet}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ Imprimir Ordem de Produção Agora</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
