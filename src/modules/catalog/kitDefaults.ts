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
      priceCents: 0,
      included: true,
      quantity: qty,
      badgeLabel: "OBRIGATÓRIO • ESTRUTURA FÍSICA",
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
