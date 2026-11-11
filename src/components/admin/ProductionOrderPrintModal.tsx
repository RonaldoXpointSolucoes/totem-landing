"use client";

import React, { useState, useRef } from "react";
import {
  Printer,
  FileText,
  Save,
  Plus,
  Trash2,
  RotateCcw,
  Edit3,
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

export interface EditablePrintChecklistItem {
  id: string;
  quantity: string;
  name: string;
}

export interface EditablePrintRemovedItem {
  id: string;
  name: string;
}

export interface EditablePrintOrderItem {
  id: string;
  headerTitle: string;
  badgeText: string;
  monitorTitle: string;
  monitorCutout: string;
  monitorRemovedAlert: boolean;
  printerTitle: string;
  printerSlot: string;
  printerRemovedAlert: boolean;
  dimensionsText: string;
  readerText: string;
  technicalNote: string;
  checklistToDeliver: EditablePrintChecklistItem[];
  checklistNotToDeliver: EditablePrintRemovedItem[];
}

export interface CustomPrintOverrides {
  orderNumberLabel?: string;
  customerName?: string;
  addressLine1?: string;
  addressCityState?: string;
  addressCep?: string;
  shippingLabel?: string;
  orderDateStr?: string;
  targetDateStr?: string;
  operatorName?: string;
  priority?: "normal" | "urgent";
  editableItems?: EditablePrintOrderItem[];
  complementaryChecks?: string[];
  orientations?: string;
  manualLines?: string[];
  signatureTitles?: string[];
  signatureDates?: string[];
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
      printOverrides?: CustomPrintOverrides | null;
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
    printOverrides?: CustomPrintOverrides;
  }) => Promise<void> | void;
}

/**
 * Remove valores monetários ("R$ 1.100,00", "(+R$ 999)") e remove "(MaDeFibra BP)"
 * garantindo que a Ordem de Produção seja limpa e 100% isenta de preços e códigos desnecessários.
 */
