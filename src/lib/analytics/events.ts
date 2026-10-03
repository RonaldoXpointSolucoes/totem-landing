/**
 * Tipos e Definições de Eventos Canônicos de Analytics & Funil de Conversão
 * Totem Landing Page — X-Point Soluções
 */

export const ANALYTICS_EVENTS = {
  VIEW_HOME: "view_home",
  START_CONFIGURATOR: "start_configurator",
  SELECT_CABINET_MODEL: "select_cabinet_model",
  SELECT_COLOR: "select_color",
  SELECT_MONITOR: "select_monitor",
  SELECT_PRINTER: "select_printer",
  SELECT_BARCODE_READER: "select_barcode_reader",
  ADD_TO_CART: "add_to_cart",
  DUPLICATE_ITEM: "duplicate_item",
  BEGIN_CHECKOUT: "begin_checkout",
  PIX_GENERATED: "pix_generated",
  PURCHASE: "purchase",
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
  { stageId: "stage_pix_issued", eventName: ANALYTICS_EVENTS.PIX_GENERATED, label: "Pix Copia e Cola Gerado", stepNumber: 6 },
  { stageId: "stage_purchase_completed", eventName: ANALYTICS_EVENTS.PURCHASE, label: "Pagamento Confirmado (Venda)", stepNumber: 7 },
];
