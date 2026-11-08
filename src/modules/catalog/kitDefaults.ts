import { KitSubItem, MonitorOption } from "@/types/catalog";

export const DEFAULT_KIT_SUB_ITEMS: KitSubItem[] = [
  {
    id: "kit-monitor-touch",
    name: 'Computador All-in-One Touch 23.8" Core i5',
    category: "monitor",
    description:
      "Display Touchscreen capacitivo com PC integrado Intel Core i5, 8GB RAM e SSD NVMe 256GB.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_657397-MLB91414180451_092025-F-computador-allinone-238-touch-screen-intel-core-i5-3320.webp",
    priceCents: 279900, // R$ 2.799,00
    selected: true,
  },
  {
    id: "KIT-IMP-001",
    name: "IMPRESSORA PDV - VT-8360 80mm",
    category: "printer",
    description:
      "Impressora térmica homologada de alta velocidade 80mm com guilhotina e saída frontal.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_726297-MLB117214728732_102026-F-impressora-nao-fiscal-termica-80mm-com-guilhotina-usb-rede.webp",
    priceCents: 45000, // R$ 450,00
    selected: true,
  },
  {
    id: "KIT-COOL-002",
    name: "Kit 2 Coolers de Ventilação",
    category: "accessory",
    description:
      "Conjunto com 2 coolers para circulação de ar e refrigeração interna do totem.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_694664-MLB103480686980_012026-F-ventoinha-cooler-90x90x25-90mm-9cm-12v-020a.webp",
    priceCents: 9200,
    selected: true,
  },
  {
    id: "kit-cabling-internal",
    name: "Kit Elétrico Completo (Régua, Botão Liga/Desliga, Cabos & Fixadores)",
    category: "accessory",
    description:
      "Régua de energia, botão liga/desliga externo, cabo de força 20A, organizadores e fixadores.",
    image: ".webp",
    priceCents: 27100,
    selected: true,
  },
];

export interface ResolvedKitEquipment {
  isKit: boolean;
  monitorDisplay: string;
  kitMonitorModel: string;
  printerDisplay: string;
  readerDisplay: string;
  hasReader: boolean;
  hasMonitorInKit: boolean;
  hasPrinterInKit: boolean;
  accessoriesSummary: string;
  kitExtraItems: string[];
  selectedItemsSummary: string;
  selectedCount: number;
  totalCount: number;
}

/**
 * Identifica se uma opção de monitor/equipamento corresponde ao Kit de Montagem
 */
export function isItemKit(item?: MonitorOption | null): boolean {
  if (!item) return false;
  if (item.isKit === true) return true;
  if (item.id === "6ac6dbf90032d4f8586e") return true;

  const anyItem = item as Record<string, any>;
  const name = (item.displayName || anyItem.name || "").toLowerCase();
  const slug = (anyItem.slug || "").toLowerCase();
  const model = (item.model || "").toLowerCase();

  return name.includes("kit") || slug.includes("kit") || model.includes("kit");
}

/**
 * Retorna os subitens efetivos do Kit (do objeto ou os padrões caso ainda não inicializado)
 */
export function getEffectiveKitItems(item?: MonitorOption | null): KitSubItem[] {
  if (!item) return DEFAULT_KIT_SUB_ITEMS.map((sub) => ({ ...sub }));

  // Se já possui kitItems no objeto
  if (Array.isArray(item.kitItems) && item.kitItems.length > 0) {
    return item.kitItems;
  }

  // Tenta recuperar do campo notes se for JSON serializado
  if (item.notes && item.notes.includes("kitItems")) {
    try {
      const parsed = JSON.parse(item.notes);
      if (Array.isArray(parsed.kitItems) && parsed.kitItems.length > 0) {
        return parsed.kitItems;
      }
    } catch (e) {}
  }

  return DEFAULT_KIT_SUB_ITEMS.map((sub) => ({ ...sub }));
}

/**
 * Mescla de forma segura e soberana no servidor os sub-itens enviados pelo cliente
 * com os preços oficiais de catálogo do servidor (impedindo adulteração de preço
 * mas respeitando quais itens o cliente marcou/desmarcou no Kit).
 */
export function mergeServerCatalogKitItems(
  catalogMonitor: MonitorOption,
  clientKitItems?: Array<{ id?: string; selected?: boolean }> | null
): MonitorOption {
  const authoritativeSubItems = getEffectiveKitItems(catalogMonitor);
  if (!Array.isArray(clientKitItems) || clientKitItems.length === 0) {
    return {
      ...catalogMonitor,
      kitItems: authoritativeSubItems.map((sub) => ({ ...sub })),
    };
  }

  const clientSelectionMap = new Map<string, boolean>();
  for (const ci of clientKitItems) {
    if (ci && typeof ci.id === "string") {
      clientSelectionMap.set(ci.id, Boolean(ci.selected));
    }
  }

  const mergedKitItems: KitSubItem[] = authoritativeSubItems.map((serverSub) => {
    const hasExplicitChoice = clientSelectionMap.has(serverSub.id);
    return {
      ...serverSub,
      selected: hasExplicitChoice
        ? Boolean(clientSelectionMap.get(serverSub.id))
        : Boolean(serverSub.selected),
    };
  });

  const mergedTotalCents = calculateKitTotalCents(mergedKitItems);

  return {
    ...catalogMonitor,
    priceAdjustmentCents: mergedTotalCents,
    kitItems: mergedKitItems,
  };
}

/**
 * Calcula o somatório em centavos dos subitens selecionados do Kit
 */
export function calculateKitTotalCents(kitItems?: KitSubItem[]): number {
  if (!Array.isArray(kitItems) || kitItems.length === 0) return 0;
  return kitItems
    .filter((i) => i.selected)
    .reduce((acc, i) => acc + (i.priceCents || 0), 0);
}

