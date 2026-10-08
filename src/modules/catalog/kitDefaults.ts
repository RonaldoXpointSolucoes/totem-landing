import { KitSubItem, MonitorOption } from "@/types/catalog";

export const DEFAULT_KIT_SUB_ITEMS: KitSubItem[] = [
  {
    id: "kit-monitor-touch",
    name: "Computador All-in-One Touch 23.8\" Core i5",
    category: "monitor",
    description: "Display Touchscreen capacitivo com PC integrado Intel Core i5, 8GB RAM e SSD 240GB.",
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_657397-MLB91414180451_092025-F-computador-allinone-238-touch-screen-intel-core-i5-3320.webp",
    priceCents: 249000, // R$ 2.490,00
    selected: true,
  },
  {
    id: "kit-printer-epson",
    name: "Impressora Térmica EPSON TM-T20X (80mm)",
    category: "printer",
    description: "Impressora térmica homologada de alta velocidade com guilhotina e saída frontal.",
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_630729-MLA108925986834_032026-F.webp",
    priceCents: 79000, // R$ 790,00
    selected: true,
  },
  {
    id: "kit-reader-bematech",
    name: "Leitor de Código de Barras Fixo 2D / QR Code",
    category: "reader",
    description: "Scanner óptico omnidirecional de embutir para leitura instantânea em smartphones e papel.",
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_925519-MLB95131543745_102025-F-leitor-de-codigo-de-barras-fixo-caixa-usb-2d-5v-preto-220v.webp",
    priceCents: 49000, // R$ 490,00
    selected: true,
  },
  {
    id: "kit-cabling-internal",
    name: "Kit de Conexões, Cabos Blindados & Filtro Industrial",
    category: "accessory",
    description: "Filtro de linha com aterramento, cabos blindados HDMI/USB, chave geral e fixadores CNC.",
    image: "/images/totems/wall/wall-white-1.png",
    priceCents: 18000, // R$ 180,00
    selected: true,
  },
];

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
  if (!item) return DEFAULT_KIT_SUB_ITEMS;

  // Se já possui kitItems no objeto
  if (Array.isArray(item.kitItems) && item.kitItems.length > 0) {
    return item.kitItems;
  }

  // Tenta recuperar do campo notes se for JSON serializado
  if (item.notes && item.notes.includes("kitItems")) {
    try {
      const parsed = JSON.parse(item.notes);
      if (Array.isArray(parsed.kitItems)) {
        return parsed.kitItems;
      }
    } catch (e) {}
  }

  return DEFAULT_KIT_SUB_ITEMS.map((sub) => ({ ...sub }));
}

/**
 * Calcula o somatório em centavos dos subitens selecionados do Kit
 */
export function calculateKitTotalCents(kitItems?: KitSubItem[]): number {
  if (!Array.isArray(kitItems) || kitItems.length === 0) return 0;
  return kitItems.filter((i) => i.selected).reduce((acc, i) => acc + (i.priceCents || 0), 0);
}
