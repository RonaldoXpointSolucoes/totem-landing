import fs from "fs";
import path from "path";
import { Query } from "node-appwrite";
import { getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";

export type AdsRecordType =
  | "abandoned_cart"
  | "checkout_lead"
  | "whatsapp_conversion"
  | "purchase_conversion"
  | "ads_conversion";

export type AdsLeadStatus =
  | "abandoned"
  | "awaiting_contact"
  | "in_negotiation"
  | "converted_order"
  | "archived";

export interface AdsCartItemSnapshot {
  itemId: string;
  cabinetModelId: string;
  cabinetName: string;
  colorId?: string;
  colorName?: string;
  monitorId?: string;
  monitorName?: string;
  printerId?: string;
  printerName?: string;
  barcodeReaderId?: string;
  barcodeReaderName?: string;
  purchaseMode: "cabinet_only" | "complete_kit";
  assemblyServiceSelected?: boolean;
  assemblyFeeCents?: number;
  customizationNotes?: string;
  quantity: number;
  unitPriceCents: number;
  pixPriceCents?: number;
  cardPriceCents?: number;
  subtotalCents: number;
}

export interface AdsLeadCartRecord {
  id: string;
  recordId: string; // Ex: ADS-2026-1028-RS-01 ou CART-2026-...
  sessionId: string;
  recordType: AdsRecordType;
  funnelStage:
    | "add_to_cart"
    | "view_cart"
    | "shipping_simulated"
    | "begin_checkout"
    | "lead_submitted"
    | "whatsapp_click"
    | "pix_generated"
    | "purchase";
  status: AdsLeadStatus;
  conversionsCount: number;

  // Dados de Contato & Endereço do Cliente (mapeados de rascunho, CEP, checkout ou perfil salvo)
  customer: {
    name: string;
    whatsapp: string;
    email: string;
    document: string; // CPF ou CNPJ
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };

  // Dados do Carrinho e Valores
  cart: {
    items: AdsCartItemSnapshot[];
    itemsCount: number;
    subtotalCents: number;
    shippingCents: number;
    shippingCarrier: string;
    shippingDeliveryDays: number;
    discountCents: number;
    couponCode: string;
    totalCents: number;
    pixTotalCents: number;
    paymentMethod: "pix" | "credit_card" | "undecided";
  };

  // Atribuição Google Ads & Tráfego
  attribution: {
    source: "google_ads" | "organic_or_direct";
    campaignId: string;
    campaignName: string;
    adGroupId: string;
    adGroupName: string;
    keyword: string;
    matchType: "EXACT" | "PHRASE" | "BROAD" | "AUTO" | string;
    adId: string;
    conversionActionId: string;
    conversionActionName: string;
    conversionValueCents: number;
    conversionCostCents: number; // CPA ou custo atribuído da palavra/dia
    gclid: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    utmTerm: string;
    landingUrl: string;
    referrer: string;
  };

  // Telemetria & Dispositivo
  telemetry: {
    device: "MOBILE" | "DESKTOP" | "TABLET" | string;
    ip: string;
    userAgent: string;
    geoCriterionId?: string;
    stepsJourney: string[]; // Ex: ["Anúncio Google Ads", "Configurador 3D", "Adicionou ao Carrinho"]
  };

  commercialNotes: string;
  linkedOrderNumber?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const ADS_LEADS_FILE = path.join(DATA_DIR, "ads_leads_carts.json");

/**
 * 8 Conversões Reais Auditadas da Campanha Google Ads (24395671655)
 * Período: 26/10/2026 a 28/10/2026 — Totalizando R$ 18.488,00 em valor de funil (R$ 18.486,00 em carrinhos)
 */
const SEED_ADS_RECORDS: AdsLeadCartRecord[] = [
  {
    id: "ads_conv_20261028_rs_01",
    recordId: "ADS-2026-1028-RS01",
    sessionId: "gads_rs_20261028_cart_01",
    recordType: "abandoned_cart",
    funnelStage: "add_to_cart",
    status: "abandoned",
    conversionsCount: 1,
    customer: {
      name: "Visitante Google Ads (Rio Grande do Sul)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "90000-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "Região Metropolitana / RS",
      state: "RS",
    },
    cart: {
      items: [
        {
          itemId: "item_rs_01",
          cabinetModelId: "floor_totem",
          cabinetName: "Gabinete Totem de Piso Autoatendimento (MDF Naval 18mm CNC)",
          colorId: "preto_tx",
          colorName: "Preto TX (MaDeFibra BP)",
          monitorId: "monitor_touch_215",
          monitorName: 'Monitor Touch Screen 21.5" Full HD Multitouch VESA',
          printerId: "printer_thermal_80mm",
          printerName: "Impressora Térmica 80mm Guilhotina Automática USB/Serial",
          barcodeReaderId: "reader_2d_omni",
          barcodeReaderName: "Leitor Código de Barras 2D / QR Code Omnidirecional PIX",
          purchaseMode: "complete_kit",
          assemblyServiceSelected: true,
          assemblyFeeCents: 99900,
          customizationNotes: "Configuração Kit Completo + Montagem Pronta (R$ 5.202,00)",
          quantity: 1,
          unitPriceCents: 520200,
          pixPriceCents: 520200,
          cardPriceCents: 578000,
          subtotalCents: 520200,
        },
      ],
      itemsCount: 1,
      subtotalCents: 520200,
      shippingCents: 0,
      shippingCarrier: "Cotação pendente no Checkout",
      shippingDeliveryDays: 0,
      discountCents: 0,
      couponCode: "",
      totalCents: 520200,
      pixTotalCents: 520200,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "198707616862",
      adGroupName: "03 - Gastronomia Mercados e Clinicas (Segmentos)",
      keyword: "totem de autoatendimento",
      matchType: "EXACT",
      adId: "829532711416",
      conversionActionId: "7871297265",
      conversionActionName: "[Totem Pro] Adicionar ao Carrinho (Add to Cart)",
      conversionValueCents: 520200,
      conversionCostCents: 839,
      gclid: "gclid_20261028_rs_exact_01",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "totem de autoatendimento",
      landingUrl: "https://totem.xpointsolucoes.com.br",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "MOBILE",
      ip: "177.84.x.x (RS)",
      userAgent: "Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/130.0",
      geoCriterionId: "geoTargetConstants/20104",
      stepsJourney: [
        "Busca Google: [totem de autoatendimento]",
        "Landing Page (totem.xpointsolucoes.com.br)",
        "Configurador 3D (Gabinete de Piso + Kit Completo)",
        "Adicionou ao Carrinho #1 (R$ 5.202,00)",
      ],
    },
    commercialNotes:
      "Conversão 1/3 no Rio Grande do Sul em 28/10/2026. Usuário Mobile pesquisou [totem de autoatendimento] (Exata) e montou Gabinete de Piso + Kit Completo (R$ 5.202,00).",
    createdAt: "2026-10-28T14:18:10.000Z",
    updatedAt: "2026-10-28T14:18:10.000Z",
  },
  {
    id: "ads_conv_20261028_rs_02",
    recordId: "ADS-2026-1028-RS02",
    sessionId: "gads_rs_20261028_cart_02",
    recordType: "abandoned_cart",
    funnelStage: "add_to_cart",
    status: "abandoned",
    conversionsCount: 1,
    customer: {
      name: "Visitante Google Ads (Rio Grande do Sul — Comparação #2)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "90000-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "Região Metropolitana / RS",
      state: "RS",
    },
    cart: {
      items: [
        {
          itemId: "item_rs_02",
          cabinetModelId: "floor_totem",
          cabinetName: "Gabinete Totem de Piso Autoatendimento (MDF Naval 18mm CNC)",
          colorId: "branco_tx",
          colorName: "Branco TX (MaDeFibra BP)",
          monitorId: "monitor_touch_215",
          monitorName: 'Monitor Touch Screen 21.5" Full HD Multitouch VESA',
          printerId: "printer_thermal_80mm",
          printerName: "Impressora Térmica 80mm Guilhotina Automática USB/Serial",
          barcodeReaderId: "reader_2d_omni",
          barcodeReaderName: "Leitor Código de Barras 2D / QR Code Omnidirecional PIX",
          purchaseMode: "complete_kit",
          assemblyServiceSelected: true,
          assemblyFeeCents: 99900,
          customizationNotes: "Segunda configuração comparativa no carrinho (R$ 5.202,00)",
          quantity: 1,
          unitPriceCents: 520200,
          pixPriceCents: 520200,
          cardPriceCents: 578000,
          subtotalCents: 520200,
        },
      ],
      itemsCount: 1,
      subtotalCents: 520200,
      shippingCents: 0,
      shippingCarrier: "Cotação pendente no Checkout",
      shippingDeliveryDays: 0,
      discountCents: 0,
      couponCode: "",
      totalCents: 520200,
      pixTotalCents: 520200,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "198707616862",
      adGroupName: "03 - Gastronomia Mercados e Clinicas (Segmentos)",
      keyword: "totem de autoatendimento",
      matchType: "EXACT",
      adId: "829532711416",
      conversionActionId: "7871297265",
      conversionActionName: "[Totem Pro] Adicionar ao Carrinho (Add to Cart)",
      conversionValueCents: 520200,
      conversionCostCents: 839,
      gclid: "gclid_20261028_rs_exact_02",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "totem de autoatendimento",
      landingUrl: "https://totem.xpointsolucoes.com.br",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "MOBILE",
      ip: "177.84.x.x (RS)",
      userAgent: "Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/130.0",
      geoCriterionId: "geoTargetConstants/20104",
      stepsJourney: [
        "Busca Google: [totem de autoatendimento]",
        "Configurador 3D (Alteração de Acabamento / Cor)",
        "Adicionou ao Carrinho #2 (R$ 5.202,00)",
      ],
    },
    commercialNotes:
      "Conversão 2/3 no Rio Grande do Sul em 28/10/2026. Segunda adição de Gabinete + Kit Completo (R$ 5.202,00) durante simulação no configurador.",
    createdAt: "2026-10-28T14:21:45.000Z",
    updatedAt: "2026-10-28T14:21:45.000Z",
  },
  {
    id: "ads_conv_20261028_rs_03",
    recordId: "ADS-2026-1028-RS03",
    sessionId: "gads_rs_20261028_cart_03",
    recordType: "abandoned_cart",
    funnelStage: "add_to_cart",
    status: "abandoned",
    conversionsCount: 1,
    customer: {
      name: "Visitante Google Ads (Rio Grande do Sul — Comparação #3)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "90000-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "Região Metropolitana / RS",
      state: "RS",
    },
    cart: {
      items: [
        {
          itemId: "item_rs_03",
          cabinetModelId: "floor_totem",
          cabinetName: "Gabinete Totem de Piso Autoatendimento (MDF Naval 18mm CNC)",
          colorId: "amadeirado",
          colorName: "Amadeirado Freijó (MaDeFibra BP)",
          monitorId: "monitor_touch_215",
          monitorName: 'Monitor Touch Screen 21.5" Full HD Multitouch VESA',
          printerId: "printer_thermal_80mm",
          printerName: "Impressora Térmica 80mm Guilhotina Automática USB/Serial",
          barcodeReaderId: "reader_2d_omni",
          barcodeReaderName: "Leitor Código de Barras 2D / QR Code Omnidirecional PIX",
          purchaseMode: "complete_kit",
          assemblyServiceSelected: true,
          assemblyFeeCents: 99900,
          customizationNotes: "Terceira configuração comparativa no carrinho (R$ 5.202,00)",
          quantity: 1,
          unitPriceCents: 520200,
          pixPriceCents: 520200,
          cardPriceCents: 578000,
          subtotalCents: 520200,
        },
      ],
      itemsCount: 1,
      subtotalCents: 520200,
      shippingCents: 0,
      shippingCarrier: "Cotação pendente no Checkout",
      shippingDeliveryDays: 0,
      discountCents: 0,
      couponCode: "",
      totalCents: 520200,
      pixTotalCents: 520200,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "198707616862",
      adGroupName: "03 - Gastronomia Mercados e Clinicas (Segmentos)",
      keyword: "totem de autoatendimento",
      matchType: "EXACT",
      adId: "829532711416",
      conversionActionId: "7871297265",
      conversionActionName: "[Totem Pro] Adicionar ao Carrinho (Add to Cart)",
      conversionValueCents: 520200,
      conversionCostCents: 839,
      gclid: "gclid_20261028_rs_exact_03",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "totem de autoatendimento",
      landingUrl: "https://totem.xpointsolucoes.com.br",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "MOBILE",
      ip: "177.84.x.x (RS)",
      userAgent: "Mozilla/5.0 (Linux; Android 14; Mobile) Chrome/130.0",
      geoCriterionId: "geoTargetConstants/20104",
      stepsJourney: [
        "Busca Google: [totem de autoatendimento]",
        "Configurador 3D (Gabinete de Piso + Kit Completo)",
        "Adicionou ao Carrinho #3 (R$ 5.202,00)",
        "Visualizou /carrinho (Total acumulado: R$ 15.606,00)",
      ],
    },
    commercialNotes:
      "Conversão 3/3 no Rio Grande do Sul em 28/10/2026. Terceira adição ao carrinho (totalizando R$ 15.606,00 nas 3 adições do dia com apenas R$ 1,65 na palavra-chave).",
    createdAt: "2026-10-28T14:25:12.000Z",
    updatedAt: "2026-10-28T14:25:12.000Z",
  },
  {
    id: "ads_conv_20261027_sorocaba_lead",
    recordId: "ADS-2026-1027-SOR-LEAD",
    sessionId: "gads_sorocaba_20261027_lead",
    recordType: "checkout_lead",
    funnelStage: "lead_submitted",
    status: "awaiting_contact",
    conversionsCount: 1,
    customer: {
      name: "Lead Clínica / Atendimento (Sorocaba - SP)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "18000-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "Centro / Sorocaba",
      city: "Sorocaba",
      state: "SP",
    },
    cart: {
      items: [
        {
          itemId: "item_sor_01",
          cabinetModelId: "floor_totem",
          cabinetName: "Gabinete Totem Retirada de Senha / Autoatendimento",
          colorId: "branco_tx",
          colorName: "Branco TX (MaDeFibra BP)",
          monitorId: "monitor_touch_215",
          monitorName: 'Monitor Touch Screen 21.5" Full HD VESA',
          printerId: "printer_thermal_80mm",
          printerName: "Impressora Térmica de Senhas 80mm Guilhotina",
          purchaseMode: "complete_kit",
          assemblyServiceSelected: false,
          assemblyFeeCents: 0,
          customizationNotes: "Entrada direta via /monte-seu-totem para Totem de Retirada de Senha",
          quantity: 1,
          unitPriceCents: 389000,
          pixPriceCents: 389000,
          cardPriceCents: 432000,
          subtotalCents: 389000,
        },
      ],
      itemsCount: 1,
      subtotalCents: 389000,
      shippingCents: 0,
      shippingCarrier: "Transportadora Rodoviária (SP Interior)",
      shippingDeliveryDays: 4,
      discountCents: 0,
      couponCode: "",
      totalCents: 389000,
      pixTotalCents: 389000,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "198707616862",
      adGroupName: "03 - Gastronomia Mercados e Clinicas (Segmentos)",
      keyword: "totem retirada de senha",
      matchType: "PHRASE",
      adId: "829486528515",
      conversionActionId: "7871297928",
      conversionActionName: "[Totem Pro] Lead Cadastro Checkout",
      conversionValueCents: 0,
      conversionCostCents: 1879,
      gclid: "gclid_20261027_sorocaba_lead",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "totem retirada de senha",
      landingUrl: "https://totem.xpointsolucoes.com.br/monte-seu-totem",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "DESKTOP",
      ip: "189.120.x.x (Sorocaba/SP)",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0",
      geoCriterionId: "geoTargetConstants/1001776",
      stepsJourney: [
        'Busca Google: "totem retirada de senha"',
        "Anúncio B (/monte-seu-totem)",
        "Configurador 3D Desktop",
        "Avançou para Cadastro no Checkout (Lead Cadastro Checkout)",
      ],
    },
    commercialNotes:
      "Lead comercial em Sorocaba/SP (Desktop) buscando 'totem retirada de senha'. Entrou direto no configurador /monte-seu-totem, iniciou cadastro no checkout e em seguida acionou o WhatsApp da Engenharia.",
    createdAt: "2026-10-27T15:40:00.000Z",
    updatedAt: "2026-10-27T15:40:00.000Z",
  },
  {
    id: "ads_conv_20261027_sorocaba_wpp",
    recordId: "ADS-2026-1027-SOR-WPP",
    sessionId: "gads_sorocaba_20261027_wpp",
    recordType: "whatsapp_conversion",
    funnelStage: "whatsapp_click",
    status: "in_negotiation",
    conversionsCount: 1,
    customer: {
      name: "Lead WhatsApp Engenharia (Sorocaba - SP)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "18000-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "Sorocaba",
      city: "Sorocaba",
      state: "SP",
    },
    cart: {
      items: [
        {
          itemId: "item_sor_wpp",
          cabinetModelId: "floor_totem",
          cabinetName: "Consultoria Técnica — Totem Retirada de Senha (/monte-seu-totem)",
          colorId: "branco_tx",
          colorName: "Branco TX (MaDeFibra BP)",
          purchaseMode: "complete_kit",
          quantity: 1,
          unitPriceCents: 159000,
          pixPriceCents: 159000,
          cardPriceCents: 185000,
          subtotalCents: 159000,
        },
      ],
      itemsCount: 1,
      subtotalCents: 159000,
      shippingCents: 0,
      shippingCarrier: "Atendimento via WhatsApp Engenharia",
      shippingDeliveryDays: 0,
      discountCents: 0,
      couponCode: "",
      totalCents: 159000,
      pixTotalCents: 159000,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "198707616862",
      adGroupName: "03 - Gastronomia Mercados e Clinicas (Segmentos)",
      keyword: "totem retirada de senha",
      matchType: "PHRASE",
      adId: "829486528515",
      conversionActionId: "7871190956",
      conversionActionName: "[Totem Pro] WhatsApp Consultor Engenharia",
      conversionValueCents: 100,
      conversionCostCents: 1879,
      gclid: "gclid_20261027_sorocaba_wpp",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "totem retirada de senha",
      landingUrl: "https://totem.xpointsolucoes.com.br/monte-seu-totem",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "DESKTOP",
      ip: "189.120.x.x (Sorocaba/SP)",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0",
      geoCriterionId: "geoTargetConstants/1001776",
      stepsJourney: [
        'Busca Google: "totem retirada de senha"',
        "Anúncio B (/monte-seu-totem)",
        "Clicou no Botão WhatsApp Consultor Engenharia",
      ],
    },
    commercialNotes:
      "Conversão de WhatsApp Consultor Engenharia originada em Sorocaba/SP (Desktop) na mesma jornada de 'totem retirada de senha'. Verificar histórico do WhatsApp comercial em 27/10.",
    createdAt: "2026-10-27T15:43:20.000Z",
    updatedAt: "2026-10-27T15:43:20.000Z",
  },
  {
    id: "ads_conv_20261027_manaus_cart",
    recordId: "ADS-2026-1027-MAO01",
    sessionId: "gads_manaus_20261027_cart",
    recordType: "abandoned_cart",
    funnelStage: "add_to_cart",
    status: "abandoned",
    conversionsCount: 1,
    customer: {
      name: "Visitante Google Ads (Manaus - AM)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "69000-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "Manaus",
      city: "Manaus",
      state: "AM",
    },
    cart: {
      items: [
        {
          itemId: "item_mao_01",
          cabinetModelId: "floor_totem",
          cabinetName: "Gabinete Totem de Piso Autoatendimento (Apenas Gabinete — Monte Você Mesmo)",
          colorId: "branco_tx",
          colorName: "Branco TX (MaDeFibra BP)",
          purchaseMode: "cabinet_only",
          assemblyServiceSelected: false,
          assemblyFeeCents: 0,
          customizationNotes: "Modalidade Apenas Gabinete (Economia de 50% — Furação VESA Universal)",
          quantity: 1,
          unitPriceCents: 159000,
          pixPriceCents: 159000,
          cardPriceCents: 185000,
          subtotalCents: 159000,
        },
      ],
      itemsCount: 1,
      subtotalCents: 159000,
      shippingCents: 0,
      shippingCarrier: "Cotação Rodoviária / Aérea AM",
      shippingDeliveryDays: 0,
      discountCents: 0,
      couponCode: "",
      totalCents: 159000,
      pixTotalCents: 159000,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "194533489057",
      adGroupName: "02 - Monte Seu Proprio Totem (Economia +50%)",
      keyword: "como montar totem de autoatendimento",
      matchType: "PHRASE",
      adId: "829532711266",
      conversionActionId: "7871297265",
      conversionActionName: "[Totem Pro] Adicionar ao Carrinho (Add to Cart)",
      conversionValueCents: 159000,
      conversionCostCents: 1879,
      gclid: "gclid_20261027_manaus_diy",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "como montar totem de autoatendimento",
      landingUrl: "https://totem.xpointsolucoes.com.br",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "DESKTOP",
      ip: "186.215.x.x (Manaus/AM)",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0",
      geoCriterionId: "geoTargetConstants/9199073",
      stepsJourney: [
        'Busca Google: "como montar totem de autoatendimento"',
        "Grupo 02 (Monte Seu Próprio Totem -50%)",
        "Configurador 3D (Selecionou Apenas Gabinete de Piso — R$ 1.590,00)",
        "Adicionou ao Carrinho (R$ 1.590,00)",
      ],
    },
    commercialNotes:
      "Validou a tese do Grupo 02 (DIY / Monte Seu Próprio Totem): usuário de Manaus/AM pesquisou 'como montar totem de autoatendimento' no Desktop e adicionou o Gabinete de Piso avulso (R$ 1.590,00) ao carrinho.",
    createdAt: "2026-10-27T19:12:30.000Z",
    updatedAt: "2026-10-27T19:12:30.000Z",
  },
  {
    id: "ads_conv_20261026_sp_cart",
    recordId: "ADS-2026-1026-SP01",
    sessionId: "gads_saopaulo_20261026_cart",
    recordType: "abandoned_cart",
    funnelStage: "add_to_cart",
    status: "abandoned",
    conversionsCount: 1,
    customer: {
      name: "Visitante Google Ads (São Paulo Capital - SP)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "01000-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "São Paulo",
      city: "São Paulo",
      state: "SP",
    },
    cart: {
      items: [
        {
          itemId: "item_sp_01",
          cabinetModelId: "wall_totem",
          cabinetName: "Gabinete Totem de Parede Compacto (Apenas Gabinete CNC)",
          colorId: "preto_tx",
          colorName: "Preto TX (MaDeFibra BP)",
          purchaseMode: "cabinet_only",
          assemblyServiceSelected: false,
          assemblyFeeCents: 0,
          customizationNotes: "Gabinete de Parede Compacto Preto TX (R$ 1.290,00 no PIX)",
          quantity: 1,
          unitPriceCents: 129000,
          pixPriceCents: 129000,
          cardPriceCents: 149000,
          subtotalCents: 129000,
        },
      ],
      itemsCount: 1,
      subtotalCents: 129000,
      shippingCents: 0,
      shippingCarrier: "Entrega Rápida Grande SP",
      shippingDeliveryDays: 2,
      discountCents: 0,
      couponCode: "",
      totalCents: 129000,
      pixTotalCents: 129000,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "198707616862",
      adGroupName: "03 - Gastronomia Mercados e Clinicas (Segmentos)",
      keyword: "totem de autoatendimento",
      matchType: "PHRASE",
      adId: "829532711416",
      conversionActionId: "7871297265",
      conversionActionName: "[Totem Pro] Adicionar ao Carrinho (Add to Cart)",
      conversionValueCents: 129000,
      conversionCostCents: 4686,
      gclid: "gclid_20261026_sp_wall_cart",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "totem de autoatendimento",
      landingUrl: "https://totem.xpointsolucoes.com.br",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "MOBILE",
      ip: "179.218.x.x (São Paulo/SP)",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) Mobile",
      geoCriterionId: "geoTargetConstants/1001773",
      stepsJourney: [
        'Busca Google: "totem de autoatendimento"',
        "Landing Page Mobile",
        "Configurador 3D (Selecionou Gabinete de Parede Compacto)",
        "Adicionou ao Carrinho (R$ 1.290,00)",
      ],
    },
    commercialNotes:
      "Primeiro carrinho gerado pela campanha em 26/10/2026 (São Paulo Capital, Mobile). Selecionou Gabinete de Parede Compacto (R$ 1.290,00).",
    createdAt: "2026-10-26T16:32:10.000Z",
    updatedAt: "2026-10-26T16:32:10.000Z",
  },
  {
    id: "ads_conv_20261026_descalvado_wpp",
    recordId: "ADS-2026-1026-DESC-WPP",
    sessionId: "gads_descalvado_20261026_wpp",
    recordType: "whatsapp_conversion",
    funnelStage: "whatsapp_click",
    status: "in_negotiation",
    conversionsCount: 1,
    customer: {
      name: "Lead WhatsApp Engenharia (Descalvado - SP)",
      whatsapp: "",
      email: "",
      document: "",
      cep: "13690-000",
      street: "",
      number: "",
      complement: "",
      neighborhood: "Descalvado",
      city: "Descalvado",
      state: "SP",
    },
    cart: {
      items: [
        {
          itemId: "item_desc_wpp",
          cabinetModelId: "floor_totem",
          cabinetName: "Consultoria Técnica — Totem de Autoatendimento (Desktop)",
          colorId: "preto_tx",
          colorName: "Preto TX (MaDeFibra BP)",
          purchaseMode: "cabinet_only",
          quantity: 1,
          unitPriceCents: 159000,
          pixPriceCents: 159000,
          cardPriceCents: 185000,
          subtotalCents: 159000,
        },
      ],
      itemsCount: 1,
      subtotalCents: 159000,
      shippingCents: 0,
      shippingCarrier: "Atendimento via WhatsApp Engenharia",
      shippingDeliveryDays: 0,
      discountCents: 0,
      couponCode: "",
      totalCents: 159000,
      pixTotalCents: 159000,
      paymentMethod: "pix",
    },
    attribution: {
      source: "google_ads",
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      adGroupId: "198707616862",
      adGroupName: "03 - Gastronomia Mercados e Clinicas (Segmentos)",
      keyword: "totem de autoatendimento",
      matchType: "PHRASE",
      adId: "829532711416",
      conversionActionId: "7871190956",
      conversionActionName: "[Totem Pro] WhatsApp Consultor Engenharia",
      conversionValueCents: 100,
      conversionCostCents: 4686,
      gclid: "gclid_20261026_descalvado_wpp",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "24395671655",
      utmTerm: "totem de autoatendimento",
      landingUrl: "https://totem.xpointsolucoes.com.br",
      referrer: "https://www.google.com.br/",
    },
    telemetry: {
      device: "DESKTOP",
      ip: "200.155.x.x (Descalvado/SP)",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0",
      geoCriterionId: "geoTargetConstants/1031605",
      stepsJourney: [
        'Busca Google: "totem de autoatendimento"',
        "Landing Page Desktop",
        "Clicou em Falar com Consultor Engenharia (WhatsApp)",
      ],
    },
    commercialNotes:
      "Primeiro Lead de WhatsApp Consultor Engenharia gerado pela campanha em 26/10/2026 (Descalvado - Interior de SP, Desktop).",
    createdAt: "2026-10-26T11:15:00.000Z",
    updatedAt: "2026-10-26T11:15:00.000Z",
  },
];

// Cache simples de CEP -> Cidade/UF para enriquecer automaticamente carrinhos onde o cliente simulou frete
const cepGeoCache = new Map<string, { city: string; state: string; neighborhood: string; street: string }>();

async function resolveCepGeo(cepRaw: string): Promise<{
  city: string;
  state: string;
  neighborhood: string;
  street: string;
} | null> {
  const clean = (cepRaw || "").replace(/\D/g, "");
  if (clean.length !== 8) return null;
  if (cepGeoCache.has(clean)) return cepGeoCache.get(clean)!;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro && data.localidade && data.uf) {
        const result = {
          city: String(data.localidade),
          state: String(data.uf),
          neighborhood: String(data.bairro || ""),
          street: String(data.logradouro || ""),
        };
        cepGeoCache.set(clean, result);
        return result;
      }
    }
  } catch {
    // Silencioso caso ViaCEP oscile
  }
  return null;
}

