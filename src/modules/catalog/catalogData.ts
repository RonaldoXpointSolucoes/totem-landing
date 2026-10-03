import {
  CabinetModel,
  ColorOption,
  MonitorOption,
  PrinterOption,
  BarcodeReaderOption,
} from "@/types/catalog";

export const CABINET_MODELS: CabinetModel[] = [
  {
    id: "cabinet-floor",
    name: "Gabinete de Chão",
    slug: "floor",
    description:
      "Design imponente e estruturado com base de alta estabilidade, fechaduras traseiras duplas e compartimento interno dedicado para CPU, nobreak e guilhotina.",
    basePriceCents: 149000, // R$ 1.490,00
    active: true,
    sortOrder: 1,
    mainImage: "/models/cabinet-floor.svg",
    dimensions: {
      heightMm: 1650,
      widthMm: 480,
      depthMm: 380,
    },
  },
  {
    id: "cabinet-wall",
    name: "Gabinete de Parede",
    slug: "wall",
    description:
      "Máximo aproveitamento do espaço físico em ambientes de tráfego intenso. Fixação vertical reforçada com passagem interna oculta para cabeamento e ventilação ativa.",
    basePriceCents: 99000, // R$ 990,00
    active: true,
    sortOrder: 2,
    mainImage: "/models/cabinet-wall.svg",
    dimensions: {
      heightMm: 850,
      widthMm: 440,
      depthMm: 220,
    },
  },
  {
    id: "cabinet-countertop",
    name: "Gabinete de Balcão",
    slug: "countertop",
    description:
      "Formato compacto e altamente ergonômico, ideal para checkouts expressos, balcões de atendimento, recepções clínicas e pagamentos rápidos.",
    basePriceCents: 89000, // R$ 890,00
    active: true,
    sortOrder: 3,
    mainImage: "/models/cabinet-countertop.svg",
    dimensions: {
      heightMm: 620,
      widthMm: 400,
      depthMm: 290,
    },
  },
];

export const COLOR_OPTIONS: ColorOption[] = [
  {
    id: "color-white",
    name: "Branco Neve Industrial",
    slug: "white",
    hexReference: "#f8fafc",
    priceAdjustmentCents: 0, // Sem acréscimo
    active: true,
  },
  {
    id: "color-black",
    name: "Preto Fosco Titanium",
    slug: "black",
    hexReference: "#0f172a",
    priceAdjustmentCents: 10000, // + R$ 100,00
    active: true,
  },
  {
    id: "color-black-white",
    name: "Black & White Dual-Tone",
    slug: "black-white",
    hexReference: "linear-gradient(135deg, #0f172a 50%, #f8fafc 50%)",
    priceAdjustmentCents: 15000, // + R$ 150,00
    active: true,
  },
];

export const HOMOLOGATED_MONITORS: MonitorOption[] = [
  {
    id: "mon-elgin-215",
    brand: "Elgin",
    model: "Touch Pro 21.5\"",
    displayName: "Elgin Touch 21.5\" Full HD",
    sizeInches: 21.5,
    vesaPattern: "100x100",
    technicalCode: "ELG-M215-V100",
    notes: "Moldura standard com furação VESA 100 e vedação perimetral.",
    active: true,
  },
  {
    id: "mon-gertec-156",
    brand: "Gertec",
    model: "TS-150 Touch 15.6\"",
    displayName: "Gertec TS-150 15.6\" Widescreen",
    sizeInches: 15.6,
    vesaPattern: "75x75",
    technicalCode: "GER-TS150-V75",
    notes: "Abertura compacta para totem de parede e balcão.",
    active: true,
  },
  {
    id: "mon-bematech-185",
    brand: "Bematech",
    model: "RC-185 Touch 18.5\"",
    displayName: "Bematech RC-185 18.5\" HD",
    sizeInches: 18.5,
    vesaPattern: "100x100",
    technicalCode: "BEM-RC185-V100",
    notes: "Padrão de corte horizontal com presilhas traseiras de pressão.",
    active: true,
  },
  {
    id: "mon-prolan-24",
    brand: "Prolan",
    model: "Industrial Pro 23.8\"",
    displayName: "Prolan Industrial 23.8\" Frameless",
    sizeInches: 23.8,
    vesaPattern: "100x100",
    technicalCode: "PRO-IND24-V100",
    notes: "Furação reforçada para uso intensivo de 24 horas.",
    active: true,
  },
];

export const HOMOLOGATED_PRINTERS: PrinterOption[] = [
  {
    id: "prt-epson-t20x",
    brand: "EPSON",
    model: "TM-T20X Térmica",
    displayName: "EPSON TM-T20X (80mm)",
    paperWidthMm: 80,
    technicalCode: "EPS-T20X-CUT80",
    notes: "Gaveta com suporte para bobina de 80mm e rasgo para guilhotina frontal.",
    active: true,
  },
  {
    id: "prt-elgin-i9",
    brand: "Elgin",
    model: "i9 Térmica USB/Ethernet",
    displayName: "Elgin i9 High-Speed (80mm)",
    paperWidthMm: 80,
    technicalCode: "ELG-I9-CUT80",
    notes: "Trilho deslizante e passagem de fita frontal em aço escovado.",
    active: true,
  },
  {
    id: "prt-bematech-4200",
    brand: "Bematech",
    model: "MP-4200 TH",
    displayName: "Bematech MP-4200 TH (80mm)",
    paperWidthMm: 80,
    technicalCode: "BEM-MP4200-CUT80",
    notes: "Gabinete preparado para fácil troca rápida de bobina sem chave.",
    active: true,
  },
  {
    id: "prt-daruma-dr800",
    brand: "Daruma",
    model: "DR800 L",
    displayName: "Daruma DR800 L (80mm)",
    paperWidthMm: 80,
    technicalCode: "DAR-DR800-CUT80",
    notes: "Recorte padrão com suporte metálico antivibração.",
    active: true,
  },
];

export const HOMOLOGATED_READERS: BarcodeReaderOption[] = [
  {
    id: "rdr-honeywell-hf680",
    brand: "Honeywell",
    model: "Orbit HF680 2D Imager",
    displayName: "Honeywell Orbit HF680 (1D/2D / QR Code)",
    is2D: true,
    technicalCode: "HON-HF680-WIN",
    notes: "Abertura frontal angular para leitura rápida de smartphones e papel.",
    active: true,
  },
  {
    id: "rdr-elgin-flash",
    brand: "Elgin",
    model: "Flash 2D Fixo",
    displayName: "Elgin Flash 2D Fixo de Embutir",
    is2D: true,
    technicalCode: "ELG-FLASH-2D",
    notes: "Vidro frontal temperado anti-risco de alta durabilidade.",
    active: true,
  },
  {
    id: "rdr-bematech-i500",
    brand: "Bematech",
    model: "I-500 Omnidirecional",
    displayName: "Bematech I-500 Omnidirecional 2D",
    is2D: true,
    technicalCode: "BEM-I500-2D",
    notes: "Encaixe embutido com inclinação otimizada para autosserviço.",
    active: true,
  },
];
