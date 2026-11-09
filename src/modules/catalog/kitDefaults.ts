import { KitSubItem, MonitorOption } from "@/types/catalog";

export const DEFAULT_KIT_SUB_ITEMS: KitSubItem[] = [
  {
    id: "kit-monitor-touch",
    name: 'Computador All-in-One Touch 23.8" Core i5',
    category: "monitor",
    description:
      "Redução Significativa de Custos: Comprar monitor touchscreen e computador (ou mini PC) separadamente sai muito mais caro. No All-in-One, você tem ambos em um único investimento, economizando no hardware e na logística.\n\nProcessador: Intel Core i5 (3ª Geração) • Memória RAM: 8 GB • SSD NVMe de 256 GB • Wi-Fi integrado.",
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
      "Impressora destinada à instalação interna no gabinete do totem de autoatendimento (80mm com guilhotina USB/Rede).",
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
      "Conjunto com 2 coolers para circulação de ar e refrigeração interna do totem. Auxilia na dissipação do calor gerado pelos equipamentos eletrônicos e melhora a ventilação do gabinete.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_694664-MLB103480686980_012026-F-ventoinha-cooler-90x90x25-90mm-9cm-12v-020a.webp",
    priceCents: 9200, // R$ 92,00
    selected: true,
  },
  {
    id: "KIT-BOT-001",
    name: "Botão Liga/Desliga",
    category: "accessory",
    description:
      "Botão de acionamento externo para ligar e desligar o equipamento instalado dentro do totem, permitindo acesso prático ao comando sem necessidade de abrir o gabinete.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_754057-MLA91647577034_092025-F.webp",
    priceCents: 3000, // R$ 30,00
    selected: true,
  },
  {
    id: "KIT-REG-001",
    name: "Régua de Energia",
    category: "accessory",
    description:
      "Régua interna para distribuição da alimentação elétrica entre os equipamentos instalados no totem, facilitando a organização e centralização das conexões de energia.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_696349-MLB86240034854_062025-F-10-tomadas-barra-multipla-regua-extensao-20a-tripla.webp",
    priceCents: 4800, // R$ 48,00
    selected: true,
  },
  {
    id: "KIT-CAB-ENERGIA",
    name: "Cabo De Força Pc 2,50mm 20 Amperes 1,20 Metro",
    category: "accessory",
    description:
      "Cabo de alimentação responsável pela conexão elétrica principal do conjunto do totem à rede de energia.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_974268-MLB81980140697_012025-F-cabo-de-forca-pc-250mm-20-amperes-120-metro.webp",
    priceCents: 4500, // R$ 45,00
    selected: true,
  },
  {
    id: "KIT-PAR-001",
    name: "Kit de Parafusos e Fixadores",
    category: "accessory",
    description:
      "Conjunto de parafusos, porcas e elementos de fixação necessários para instalação e acabamento dos componentes internos do gabinete.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_838593-MLA95519907414_102025-F.webp",
    priceCents: 3000, // R$ 30,00
    selected: true,
  },
  {
    id: "KIT-ORG-001",
    name: "Kit Organizador de Fios",
    category: "accessory",
    description:
      "Conjunto de acessórios para organização e fixação dos cabos internos, proporcionando montagem mais limpa, segura e de fácil manutenção.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_649655-MLB74109040915_012024-F-kit-100-clipes-de-cabo-organizador-de-cabos-adesivos-atacado.webp",
    priceCents: 3500, // R$ 35,00
    selected: true,
  },
  {
    id: "KIT-FIO-CON",
    name: "Kit de Fios e Conectores",
    category: "accessory",
    description:
      "Conjunto de fios, terminais e conectores utilizados na instalação dos coolers, botão liga/desliga, LED e demais conexões auxiliares necessárias à montagem interna do totem.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_880026-MLB77708998554_072024-F-15-metros-fio-som-automotivo-alto-falante-100-cobre-15mm.webp",
    priceCents: 6000, // R$ 60,00
    selected: true,
  },
  {
    id: "EMB-TOTEM-001",
    name: "Embalagem para Transporte",
    category: "accessory",
    description:
      "Material de embalagem e proteção utilizado para preparar os componentes para transporte, reduzindo o risco de avarias durante o envio.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_629186-MLB74239408117_012024-F-kit-10-caixas-mdf-21x16x5-tampa-articulada-convite-padrinho.webp",
    priceCents: 0,
    selected: true,
  },
  {
    id: "kit-c14",
    name: "Tomada de força Femea",
    category: "accessory",
    description: "Conector fêmea para ligação do cabo de força.",
    image:
      "https://http2.mlstatic.com/D_NQ_NP_2X_698999-MLB31067229972_062019-F-kit-6-tomada-de-painel-c14-de-forca-3-polos-10a-fonte-pc.webp",
    priceCents: 2300, // R$ 23,00
    selected: true,
  },
];