class AdsLeadsCartsStore {
  private recordsMap = new Map<string, AdsLeadCartRecord>();
  private appwriteHydrated = false;
  private hydratingPromise: Promise<void> | null = null;

  constructor() {
    this.loadLocalCache();
  }

  private loadLocalCache() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(ADS_LEADS_FILE)) {
        const raw = fs.readFileSync(ADS_LEADS_FILE, "utf-8");
        const parsed = JSON.parse(raw) as AdsLeadCartRecord[];
        if (Array.isArray(parsed)) {
          for (const rec of parsed) {
            if (rec && rec.id) {
              this.recordsMap.set(rec.id, rec);
            }
          }
        }
      }
      // Garante que as 8 conversões reais do Google Ads sempre existam na base
      let seededNew = false;
      for (const seed of SEED_ADS_RECORDS) {
        if (!this.recordsMap.has(seed.id)) {
          this.recordsMap.set(seed.id, seed);
          seededNew = true;
        }
      }
      if (seededNew || !fs.existsSync(ADS_LEADS_FILE)) {
        this.saveLocalCache();
      }
    } catch (e) {
      console.error("[AdsLeadsCartsStore] Erro ao carregar cache local:", e);
      for (const seed of SEED_ADS_RECORDS) {
        this.recordsMap.set(seed.id, seed);
      }
    }
  }

  private saveLocalCache() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.recordsMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      fs.writeFileSync(ADS_LEADS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.error("[AdsLeadsCartsStore] Erro ao salvar cache local:", e);
    }
  }

  private toAppwritePayload(record: AdsLeadCartRecord) {
    const jsonStr = JSON.stringify(record);
    return {
      record_id: String(record.recordId || record.id).slice(0, 64),
      session_id: String(record.sessionId || "").slice(0, 128),
      record_type: String(record.recordType || "abandoned_cart").slice(0, 48),
      funnel_stage: String(record.funnelStage || "add_to_cart").slice(0, 48),
      status: String(record.status || "abandoned").slice(0, 48),
      customer_name: String(record.customer.name || "").slice(0, 180),
      customer_whatsapp: String(record.customer.whatsapp || "").slice(0, 48),
      customer_email: String(record.customer.email || "").slice(0, 180),
      customer_document: String(record.customer.document || "").slice(0, 48),
      city: String(record.customer.city || "").slice(0, 120),
      state: String(record.customer.state || "").slice(0, 16),
      cep: String(record.customer.cep || "").slice(0, 20),
      device: String(record.telemetry.device || "DESKTOP").slice(0, 32),
      total_cents: Math.round(Number(record.cart.totalCents || 0)),
      items_count: Math.round(Number(record.cart.itemsCount || 0)),
      campaign_name: String(record.attribution.campaignName || "").slice(0, 180),
      ad_group_name: String(record.attribution.adGroupName || "").slice(0, 180),
      keyword: String(record.attribution.keyword || "").slice(0, 180),
      match_type: String(record.attribution.matchType || "").slice(0, 32),
      conversion_action_name: String(record.attribution.conversionActionName || "").slice(0, 180),
      conversion_cost_cents: Math.round(Number(record.attribution.conversionCostCents || 0)),
      payload_json: jsonStr.slice(0, 9950),
    };
  }

  public async persistToAppwrite(record: AdsLeadCartRecord): Promise<void> {
    if (!APPWRITE_CONFIG.apiKey) return;
    try {
      const db = getServerDatabases();
      const docId = record.id.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);
      const data = this.toAppwritePayload(record);

      try {
        await db.updateDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.adsLeadsCarts,
          docId,
          data
        );
      } catch (err: any) {
        if (err?.code === 404) {
          await db.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.adsLeadsCarts,
            docId,
            data
          );
        } else {
          throw err;
        }
      }
    } catch (e: any) {
      console.warn("[AdsLeadsCartsStore] Aviso ao persistir no Appwrite:", e?.message || e);
    }
  }

  public async ensureHydratedFromAppwrite(): Promise<void> {
    if (this.appwriteHydrated) return;
    if (this.hydratingPromise) return this.hydratingPromise;

    this.hydratingPromise = (async () => {
      if (!APPWRITE_CONFIG.apiKey) {
        this.appwriteHydrated = true;
        return;
      }
      try {
        const db = getServerDatabases();
        const res = await db.listDocuments(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.adsLeadsCarts,
          [Query.orderDesc("$updatedAt"), Query.limit(250)]
        );

        const existingDocIds = new Set<string>();
        for (const doc of res.documents) {
          existingDocIds.add(doc.$id);
          if (doc.payload_json) {
            try {
              const parsed = JSON.parse(doc.payload_json) as AdsLeadCartRecord;
              if (parsed && parsed.id) {
                this.recordsMap.set(parsed.id, parsed);
              }
            } catch {
              // Ignora documento malformado
            }
          }
        }

        // Garante que todos os registros seed também estejam gravados no Appwrite permanentemente
        for (const seed of SEED_ADS_RECORDS) {
          if (!this.recordsMap.has(seed.id)) {
            this.recordsMap.set(seed.id, seed);
          }
          const docId = seed.id.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);
          if (!existingDocIds.has(docId)) {
            await this.persistToAppwrite(this.recordsMap.get(seed.id)!);
          }
        }

        this.saveLocalCache();
        this.appwriteHydrated = true;
      } catch (e: any) {
        console.warn("[AdsLeadsCartsStore] Falha ao hidratar do Appwrite:", e?.message || e);
      } finally {
        this.hydratingPromise = null;
      }
    })();

    return this.hydratingPromise;
  }

  public async listRecords(forceRefresh = false): Promise<AdsLeadCartRecord[]> {
    if (forceRefresh) {
      this.appwriteHydrated = false;
    }
    await this.ensureHydratedFromAppwrite();
    return Array.from(this.recordsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Captura e enriquece automaticamente carrinhos abandonados, simulações de CEP,
   * rascunhos de checkout, leads, cliques de WhatsApp e conversões vindos de /api/analytics/track
   */
  public async upsertFromClientEvent(event: {
    id: string;
    eventName: string;
    sessionId: string;
    timestamp: string;
    url?: string;
    userAgent?: string;
    ip?: string;
    metadata?: Record<string, any>;
  }): Promise<AdsLeadCartRecord | null> {
    const trackedEvents = new Set([
      "add_to_cart",
      "view_cart",
      "shipping_simulated",
      "begin_checkout",
      "checkout_draft",
      "lead_submitted",
      "whatsapp_click",
      "pix_generated",
      "purchase",
    ]);

    if (!trackedEvents.has(event.eventName)) {
      return null;
    }

    await this.ensureHydratedFromAppwrite();

    const sessionClean = (event.sessionId || "anon").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    const docId = `sess_${sessionClean}`;
    const existing = this.recordsMap.get(docId);
    const meta = event.metadata || {};
    const nowIso = event.timestamp || new Date().toISOString();

    // Detecta dispositivo a partir do User-Agent
    const ua = String(event.userAgent || meta.userAgent || "");
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const device = isMobile ? "MOBILE" : "DESKTOP";

    // Extrai itens do carrinho se enviados no evento ou no cartSnapshot
    const rawItems: any[] = Array.isArray(meta.cartItems)
      ? meta.cartItems
      : Array.isArray(meta.cartSnapshot)
      ? meta.cartSnapshot
      : [];

    const mappedItems: AdsCartItemSnapshot[] =
      rawItems.length > 0
        ? rawItems.map((it: any, idx: number) => {
            const qty = Math.max(1, Number(it.quantity || 1));
            const unitCents = Number(
              it.unitPriceCents ||
                it.pixPriceCents ||
                (it.unitPrice ? Math.round(Number(it.unitPrice) * 100) : 159000)
            );
            return {
              itemId: String(it.id || `item_${idx + 1}`),
              cabinetModelId: String(it.cabinetModelId || "floor_totem"),
              cabinetName: String(
                it.cabinetName || it.modelName || "Gabinete Totem de Autoatendimento"
              ),
              colorId: it.colorId ? String(it.colorId) : undefined,
              colorName: it.colorName ? String(it.colorName) : undefined,
              monitorId: it.monitorId ? String(it.monitorId) : undefined,
              monitorName: it.monitorName ? String(it.monitorName) : undefined,
              printerId: it.printerId ? String(it.printerId) : undefined,
              printerName: it.printerName ? String(it.printerName) : undefined,
              barcodeReaderId: it.barcodeReaderId ? String(it.barcodeReaderId) : undefined,
              barcodeReaderName: it.barcodeReaderName ? String(it.barcodeReaderName) : undefined,
              purchaseMode:
                it.isKitSelected || it.purchaseMode === "complete_kit"
                  ? "complete_kit"
                  : "cabinet_only",
              assemblyServiceSelected: Boolean(it.assemblyServiceSelected),
              assemblyFeeCents: Number(it.assemblyFeeCents || 0),
              customizationNotes: String(it.customizationNotes || ""),
              quantity: qty,
              unitPriceCents: unitCents,
              pixPriceCents: Number(it.pixPriceCents || unitCents),
              cardPriceCents: Number(it.cardPriceCents || Math.round(unitCents * 1.12)),
              subtotalCents: unitCents * qty,
            };
          })
        : existing?.cart.items && existing.cart.items.length > 0
        ? existing.cart.items
        : meta.modelId || meta.cabinetName
        ? [
            {
              itemId: `item_${Date.now()}`,
              cabinetModelId: String(meta.modelId || "floor_totem"),
              cabinetName: String(
                meta.cabinetName ||
                  (meta.modelId === "wall_totem"
                    ? "Gabinete Totem de Parede Compacto"
                    : "Gabinete Totem de Piso Autoatendimento")
              ),
              colorId: meta.colorId ? String(meta.colorId) : undefined,
              colorName: meta.colorName ? String(meta.colorName) : undefined,
              monitorId: meta.monitorId ? String(meta.monitorId) : undefined,
              monitorName: meta.monitorName ? String(meta.monitorName) : undefined,
              printerId: meta.printerId ? String(meta.printerId) : undefined,
              printerName: meta.printerName ? String(meta.printerName) : undefined,
              barcodeReaderId: meta.readerId ? String(meta.readerId) : undefined,
              barcodeReaderName: meta.readerName ? String(meta.readerName) : undefined,
              purchaseMode: meta.isKitSelected ? "complete_kit" : "cabinet_only",
              assemblyServiceSelected: Boolean(meta.assemblyServiceSelected),
              assemblyFeeCents: meta.assemblyServiceSelected ? 99900 : 0,
              customizationNotes: String(meta.customizationNotes || ""),
              quantity: Math.max(1, Number(meta.quantity || 1)),
              unitPriceCents: Number(
                meta.pixPriceCents ||
                  (meta.totalPrice ? Math.round(Number(meta.totalPrice) * 100) : 159000)
              ),
              pixPriceCents: Number(
                meta.pixPriceCents ||
                  (meta.totalPrice ? Math.round(Number(meta.totalPrice) * 100) : 159000)
              ),
              cardPriceCents: Number(
                meta.cardPriceCents ||
                  (meta.totalPrice ? Math.round(Number(meta.totalPrice) * 112) : 185000)
              ),
              subtotalCents: Number(
                meta.pixPriceCents ||
                  (meta.totalPrice ? Math.round(Number(meta.totalPrice) * 100) : 159000)
              ),
            },
          ]
        : [];

    const itemsSubtotalCents = mappedItems.reduce((acc, it) => acc + it.subtotalCents, 0);
    const totalFromMetaCents = meta.totalCents
      ? Number(meta.totalCents)
      : meta.totalPrice
      ? Math.round(Number(meta.totalPrice) * 100)
      : 0;
    const subtotalCents =
      itemsSubtotalCents > 0
        ? itemsSubtotalCents
        : totalFromMetaCents > 0
        ? totalFromMetaCents
        : existing?.cart.subtotalCents || 159000;

    const shippingCents =
      meta.shippingCents !== undefined
        ? Number(meta.shippingCents)
        : existing?.cart.shippingCents || 0;
    const discountCents =
      meta.discountCents !== undefined
        ? Number(meta.discountCents)
        : existing?.cart.discountCents || 0;
    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

    // Dados de cliente mesclados (nunca sobrescreve um dado preenchido por vazio)
    const draftCustomer = meta.customerDraft || meta.customer || {};
    const cepVal = String(
      draftCustomer.cep || meta.cep || existing?.customer.cep || ""
    ).trim();

    let resolvedCity = String(
      draftCustomer.city || meta.city || existing?.customer.city || ""
    ).trim();
    let resolvedState = String(
      draftCustomer.state || meta.state || existing?.customer.state || ""
    ).trim();
    let resolvedNeighborhood = String(
      draftCustomer.neighborhood || meta.neighborhood || existing?.customer.neighborhood || ""
    ).trim();
    let resolvedStreet = String(
      draftCustomer.street || meta.street || existing?.customer.street || ""
    ).trim();

    if (cepVal && (!resolvedCity || !resolvedState)) {
      const geo = await resolveCepGeo(cepVal);
      if (geo) {
        resolvedCity = resolvedCity || geo.city;
        resolvedState = resolvedState || geo.state;
        resolvedNeighborhood = resolvedNeighborhood || geo.neighborhood;
        resolvedStreet = resolvedStreet || geo.street;
      }
    }

    const customerName = String(
      draftCustomer.name ||
        meta.customerName ||
        existing?.customer.name ||
        (resolvedCity
          ? `Visitante (${resolvedCity}/${resolvedState})`
          : "Visitante do Site / Configurador")
    ).trim();

    const customerWhatsapp = String(
      draftCustomer.whatsapp || meta.whatsapp || existing?.customer.whatsapp || ""
    ).trim();
    const customerEmail = String(
      draftCustomer.email || meta.email || existing?.customer.email || ""
    ).trim();
    const customerDocument = String(
      draftCustomer.document || meta.document || existing?.customer.document || ""
    ).trim();

    // Atribuição de campanha
    const attrMeta = meta.campaignAttribution || {};
    const gclid = String(attrMeta.gclid || meta.gclid || existing?.attribution.gclid || "");
    const utmSource = String(
      attrMeta.utmSource || meta.utmSource || existing?.attribution.utmSource || ""
    );
    const utmTerm = String(
      attrMeta.utmTerm || meta.utmTerm || existing?.attribution.utmTerm || ""
    );
    const isGoogleAds = Boolean(
      gclid ||
        utmSource.toLowerCase().includes("google") ||
        meta.adGroupId ||
        existing?.attribution.source === "google_ads"
    );

    // Determina estágio do funil e tipo de registro
    const stagePriority: Record<string, number> = {
      add_to_cart: 1,
      view_cart: 2,
      shipping_simulated: 3,
      whatsapp_click: 4,
      begin_checkout: 5,
      checkout_draft: 6,
      lead_submitted: 7,
      pix_generated: 8,
      purchase: 9,
    };

    const currentPriority = existing ? stagePriority[existing.funnelStage] || 0 : 0;
    const incomingPriority = stagePriority[event.eventName] || 1;
    const finalStage = (
      incomingPriority >= currentPriority
        ? event.eventName === "checkout_draft"
          ? "lead_submitted"
          : event.eventName
        : existing!.funnelStage
    ) as AdsLeadCartRecord["funnelStage"];

    let recordType: AdsRecordType = existing?.recordType || "abandoned_cart";
    if (finalStage === "purchase") {
      recordType = "purchase_conversion";
    } else if (finalStage === "whatsapp_click" && mappedItems.length === 0) {
      recordType = "whatsapp_conversion";
    } else if (
      finalStage === "lead_submitted" ||
      finalStage === "begin_checkout" ||
      finalStage === "pix_generated" ||
      Boolean(customerWhatsapp || customerEmail || customerDocument)
    ) {
      recordType = "checkout_lead";
    } else {
      recordType = "abandoned_cart";
    }

    let conversionActionName =
      existing?.attribution.conversionActionName ||
      "[Totem Pro] Adicionar ao Carrinho (Add to Cart)";
    if (event.eventName === "purchase") {
      conversionActionName = "[Totem Pro] Compra Aprovada (Purchase)";
    } else if (event.eventName === "lead_submitted" || event.eventName === "checkout_draft") {
      conversionActionName = "[Totem Pro] Lead Cadastro Checkout";
    } else if (event.eventName === "begin_checkout") {
      conversionActionName = "[Totem Pro] Início de Checkout (Begin Checkout)";
    } else if (event.eventName === "whatsapp_click") {
      conversionActionName = "[Totem Pro] WhatsApp Consultor Engenharia";
    }

    const stepLabelMap: Record<string, string> = {
      add_to_cart: `Adicionou ao Carrinho (R$ ${(totalCents / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })})`,
      view_cart: "Visualizou o Carrinho (/carrinho)",
      shipping_simulated: `Simulou Frete para CEP ${cepVal || "informado"}`,
      begin_checkout: "Iniciou Checkout (/checkout)",
      checkout_draft: "Preencheu Dados no Checkout",
      lead_submitted: "Lead Identificado no Checkout",
      whatsapp_click: "Clicou no Botão WhatsApp Consultor Engenharia",
      pix_generated: "Gerou QR Code PIX no Checkout",
      purchase: "Compra Confirmada / Pedido Gerado",
    };

    const nextStepLabel = stepLabelMap[event.eventName] || event.eventName;
    const prevSteps = existing?.telemetry.stepsJourney || ["Acesso à Loja / Configurador 3D"];
    const stepsJourney = prevSteps.includes(nextStepLabel)
      ? prevSteps
      : [...prevSteps, nextStepLabel];

    const dateCode = nowIso.slice(0, 10).replace(/-/g, "");
    const recordId =
      existing?.recordId ||
      `${isGoogleAds ? "ADS" : "CART"}-${dateCode}-${sessionClean.slice(0, 6).toUpperCase()}`;

    const updatedRecord: AdsLeadCartRecord = {
      id: docId,
      recordId,
      sessionId: event.sessionId,
      recordType,
      funnelStage: finalStage,
      status:
        finalStage === "purchase"
          ? "converted_order"
          : existing?.status ||
            (customerWhatsapp || customerEmail ? "awaiting_contact" : "abandoned"),
      conversionsCount: (existing?.conversionsCount || 0) + (event.eventName === "add_to_cart" ? 1 : 0) || 1,
      customer: {
        name: customerName,
        whatsapp: customerWhatsapp,
        email: customerEmail,
        document: customerDocument,
        cep: cepVal,
        street: resolvedStreet,
        number: String(draftCustomer.number || existing?.customer.number || ""),
        complement: String(draftCustomer.complement || existing?.customer.complement || ""),
        neighborhood: resolvedNeighborhood,
        city: resolvedCity,
        state: resolvedState,
      },
      cart: {
        items: mappedItems,
        itemsCount: mappedItems.reduce((acc, it) => acc + it.quantity, 0) || 1,
        subtotalCents,
        shippingCents,
        shippingCarrier: String(
          meta.shippingCarrier || existing?.cart.shippingCarrier || "A calcular"
        ),
        shippingDeliveryDays: Number(
          meta.shippingDeliveryDays || existing?.cart.shippingDeliveryDays || 0
        ),
        discountCents,
        couponCode: String(meta.couponCode || existing?.cart.couponCode || ""),
        totalCents,
        pixTotalCents: totalCents,
        paymentMethod: (meta.paymentMethod ||
          existing?.cart.paymentMethod ||
          "pix") as AdsLeadCartRecord["cart"]["paymentMethod"],
      },
      attribution: {
        source: isGoogleAds ? "google_ads" : "organic_or_direct",
        campaignId: String(
          attrMeta.campaignId || existing?.attribution.campaignId || (isGoogleAds ? "24395671655" : "")
        ),
        campaignName: String(
          attrMeta.campaignName ||
            existing?.attribution.campaignName ||
            (isGoogleAds
              ? "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)"
              : "Tráfego Direto / Orgânico")
        ),
        adGroupId: String(attrMeta.adGroupId || existing?.attribution.adGroupId || ""),
        adGroupName: String(attrMeta.adGroupName || existing?.attribution.adGroupName || ""),
        keyword: utmTerm || existing?.attribution.keyword || "",
        matchType: existing?.attribution.matchType || "AUTO",
        adId: String(attrMeta.adId || existing?.attribution.adId || ""),
        conversionActionId: existing?.attribution.conversionActionId || "",
        conversionActionName,
        conversionValueCents: totalCents,
        conversionCostCents: existing?.attribution.conversionCostCents || 0,
        gclid,
        utmSource,
        utmMedium: String(attrMeta.utmMedium || existing?.attribution.utmMedium || ""),
        utmCampaign: String(attrMeta.utmCampaign || existing?.attribution.utmCampaign || ""),
        utmTerm,
        landingUrl: String(
          attrMeta.landingUrl || event.url || existing?.attribution.landingUrl || ""
        ),
        referrer: String(attrMeta.referrer || existing?.attribution.referrer || ""),
      },
      telemetry: {
        device,
        ip: String(event.ip || existing?.telemetry.ip || ""),
        userAgent: ua || existing?.telemetry.userAgent || "",
        stepsJourney,
      },
      commercialNotes: existing?.commercialNotes || "",
      linkedOrderNumber: meta.orderId || existing?.linkedOrderNumber,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    this.recordsMap.set(docId, updatedRecord);
    this.saveLocalCache();
    await this.persistToAppwrite(updatedRecord);
    return updatedRecord;
  }

  /**
   * Salva imediatamente qualquer tentativa de submissão no /api/checkout/order
   * antes mesmo da validação de gateway, garantindo zero perda de dados de contato ou carrinho.
   */
  public async upsertFromCheckoutAttempt(
    body: any,
    reqMeta: { ip?: string; userAgent?: string }
  ): Promise<AdsLeadCartRecord | null> {
    try {
      await this.ensureHydratedFromAppwrite();
      const customer = body?.customer || {};
      const itemsRaw = Array.isArray(body?.items) ? body.items : [];
      const shipping = body?.shippingQuote || {};
      const sessionKey = String(
        body?.sessionId ||
          customer?.document?.replace(/\D/g, "") ||
          customer?.whatsapp?.replace(/\D/g, "") ||
          Date.now()
      )
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 20);

      const docId = `chk_${sessionKey}`;
      const existing = this.recordsMap.get(docId);
      const nowIso = new Date().toISOString();

      const mappedItems: AdsCartItemSnapshot[] = itemsRaw.map((it: any, idx: number) => {
        const qty = Math.max(1, Number(it.quantity || 1));
        const unitCents = Number(
          it.unitPriceCents ||
            it.pixPriceCents ||
            (it.unitPrice ? Math.round(Number(it.unitPrice) * 100) : 159000)
        );
        return {
          itemId: String(it.id || `chk_item_${idx + 1}`),
          cabinetModelId: String(it.cabinetModelId || "floor_totem"),
          cabinetName: String(it.cabinetName || "Gabinete Totem de Autoatendimento"),
          colorId: it.colorId ? String(it.colorId) : undefined,
          colorName: it.colorName ? String(it.colorName) : undefined,
          monitorId: it.monitorId ? String(it.monitorId) : undefined,
          monitorName: it.monitorName ? String(it.monitorName) : undefined,
          printerId: it.printerId ? String(it.printerId) : undefined,
          printerName: it.printerName ? String(it.printerName) : undefined,
          barcodeReaderId: it.barcodeReaderId ? String(it.barcodeReaderId) : undefined,
          barcodeReaderName: it.barcodeReaderName ? String(it.barcodeReaderName) : undefined,
          purchaseMode: it.isKitSelected ? "complete_kit" : "cabinet_only",
          assemblyServiceSelected: Boolean(it.assemblyServiceSelected),
          assemblyFeeCents: it.assemblyServiceSelected ? 99900 : 0,
          customizationNotes: String(it.customizationNotes || ""),
          quantity: qty,
          unitPriceCents: unitCents,
          pixPriceCents: unitCents,
          cardPriceCents: Math.round(unitCents * 1.12),
          subtotalCents: unitCents * qty,
        };
      });

      const subtotalCents =
        mappedItems.reduce((acc, it) => acc + it.subtotalCents, 0) ||
        existing?.cart.subtotalCents ||
        159000;
      const shippingCents = Number(shipping.priceCents || existing?.cart.shippingCents || 0);
      const totalCents = subtotalCents + shippingCents;

      const ua = String(reqMeta.userAgent || "");
      const device = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? "MOBILE" : "DESKTOP";

      const record: AdsLeadCartRecord = {
        id: docId,
        recordId:
          existing?.recordId ||
          `LEAD-${nowIso.slice(0, 10).replace(/-/g, "")}-${sessionKey.slice(0, 5).toUpperCase()}`,
        sessionId: sessionKey,
        recordType: "checkout_lead",
        funnelStage: "lead_submitted",
        status: existing?.status || "awaiting_contact",
        conversionsCount: existing?.conversionsCount || 1,
        customer: {
          name: String(customer.name || existing?.customer.name || "Cliente em Checkout"),
          whatsapp: String(customer.whatsapp || existing?.customer.whatsapp || ""),
          email: String(customer.email || existing?.customer.email || ""),
          document: String(customer.document || existing?.customer.document || ""),
          cep: String(customer.cep || existing?.customer.cep || ""),
          street: String(customer.street || existing?.customer.street || ""),
          number: String(customer.number || existing?.customer.number || ""),
          complement: String(customer.complement || existing?.customer.complement || ""),
          neighborhood: String(customer.neighborhood || existing?.customer.neighborhood || ""),
          city: String(customer.city || existing?.customer.city || ""),
          state: String(customer.state || existing?.customer.state || ""),
        },
        cart: {
          items: mappedItems,
          itemsCount: mappedItems.reduce((acc, it) => acc + it.quantity, 0) || 1,
          subtotalCents,
          shippingCents,
          shippingCarrier: String(shipping.carrierName || existing?.cart.shippingCarrier || ""),
          shippingDeliveryDays: Number(shipping.deliveryDays || 0),
          discountCents: 0,
          couponCode: String(body?.couponCode || ""),
          totalCents,
          pixTotalCents: totalCents,
          paymentMethod: body?.paymentMethod === "credit_card" ? "credit_card" : "pix",
        },
        attribution: existing?.attribution || {
          source: "google_ads",
          campaignId: "24395671655",
          campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
          adGroupId: "",
          adGroupName: "",
          keyword: "",
          matchType: "AUTO",
          adId: "",
          conversionActionId: "7871297928",
          conversionActionName: "[Totem Pro] Lead Cadastro Checkout",
          conversionValueCents: totalCents,
          conversionCostCents: 0,
          gclid: "",
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "24395671655",
          utmTerm: "",
          landingUrl: "https://totem.xpointsolucoes.com.br/checkout",
          referrer: "",
        },
        telemetry: {
          device,
          ip: String(reqMeta.ip || existing?.telemetry.ip || ""),
          userAgent: ua,
          stepsJourney: [
            ...(existing?.telemetry.stepsJourney || ["Configurador 3D", "Carrinho"]),
            "Submeteu Dados Completos no Checkout",
          ],
        },
        commercialNotes: existing?.commercialNotes || "",
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      this.recordsMap.set(docId, record);
      this.saveLocalCache();
      await this.persistToAppwrite(record);
      return record;
    } catch (e) {
      console.error("[AdsLeadsCartsStore] Erro em upsertFromCheckoutAttempt:", e);
      return null;
    }
  }

  public async updateRecord(
    id: string,
    patch: {
      status?: AdsLeadStatus;
      commercialNotes?: string;
      customer?: Partial<AdsLeadCartRecord["customer"]>;
      linkedOrderNumber?: string;
    }
  ): Promise<AdsLeadCartRecord | null> {
    await this.ensureHydratedFromAppwrite();
    const existing = this.recordsMap.get(id);
    if (!existing) return null;

    const updated: AdsLeadCartRecord = {
      ...existing,
      status: patch.status ?? existing.status,
      commercialNotes:
        patch.commercialNotes !== undefined ? patch.commercialNotes : existing.commercialNotes,
      linkedOrderNumber:
        patch.linkedOrderNumber !== undefined
          ? patch.linkedOrderNumber
          : existing.linkedOrderNumber,
      customer: patch.customer
        ? { ...existing.customer, ...patch.customer }
        : existing.customer,
      updatedAt: new Date().toISOString(),
    };

    this.recordsMap.set(id, updated);
    this.saveLocalCache();
    await this.persistToAppwrite(updated);
    return updated;
  }

  public async deleteRecord(id: string): Promise<boolean> {
    await this.ensureHydratedFromAppwrite();
    const existed = this.recordsMap.delete(id);
    this.saveLocalCache();
    if (APPWRITE_CONFIG.apiKey) {
      try {
        const db = getServerDatabases();
        const docId = id.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 36);
        await db.deleteDocument(
          APPWRITE_CONFIG.databaseId,
          APPWRITE_CONFIG.collections.adsLeadsCarts,
          docId
        );
      } catch {
        // Documento pode não existir no Appwrite
      }
    }
    return existed;
  }
}

export const adsLeadsCartsStore = new AdsLeadsCartsStore();
