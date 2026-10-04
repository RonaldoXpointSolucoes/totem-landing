/**
 * Tipos e Definições de Eventos Canônicos de Analytics, Tráfego Pago & Funil de Conversão
 * Totem Landing Page — X-Point Soluções
 */

export const ANALYTICS_EVENTS = {
  // Topo do Funil (Descoberta & Landing)
  VIEW_HOME: "view_home",
  VIEW_FAQ: "view_faq",
  WHATSAPP_CLICK: "whatsapp_click",

  // Meio do Funil (Configurador & Engajamento com Produto)
  START_CONFIGURATOR: "start_configurator",
  SELECT_CABINET_MODEL: "select_cabinet_model",
  SELECT_COLOR: "select_color",
  SELECT_MONITOR: "select_monitor",
  SELECT_PRINTER: "select_printer",
  SELECT_BARCODE_READER: "select_barcode_reader",
  VIEW_3D_MODEL: "view_3d_model", // Equivalente a video_view / inspeção 3D interativa
  INTERACT_3D: "interact_3d",

  // Fundo do Funil (Carrinho & Checkout E-commerce)
  VIEW_CART: "view_cart",
  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  DUPLICATE_ITEM: "duplicate_item",
  BEGIN_CHECKOUT: "begin_checkout",
  LEAD_SUBMITTED: "lead_submitted", // Cadastro concluído no checkout (Nome/Email/WhatsApp)
  PIX_GENERATED: "pix_generated",   // QR Code Pix / Copia e Cola gerado
  PURCHASE: "purchase",             // Pagamento aprovado / Pedido concluído
} as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsEventPayload {
  eventName: AnalyticsEventType;
  sessionId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface FunnelStageMetric {
  stageId: string;
  eventName: AnalyticsEventType;
  label: string;
  stepNumber: number;
  count: number;
  conversionRateFromPrevious: number; // Porcentagem de 0 a 100
  dropoffRateFromPrevious: number;   // Porcentagem de abandono (100 - conversionRate)
  overallConversionRate: number;     // Conversão relativa ao topo do funil
}

export const FUNNEL_STAGES: {
  stageId: string;
  eventName: AnalyticsEventType;
  label: string;
  stepNumber: number;
}[] = [
  { stageId: "stage_home", eventName: ANALYTICS_EVENTS.VIEW_HOME, label: "Visita Landing Page", stepNumber: 1 },
  { stageId: "stage_configurator", eventName: ANALYTICS_EVENTS.START_CONFIGURATOR, label: "Início do Configurador", stepNumber: 2 },
  { stageId: "stage_model_selected", eventName: ANALYTICS_EVENTS.SELECT_CABINET_MODEL, label: "Seleção do Modelo de Gabinete", stepNumber: 3 },
  { stageId: "stage_cart_added", eventName: ANALYTICS_EVENTS.ADD_TO_CART, label: "Adição ao Carrinho", stepNumber: 4 },
  { stageId: "stage_checkout", eventName: ANALYTICS_EVENTS.BEGIN_CHECKOUT, label: "Início de Checkout", stepNumber: 5 },
  { stageId: "stage_lead_captured", eventName: ANALYTICS_EVENTS.LEAD_SUBMITTED, label: "Cadastro do Cliente", stepNumber: 6 },
  { stageId: "stage_pix_issued", eventName: ANALYTICS_EVENTS.PIX_GENERATED, label: "Pix Copia e Cola Gerado", stepNumber: 7 },
  { stageId: "stage_purchase_completed", eventName: ANALYTICS_EVENTS.PURCHASE, label: "Pagamento Confirmado (Venda)", stepNumber: 8 },
];