function cleanPrintText(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/\(\s*[+-]?\s*R\$\s*[\d.,]+\s*\)/gi, "")
    .replace(/[+-]?\s*R\$\s*[\d.,]+/gi, "")
    .replace(/\(\s*MaDeFibra\s*BP\s*\)/gi, "")
    .replace(/\bMaDeFibra\s*BP\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildDefaultEditableItems(
  items: PrintableOrderItem[],
  sheets: any[]
): EditablePrintOrderItem[] {
  return items.map((it, idx) => {
    const sheet = sheets[idx] || null;
    const itemQty = Math.max(1, Number(it.quantity) || 1);
    const kitSnapshot = it.kit_items_snapshot || sheet?.kitItemsSnapshot || null;
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

    const rawChecklist: DeliveryChecklistItem[] =
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

    const cleanCab = cleanPrintText(it.cabinet_name);
    const cleanCol = cleanPrintText(it.color_name);

    return {
      id: it.$id || `item-${idx}`,
      headerTitle: `${itemQty}X ${cleanCab.toUpperCase()} — COR: ${cleanCol.toUpperCase()}`,
      badgeText: hasAssembly
        ? "⚙️ ENTREGAR 100% MONTADO"
        : resolvedEq.isKit
        ? `📦 KIT (${resolvedEq.selectedCount}/${resolvedEq.totalCount} ITENS)`
        : "📦 SOMENTE GABINETE",
      monitorRemovedAlert: Boolean(resolvedEq.isKit && !resolvedEq.hasMonitorInKit),
      monitorTitle:
        resolvedEq.isKit && !resolvedEq.hasMonitorInKit
          ? "🚫 REMOVIDO PELO CLIENTE (NÃO ENVIAR TELA)"
          : cleanPrintText(resolvedEq.monitorDisplay || it.monitor_name || "Nenhum"),
      monitorCutout: cleanPrintText(
        sheet?.screenSpecs?.screenCutoutMm ||
          'Abertura padrão tela 23.8" (+1.5mm)'
      ),
      printerRemovedAlert: Boolean(resolvedEq.isKit && !resolvedEq.hasPrinterInKit),
      printerTitle:
        resolvedEq.isKit && !resolvedEq.hasPrinterInKit
          ? "🚫 REMOVIDA PELO CLIENTE (NÃO ENVIAR IMPR.)"
          : cleanPrintText(resolvedEq.printerDisplay || it.printer_name || "Sem impressora"),
      printerSlot: cleanPrintText(
        sheet?.printerSpecs?.slotOpeningMm ||
          "Rasgo frontal padrão 80mm c/ berço"
      ),
      dimensionsText: sheet?.dimensionsMm?.heightMm
        ? `${sheet.dimensionsMm.heightMm} × ${sheet.dimensionsMm.widthMm} × ${sheet.dimensionsMm.depthMm} mm`
        : "Gabarito Homologado CNC",
      readerText: resolvedEq.hasReader
        ? cleanPrintText(resolvedEq.readerDisplay)
        : cleanPrintText(it.reader_name || "Sem leitor"),
      technicalNote: cleanPrintText(sheet?.customizationNotes || ""),
      checklistToDeliver: rawChecklist
        .filter((c) => c.included)
        .map((c, cIdx) => ({
          id: c.id || `deliv-${cIdx}`,
          quantity: `${c.quantity || 1}x`,
          name: cleanPrintText(c.name),
        })),
      checklistNotToDeliver: rawChecklist
        .filter((c) => !c.included)
        .map((c, rIdx) => ({
          id: c.id || `rem-${rIdx}`,
          name: cleanPrintText(c.name),
        })),
    };
  });
}

export function ProductionOrderPrintModal({
  order,
  onClose,
  onSaveOrientations,
}: ProductionOrderPrintModalProps) {
  const exec = order.address?.executionOrder || null;
  const savedOverrides = exec?.printOverrides || null;
  const items = Array.isArray(order.items) ? order.items : [];
  const sheets = Array.isArray(order.sheets) ? order.sheets : [];
  const addr = order.address || {};
  const ship = order.shipping || {};

  const initialNotes = [
    order.address?.customerNotes ? cleanPrintText(order.address.customerNotes) : "",
    exec?.plainSummary ? cleanPrintText(exec.plainSummary) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const defaultAddressLine1 = addr.street
    ? `${addr.street}, nº ${addr.number || "S/N"}${addr.complement ? ` (${addr.complement})` : ""}`
    : "Endereço não informado";
  const defaultCityState = `${addr.city || "—"}/${addr.state || "SP"}`;
  const defaultCep = addr.cep || "—";
  const defaultShippingLabel = cleanPrintText(ship.name || "A Definir");
  const defaultOrderDateStr = new Date(order.$createdAt).toLocaleDateString("pt-BR");

  // Estados editáveis de toda a folha A4
  const [orderNumberLabel, setOrderNumberLabel] = useState<string>(
    savedOverrides?.orderNumberLabel || order.order_number
  );
  const [customerName, setCustomerName] = useState<string>(
    savedOverrides?.customerName || order.customer_name || ""
  );
  const [addressLine1, setAddressLine1] = useState<string>(
    savedOverrides?.addressLine1 || defaultAddressLine1
  );
  const [addressCityState, setAddressCityState] = useState<string>(
    savedOverrides?.addressCityState || defaultCityState
  );
  const [addressCep, setAddressCep] = useState<string>(
    savedOverrides?.addressCep || defaultCep
  );
  const [shippingLabel, setShippingLabel] = useState<string>(
    savedOverrides?.shippingLabel || defaultShippingLabel
  );
  const [orderDateStr, setOrderDateStr] = useState<string>(
    savedOverrides?.orderDateStr || defaultOrderDateStr
  );
  const [targetDate, setTargetDate] = useState<string>(
    exec?.deadlineDate || exec?.targetDispatchDate || ""
  );
  const [targetDateStr, setTargetDateStr] = useState<string>(
    savedOverrides?.targetDateStr ||
      (exec?.deadlineDate || exec?.targetDispatchDate
        ? new Date((exec?.deadlineDate || exec?.targetDispatchDate) + "T12:00:00").toLocaleDateString("pt-BR")
        : "___/___/26")
  );
  const [operatorName, setOperatorName] = useState<string>(
    savedOverrides?.operatorName ?? (exec?.technicianName || exec?.assignedOperator || "")
  );
  const [priority, setPriority] = useState<"normal" | "urgent">(
    (savedOverrides?.priority || (exec?.priority === "urgent" ? "urgent" : "normal")) as
      | "normal"
      | "urgent"
  );

  const [editableItems, setEditableItems] = useState<EditablePrintOrderItem[]>(() =>
    savedOverrides?.editableItems && savedOverrides.editableItems.length > 0
      ? savedOverrides.editableItems.map((ei) => ({
          ...ei,
          headerTitle: cleanPrintText(ei.headerTitle),
          checklistToDeliver: (ei.checklistToDeliver || []).map((c) => ({
            ...c,
            name: cleanPrintText(c.name),
          })),
        }))
      : buildDefaultEditableItems(items, sheets)
  );

  const [complementaryChecks, setComplementaryChecks] = useState<string[]>(
    savedOverrides?.complementaryChecks && savedOverrides.complementaryChecks.length > 0
      ? savedOverrides.complementaryChecks
      : ["Chave", "Trava Monitor", "Parafusos", "Manuais", "Folder Propaganda"]
  );

  const [orientations, setOrientations] = useState<string>(
    savedOverrides?.orientations ?? initialNotes
  );

  const [manualLines, setManualLines] = useState<string[]>(
    savedOverrides?.manualLines && savedOverrides.manualLines.length > 0
      ? savedOverrides.manualLines
      : ["", "", ""]
  );

  const [signatureTitles, setSignatureTitles] = useState<string[]>(
    savedOverrides?.signatureTitles && savedOverrides.signatureTitles.length === 3
      ? savedOverrides.signatureTitles
      : [
          "1. OPERADOR ROUTER CNC / ESTRUTURA",
          "2. SEPARAÇÃO DE KIT & ELÉTRICA",
          "3. AUDITORIA FINAL EXPEDIÇÃO (100% OK)",
        ]
  );

  const [signatureDates, setSignatureDates] = useState<string[]>(
    savedOverrides?.signatureDates && savedOverrides.signatureDates.length === 3
      ? savedOverrides.signatureDates
      : [
          "Data: ___/___/2026 • Hora: ___:___",
          "Data: ___/___/2026 • Hora: ___:___",
          "Data: ___/___/2026 • Hora: ___:___",
        ]
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const printableRef = useRef<HTMLDivElement>(null);

  const buildCurrentOverrides = (): CustomPrintOverrides => ({
    orderNumberLabel,
    customerName,
    addressLine1,
    addressCityState,
    addressCep,
    shippingLabel,
    orderDateStr,
    targetDateStr,
    operatorName,
    priority,
    editableItems,
    complementaryChecks,
    orientations,
    manualLines,
    signatureTitles,
    signatureDates,
  });

  const handleResetToOrderDefaults = () => {
    setOrderNumberLabel(order.order_number);
    setCustomerName(order.customer_name || "");
    setAddressLine1(defaultAddressLine1);
    setAddressCityState(defaultCityState);
    setAddressCep(defaultCep);
    setShippingLabel(defaultShippingLabel);
    setOrderDateStr(defaultOrderDateStr);
    setTargetDateStr("___/___/26");
    setOperatorName(exec?.technicianName || exec?.assignedOperator || "");
    setPriority(exec?.priority === "urgent" ? "urgent" : "normal");
    setEditableItems(buildDefaultEditableItems(items, sheets));
    setComplementaryChecks([
      "Chave",
      "Trava Monitor",
      "Parafusos",
      "Manuais",
      "Folder Propaganda",
    ]);
    setOrientations(initialNotes);
    setManualLines(["", "", ""]);
    setSignatureTitles([
      "1. OPERADOR ROUTER CNC / ESTRUTURA",
      "2. SEPARAÇÃO DE KIT & ELÉTRICA",
      "3. AUDITORIA FINAL EXPEDIÇÃO (100% OK)",
    ]);
    setSignatureDates([
      "Data: ___/___/2026 • Hora: ___:___",
      "Data: ___/___/2026 • Hora: ___:___",
      "Data: ___/___/2026 • Hora: ___:___",
    ]);
  };

  const handleQuickAddOrientation = (snippet: string) => {
    setOrientations((prev) =>
      prev.trim() ? `${prev.trim()}\n• ${snippet}` : `• ${snippet}`
    );
  };

  const updateItemField = <K extends keyof EditablePrintOrderItem>(
    itemIdx: number,
    field: K,
    value: EditablePrintOrderItem[K]
  ) => {
    setEditableItems((prev) =>
      prev.map((it, idx) => (idx === itemIdx ? { ...it, [field]: value } : it))
    );
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
        printOverrides: buildCurrentOverrides(),
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
          printOverrides: buildCurrentOverrides(),
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
  <title>O.P. ${orderNumberLabel} — ${customerName}</title>
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

  // Estilo base para inputs inline na folha A4 interativa
  const inlineInputBase =
    "bg-transparent border border-transparent hover:border-indigo-400/70 focus:border-indigo-600 focus:bg-indigo-50/60 rounded px-1 -mx-1 focus:outline-none transition-colors w-full";

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-[1420px] w-full max-h-[96dvh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        {/* Cabeçalho Compacto do Modal */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ficha A4 100% Editável • Clique em Qualquer Campo para Editar</span>
            </span>
            <h2 className="text-sm sm:text-lg font-black text-white font-mono">
              O.P. {orderNumberLabel} — {customerName}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetToOrderDefaults}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              title="Restaurar todos os textos para os dados originais do pedido"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar Padrão</span>
            </button>

            {onSaveOrientations && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveOnly}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savedFeedback ? "Alterações Salvas!" : "Salvar Alterações"}</span>
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

        {/* Corpo em 2 Colunas: Esquerda (Controles Rápidos) | Direita (Folha A4 Interativa Editável) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* COLUNA ESQUERDA (4 COLS): CONFIGURAÇÃO RÁPIDA & ORIENTAÇÕES PARA A FÁBRICA */}
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 text-xs lg:sticky lg:top-0">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <span className="font-black text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Preenchimento Rápido & Orientações</span>
              </span>
              <span className="text-[10px] font-bold text-cyan-400">
                Edite aqui ou direto na folha →
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetDate(val);
                    setTargetDateStr(
                      val
                        ? new Date(val + "T12:00:00").toLocaleDateString("pt-BR")
                        : "___/___/26"
                    );
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">
                  Operador CNC / Bancada
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
                  Linhas Pautadas (Seção 4)
                </label>
                <select
                  value={manualLines.length}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    setManualLines((prev) => {
                      const next = [...prev];
                      while (next.length < count) next.push("");
                      return next.slice(0, count);
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs"
                >
                  <option value={2}>2 linhas editáveis/pautadas</option>
                  <option value={3}>3 linhas editáveis/pautadas (Ideal A4)</option>
                  <option value={4}>4 linhas editáveis/pautadas</option>
                  <option value={0}>Sem linhas pautadas extras</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-amber-200 font-bold text-[11px] mb-1">
                ✍️ Orientações de Produção (Seção 4):
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
                Atalhos Rápidos (Clique para inserir):
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

            <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 leading-relaxed">
              💡 <strong>Dica:</strong> Você pode clicar diretamente em <strong>qualquer texto ou linha pontilhada da folha A4 ao lado</strong> (nome do cliente, endereço, modelo do gabinete, monitor, impressora, medidas, checklist ou linhas de observação) para editar ou preencher antes de imprimir.
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
          {/* COLUNA DIREITA (8 COLS): FOLHA A4 INTERATIVA (CLIQUE E EDITE QUALQUER CAMPO) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 bg-white text-slate-950 rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-slate-300">
            {/* VISÃO INTERATIVA NA TELA (COM INPUTS DIRETO NA FOLHA) */}
            <div style={{ fontSize: "10px", lineHeight: 1.28 }}>
              {/* CABEÇALHO UNIFICADO */}
              <div
                style={{
                  border: "2px solid #0f172a",
                  borderRadius: "6px",
                  overflow: "hidden",
                  marginBottom: "7px",
                }}
              >
                <div
                  style={{
                    background: "#0f172a",
                    color: "#ffffff",
                    padding: "6px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
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
                    <button
                      type="button"
                      onClick={() => setPriority((p) => (p === "urgent" ? "normal" : "urgent"))}
                      title="Clique para alternar prioridade"
                      style={{
                        background: priority === "urgent" ? "#dc2626" : "#334155",
                        color: "#ffffff",
                        padding: "3px 7px",
                        borderRadius: "4px",
                        fontWeight: 900,
                        fontSize: "9.5px",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        border: "none",
                      }}
                    >
                      {priority === "urgent" ? "🚨 PRIORIDADE URGENTE" : "FILA PADRÃO"}
                    </button>
                    <input
                      type="text"
                      value={orderNumberLabel}
                      onChange={(e) => setOrderNumberLabel(e.target.value)}
                      style={{
                        fontFamily: "Consolas, monospace",
                        fontSize: "14px",
                        fontWeight: 900,
                        background: "#ffffff",
                        color: "#0f172a",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        width: "195px",
                        textAlign: "center",
                        border: "1px solid transparent",
                      }}
                    />
                  </div>
                </div>

                {/* Grade de Dados Essenciais: Cliente (SEM CPF/Tel) | Endereço | Logística */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1.3fr 0.95fr",
                    gap: "8px",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    fontSize: "9.8px",
                    alignItems: "center",
                  }}
                >
                  {/* 1. CLIENTE / DESTINATÁRIO (Sem CPF/CNPJ e Sem Telefone conforme solicitado) */}
                  <div style={{ borderRight: "1px solid #cbd5e1", paddingRight: "8px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 900,
                        color: "#334155",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      CLIENTE / DESTINATÁRIO
                    </div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nome do cliente / destinatário"
                      className={inlineInputBase}
                      style={{
                        fontSize: "16px",
                        fontWeight: 900,
                        color: "#0f172a",
                        marginTop: "2px",
                        lineHeight: 1.2,
                      }}
                    />
                  </div>

                  {/* 2. DESTINO & ENDEREÇO DE ENTREGA */}
                  <div style={{ borderRight: "1px solid #cbd5e1", paddingRight: "8px" }}>
                    <div
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 900,
                        color: "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      DESTINO & ENDEREÇO DE ENTREGA
                    </div>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="Rua, número, complemento"
                      className={inlineInputBase}
                      style={{ fontWeight: 800, color: "#0f172a", marginTop: "1px" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#1e293b",
                        marginTop: "1px",
                      }}
                    >
                      <strong>Cidade/UF:</strong>
                      <input
                        type="text"
                        value={addressCityState}
                        onChange={(e) => setAddressCityState(e.target.value)}
                        className={inlineInputBase}
                        style={{ width: "115px" }}
                      />
                      <span>•</span>
                      <strong>CEP:</strong>
                      <input
                        type="text"
                        value={addressCep}
                        onChange={(e) => setAddressCep(e.target.value)}
                        className={inlineInputBase}
                        style={{ width: "80px" }}
                      />
                    </div>
                  </div>

                  {/* 3. LOGÍSTICA & CONTROLE CNC */}
                  <div>
                    <div
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 900,
                        color: "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      LOGÍSTICA & CONTROLE CNC
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
                      <strong style={{ color: "#0f172a" }}>Envio:</strong>
                      <input
                        type="text"
                        value={shippingLabel}
                        onChange={(e) => setShippingLabel(e.target.value)}
                        className={inlineInputBase}
                        style={{ fontWeight: 900, color: "#0f172a" }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        color: "#1e293b",
                        marginTop: "1px",
                      }}
                    >
                      <strong>Data:</strong>
                      <input
                        type="text"
                        value={orderDateStr}
                        onChange={(e) => setOrderDateStr(e.target.value)}
                        className={inlineInputBase}
                        style={{ width: "66px" }}
                      />
                      <span>•</span>
                      <strong>Meta:</strong>
                      <input
                        type="text"
                        value={targetDateStr}
                        onChange={(e) => setTargetDateStr(e.target.value)}
                        className={inlineInputBase}
                        style={{ width: "66px" }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#1e293b",
                        marginTop: "1px",
                      }}
                    >
                      <strong>Operador:</strong>
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="____________________"
                        className={inlineInputBase}
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* POR ITEM: ESPECIFICAÇÃO TÉCNICA + CHECKLIST COMPLETO */}
              {editableItems.map((it, idx) => (
                <div key={it.id || idx} style={{ marginBottom: "7px" }}>
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
                        gap: "8px",
                        borderBottom: "2px solid #0f172a",
                        paddingBottom: "5px",
                        marginBottom: "6px",
                      }}
                    >
                      <input
                        type="text"
                        value={it.headerTitle}
                        onChange={(e) => updateItemField(idx, "headerTitle", e.target.value)}
                        className={inlineInputBase}
                        style={{
                          fontSize: "15.5px",
                          fontWeight: 900,
                          color: "#0f172a",
                          textTransform: "uppercase",
                          letterSpacing: "0.2px",
                        }}
                      />
                      <input
                        type="text"
                        value={it.badgeText}
                        onChange={(e) => updateItemField(idx, "badgeText", e.target.value)}
                        style={{
                          background: "#e2e8f0",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          width: "190px",
                          textAlign: "center",
                          border: "1px solid transparent",
                        }}
                      />
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
                          border: it.monitorRemovedAlert
                            ? "2px solid #dc2626"
                            : "1px solid #475569",
                          borderRadius: "5px",
                          padding: "4px 7px",
                          background: it.monitorRemovedAlert ? "#fff1f2" : "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 900,
                            color: "#334155",
                            textTransform: "uppercase",
                          }}
                        >
                          TELA / MONITOR & RECORTE CNC:
                        </div>
                        <input
                          type="text"
                          value={it.monitorTitle}
                          onChange={(e) => updateItemField(idx, "monitorTitle", e.target.value)}
                          className={inlineInputBase}
                          style={{
                            fontWeight: 900,
                            fontSize: "10px",
                            marginTop: "1px",
                            color: "#0f172a",
                          }}
                        />
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#334155",
                            marginTop: "2px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "3px",
                          }}
                        >
                          <strong style={{ flexShrink: 0 }}>Corte:</strong>
                          <textarea
                            rows={2}
                            value={it.monitorCutout}
                            onChange={(e) => updateItemField(idx, "monitorCutout", e.target.value)}
                            className={`${inlineInputBase} resize-none`}
                            style={{ fontSize: "9px", lineHeight: 1.25 }}
                          />
                        </div>
                      </div>

                      {/* IMPRESSORA TÉRMICA */}
                      <div
                        style={{
                          border: it.printerRemovedAlert
                            ? "2px solid #dc2626"
                            : "1px solid #475569",
                          borderRadius: "5px",
                          padding: "4px 7px",
                          background: it.printerRemovedAlert ? "#fff1f2" : "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 900,
                            color: "#334155",
                            textTransform: "uppercase",
                          }}
                        >
                          IMPRESSORA TÉRMICA & RASGO CNC:
                        </div>
                        <input
                          type="text"
                          value={it.printerTitle}
                          onChange={(e) => updateItemField(idx, "printerTitle", e.target.value)}
                          className={inlineInputBase}
                          style={{
                            fontWeight: 900,
                            fontSize: "10px",
                            marginTop: "1px",
                            color: "#0f172a",
                          }}
                        />
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#334155",
                            marginTop: "2px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "3px",
                          }}
                        >
                          <strong style={{ flexShrink: 0 }}>Rasgo:</strong>
                          <textarea
                            rows={2}
                            value={it.printerSlot}
                            onChange={(e) => updateItemField(idx, "printerSlot", e.target.value)}
                            className={`${inlineInputBase} resize-none`}
                            style={{ fontSize: "9px", lineHeight: 1.25 }}
                          />
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
                        <div
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 900,
                            color: "#334155",
                            textTransform: "uppercase",
                          }}
                        >
                          MEDIDAS EXTERNAS & LEITOR:
                        </div>
                        <input
                          type="text"
                          value={it.dimensionsText}
                          onChange={(e) => updateItemField(idx, "dimensionsText", e.target.value)}
                          className={inlineInputBase}
                          style={{
                            fontWeight: 900,
                            fontSize: "10px",
                            marginTop: "1px",
                            color: "#0f172a",
                          }}
                        />
                        <div
                          style={{
                            fontSize: "9px",
                            color: "#334155",
                            marginTop: "2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <strong style={{ flexShrink: 0 }}>Leitor:</strong>
                          <input
                            type="text"
                            value={it.readerText}
                            onChange={(e) => updateItemField(idx, "readerText", e.target.value)}
                            className={inlineInputBase}
                            style={{ fontSize: "9px" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* NOTA TÉCNICA DO ITEM (Editável ou preenchível se vazio) */}
                    <div
                      style={{
                        marginTop: "5px",
                        padding: "4px 7px",
                        border: it.technicalNote.trim()
                          ? "1.5px solid #d97706"
                          : "1px dashed #cbd5e1",
                        background: it.technicalNote.trim() ? "#fef3c7" : "#f8fafc",
                        borderRadius: "4px",
                        fontWeight: 800,
                        fontSize: "9.8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <span style={{ flexShrink: 0, color: "#92400e" }}>
                        ⚠️ NOTA TÉCNICA DO ITEM:
                      </span>
                      <input
                        type="text"
                        value={it.technicalNote}
                        onChange={(e) => updateItemField(idx, "technicalNote", e.target.value)}
                        placeholder="(Opcional — clique para preencher uma nota técnica específica deste item)"
                        className={inlineInputBase}
                        style={{ fontWeight: 800, color: "#0f172a" }}
                      />
                    </div>
                  </div>

                  {/* 2. CHECKLIST DE SEPARAÇÃO & ENTREGA EM 2 COLUNAS */}
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
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const nextList = [
                              ...it.checklistToDeliver,
                              {
                                id: `custom-${Date.now()}`,
                                quantity: "1x",
                                name: "Novo item para envio",
                              },
                            ];
                            updateItemField(idx, "checklistToDeliver", nextList);
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>+ Item</span>
                        </button>
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
                          ENVIAR: {it.checklistToDeliver.length} ITENS OBRIGATÓRIOS
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 8px",
                      }}
                    >
                      {it.checklistToDeliver.map((chk, cIdx) => (
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
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
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
                            <input
                              type="text"
                              value={chk.quantity}
                              onChange={(e) => {
                                const next = [...it.checklistToDeliver];
                                next[cIdx] = { ...next[cIdx], quantity: e.target.value };
                                updateItemField(idx, "checklistToDeliver", next);
                              }}
                              className={inlineInputBase}
                              style={{
                                fontFamily: "Consolas, monospace",
                                fontWeight: 900,
                                fontSize: "10.5px",
                                color: "#0f172a",
                                width: "28px",
                                flexShrink: 0,
                              }}
                            />
                            <input
                              type="text"
                              value={chk.name}
                              onChange={(e) => {
                                const next = [...it.checklistToDeliver];
                                next[cIdx] = { ...next[cIdx], name: e.target.value };
                                updateItemField(idx, "checklistToDeliver", next);
                              }}
                              className={inlineInputBase}
                              style={{
                                fontWeight: 800,
                                fontSize: "10px",
                                color: "#0f172a",
                              }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: "8.5px",
                                fontWeight: 800,
                                color: "#475569",
                                borderLeft: "1px dashed #94a3b8",
                                paddingLeft: "5px",
                              }}
                            >
                              Visto: _____
                            </span>
                            {it.checklistToDeliver.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = it.checklistToDeliver.filter((_, i) => i !== cIdx);
                                  updateItemField(idx, "checklistToDeliver", next);
                                }}
                                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                title="Remover este item do checklist"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AUDITORIA DE BLOQUEIO: ITENS REMOVIDOS PELO CLIENTE (NÃO ENVIAR) */}
                    {it.checklistNotToDeliver.length > 0 && (
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
                          {it.checklistNotToDeliver.map((rem, rIdx) => (
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
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  flex: 1,
                                  minWidth: 0,
                                }}
                              >
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
                                <input
                                  type="text"
                                  value={rem.name}
                                  onChange={(e) => {
                                    const next = [...it.checklistNotToDeliver];
                                    next[rIdx] = { ...next[rIdx], name: e.target.value };
                                    updateItemField(idx, "checklistNotToDeliver", next);
                                  }}
                                  className={inlineInputBase}
                                  style={{
                                    fontWeight: 800,
                                    fontSize: "9.8px",
                                    textDecoration: "line-through",
                                    color: "#881337",
                                  }}
                                />
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                                <span
                                  style={{
                                    fontSize: "8.5px",
                                    fontWeight: 900,
                                    color: "#991b1b",
                                  }}
                                >
                                  🚫 NÃO ENVIAR
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = it.checklistNotToDeliver.filter((_, i) => i !== rIdx);
                                    updateItemField(idx, "checklistNotToDeliver", next);
                                  }}
                                  className="text-rose-400 hover:text-rose-700 p-0.5 cursor-pointer"
                                  title="Remover este alerta"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 3. CHECKLIST COMPLEMENTAR DE ENVIO (EDITÁVEL) */}
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
                  <span>3. CHECKLIST COMPLEMENTAR DE ENVIO (MARCAR [ ✓ ] À CANETA)</span>
                  <span style={{ fontSize: "9px", color: "#334155" }}>CONFERÊNCIA OBRIGATÓRIA</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.max(1, complementaryChecks.length)}, 1fr)`,
                    gap: "6px",
                  }}
                >
                  {complementaryChecks.map((stepText, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1.5px solid #475569",
                        borderRadius: "5px",
                        padding: "5px 7px",
                        background: "#f8fafc",
                      }}
                    >
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid #0f172a",
                          borderRadius: "3px",
                          display: "inline-block",
                          flexShrink: 0,
                          background: "#ffffff",
                        }}
                      />
                      <input
                        type="text"
                        value={stepText}
                        onChange={(e) => {
                          const next = [...complementaryChecks];
                          next[sIdx] = e.target.value;
                          setComplementaryChecks(next);
                        }}
                        className={inlineInputBase}
                        style={{ fontWeight: 900, fontSize: "10.5px", color: "#0f172a" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. ORIENTAÇÕES DE PRODUÇÃO & LINHAS PAUTADAS CLICÁVEIS PARA PREENCHIMENTO */}
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
                  <span style={{ fontSize: "8.5px", color: "#78350f" }}>
                    CLIQUE NAS LINHAS ABAIXO PARA DIGITAR OU DEIXE EM BRANCO P/ CANETA
                  </span>
                </div>

                {orientations.trim() && (
                  <textarea
                    rows={2}
                    value={orientations}
                    onChange={(e) => setOrientations(e.target.value)}
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#0f172a",
                      width: "100%",
                      background: "#ffffff",
                      border: "1px solid #0f172a",
                      borderRadius: "4px",
                      padding: "5px 7px",
                      marginBottom: manualLines.length > 0 ? "4px" : "0",
                    }}
                  />
                )}

                {manualLines.length > 0 && (
                  <div>
                    {manualLines.map((lineText, lIdx) => (
                      <div
                        key={lIdx}
                        style={{
                          borderBottom: "1px dashed #475569",
                          height: "20px",
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={lineText}
                          onChange={(e) => {
                            const next = [...manualLines];
                            next[lIdx] = e.target.value;
                            setManualLines(next);
                          }}
                          placeholder={
                            lIdx === 0 && !orientations.trim()
                              ? "Clique aqui para digitar uma observação nesta linha antes de imprimir (ou deixe em branco para escrever à caneta)..."
                              : ""
                          }
                          className="w-full bg-transparent focus:bg-amber-100/60 focus:outline-none text-[10.5px] font-bold text-slate-900 placeholder-amber-700/45 px-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. ASSINATURAS DE RESPONSABILIDADE EM 3 COLUNAS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                  marginTop: "4px",
                }}
              >
                {signatureTitles.map((sigTitle, sIdx) => (
                  <div
                    key={sIdx}
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
                    <input
                      type="text"
                      value={sigTitle}
                      onChange={(e) => {
                        const next = [...signatureTitles];
                        next[sIdx] = e.target.value;
                        setSignatureTitles(next);
                      }}
                      className={`${inlineInputBase} text-center`}
                      style={{ fontWeight: 900, fontSize: "9px", textTransform: "uppercase" }}
                    />
                    <input
                      type="text"
                      value={signatureDates[sIdx] || ""}
                      onChange={(e) => {
                        const next = [...signatureDates];
                        next[sIdx] = e.target.value;
                        setSignatureDates(next);
                      }}
                      className={`${inlineInputBase} text-center`}
                      style={{ fontSize: "8.5px", color: "#475569", marginTop: "1px" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* DOM ESTÁTICO OCULTO PARA IMPRESSÃO A4 PERFEITA (REFLECTE 100% DAS EDIÇÕES) */}
            {/* ========================================================================= */}
            <div ref={printableRef} style={{ display: "none" }}>
              {/* CABEÇALHO UNIFICADO */}
              <div
                style={{
                  border: "2px solid #0f172a",
                  borderRadius: "6px",
                  overflow: "hidden",
                  marginBottom: "7px",
                }}
              >
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
                      {orderNumberLabel}
                    </span>
                  </div>
                </div>

                {/* Grade de Dados Essenciais: Cliente (Sem CPF/Tel) | Endereço | Logística */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 1.3fr 0.95fr",
                    gap: "8px",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    fontSize: "9.8px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ borderRight: "1px solid #cbd5e1", paddingRight: "8px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 900,
                        color: "#334155",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      CLIENTE / DESTINATÁRIO
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 900,
                        color: "#0f172a",
                        marginTop: "2px",
                        lineHeight: 1.15,
                      }}
                    >
                      {customerName}
                    </div>
                  </div>

                  <div style={{ borderRight: "1px solid #cbd5e1", paddingRight: "8px" }}>
                    <div
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 900,
                        color: "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      DESTINO & ENDEREÇO DE ENTREGA
                    </div>
                    <div style={{ fontWeight: 800, color: "#0f172a", marginTop: "1px" }}>
                      {addressLine1}
                    </div>
                    <div style={{ color: "#1e293b", marginTop: "1px" }}>
                      <strong>Cidade/UF:</strong> {addressCityState} •{" "}
                      <strong>CEP:</strong> {addressCep}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "8.5px",
                        fontWeight: 900,
                        color: "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      LOGÍSTICA & CONTROLE CNC
                    </div>
                    <div style={{ fontWeight: 900, color: "#0f172a", marginTop: "1px" }}>
                      Envio: {shippingLabel}
                    </div>
                    <div style={{ color: "#1e293b", marginTop: "1px" }}>
                      <strong>Data:</strong> {orderDateStr} •{" "}
                      <strong>Meta:</strong> {targetDateStr}
                    </div>
                    <div style={{ color: "#1e293b", marginTop: "1px" }}>
                      <strong>Operador:</strong> {operatorName.trim() || "____________________"}
                    </div>
                  </div>
                </div>
              </div>

              {/* POR ITEM (IMPRESSÃO) */}
              {editableItems.map((it, idx) => (
                <div key={it.id || idx} style={{ marginBottom: "7px" }}>
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
                        borderBottom: "2px solid #0f172a",
                        paddingBottom: "5px",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15.5px",
                          fontWeight: 900,
                          color: "#0f172a",
                          textTransform: "uppercase",
                          letterSpacing: "0.2px",
                        }}
                      >
                        {cleanPrintText(it.headerTitle)}
                      </span>
                      <span
                        style={{
                          background: "#e2e8f0",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        {it.badgeText}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.15fr 1.15fr 0.9fr",
                        gap: "6px",
                        fontSize: "9.8px",
                      }}
                    >
                      <div
                        style={{
                          border: it.monitorRemovedAlert
                            ? "2px solid #dc2626"
                            : "1px solid #475569",
                          borderRadius: "5px",
                          padding: "4px 7px",
                          background: it.monitorRemovedAlert ? "#fff1f2" : "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 900,
                            color: "#334155",
                            textTransform: "uppercase",
                          }}
                        >
                          TELA / MONITOR & RECORTE CNC:
                        </div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: "10px",
                            marginTop: "1px",
                            color: "#0f172a",
                          }}
                        >
                          {cleanPrintText(it.monitorTitle)}
                        </div>
                        <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>
                          <strong>Corte:</strong> {cleanPrintText(it.monitorCutout)}
                        </div>
                      </div>

                      <div
                        style={{
                          border: it.printerRemovedAlert
                            ? "2px solid #dc2626"
                            : "1px solid #475569",
                          borderRadius: "5px",
                          padding: "4px 7px",
                          background: it.printerRemovedAlert ? "#fff1f2" : "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 900,
                            color: "#334155",
                            textTransform: "uppercase",
                          }}
                        >
                          IMPRESSORA TÉRMICA & RASGO CNC:
                        </div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: "10px",
                            marginTop: "1px",
                            color: "#0f172a",
                          }}
                        >
                          {cleanPrintText(it.printerTitle)}
                        </div>
                        <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>
                          <strong>Rasgo:</strong> {cleanPrintText(it.printerSlot)}
                        </div>
                      </div>

                      <div
                        style={{
                          border: "1px solid #475569",
                          borderRadius: "5px",
                          padding: "4px 7px",
                          background: "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 900,
                            color: "#334155",
                            textTransform: "uppercase",
                          }}
                        >
                          MEDIDAS EXTERNAS & LEITOR:
                        </div>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: "10px",
                            marginTop: "1px",
                            color: "#0f172a",
                          }}
                        >
                          {cleanPrintText(it.dimensionsText)}
                        </div>
                        <div style={{ fontSize: "9px", color: "#334155", marginTop: "1px" }}>
                          <strong>Leitor:</strong> {cleanPrintText(it.readerText)}
                        </div>
                      </div>
                    </div>

                    {it.technicalNote.trim() && (
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
                        ⚠️ NOTA TÉCNICA DO ITEM: {cleanPrintText(it.technicalNote)}
                      </div>
                    )}
                  </div>

                  {/* 2. CHECKLIST DE SEPARAÇÃO & ENTREGA (IMPRESSÃO) */}
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
                        ENVIAR: {it.checklistToDeliver.length} ITENS OBRIGATÓRIOS
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "4px 8px",
                      }}
                    >
                      {it.checklistToDeliver.map((chk, cIdx) => (
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
                              {chk.quantity}
                            </span>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: "10px",
                                color: "#0f172a",
                              }}
                            >
                              {cleanPrintText(chk.name)}
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

                    {it.checklistNotToDeliver.length > 0 && (
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
                          {it.checklistNotToDeliver.map((rem, rIdx) => (
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
                                  {cleanPrintText(rem.name)}
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
              ))}

              {/* 3. CHECKLIST COMPLEMENTAR DE ENVIO (IMPRESSÃO) */}
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
                  <span>3. CHECKLIST COMPLEMENTAR DE ENVIO (MARCAR [ ✓ ] À CANETA)</span>
                  <span style={{ fontSize: "9px", color: "#334155" }}>CONFERÊNCIA OBRIGATÓRIA</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.max(1, complementaryChecks.length)}, 1fr)`,
                    gap: "6px",
                  }}
                >
                  {complementaryChecks.map((stepText, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1.5px solid #475569",
                        borderRadius: "5px",
                        padding: "5px 7px",
                        background: "#f8fafc",
                      }}
                    >
                      <span
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid #0f172a",
                          borderRadius: "3px",
                          display: "inline-block",
                          flexShrink: 0,
                          background: "#ffffff",
                        }}
                      />
                      <span style={{ fontWeight: 900, fontSize: "10.5px", color: "#0f172a" }}>
                        {cleanPrintText(stepText)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. ORIENTAÇÕES TÉCNICAS & LINHAS PAUTADAS (IMPRESSÃO) */}
              {(orientations.trim() || manualLines.length > 0) && (
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
                        marginBottom: manualLines.length > 0 ? "4px" : "0",
                      }}
                    >
                      {cleanPrintText(orientations)}
                    </div>
                  )}

                  {manualLines.length > 0 && (
                    <div>
                      {manualLines.map((lineText, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderBottom: "1px dashed #475569",
                            minHeight: "17px",
                            width: "100%",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#0f172a",
                            paddingTop: "1px",
                          }}
                        >
                          {cleanPrintText(lineText)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. ASSINATURAS DE RESPONSABILIDADE (IMPRESSÃO) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px",
                  marginTop: "4px",
                }}
              >
                {signatureTitles.map((sigTitle, sIdx) => (
                  <div
                    key={sIdx}
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
                      {signatureDates[sIdx] || "Data: ___/___/2026 • Hora: ___:___"}
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