/**
 * Resolve os nomes equivalentes de Monitor, Impressora, Leitor e Acessórios quando o cliente
 * escolhe o "Kit de Montagem", respeitando rigorosamente os itens que foram marcados ou desmarcados.
 */
export function resolveKitEquipmentSummary(params: {
  monitor?: MonitorOption | null;
  monitorName?: string | null;
  printerName?: string | null;
  readerName?: string | null;
}): ResolvedKitEquipment {
  const rawMon = String(
    params.monitorName || params.monitor?.displayName || ""
  ).trim();
  const rawPrt = String(params.printerName || "").trim();
  const rawRdr = String(params.readerName || "").trim();

  const isEmptyLabel = (val: string) => {
    const low = val.toLowerCase();
    return (
      !low ||
      low === "nenhum" ||
      low === "nenhuma" ||
      low === "sem impressora" ||
      low === "sem impressora instalada" ||
      low === "sem leitor" ||
      low === "sem leitor frontal" ||
      low === "padrão" ||
      low === "padrao" ||
      low === "—"
    );
  };

  const isKit =
    isItemKit(params.monitor) ||
    rawMon.toLowerCase().includes("kit de montagem") ||
    rawMon.toLowerCase().includes("kit personalizado") ||
    rawMon.toLowerCase() === "kit" ||
    rawPrt.toLowerCase().includes("(kit)");

  if (!isKit) {
    return {
      isKit: false,
      monitorDisplay: rawMon || "Nenhum",
      kitMonitorModel: rawMon || "Nenhum",
      printerDisplay: !isEmptyLabel(rawPrt) ? rawPrt : "Sem impressora",
      readerDisplay: !isEmptyLabel(rawRdr) ? rawRdr : "Sem leitor",
      hasReader: !isEmptyLabel(rawRdr),
      hasMonitorInKit: Boolean(rawMon && !isEmptyLabel(rawMon)),
      hasPrinterInKit: !isEmptyLabel(rawPrt),
      accessoriesSummary: "",
      kitExtraItems: [],
      selectedItemsSummary: "",
      selectedCount: 0,
      totalCount: 0,
    };
  }

  const hasExplicitKitObject = Boolean(
    params.monitor && Array.isArray(params.monitor.kitItems) && params.monitor.kitItems.length > 0
  );
  const kitItems = getEffectiveKitItems(params.monitor);
  const selectedSubItems = kitItems.filter((i) => i.selected !== false);
  const monSub = selectedSubItems.find((i) => i.category === "monitor");
  const prtSub = selectedSubItems.find((i) => i.category === "printer");
  const rdrSub = selectedSubItems.find((i) => i.category === "reader");
  const accSubs = selectedSubItems.filter((i) => i.category === "accessory");

  const accessoriesSummary = accSubs.map((a) => a.name).join(" + ");
  const selectedItemsSummary = selectedSubItems.map((s) => s.name).join(" + ");

  // Se temos o objeto monitor.kitItems explícito, respeitamos se o cliente desmarcou o monitor ou impressora
  const hasMonitorInKit = hasExplicitKitObject ? Boolean(monSub) : true;
  const hasPrinterInKit = hasExplicitKitObject
    ? Boolean(prtSub)
    : !rawPrt.toLowerCase().includes("não inclusa") && !rawPrt.toLowerCase().includes("removida");

  const kitMonitorModel = hasMonitorInKit
    ? monSub?.name || 'Computador All-in-One Touch 23.8" Core i5'
    : accSubs.length > 0
    ? `Sem Monitor no Kit (Apenas: ${accessoriesSummary})`
    : "Sem Monitor no Kit";

  const kitPrinterModel = hasPrinterInKit
    ? prtSub?.name || "IMPRESSORA PDV - VT-8360 80mm"
    : "Não inclusa no Kit (Desmarcada)";

  const kitReaderModel = rdrSub?.name || "";

  let monitorDisplay: string;
  if (
    rawMon &&
    rawMon.toLowerCase() !== "kit de montagem" &&
    rawMon.toLowerCase() !== "kit"
  ) {
    monitorDisplay = rawMon;
  } else if (hasMonitorInKit) {
    monitorDisplay = `Kit de Montagem — ${kitMonitorModel}`;
  } else if (accSubs.length > 0 || hasPrinterInKit) {
    monitorDisplay = `Kit Parcial — ${kitMonitorModel}`;
  } else {
    monitorDisplay = "Kit de Montagem (Sem itens selecionados)";
  }

  const printerDisplay = !isEmptyLabel(rawPrt)
    ? rawPrt
    : !hasPrinterInKit
    ? "Não inclusa no Kit (Desmarcada)"
    : kitPrinterModel.toLowerCase().includes("kit")
    ? kitPrinterModel
    : `${kitPrinterModel} (Kit)`;

  const hasValidRawReader =
    !isEmptyLabel(rawRdr) && !rawRdr.toLowerCase().includes("coolers");
  const readerDisplay = hasValidRawReader
    ? rawRdr
    : kitReaderModel
    ? `${kitReaderModel} (Kit)`
    : accessoriesSummary
    ? `Acessórios do Kit: ${accessoriesSummary}`
    : "";

  return {
    isKit: true,
    monitorDisplay,
    kitMonitorModel,
    printerDisplay,
    readerDisplay,
    hasReader: Boolean(kitReaderModel || hasValidRawReader),
    hasMonitorInKit,
    hasPrinterInKit,
    accessoriesSummary,
    kitExtraItems: accSubs.map((a) => a.name),
    selectedItemsSummary,
    selectedCount: selectedSubItems.length,
    totalCount: kitItems.length,
  };
}