export interface DeliveryChecklistItem {
  id: string;
  name: string;
  category:
    | "cabinet"
    | "monitor"
    | "printer"
    | "reader"
    | "accessory"
    | "service"
    | "cnc_cutout";
  priceCents: number;
  included: boolean; // true = ENTREGAR JUNTO COM O GABINETE, false = NÃO ENVIAR (removido pelo cliente ou apenas furação)
  quantity: number;
  badgeLabel: string;
  notes?: string;
}

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
  removedItemsSummary: string;
  includedSubItems: KitSubItem[];
  removedSubItems: KitSubItem[];
  selectedCount: number;
  totalCount: number;
  kitPriceCents: number;
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
 * mas respeitando quais itens o cliente marcou/desmarcou no Kit, por ID ou por Nome).
 */
export function mergeServerCatalogKitItems(
  catalogMonitor: MonitorOption,
  clientKitItems?: Array<{ id?: string; name?: string; selected?: boolean; category?: string }> | null
): MonitorOption {
  const authoritativeSubItems = getEffectiveKitItems(catalogMonitor);
  if (!Array.isArray(clientKitItems) || clientKitItems.length === 0) {
    return {
      ...catalogMonitor,
      kitItems: authoritativeSubItems.map((sub) => ({ ...sub })),
    };
  }

  const clientById = new Map<string, boolean>();
  const clientByName = new Map<string, boolean>();
  const clientByCategory = new Map<string, boolean>();

  for (const ci of clientKitItems) {
    if (!ci) continue;
    const sel = Boolean(ci.selected);
    if (typeof ci.id === "string" && ci.id.trim()) {
      clientById.set(ci.id.trim(), sel);
    }
    if (typeof ci.name === "string" && ci.name.trim()) {
      clientByName.set(ci.name.trim().toLowerCase(), sel);
    }
    if (
      (ci.category === "monitor" || ci.category === "printer" || ci.category === "reader") &&
      typeof ci.selected === "boolean"
    ) {
      clientByCategory.set(ci.category, sel);
    }
  }

  const mergedKitItems: KitSubItem[] = authoritativeSubItems.map((serverSub) => {
    const cleanId = (serverSub.id || "").trim();
    const cleanName = (serverSub.name || "").trim().toLowerCase();

    let resolvedSelected = Boolean(serverSub.selected);
    if (cleanId && clientById.has(cleanId)) {
      resolvedSelected = Boolean(clientById.get(cleanId));
    } else if (cleanName && clientByName.has(cleanName)) {
      resolvedSelected = Boolean(clientByName.get(cleanName));
    } else if (
      (serverSub.category === "monitor" ||
        serverSub.category === "printer" ||
        serverSub.category === "reader") &&
      clientByCategory.has(serverSub.category)
    ) {
      resolvedSelected = Boolean(clientByCategory.get(serverSub.category));
    }

    return {
      ...serverSub,
      selected: resolvedSelected,
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
    .filter((i) => i.selected !== false)
    .reduce((acc, i) => acc + (i.priceCents || 0), 0);
}

/**
 * Resolve os nomes equivalentes de Monitor, Impressora, Leitor e Acessórios quando o cliente
 * escolhe o "Kit de Montagem", respeitando rigorosamente os itens que foram marcados ou desmarcados.
 */
export function resolveKitEquipmentSummary(params: {
  monitor?: MonitorOption | null;
  kitItemsSnapshot?: KitSubItem[] | null;
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
    (Array.isArray(params.kitItemsSnapshot) && params.kitItemsSnapshot.length > 0) ||
    rawMon.toLowerCase().includes("kit de montagem") ||
    rawMon.toLowerCase().includes("kit parcial") ||
    rawMon.toLowerCase().includes("kit personalizado") ||
    rawMon.toLowerCase().includes("sem monitor no kit") ||
    rawMon.toLowerCase() === "kit" ||
    rawPrt.toLowerCase().includes("(kit)") ||
    rawPrt.toLowerCase().includes("no kit");

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
      removedItemsSummary: "",
      includedSubItems: [],
      removedSubItems: [],
      selectedCount: 0,
      totalCount: 0,
      kitPriceCents: 0,
    };
  }

  const effectiveSourceItems: KitSubItem[] =
    Array.isArray(params.kitItemsSnapshot) && params.kitItemsSnapshot.length > 0
      ? params.kitItemsSnapshot
      : getEffectiveKitItems(params.monitor);

  const hasExplicitKitObject = Boolean(
    (Array.isArray(params.kitItemsSnapshot) && params.kitItemsSnapshot.length > 0) ||
      (params.monitor && Array.isArray(params.monitor.kitItems) && params.monitor.kitItems.length > 0)
  );

  // Caso não tenhamos o array explícito (ex: leitura apenas de strings salvas em order_items),
  // inferimos se o monitor ou impressora foram marcados como removidos no texto salvo:
  const rawMonLower = rawMon.toLowerCase();
  const rawPrtLower = rawPrt.toLowerCase();
  const textIndicatesNoMonitor =
    rawMonLower.includes("sem monitor") ||
    rawMonLower.includes("não incluso") ||
    rawMonLower.includes("nao incluso") ||
    rawMonLower.includes("removido") ||
    rawMonLower.includes("desmarcado");
  const textIndicatesNoPrinter =
    rawPrtLower.includes("não inclusa") ||
    rawPrtLower.includes("nao inclusa") ||
    rawPrtLower.includes("removida") ||
    rawPrtLower.includes("desmarcada") ||
    rawPrtLower.includes("sem impressora");

  const kitItems: KitSubItem[] = hasExplicitKitObject
    ? effectiveSourceItems
    : effectiveSourceItems.map((sub) => {
        if (sub.category === "monitor" && textIndicatesNoMonitor) {
          return { ...sub, selected: false };
        }
        if (sub.category === "printer" && textIndicatesNoPrinter) {
          return { ...sub, selected: false };
        }
        return sub;
      });

  const selectedSubItems = kitItems.filter((i) => i.selected !== false);
  const removedSubItems = kitItems.filter((i) => i.selected === false);
  const monSub = selectedSubItems.find((i) => i.category === "monitor");
  const prtSub = selectedSubItems.find((i) => i.category === "printer");
  const rdrSub = selectedSubItems.find((i) => i.category === "reader");
  const accSubs = selectedSubItems.filter((i) => i.category === "accessory");

  const accessoriesSummary = accSubs.map((a) => a.name).join(" + ");
  const selectedItemsSummary = selectedSubItems.map((s) => s.name).join(" + ");
  const removedItemsSummary = removedSubItems.map((s) => s.name).join(" + ");

  const hasMonitorInKit = Boolean(monSub);
  const hasPrinterInKit = Boolean(prtSub);

  const kitMonitorModel = hasMonitorInKit
    ? monSub?.name || 'Computador All-in-One Touch 23.8" Core i5'
    : "NÃO INCLUSO (Removido do Kit pelo Cliente)";

  const kitPrinterModel = hasPrinterInKit
    ? prtSub?.name || "IMPRESSORA PDV - VT-8360 80mm"
    : "NÃO INCLUSA (Removida do Kit pelo Cliente)";

  const kitReaderModel = rdrSub?.name || "";

  let monitorDisplay: string;
  if (hasMonitorInKit) {
    monitorDisplay = `Kit de Montagem — ${kitMonitorModel}`;
  } else if (accSubs.length > 0 || hasPrinterInKit) {
    monitorDisplay = `Kit Parcial (${selectedSubItems.length}/${kitItems.length} itens) — SEM MONITOR TOUCH (Removido pelo Cliente)`;
  } else {
    monitorDisplay = "Kit de Montagem (Sem itens selecionados)";
  }

  const printerDisplay = hasPrinterInKit
    ? kitPrinterModel.toLowerCase().includes("kit")
      ? kitPrinterModel
      : `${kitPrinterModel} (Inclusa no Kit)`
    : "NÃO INCLUSA (Removida do Kit pelo Cliente)";

  const hasValidRawReader =
    !isEmptyLabel(rawRdr) &&
    !rawRdr.toLowerCase().includes("coolers") &&
    !rawRdr.toLowerCase().includes("acessórios do kit");
  const readerDisplay = hasValidRawReader
    ? rawRdr.slice(0, 128)
    : kitReaderModel
    ? `${kitReaderModel} (Kit)`.slice(0, 128)
    : accessoriesSummary
    ? `Enviar do Kit (${accSubs.length} itens): ${accessoriesSummary}`.slice(0, 128)
    : "";

  return {
    isKit: true,
    monitorDisplay: monitorDisplay.slice(0, 128),
    kitMonitorModel: kitMonitorModel.slice(0, 128),
    printerDisplay: printerDisplay.slice(0, 128),
    readerDisplay,
    hasReader: Boolean(kitReaderModel || hasValidRawReader),
    hasMonitorInKit,
    hasPrinterInKit,
    accessoriesSummary,
    kitExtraItems: accSubs.map((a) => a.name),
    selectedItemsSummary,
    removedItemsSummary,
    includedSubItems: selectedSubItems,
    removedSubItems,
    selectedCount: selectedSubItems.length,
    totalCount: kitItems.length,
    kitPriceCents: calculateKitTotalCents(selectedSubItems),
  };
}

/**
 * Resolve os valores oficiais de tabela do Gabinete (Preço Base PIX, Preço Base Cartão,
 * Diferença da Modalidade Cartão e Adicional de Cor/Acabamento) a partir do nome.
 */
export function resolveCabinetBasePricing(
  cabinetName?: string | null,
  colorName?: string | null
): {
  pixBaseCents: number;
  cardBaseCents: number;
  cardAdditionCents: number;
  colorAdjustmentCents: number;
  pixCabinetWithColorCents: number;
  cardCabinetWithColorCents: number;
} {
  const cabNorm = (cabinetName || "").toLowerCase();
  let pixBaseCents = 110000; // Gabinete de Balcão (R$ 1.100,00 no PIX)
  let cardBaseCents = 133000; // Gabinete de Balcão (R$ 1.330,00 no Cartão)

  if (cabNorm.includes("parede")) {
    pixBaseCents = 99000; // R$ 990,00 no PIX
    cardBaseCents = 120000; // R$ 1.200,00 no Cartão
  } else if (cabNorm.includes("piso")) {
    pixBaseCents = 159000; // R$ 1.590,00 no PIX
    cardBaseCents = 193000; // R$ 1.930,00 no Cartão
  }

  const colNorm = (colorName || "").toLowerCase();
  let colorAdjustmentCents = 0;
  if (colNorm.includes("bicolor") || colNorm.includes("black & white")) {
    colorAdjustmentCents = 12000; // + R$ 120,00
  } else if (colNorm.includes("preto")) {
    colorAdjustmentCents = 18000; // + R$ 180,00
  }

  const cardAdditionCents = Math.max(0, cardBaseCents - pixBaseCents);

  return {
    pixBaseCents,
    cardBaseCents,
    cardAdditionCents,
    colorAdjustmentCents,
    pixCabinetWithColorCents: pixBaseCents + colorAdjustmentCents,
    cardCabinetWithColorCents: cardBaseCents + colorAdjustmentCents,
  };
}

export interface OrderFinancialStepLine {
  stepNumber: string; // "01", "02", "03"...
  label: string;
  subLabel?: string;
  amountCents: number;
  isAddition?: boolean;
  isDiscount?: boolean;
  isCardDiff?: boolean;
  isShipping?: boolean;
  isZeroIncluded?: boolean;
}

export interface OrderFinancialBreakdownResult {
  lines: OrderFinancialStepLine[];
  pixProductsSubtotalCents: number;
  cardProductsSubtotalCents: number;
  cardTotalDiffCents: number;
  additionalChargesCents: number;
  discountCents: number;
  shippingCents: number;
  pixTotalCents: number;
  cardTotalCents: number;
  activeTotalCents: number;
  isCreditCard: boolean;
}

/**
 * Constrói o Demonstrativo / Memória de Cálculo em Ordem (01, 02, 03, 04...)
 * explicando exatamente como se chega no valor no PIX e no valor no Cartão.
 */
export function buildOrderFinancialBreakdown(params: {
  items: Array<{
    cabinet_name: string;
    color_name: string;
    quantity: number;
    unit_price_cents?: number;
    subtotal_cents?: number;
    monitor_name?: string;
    printer_name?: string;
    reader_name?: string;
    kit_items_snapshot?: KitSubItem[] | null;
  }>;
  sheets?: Array<{
    kitItemsSnapshot?: KitSubItem[] | null;
    assemblyService?: string | null;
  }> | null;
  additionalCharges?: Array<{
    id: string;
    description: string;
    amountCents: number;
    quantity?: number;
  }> | null;
  discountCents?: number;
  couponCode?: string | null;
  shippingCents?: number;
  shippingName?: string | null;
  paymentMethod?: "pix" | "credit_card" | string | null;
  orderTotalCents?: number;
}): OrderFinancialBreakdownResult {
  const isCreditCard = params.paymentMethod === "credit_card";
  const lines: OrderFinancialStepLine[] = [];
  let stepCounter = 1;
  const nextStep = () => String(stepCounter++).padStart(2, "0");

  let pixProductsSubtotalCents = 0;
  let cardTotalDiffCents = 0;

  const itemsList = Array.isArray(params.items) ? params.items : [];
  const sheetsList = Array.isArray(params.sheets) ? params.sheets : [];

  itemsList.forEach((it, idx) => {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const sheet = sheetsList[idx] || null;
    const cabPricing = resolveCabinetBasePricing(it.cabinet_name, it.color_name);
    const kitSnapshot = it.kit_items_snapshot || sheet?.kitItemsSnapshot || null;

    const resolvedEq = resolveKitEquipmentSummary({
      kitItemsSnapshot: kitSnapshot,
      monitorName: it.monitor_name,
      printerName: it.printer_name,
      readerName: it.reader_name,
    });

    const hasAssembly = Boolean(
      sheet?.assemblyService?.includes("Montagem Especializada") ||
        it.monitor_name?.includes("100% Montado")
    );

    // 01 - Gabinete Base (Preço PIX)
    const cabPixTotal = cabPricing.pixBaseCents * qty;
    pixProductsSubtotalCents += cabPixTotal;
    lines.push({
      stepNumber: nextStep(),
      label: `${ String(qty).padStart(2, "0") } - ${it.cabinet_name}${qty > 1 ? ` (${qty}x)` : ""}`,
      subLabel: `Valor base na tabela PIX • Cor: ${it.color_name}`,
      amountCents: cabPixTotal,
    });

    // Se a cor tiver acréscimo (Preto TX ou Bicolor)
    if (cabPricing.colorAdjustmentCents > 0) {
      const colTotal = cabPricing.colorAdjustmentCents * qty;
      pixProductsSubtotalCents += colTotal;
      lines.push({
        stepNumber: nextStep(),
        label: `Acabamento Especial: ${it.color_name}${qty > 1 ? ` (${qty}x)` : ""}`,
        subLabel: "Adicional de acabamento sobre o Branco TX padrão",
        amountCents: colTotal,
        isAddition: true,
      });
    }

    // 02 - Kit de Montagem (Completo ou Editado)
    if (resolvedEq.isKit) {
      const kitTotal = resolvedEq.kitPriceCents * qty;
      pixProductsSubtotalCents += kitTotal;
      const isEditedKit = resolvedEq.removedSubItems.length > 0;
      const includedBreakdownText = resolvedEq.includedSubItems
        .map((sub) => `${sub.name} (${sub.priceCents > 0 ? `R$ ${(sub.priceCents / 100).toFixed(0)}` : "Incluso"})`)
        .join(" + ");

      lines.push({
        stepNumber: nextStep(),
        label: `${ String(qty).padStart(2, "0") } - ${
          isEditedKit
            ? `Kit Editado (${resolvedEq.selectedCount} de ${resolvedEq.totalCount} itens)`
            : `Kit de Montagem Completo (${resolvedEq.selectedCount} itens)`
        }`,
        subLabel: includedBreakdownText,
        amountCents: kitTotal,
        isAddition: true,
      });
    } else if (
      it.reader_name &&
      !it.reader_name.toLowerCase().includes("não") &&
      !it.reader_name.toLowerCase().includes("nenhum") &&
      !it.reader_name.toLowerCase().includes("kit")
    ) {
      // Leitor avulso fora do kit
      const readerTotal = 28000 * qty;
      pixProductsSubtotalCents += readerTotal;
      lines.push({
        stepNumber: nextStep(),
        label: `${ String(qty).padStart(2, "0") } - Leitor 2D (${it.reader_name})`,
        subLabel: "Acessório avulso selecionado",
        amountCents: readerTotal,
        isAddition: true,
      });
    }

    // Montagem de Fábrica (+ R$ 999,00)
    if (hasAssembly) {
      const asmTotal = 99900 * qty;
      pixProductsSubtotalCents += asmTotal;
      lines.push({
        stepNumber: nextStep(),
        label: `${ String(qty).padStart(2, "0") } - Serviço de Montagem Completa de Fábrica`,
        subLabel: "Totem entregue 100% montado e testado",
        amountCents: asmTotal,
        isAddition: true,
      });
    }

    // Diferença do Cartão sobre o Gabinete (ex: R$ 1.330 - R$ 1.100 = + R$ 230,00)
    cardTotalDiffCents += cabPricing.cardAdditionCents * qty;
  });

  // Valores Adicionais / Serviços Extras inseridos pelo Admin
  let additionalChargesCents = 0;
  if (Array.isArray(params.additionalCharges)) {
    for (const chg of params.additionalCharges) {
      const chgQty = Math.max(1, Number(chg.quantity) || 1);
      const chgTotal = (Number(chg.amountCents) || 0) * chgQty;
      if (chgTotal > 0) {
        additionalChargesCents += chgTotal;
        lines.push({
          stepNumber: nextStep(),
          label: `${ String(chgQty).padStart(2, "0") } - ${chg.description}`,
          subLabel: "Valor adicional / serviço extra incluído no pedido",
          amountCents: chgTotal,
          isAddition: true,
        });
      }
    }
  }

  // Desconto de Cupom (se houver)
  const discountCents = Math.max(0, Number(params.discountCents) || 0);
  if (discountCents > 0) {
    lines.push({
      stepNumber: nextStep(),
      label: `Desconto Cupom${params.couponCode ? ` (${params.couponCode})` : ""}`,
      subLabel: "Abatimento promocional aplicado no checkout",
      amountCents: discountCents,
      isDiscount: true,
    });
  }

  // Frete (SEDEX / PAC / Transportadora)
  const shippingCents = Math.max(0, Number(params.shippingCents) || 0);
  const cleanShipName = (params.shippingName || "Frete").trim();
  lines.push({
    stepNumber: nextStep(),
    label: cleanShipName,
    subLabel: shippingCents > 0 ? "Frete calculado para o CEP de destino" : "Frete Grátis / Retirada",
    amountCents: shippingCents,
    isShipping: true,
    isZeroIncluded: shippingCents === 0,
  });

  const pixTotalCents = Math.max(
    0,
    pixProductsSubtotalCents + additionalChargesCents - discountCents + shippingCents
  );

  // Se o pedido estiver no Cartão de Crédito (ou se houver diferença de tabela Cartão),
  // adicionamos a linha explícita explicando os + R$ 230,00 (ou + R$ 210 / + R$ 340) da Tabela Cartão!
  if (isCreditCard && cardTotalDiffCents > 0) {
    lines.push({
      stepNumber: nextStep(),
      label: "Acréscimo Modalidade Cartão de Crédito (até 10x)",
      subLabel: `Diferença de tabela do Gabinete no Cartão vs Preço à vista no PIX`,
      amountCents: cardTotalDiffCents,
      isAddition: true,
      isCardDiff: true,
    });
  }

  const cardProductsSubtotalCents = pixProductsSubtotalCents + cardTotalDiffCents;
  const cardTotalCents = Math.max(
    0,
    cardProductsSubtotalCents + additionalChargesCents - discountCents + shippingCents
  );

  const activeTotalCents =
    typeof params.orderTotalCents === "number" && params.orderTotalCents > 0
      ? params.orderTotalCents
      : isCreditCard
      ? cardTotalCents
      : pixTotalCents;

  return {
    lines,
    pixProductsSubtotalCents,
    cardProductsSubtotalCents,
    cardTotalDiffCents,
    additionalChargesCents,
    discountCents,
    shippingCents,
    pixTotalCents,
    cardTotalCents,
    activeTotalCents,
    isCreditCard,
  };
}

/**
 * Constrói o Checklist Oficial de Entrega / Expedição de um item do pedido,
 * deixando 100% explícito o que DEVE ser entregue junto com o gabinete (✅)
 * e o que foi REMOVIDO pelo cliente ou é apenas furação CNC (❌).
 */
export function buildOrderDeliveryChecklist(params: {
  cabinetName: string;
  colorName: string;
  quantity?: number;
  monitor?: MonitorOption | null;
  kitItemsSnapshot?: KitSubItem[] | null;
  monitorName?: string | null;
  printerName?: string | null;
  readerName?: string | null;
  includeAssemblyService?: boolean;
}): DeliveryChecklistItem[] {
  const qty = Math.max(1, Number(params.quantity) || 1);
  const cabPricing = resolveCabinetBasePricing(params.cabinetName, params.colorName);
  const resolved = resolveKitEquipmentSummary({
    monitor: params.monitor,
    kitItemsSnapshot: params.kitItemsSnapshot,
    monitorName: params.monitorName,
    printerName: params.printerName,
    readerName: params.readerName,
  });

  const checklist: DeliveryChecklistItem[] = [
    {
      id: "chk-cabinet",
      name: `${params.cabinetName} — Cor: ${params.colorName}`,
      category: "cabinet",
      priceCents: cabPricing.pixCabinetWithColorCents * qty,
      included: true,
      quantity: qty,
      badgeLabel: "OBRIGATÓRIO • ESTRUTURA FÍSICA (BASE PIX)",
      notes: "Gabinete usinado em CNC com fechadura e chaves.",
    },
  ];

  if (resolved.isKit) {
    // Primeiro todos os itens SELECIONADOS pelo cliente (O QUE ENTREGAR JUNTO COM O GABINETE)
    for (const sub of resolved.includedSubItems) {
      checklist.push({
        id: `chk-kit-inc-${sub.id}`,
        name: sub.name,
        category:
          sub.category === "monitor"
            ? "monitor"
            : sub.category === "printer"
            ? "printer"
            : sub.category === "reader"
            ? "reader"
            : "accessory",
        priceCents: sub.priceCents || 0,
        included: true,
        quantity: qty,
        badgeLabel: "ENTREGAR JUNTO COM O GABINETE",
        notes: "Item selecionado e pago pelo cliente no Kit.",
      });
    }

    // Se contratou Serviço de Montagem Completa (+ R$ 999)
    if (params.includeAssemblyService) {
      checklist.push({
        id: "chk-service-assembly",
        name: "Serviço de Montagem Completa de Fábrica (Totem 100% Montado e Testado)",
        category: "service",
        priceCents: 99900,
        included: true,
        quantity: qty,
        badgeLabel: "ENTREGAR 100% MONTADO",
        notes: "Entregar com todos os itens instalados internamente.",
      });
    }

    // Depois, de forma explícita, os itens que o cliente REMOVEU do Kit (NÃO ENTREGAR!)
    for (const rem of resolved.removedSubItems) {
      checklist.push({
        id: `chk-kit-rem-${rem.id}`,
        name: rem.name,
        category:
          rem.category === "monitor"
            ? "monitor"
            : rem.category === "printer"
            ? "printer"
            : rem.category === "reader"
            ? "reader"
            : "accessory",
        priceCents: rem.priceCents || 0,
        included: false,
        quantity: 0,
        badgeLabel: "NÃO ENTREGAR — REMOVIDO PELO CLIENTE",
        notes: "O cliente desmarcou este item do Kit. Não cobrar e não enviar.",
      });
    }
  } else {
    // Pedido APENAS DO GABINETE (Sem Kit de Montagem)
    checklist.push({
      id: "chk-only-cabinet-mon",
      name: `Monitor (${resolved.monitorDisplay}): APENAS FURAÇÃO CNC NO GABINETE`,
      category: "cnc_cutout",
      priceCents: 0,
      included: false,
      quantity: 0,
      badgeLabel: "NÃO ENVIAR TELA (SÓ FURAÇÃO)",
      notes: "Cliente comprou apenas o gabinete físico.",
    });
    checklist.push({
      id: "chk-only-cabinet-prt",
      name: `Impressora (${resolved.printerDisplay}): APENAS RECORTE CNC NO GABINETE`,
      category: "cnc_cutout",
      priceCents: 0,
      included: false,
      quantity: 0,
      badgeLabel: "NÃO ENVIAR IMPRESSORA (SÓ RECORTE)",
      notes: "Cliente comprou apenas o gabinete físico.",
    });
  }

  return checklist;
}
