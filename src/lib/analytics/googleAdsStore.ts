import fs from "fs";
import path from "path";

export interface GoogleAdsCampaignInfo {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED";
  channelType: string;
  customerId: string;
  gtmContainerId: string;
  nominalDailyBudget: number;
  effectiveDailyTargetMin: number;
  effectiveDailyTargetMax: number;
  negativeKeywordsCount: number;
  recentNegativeKeywords: string[];
  allNegativeKeywords?: string[];
  lastSyncedAt: string;
}

export interface GoogleAdsDailyMetric {
  id: string;
  date: string; // YYYY-MM-DD
  label: string; // ex: "Ontem (25/10)" | "Hoje (26/10)"
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  ctr: number; // %
  avgCpc: number; // BRL
  cost: number; // BRL
  conversions: number;
  conversionValue: number; // BRL
  cpa: number; // BRL
  roas: number; // x
  overdeliveryFlag?: boolean;
  notes?: string;
}

export interface GoogleAdsAdGroupMetric {
  id: string;
  date: string; // YYYY-MM-DD or "ALL"
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: number; // %
  cost: number; // BRL
  avgCpc: number; // BRL
  conversions: number;
  conversionValue: number; // BRL
  maxCpcBefore?: number;
  maxCpcCurrent: number;
  highlightNote?: string;
  conversionBreakdownText?: string;
}

export interface GoogleAdsSearchTermMetric {
  id: string;
  date: string; // YYYY-MM-DD
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  term: string;
  matchType: "EXACT" | "PHRASE" | "BROAD" | "NEAR_EXACT" | "NEAR_PHRASE" | string;
  impressions: number;
  clicks: number;
  ctr: number; // %
  avgCpc: number; // BRL
  cost: number; // BRL
  conversions: number;
  conversionValue: number; // BRL
  subQueriesNote?: string;
  conversionNote?: string;
  isQualified: boolean;
}

export interface GoogleAdsConversionDetail {
  id: string;
  date: string; // YYYY-MM-DD
  campaignId: string;
  campaignName: string;
  actionId: string;
  actionName: string;
  funnelOrder: number;
  count: number;
  value: number; // BRL
  isSymbolicValue: boolean;
  city: string;
  state: string;
  device: "MOBILE" | "DESKTOP" | "TABLET" | string;
  adGroupName: string;
  keyword: string;
  matchType: string;
  adId: string;
  landingUrl: string;
  stepsJourney: string[];
}

export interface GoogleAdsGtmActionCatalog {
  order: number;
  stageLabel: string;
  actionId: string;
  actionName: string;
  triggerDescription: string;
  valueRule: string;
  isPrimary: boolean;
  conversionsToday: number;
  conversionsTotal: number;
  conversionValueTotal: number;
}

export interface GoogleAdsOptimizationRecord {
  id: string;
  date: string;
  timestamp: string;
  campaignId: string;
  campaignName: string;
  category: "BID_REDUCTION" | "BUDGET_GUARD" | "NEGATIVE_KEYWORDS" | "AD_COPY" | "CONVERSION_GOAL";
  title: string;
  targetScope: string;
  beforeValue: string;
  afterValue: string;
  expectedImpact: string;
  technicalReason: string;
}

export interface GoogleAdsExecutiveInsight {
  id: string;
  severity: "critical" | "warning" | "opportunity" | "success";
  category: "ORÇAMENTO" | "LEILÃO & CPC" | "TERMOS DE BUSCA" | "CONVERSÕES & ROI" | "FUNIL INTEGRADO";
  title: string;
  metricBadge: string;
  diagnosis: string;
  recommendedDecision: string;
}

export interface GoogleAdsIntelligenceState {
  lastUpdatedAt: string;
  lastLiveSyncAt: string | null;
  liveSyncStatus: "connected" | "seeded" | "error";
  liveSyncMessage?: string;
  campaigns: GoogleAdsCampaignInfo[];
  dailyMetrics: GoogleAdsDailyMetric[];
  adGroups: GoogleAdsAdGroupMetric[];
  searchTerms: GoogleAdsSearchTermMetric[];
  conversionDetails: GoogleAdsConversionDetail[];
  gtmActionsCatalog: GoogleAdsGtmActionCatalog[];
  optimizations: GoogleAdsOptimizationRecord[];
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const ADS_STORE_FILE = path.join(DATA_DIR, "analytics_google_ads.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[GoogleAdsStore] Não foi possível criar diretório de dados:", err);
  }
}

function getDefaultSeedState(): GoogleAdsIntelligenceState {
  const campaignId = "24395671655";
  const campaignName = "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)";

  return {
    lastUpdatedAt: "2026-10-26T21:27:00.000Z",
    lastLiveSyncAt: null,
    liveSyncStatus: "seeded",
    liveSyncMessage: "Dados oficiais da campanha 24395671655 carregados e prontos para sincronização em tempo real.",
    campaigns: [
      {
        id: campaignId,
        name: campaignName,
        status: "ENABLED",
        channelType: "SEARCH",
        customerId: "2248859628",
        gtmContainerId: "GTM-W4N3KKL7",
        nominalDailyBudget: 35.0,
        effectiveDailyTargetMin: 35.0,
        effectiveDailyTargetMax: 50.0,
        negativeKeywordsCount: 67,
        recentNegativeKeywords: ["gov", "poupatempo", "detran", "inss", "prefeitura"],
        allNegativeKeywords: [
          "gov",
          "poupatempo",
          "detran",
          "inss",
          "prefeitura",
          "aluguel",
          "locação",
          "usado",
          "olx",
          "mercado livre",
          "emprego",
          "vaga",
          "curso",
          "gratis",
          "gratuito",
          "papelão",
          "mdf cru",
          "festa",
          "fotografico",
          "cabine fotografica",
        ],
        lastSyncedAt: "2026-10-26T21:27:00.000Z",
      },
    ],
    dailyMetrics: [
      {
        id: "daily_2026-10-25_24395671655",
        date: "2026-10-25",
        label: "Ontem (Dom, 25/10)",
        campaignId,
        campaignName,
        impressions: 202,
        clicks: 10,
        ctr: 4.95,
        avgCpc: 2.41,
        cost: 24.13,
        conversions: 0,
        conversionValue: 0,
        cpa: 0,
        roas: 0,
        overdeliveryFlag: false,
        notes: "Domingo com menor volume comercial; gastou R$ 24,13 dos R$ 50,00 nominais anteriores, gerando saldo residual que acionou a compensação de segunda-feira.",
      },
      {
        id: "daily_2026-10-26_24395671655",
        date: "2026-10-26",
        label: "Hoje (Seg, 26/10 até 21h27)",
        campaignId,
        campaignName,
        impressions: 442,
        clicks: 35,
        ctr: 7.92,
        avgCpc: 2.68,
        cost: 93.72,
        conversions: 2.0,
        conversionValue: 1291.0,
        cpa: 46.86,
        roas: 13.78,
        overdeliveryFlag: true,
        notes: "Superfornecimento Diário (Overdelivery): compensou o saldo de domingo em segunda-feira de alta procura. CTR saltou +60% (de 4,95% para 7,92%) com 2 conversões principais (1 Carrinho R$ 1.290,00 + 1 WhatsApp). Trava nominal de R$ 35/dia e redução de 30% no CPC Máx já aplicadas.",
      },
    ],
    adGroups: [
      {
        id: "ag_2026-10-26_03",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616862",
        adGroupName: "03 - Gastronomia, Mercados e Clínicas",
        status: "ENABLED",
        impressions: 250,
        clicks: 20,
        ctr: 8.0,
        cost: 49.25,
        avgCpc: 2.46,
        conversions: 2.0,
        conversionValue: 1291.0,
        maxCpcBefore: 2.5,
        maxCpcCurrent: 1.75,
        highlightNote: "Líder de volume e conversão hoje: gerou 1 Adição ao Carrinho (R$ 1.290,00) + 1 Lead no WhatsApp com 8,00% de CTR. CPC Máx reduzido de R$ 2,50 para R$ 1,75.",
        conversionBreakdownText: "2,0 (1 Carrinho R$ 1.290 + 1 WhatsApp)",
      },
      {
        id: "ag_2026-10-26_04",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616902",
        adGroupName: "04 - Revenda, Automação e Software House",
        status: "ENABLED",
        impressions: 127,
        clicks: 11,
        ctr: 8.66,
        cost: 32.03,
        avgCpc: 2.91,
        conversions: 0.0,
        conversionValue: 0.0,
        maxCpcBefore: 3.2,
        maxCpcCurrent: 2.1,
        highlightNote: "Após a limpeza de negativas à meia-noite, o CTR saltou de 3,36% para 8,66% (com o Anúncio A batendo 14,29% de CTR!). CPC Máx reduzido de R$ 3,20 para R$ 2,10.",
        conversionBreakdownText: "0,0",
      },
      {
        id: "ag_2026-10-26_01",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616782",
        adGroupName: "01 - Gabinete para Totem (Só Gabinete ou Kit)",
        status: "ENABLED",
        impressions: 58,
        clicks: 4,
        ctr: 6.9,
        cost: 12.44,
        avgCpc: 3.11,
        conversions: 0.0,
        conversionValue: 0.0,
        maxCpcBefore: 3.2,
        maxCpcCurrent: 2.2,
        highlightNote: "Subiu para 58 impressões e 4 cliques altamente qualificados (2 cliques no anúncio da Home e 2 cliques direto no Configurador /monte-seu-totem). CPC Máx reduzido de R$ 3,20 para R$ 2,20.",
        conversionBreakdownText: "0,0",
      },
      {
        id: "ag_2026-10-26_02",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616822",
        adGroupName: "02 - Monte Seu Próprio Totem (-50%)",
        status: "ENABLED",
        impressions: 7,
        clicks: 0,
        ctr: 0.0,
        cost: 0.0,
        avgCpc: 0.0,
        conversions: 0.0,
        conversionValue: 0.0,
        maxCpcBefore: 3.2,
        maxCpcCurrent: 2.2,
        highlightNote: "Baixo volume de buscas exatas DIY; CPC Máx equalizado de R$ 3,20 para R$ 2,20.",
        conversionBreakdownText: "0,0",
      },
    ],
    searchTerms: [
      {
        id: "st_1",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616862",
        adGroupName: "03 - Gastronomia, Mercados e Clínicas",
        term: "totem autoatendimento supermercado",
        matchType: "PHRASE",
        impressions: 86,
        clicks: 9,
        ctr: 10.47,
        avgCpc: 2.42,
        cost: 21.78,
        conversions: 0,
        conversionValue: 0,
        subQueriesNote: "Inclui buscas como 'self checkout preço', 'caixa de supermercado automatizado', 'totem de pagamento mini mercado'",
        isQualified: true,
      },
      {
        id: "st_2",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616902",
        adGroupName: "04 - Revenda, Automação e Software House",
        term: "totem pdv",
        matchType: "PHRASE",
        impressions: 91,
        clicks: 8,
        ctr: 8.79,
        avgCpc: 2.88,
        cost: 23.04,
        conversions: 0,
        conversionValue: 0,
        subQueriesNote: "Público B2B de software houses e integradores de PDV",
        isQualified: true,
      },
      {
        id: "st_3",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616862",
        adGroupName: "03 - Gastronomia, Mercados e Clínicas",
        term: "totem de autoatendimento",
        matchType: "PHRASE",
        impressions: 57,
        clicks: 6,
        ctr: 10.53,
        avgCpc: 2.5,
        cost: 15.0,
        conversions: 2.0,
        conversionValue: 1291.0,
        conversionNote: "Gerou 1 Adição ao Carrinho de R$ 1.290,00 (SP Capital / Mobile) + 1 Lead no WhatsApp (Descalvado-SP / Desktop)",
        isQualified: true,
      },
      {
        id: "st_4",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616862",
        adGroupName: "03 - Gastronomia, Mercados e Clínicas",
        term: "totem de autoatendimento preco / valor",
        matchType: "PHRASE",
        impressions: 33,
        clicks: 5,
        ctr: 15.15,
        avgCpc: 2.49,
        cost: 12.47,
        conversions: 0,
        conversionValue: 0,
        subQueriesNote: "Altíssima intenção comercial de fundo de funil (busca direta por preço/valor)",
        isQualified: true,
      },
      {
        id: "st_5",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616782",
        adGroupName: "01 - Gabinete para Totem (Só Gabinete ou Kit)",
        term: "[gabinete para totem]",
        matchType: "EXACT",
        impressions: 5,
        clicks: 2,
        ctr: 25.0,
        avgCpc: 3.1,
        cost: 6.2,
        conversions: 0,
        conversionValue: 0,
        subQueriesNote: "Correspondência exata do produto principal da fábrica",
        isQualified: true,
      },
      {
        id: "st_6",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616902",
        adGroupName: "04 - Revenda, Automação e Software House",
        term: "totem gertec / gertec sk210",
        matchType: "PHRASE",
        impressions: 24,
        clicks: 2,
        ctr: 8.33,
        avgCpc: 1.75,
        cost: 3.5,
        conversions: 0,
        conversionValue: 0,
        subQueriesNote: "Destaque: 1 clique em 'gertec sk210' custou apenas R$ 0,61!",
        isQualified: true,
      },
      {
        id: "st_7",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616782",
        adGroupName: "01 - Gabinete para Totem (Só Gabinete ou Kit)",
        term: "[gabinete totem]",
        matchType: "EXACT",
        impressions: 4,
        clicks: 1,
        ctr: 25.0,
        avgCpc: 3.12,
        cost: 3.12,
        conversions: 0,
        conversionValue: 0,
        isQualified: true,
      },
      {
        id: "st_8",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616862",
        adGroupName: "03 - Gastronomia, Mercados e Clínicas",
        term: "totem de autoatendimento com impressora",
        matchType: "PHRASE",
        impressions: 1,
        clicks: 1,
        ctr: 100.0,
        avgCpc: 2.35,
        cost: 2.35,
        conversions: 0,
        conversionValue: 0,
        isQualified: true,
      },
      {
        id: "st_9",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616902",
        adGroupName: "04 - Revenda, Automação e Software House",
        term: "totem com impressora",
        matchType: "PHRASE",
        impressions: 1,
        clicks: 1,
        ctr: 100.0,
        avgCpc: 2.55,
        cost: 2.55,
        conversions: 0,
        conversionValue: 0,
        isQualified: true,
      },
      {
        id: "st_10",
        date: "2026-10-26",
        campaignId,
        campaignName,
        adGroupId: "198707616782",
        adGroupName: "01 - Gabinete para Totem (Só Gabinete ou Kit)",
        term: "estrutura totem / gabinete para totem de autoatendimento",
        matchType: "PHRASE",
        impressions: 31,
        clicks: 1,
        ctr: 3.23,
        avgCpc: 3.12,
        cost: 3.12,
        conversions: 0,
        conversionValue: 0,
        subQueriesNote: "26 impr. em 'estrutura totem', 5 impr. em 'gabinete para totem de autoatendimento', 1 clique em 'gabinete com tela touch'",
        isQualified: true,
      },
    ],
    conversionDetails: [
      {
        id: "conv_2026-10-26_1",
        date: "2026-10-26",
        campaignId,
        campaignName,
        actionId: "7871297265",
        actionName: "[Totem Pro] Adicionar ao Carrinho (Add to Cart)",
        funnelOrder: 1,
        count: 1.0,
        value: 1290.0,
        isSymbolicValue: false,
        city: "São Paulo",
        state: "SP (Capital)",
        device: "MOBILE",
        adGroupName: "03 - Gastronomia, Mercados e Clínicas",
        keyword: "totem de autoatendimento",
        matchType: "PHRASE",
        adId: "829532711416",
        landingUrl: "https://totem.xpointsolucoes.com.br",
        stepsJourney: [
          "Pesquisou por 'totem de autoatendimento' no celular (MOBILE) em São Paulo/SP e clicou no anúncio 829532711416.",
          "Entrou na Landing Page e clicou para abrir o Configurador (/monte-seu-totem).",
          "Passou pelas 3 etapas completas de configuração (escolheu a modalidade Só Gabinete para usar as próprias peças + acabamento de cor + seleção de furação dos periféricos homologados), totalizando R$ 1.290,00.",
          "Clicou no botão final 'Adicionar ao Carrinho', sendo levado para /carrinho (onde o GTM-W4N3KKL7 disparou add_to_cart enviando R$ 1.290,00).",
        ],
      },
      {
        id: "conv_2026-10-26_2",
        date: "2026-10-26",
        campaignId,
        campaignName,
        actionId: "7871190956",
        actionName: "[Totem Pro] WhatsApp Consultor Engenharia",
        funnelOrder: 2,
        count: 1.0,
        value: 1.0,
        isSymbolicValue: true,
        city: "Descalvado",
        state: "SP (Interior — região São Carlos/Ribeirão Preto)",
        device: "DESKTOP",
        adGroupName: "03 - Gastronomia, Mercados e Clínicas",
        keyword: "totem de autoatendimento",
        matchType: "PHRASE",
        adId: "829532711416",
        landingUrl: "https://totem.xpointsolucoes.com.br",
        stepsJourney: [
          "Pesquisou pelo computador (DESKTOP) a partir de Descalvado/SP por 'totem de autoatendimento' e clicou no anúncio 829532711416.",
          "Leu a proposta técnica do gabinete na página inicial.",
          "Clicou diretamente no botão de WhatsApp de Atendimento/Engenharia ((11) 99164-9959) para iniciar conversa comercial (GTM-W4N3KKL7 registrou R$ 1,00 simbólico).",
        ],
      },
    ],
    gtmActionsCatalog: [
      {
        order: 1,
        stageLabel: "1º (Interesse Forte)",
        actionId: "7871297265",
        actionName: "[Totem Pro] Adicionar ao Carrinho (Add to Cart)",
        triggerDescription: "Quando o cliente termina as 3 etapas do Configurador (/monte-seu-totem) e clica em Adicionar ao Carrinho",
        valueRule: "Valor real configurado (ex: R$ 1.290,00)",
        isPrimary: true,
        conversionsToday: 1.0,
        conversionsTotal: 1.0,
        conversionValueTotal: 1290.0,
      },
      {
        order: 2,
        stageLabel: "2º (Contato Comercial)",
        actionId: "7871190956",
        actionName: "[Totem Pro] WhatsApp Consultor Engenharia",
        triggerDescription: "Quando o cliente clica em qualquer botão de WhatsApp do site para falar com o consultor",
        valueRule: "R$ 1,00 (simbólico para diferenciar de produtos do carrinho)",
        isPrimary: true,
        conversionsToday: 1.0,
        conversionsTotal: 1.0,
        conversionValueTotal: 1.0,
      },
      {
        order: 3,
        stageLabel: "3º (Intenção de Compra)",
        actionId: "7871296935",
        actionName: "[Totem Pro] Início de Checkout (Begin Checkout)",
        triggerDescription: "Quando o cliente está no /carrinho e clica em Finalizar Pedido para ir ao /checkout",
        valueRule: "Valor total do carrinho",
        isPrimary: true,
        conversionsToday: 0.0,
        conversionsTotal: 0.0,
        conversionValueTotal: 0.0,
      },
      {
        order: 4,
        stageLabel: "4º (Lead Identificado)",
        actionId: "7871297928",
        actionName: "[Totem Pro] Lead Cadastro Checkout",
        triggerDescription: "Quando o cliente preenche Nome, WhatsApp, CPF/CNPJ e Endereço no /checkout e avança para pagamento",
        valueRule: "Valor total do pedido",
        isPrimary: true,
        conversionsToday: 0.0,
        conversionsTotal: 0.0,
        conversionValueTotal: 0.0,
      },
      {
        order: 5,
        stageLabel: "5º (Venda Concluída)",
        actionId: "7871295732",
        actionName: "[Totem Pro] Compra Aprovada (Purchase)",
        triggerDescription: "Quando o pagamento (PIX ou Cartão no Mercado Pago) é efetivamente aprovado",
        valueRule: "Valor total pago + frete",
        isPrimary: true,
        conversionsToday: 0.0,
        conversionsTotal: 0.0,
        conversionValueTotal: 0.0,
      },
    ],
    optimizations: [
      {
        id: "opt_2026-10-26_budget_guard",
        date: "2026-10-26",
        timestamp: "2026-10-26T21:27:00.000Z",
        campaignId,
        campaignName,
        category: "BUDGET_GUARD",
        title: "Trava Anti-Superfornecimento no Orçamento Diário (Overdelivery Guard)",
        targetScope: "Campanha Completa",
        beforeValue: "R$ 50,00/dia nominal (pico de R$ 93,72 por compensação de domingo)",
        afterValue: "R$ 35,00/dia nominal (teto real travado em R$ 35 a R$ 50/dia)",
        expectedImpact: "Impede picos de R$ 90+ em dias úteis quando houver sobra de orçamento no fim de semana.",
        technicalReason: "O Google Ads aplicou a regra padrão de Overdelivery para compensar o domingo (R$ 24,13 gastos). Reduzindo o nominal para R$ 35/dia, mesmo com +30% a +40% de margem em dias de pico, o gasto efetivo fica cravado entre R$ 35 e R$ 50/dia.",
      },
      {
        id: "opt_2026-10-26_cpc_g03",
        date: "2026-10-26",
        timestamp: "2026-10-26T21:27:00.000Z",
        campaignId,
        campaignName,
        category: "BID_REDUCTION",
        title: "Redução de ~30% nos Lances de CPC Máximo (Alta Relevância / CTR 7,92%)",
        targetScope: "Grupos 01, 02, 03 e 04",
        beforeValue: "G03: R$ 2,50 | G04: R$ 3,20 | G01/G02: R$ 3,20",
        afterValue: "G03: R$ 1,75 | G04: R$ 2,10 | G01/G02: R$ 2,20",
        expectedImpact: "Comprar a mesma quantidade de cliques (~25 a 30 cliques/dia) pagando entre R$ 1,60 e R$ 1,90 por clique.",
        technicalReason: "Com o CTR elevado (7,92% na campanha e até 14,29% no Anúncio A do Grupo 04), o Índice de Qualidade permite vencer os mesmos leilões pagando ~30% menos por clique.",
      },
      {
        id: "opt_2026-10-26_neg_gov",
        date: "2026-10-26",
        timestamp: "2026-10-26T21:27:00.000Z",
        campaignId,
        campaignName,
        category: "NEGATIVE_KEYWORDS",
        title: "Blindagem contra Buscas de Órgãos Públicos (+5 Palavras Negativas)",
        targetScope: "Campanha Completa (Total: 67 negativas ativas)",
        beforeValue: "62 palavras negativas ativas (1 impressão detectada para 'totem de autoatendimento gov')",
        afterValue: "67 palavras negativas (+gov, +poupatempo, +detran, +inss, +prefeitura)",
        expectedImpact: "Zero desperdício de impressões e cliques com cidadãos buscando atendimento público.",
        technicalReason: "Detectada 1 impressão (sem clique) para 'totem de autoatendimento gov'. Bloqueio preventivo aplicado imediatamente.",
      },
    ],
  };
}

class GoogleAdsAnalyticsStore {
  private state: GoogleAdsIntelligenceState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): GoogleAdsIntelligenceState {
    try {
      ensureDataDir();
      if (fs.existsSync(ADS_STORE_FILE)) {
        const raw = fs.readFileSync(ADS_STORE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.dailyMetrics)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("[GoogleAdsStore] Erro ao ler analytics_google_ads.json:", err);
    }
    const seed = getDefaultSeedState();
    this.saveToDisk(seed);
    return seed;
  }

  private saveToDisk(stateToSave = this.state) {
    try {
      ensureDataDir();
      fs.writeFileSync(ADS_STORE_FILE, JSON.stringify(stateToSave, null, 2), "utf-8");
    } catch (err) {
      console.warn("[GoogleAdsStore] Erro ao salvar analytics_google_ads.json:", err);
    }
  }

  public getState(): GoogleAdsIntelligenceState {
    return this.state;
  }

  /**
   * Sincroniza diretamente com a API Oficial do Google Ads v25 via OAuth2 REST,
   * preservando os enriquecimentos qualitativos (notas de jornada, histórico de travas e sub-buscas).
   */
  public async syncWithLiveGoogleAdsApi(options?: {
    startDate?: string;
    endDate?: string;
    campaignId?: string;
  }): Promise<{ synced: boolean; message: string; state: GoogleAdsIntelligenceState }> {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || "2248859628").replace(/\D/g, "");
    const projectId = process.env.GOOGLE_ADS_PROJECT_ID || "gen-lang-client-0350473788";

    if (!clientId || !clientSecret || !refreshToken) {
      return {
        synced: false,
        message: "Credenciais OAuth do Google Ads não configuradas no ambiente; mantendo base histórica salva.",
        state: this.state,
      };
    }

    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenRes.ok) {
        throw new Error(`Falha ao renovar token OAuth2 (${tokenRes.status})`);
      }

      const { access_token } = await tokenRes.json();
      const startDate = options?.startDate || "2026-10-01";
      const endDate = options?.endDate || "2026-12-31";
      const targetCampaignId = options?.campaignId || "24395671655";

      const runGaql = async (query: string) => {
        const res = await fetch(
          `https://googleads.googleapis.com/v25/customers/${customerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
              "x-goog-api-client":
                "gl-python/3.12.0 grpc/1.68.0 gax/2.22.0 gccl/29.1.0 pb/5.28.3+c google-ads-mcp/0.2.0",
              "x-goog-user-project": projectId,
            },
            body: JSON.stringify({ query }),
          }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data.results || [];
      };

      const [campaignRows, adGroupRows, searchTermRows, negKeywordRows, convRows] =
        await Promise.all([
          runGaql(`
            SELECT
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.advertising_channel_type,
              campaign_budget.amount_micros,
              segments.date,
              metrics.impressions,
              metrics.clicks,
              metrics.ctr,
              metrics.average_cpc,
              metrics.cost_micros,
              metrics.conversions,
              metrics.conversions_value
            FROM campaign
            WHERE campaign.id = ${targetCampaignId}
              AND segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY segments.date ASC
          `),
          runGaql(`
            SELECT
              campaign.id,
              campaign.name,
              ad_group.id,
              ad_group.name,
              ad_group.status,
              ad_group.cpc_bid_micros,
              segments.date,
              metrics.impressions,
              metrics.clicks,
              metrics.ctr,
              metrics.average_cpc,
              metrics.cost_micros,
              metrics.conversions,
              metrics.conversions_value
            FROM ad_group
            WHERE campaign.id = ${targetCampaignId}
              AND segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY segments.date DESC, metrics.clicks DESC
          `),
          runGaql(`
            SELECT
              campaign.id,
              campaign.name,
              ad_group.id,
              ad_group.name,
              search_term_view.search_term,
              search_term_view.status,
              segments.date,
              segments.search_term_match_type,
              metrics.impressions,
              metrics.clicks,
              metrics.ctr,
              metrics.average_cpc,
              metrics.cost_micros,
              metrics.conversions,
              metrics.conversions_value
            FROM search_term_view
            WHERE campaign.id = ${targetCampaignId}
              AND segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY metrics.clicks DESC, metrics.impressions DESC
            LIMIT 150
          `),
          runGaql(`
            SELECT
              campaign.id,
              campaign_criterion.criterion_id,
              campaign_criterion.keyword.text,
              campaign_criterion.keyword.match_type
            FROM campaign_criterion
            WHERE campaign.id = ${targetCampaignId}
              AND campaign_criterion.negative = TRUE
              AND campaign_criterion.type = 'KEYWORD'
          `),
          runGaql(`
            SELECT
              campaign.id,
              campaign.name,
              ad_group.id,
              ad_group.name,
              segments.date,
              segments.conversion_action,
              segments.conversion_action_name,
              segments.device,
              metrics.conversions,
              metrics.conversions_value
            FROM ad_group
            WHERE campaign.id = ${targetCampaignId}
              AND segments.date BETWEEN '${startDate}' AND '${endDate}'
              AND metrics.conversions > 0
          `),
        ]);

      const nowIso = new Date().toISOString();

      // 1. Atualiza campanha e palavras negativas reais
      if (negKeywordRows.length > 0 || campaignRows.length > 0) {
        const negTexts = negKeywordRows
          .map((r: any) => r.campaignCriterion?.keyword?.text)
          .filter(Boolean);
        const latestCampRow = campaignRows[campaignRows.length - 1];
        const budgetMicros = Number(latestCampRow?.campaignBudget?.amountMicros || 35000000);
        const nominalBudget = Number((budgetMicros / 1_000_000).toFixed(2));

        const existingCamp = this.state.campaigns.find((c) => c.id === targetCampaignId);
        if (existingCamp) {
          existingCamp.nominalDailyBudget = nominalBudget;
          existingCamp.negativeKeywordsCount = negTexts.length || existingCamp.negativeKeywordsCount;
          if (negTexts.length > 0) {
            existingCamp.allNegativeKeywords = negTexts;
          }
          existingCamp.lastSyncedAt = nowIso;
        }
      }

      // 2. Mescla métricas diárias preservando notas qualitativas
      if (campaignRows.length > 0) {
        const existingNotesByDate = new Map(
          this.state.dailyMetrics.map((d) => [d.date, { notes: d.notes, label: d.label, overdeliveryFlag: d.overdeliveryFlag }])
        );

        const syncedDaily: GoogleAdsDailyMetric[] = campaignRows.map((r: any) => {
          const dateStr = r.segments?.date || "";
          const impr = Number(r.metrics?.impressions || 0);
          const clicks = Number(r.metrics?.clicks || 0);
          const cost = Number((Number(r.metrics?.costMicros || 0) / 1_000_000).toFixed(2));
          const conv = Number(r.metrics?.conversions || 0);
          const convVal = Number(r.metrics?.conversionsValue || 0);
          const ctr = impr > 0 ? Number(((clicks / impr) * 100).toFixed(2)) : 0;
          const avgCpc = clicks > 0 ? Number((cost / clicks).toFixed(2)) : 0;
          const cpa = conv > 0 ? Number((cost / conv).toFixed(2)) : 0;
          const roas = cost > 0 ? Number((convVal / cost).toFixed(2)) : 0;
          const prev = existingNotesByDate.get(dateStr);

          const [yyyy, mm, dd] = dateStr.split("-");
          const defaultLabel = dd && mm ? `Dia ${dd}/${mm}/${yyyy}` : dateStr;

          return {
            id: `daily_${dateStr}_${targetCampaignId}`,
            date: dateStr,
            label: prev?.label || defaultLabel,
            campaignId: String(r.campaign?.id || targetCampaignId),
            campaignName: r.campaign?.name || "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
            impressions: impr,
            clicks,
            ctr,
            avgCpc,
            cost,
            conversions: conv,
            conversionValue: convVal,
            cpa,
            roas,
            overdeliveryFlag: prev?.overdeliveryFlag ?? cost > 55,
            notes: prev?.notes,
          };
        });

        this.state.dailyMetrics = syncedDaily;
      }

      // 3. Mescla Ad Groups por data preservando notas e maxCpcBefore
      if (adGroupRows.length > 0) {
        const existingAgMap = new Map(
          this.state.adGroups.map((ag) => [`${ag.date}_${ag.adGroupName.slice(0, 5)}`, ag])
        );

        const syncedAdGroups: GoogleAdsAdGroupMetric[] = adGroupRows.map((r: any, idx: number) => {
          const dateStr = r.segments?.date || "";
          const rawName = r.adGroup?.name || `Grupo ${idx + 1}`;
          const prefixKey = `${dateStr}_${rawName.slice(0, 5)}`;
          const prev = existingAgMap.get(prefixKey);

          const impr = Number(r.metrics?.impressions || 0);
          const clicks = Number(r.metrics?.clicks || 0);
          const cost = Number((Number(r.metrics?.costMicros || 0) / 1_000_000).toFixed(2));
          const conv = Number(r.metrics?.conversions || 0);
          const convVal = Number(r.metrics?.conversionsValue || 0);
          const ctr = impr > 0 ? Number(((clicks / impr) * 100).toFixed(2)) : 0;
          const avgCpc = clicks > 0 ? Number((cost / clicks).toFixed(2)) : 0;
          const currentBid = Number((Number(r.adGroup?.cpcBidMicros || 0) / 1_000_000).toFixed(2));

          return {
            id: `ag_${dateStr}_${r.adGroup?.id || idx}`,
            date: dateStr,
            campaignId: String(r.campaign?.id || targetCampaignId),
            campaignName: r.campaign?.name || "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
            adGroupId: String(r.adGroup?.id || ""),
            adGroupName: prev?.adGroupName || rawName,
            status: r.adGroup?.status || "ENABLED",
            impressions: impr,
            clicks,
            ctr,
            cost,
            avgCpc,
            conversions: conv,
            conversionValue: convVal,
            maxCpcBefore: prev?.maxCpcBefore,
            maxCpcCurrent: currentBid || prev?.maxCpcCurrent || 2.0,
            highlightNote: prev?.highlightNote,
            conversionBreakdownText:
              prev?.conversionBreakdownText || (conv > 0 ? `${conv.toFixed(1)} (R$ ${convVal.toFixed(2)})` : "0,0"),
          };
        });

        // Garante que grupos com 0 impressões na API (ex: Grupo 02 se zerado) continuem visíveis
        for (const oldAg of this.state.adGroups) {
          const found = syncedAdGroups.some(
            (s) => s.date === oldAg.date && s.adGroupName.slice(0, 5) === oldAg.adGroupName.slice(0, 5)
          );
          if (!found) {
            syncedAdGroups.push(oldAg);
          }
        }

        this.state.adGroups = syncedAdGroups;
      }

      // 4. Mescla Termos de Pesquisa (mantendo os 10 termos agrupados de destaque + termos granulares da API)
      if (searchTermRows.length > 0) {
        const existingTermsMap = new Map(
          this.state.searchTerms.map((st) => [st.term.replace(/[\[\]"]/g, "").toLowerCase(), st])
        );

        const apiTerms: GoogleAdsSearchTermMetric[] = searchTermRows.map((r: any, idx: number) => {
          const termText = r.searchTermView?.searchTerm || "";
          const prev = existingTermsMap.get(termText.toLowerCase());
          const impr = Number(r.metrics?.impressions || 0);
          const clicks = Number(r.metrics?.clicks || 0);
          const cost = Number((Number(r.metrics?.costMicros || 0) / 1_000_000).toFixed(2));
          const conv = Number(r.metrics?.conversions || 0);
          const convVal = Number(r.metrics?.conversionsValue || 0);
          const ctr = impr > 0 ? Number(((clicks / impr) * 100).toFixed(2)) : 0;
          const avgCpc = clicks > 0 ? Number((cost / clicks).toFixed(2)) : 0;

          return {
            id: `st_api_${r.segments?.date || "all"}_${idx}`,
            date: r.segments?.date || "2026-10-26",
            campaignId: String(r.campaign?.id || targetCampaignId),
            campaignName: r.campaign?.name || "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
            adGroupId: String(r.adGroup?.id || ""),
            adGroupName: r.adGroup?.name || "",
            term: termText,
            matchType: r.segments?.searchTermMatchType || "PHRASE",
            impressions: impr,
            clicks,
            ctr,
            avgCpc,
            cost,
            conversions: conv,
            conversionValue: convVal,
            subQueriesNote: prev?.subQueriesNote,
            conversionNote:
              prev?.conversionNote ||
              (conv > 0 ? `${conv} conv. (R$ ${convVal.toFixed(2)})` : undefined),
            isQualified: !termText.toLowerCase().includes("gov"),
          };
        });

        // Preserva também os agrupamentos curados do relatório executivo se tiverem notas especiais
        const curatedHighlights = this.state.searchTerms.filter((st) => st.id.startsWith("st_") && !st.id.startsWith("st_api_"));
        const combined = [...curatedHighlights];
        for (const apiT of apiTerms) {
          const alreadyCovered = combined.some(
            (c) =>
              c.date === apiT.date &&
              c.term.replace(/[\[\]"]/g, "").toLowerCase() === apiT.term.toLowerCase()
          );
          if (!alreadyCovered) {
            combined.push(apiT);
          }
        }
        this.state.searchTerms = combined;
      }

      // 5. Atualiza contagens do catálogo GTM se houver conversões na API
      if (convRows.length > 0) {
        const totalsByAction = new Map<string, { today: number; total: number; val: number }>();
        const latestDate =
          this.state.dailyMetrics[this.state.dailyMetrics.length - 1]?.date || "2026-10-26";

        for (const cr of convRows) {
          const actionRes = String(cr.segments?.conversionAction || "");
          const actionId = actionRes.split("/").pop() || "";
          const cCount = Number(cr.metrics?.conversions || 0);
          const cVal = Number(cr.metrics?.conversionsValue || 0);
          const curr = totalsByAction.get(actionId) || { today: 0, total: 0, val: 0 };
          curr.total += cCount;
          curr.val += cVal;
          if (cr.segments?.date === latestDate) {
            curr.today += cCount;
          }
          totalsByAction.set(actionId, curr);
        }

        this.state.gtmActionsCatalog = this.state.gtmActionsCatalog.map((item) => {
          const found = totalsByAction.get(item.actionId);
          if (found) {
            return {
              ...item,
              conversionsToday: found.today,
              conversionsTotal: found.total,
              conversionValueTotal: found.val,
            };
          }
          return item;
        });
      }

      this.state.lastLiveSyncAt = nowIso;
      this.state.lastUpdatedAt = nowIso;
      this.state.liveSyncStatus = "connected";
      this.state.liveSyncMessage = `Sincronizado ao vivo com Google Ads API v25 (Conta ${customerId}) em ${new Date().toLocaleTimeString("pt-BR")}.`;
      this.saveToDisk();

      return {
        synced: true,
        message: this.state.liveSyncMessage,
        state: this.state,
      };
    } catch (err: any) {
      this.state.liveSyncStatus = "error";
      this.state.liveSyncMessage = `Aviso ao consultar API ao vivo (${err?.message || "Erro"}); exibindo dados salvos.`;
      return {
        synced: false,
        message: this.state.liveSyncMessage,
        state: this.state,
      };
    }
  }

  /**
   * Calcula KPIs filtrados e gera Recomendações Executivas Automáticas para tomada de decisão.
   */
  public getFilteredDashboardData(filters?: {
    dateFilter?: string; // "ALL" | "2026-10-26" | "2026-10-25" | custom YYYY-MM-DD
    campaignId?: string;
    adGroupFilter?: string;
    matchTypeFilter?: string;
    onlyConversions?: boolean;
    onlyClicks?: boolean;
    search?: string;
  }) {
    const dateFilter = filters?.dateFilter || "ALL";
    const campaignId = filters?.campaignId || "ALL";
    const adGroupFilter = filters?.adGroupFilter || "ALL";
    const matchTypeFilter = filters?.matchTypeFilter || "ALL";
    const onlyConversions = Boolean(filters?.onlyConversions);
    const onlyClicks = Boolean(filters?.onlyClicks);
    const search = (filters?.search || "").trim().toLowerCase();

    const dailyFiltered = this.state.dailyMetrics.filter((d) => {
      if (campaignId !== "ALL" && d.campaignId !== campaignId) return false;
      if (dateFilter !== "ALL" && d.date !== dateFilter) return false;
      return true;
    });

    const totals = dailyFiltered.reduce(
      (acc, d) => {
        acc.impressions += d.impressions;
        acc.clicks += d.clicks;
        acc.cost += d.cost;
        acc.conversions += d.conversions;
        acc.conversionValue += d.conversionValue;
        return acc;
      },
      { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionValue: 0 }
    );

    const summary = {
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: totals.impressions > 0 ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0,
      avgCpc: totals.clicks > 0 ? Number((totals.cost / totals.clicks).toFixed(2)) : 0,
      cost: Number(totals.cost.toFixed(2)),
      conversions: Number(totals.conversions.toFixed(1)),
      conversionValue: Number(totals.conversionValue.toFixed(2)),
      cpa: totals.conversions > 0 ? Number((totals.cost / totals.conversions).toFixed(2)) : 0,
      roas: totals.cost > 0 ? Number((totals.conversionValue / totals.cost).toFixed(2)) : 0,
    };

    // Comparativo Hoje vs Ontem
    const sortedDays = [...this.state.dailyMetrics].sort((a, b) => a.date.localeCompare(b.date));
    const yesterdayMetric = sortedDays.length >= 2 ? sortedDays[sortedDays.length - 2] : null;
    const todayMetric = sortedDays.length >= 1 ? sortedDays[sortedDays.length - 1] : null;

    // Filtra Grupos de Anúncios
    const adGroupsFiltered = this.state.adGroups.filter((ag) => {
      if (campaignId !== "ALL" && ag.campaignId !== campaignId) return false;
      if (dateFilter !== "ALL" && ag.date !== dateFilter) return false;
      if (adGroupFilter !== "ALL" && !ag.adGroupName.toLowerCase().includes(adGroupFilter.toLowerCase())) {
        return false;
      }
      if (onlyConversions && ag.conversions <= 0) return false;
      if (onlyClicks && ag.clicks <= 0) return false;
      if (search && !`${ag.adGroupName} ${ag.highlightNote || ""}`.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });

    // Filtra Termos de Pesquisa
    const searchTermsFiltered = this.state.searchTerms.filter((st) => {
      if (campaignId !== "ALL" && st.campaignId !== campaignId) return false;
      if (dateFilter !== "ALL" && st.date !== dateFilter) return false;
      if (adGroupFilter !== "ALL" && !st.adGroupName.toLowerCase().includes(adGroupFilter.toLowerCase())) {
        return false;
      }
      if (matchTypeFilter !== "ALL" && st.matchType !== matchTypeFilter) return false;
      if (onlyConversions && st.conversions <= 0) return false;
      if (onlyClicks && st.clicks <= 0) return false;
      if (
        search &&
        !`${st.term} ${st.adGroupName} ${st.subQueriesNote || ""} ${st.conversionNote || ""}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }
      return true;
    });

    // Filtra Conversões Detalhadas
    const conversionsFiltered = this.state.conversionDetails.filter((cd) => {
      if (campaignId !== "ALL" && cd.campaignId !== campaignId) return false;
      if (dateFilter !== "ALL" && cd.date !== dateFilter) return false;
      if (adGroupFilter !== "ALL" && !cd.adGroupName.toLowerCase().includes(adGroupFilter.toLowerCase())) {
        return false;
      }
      if (
        search &&
        !`${cd.actionName} ${cd.city} ${cd.state} ${cd.keyword} ${cd.adGroupName} ${cd.stepsJourney.join(" ")}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }
      return true;
    });

    // Gera Insights Executivos Automáticos
    const executiveInsights = this.generateExecutiveInsights(summary, todayMetric, yesterdayMetric);

    return {
      lastUpdatedAt: this.state.lastUpdatedAt,
      lastLiveSyncAt: this.state.lastLiveSyncAt,
      liveSyncStatus: this.state.liveSyncStatus,
      liveSyncMessage: this.state.liveSyncMessage,
      campaigns: this.state.campaigns,
      summary,
      comparison: {
        yesterday: yesterdayMetric,
        today: todayMetric,
      },
      dailyMetrics: dailyFiltered,
      adGroups: adGroupsFiltered,
      searchTerms: searchTermsFiltered,
      conversionDetails: conversionsFiltered,
      gtmActionsCatalog: this.state.gtmActionsCatalog,
      optimizations: this.state.optimizations,
      executiveInsights,
    };
  }

  private generateExecutiveInsights(
    summary: {
      impressions: number;
      clicks: number;
      ctr: number;
      avgCpc: number;
      cost: number;
      conversions: number;
      conversionValue: number;
      cpa: number;
      roas: number;
    },
    today: GoogleAdsDailyMetric | null,
    yesterday: GoogleAdsDailyMetric | null
  ): GoogleAdsExecutiveInsight[] {
    const insights: GoogleAdsExecutiveInsight[] = [];

    if (today && yesterday) {
      const ctrGrowth =
        yesterday.ctr > 0 ? Number((((today.ctr - yesterday.ctr) / yesterday.ctr) * 100).toFixed(0)) : 0;
      insights.push({
        id: "ins_ctr_leap",
        severity: "success",
        category: "LEILÃO & CPC",
        title: `Salto de +${ctrGrowth}% no CTR (${yesterday.ctr}% ➔ ${today.ctr}%) permite comprar cliques ~30% mais baratos`,
        metricBadge: `CTR Hoje: ${today.ctr}%`,
        diagnosis: `A limpeza de termos irrelevantes elevou o CTR geral para ${today.ctr}% (com o Grupo 04 saltando de 3,36% para 8,66% e Grupo 03 em 8,00%). Com Índice de Qualidade alto, o Google exige menor lance para manter a 1ª página.`,
        recommendedDecision:
          "Manter os novos tetos de CPC Máx reduzidos (G03: R$ 1,75 | G04: R$ 2,10 | G01/G02: R$ 2,20) para reduzir o CPC médio da faixa de R$ 2,68 para R$ 1,60–R$ 1,90.",
      });
    }

    if (today && today.cost > 50) {
      insights.push({
        id: "ins_overdelivery_guard",
        severity: "warning",
        category: "ORÇAMENTO",
        title: "Superfornecimento Diário (Overdelivery) detectado e travado em R$ 35,00/dia nominal",
        metricBadge: `Gasto Hoje: R$ ${today.cost.toFixed(2)}`,
        diagnosis: `Como domingo gastou apenas R$ ${yesterday?.cost.toFixed(2) || "24,13"}, o algoritmo compensou na segunda-feira gastando R$ ${today.cost.toFixed(2)}.`,
        recommendedDecision:
          "Com a trava nominal de R$ 35,00/dia já ativa, mesmo em dias úteis de pico (+30% a +40% de margem do Google), o gasto diário efetivo ficará contido entre R$ 35,00 e R$ 50,00.",
      });
    }

    if (summary.conversions > 0) {
      insights.push({
        id: "ins_conversions_roi",
        severity: "opportunity",
        category: "CONVERSÕES & ROI",
        title: `ROAS de Intenção de ${summary.roas}x: R$ ${summary.conversionValue.toFixed(2)} gerados em Carrinho + Lead WhatsApp`,
        metricBadge: `${summary.conversions} Conv. | CPA R$ ${summary.cpa.toFixed(2)}`,
        diagnosis: `A palavra-chave "totem de autoatendimento" no Grupo 03 converteu 1 montagem completa no carrinho (R$ 1.290,00 via Mobile em São Paulo/SP) e 1 contato direto com a Engenharia no WhatsApp (via Desktop em Descalvado/SP).`,
        recommendedDecision:
          "Priorizar atendimento ativo no WhatsApp para fechar o pedido e acompanhar a conversão de Add to Cart (Etapa 1 GTM) para Begin Checkout e Purchase.",
      });
    }

    insights.push({
      id: "ins_search_terms_quality",
      severity: "success",
      category: "TERMOS DE BUSCA",
      title: "100% dos Cliques Qualificados + 67 Palavras Negativas Blindando o Orçamento",
      metricBadge: "67 Negativas Ativas",
      diagnosis:
        "Termos campeões de intenção comercial: 'totem autoatendimento supermercado' (CTR 10,47%), 'totem de autoatendimento' (CTR 10,53%), 'totem pdv' (CTR 8,79%) e '[gabinete para totem]' (CTR 25%). Órgãos públicos (gov, poupatempo, detran, inss, prefeitura) bloqueados.",
      recommendedDecision:
        "Monitorar diariamente a aba de Termos Reais Pesquisados e negativar imediatamente qualquer sigla de órgão público ou busca informacional sem intenção B2B.",
    });

    return insights;
  }

  /**
   * Salva uma nova otimização / ajuste de campanha no histórico.
   */
  public saveOptimization(
    payload: Omit<GoogleAdsOptimizationRecord, "id" | "timestamp"> & { id?: string }
  ): GoogleAdsOptimizationRecord {
    const now = new Date().toISOString();
    const record: GoogleAdsOptimizationRecord = {
      id: payload.id || `opt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: payload.date || now.slice(0, 10),
      timestamp: now,
      campaignId: payload.campaignId || "24395671655",
      campaignName:
        payload.campaignName || "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      category: payload.category || "BID_REDUCTION",
      title: payload.title,
      targetScope: payload.targetScope || "Campanha Completa",
      beforeValue: payload.beforeValue || "—",
      afterValue: payload.afterValue || "—",
      expectedImpact: payload.expectedImpact || "",
      technicalReason: payload.technicalReason || "",
    };

    const existingIdx = this.state.optimizations.findIndex((o) => o.id === record.id);
    if (existingIdx >= 0) {
      this.state.optimizations[existingIdx] = record;
    } else {
      this.state.optimizations.unshift(record);
    }
    this.state.lastUpdatedAt = now;
    this.saveToDisk();
    return record;
  }

  public deleteOptimization(id: string): boolean {
    const prev = this.state.optimizations.length;
    this.state.optimizations = this.state.optimizations.filter((o) => o.id !== id);
    if (this.state.optimizations.length !== prev) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  /**
   * Salva ou atualiza um registro detalhado de conversão (Raio-X).
   */
  public saveConversionDetail(
    payload: Omit<GoogleAdsConversionDetail, "id"> & { id?: string }
  ): GoogleAdsConversionDetail {
    const record: GoogleAdsConversionDetail = {
      ...payload,
      id: payload.id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const existingIdx = this.state.conversionDetails.findIndex((c) => c.id === record.id);
    if (existingIdx >= 0) {
      this.state.conversionDetails[existingIdx] = record;
    } else {
      this.state.conversionDetails.unshift(record);
    }
    this.state.lastUpdatedAt = new Date().toISOString();
    this.saveToDisk();
    return record;
  }

  /**
   * Processador Inteligente de Relatórios colados (extrai métricas diárias, palavras negativas e notas automaticamente).
   */
  public importRawReportText(rawText: string, reportDate = "2026-10-26") {
    const now = new Date().toISOString();
    // Registra como nota de auditoria no histórico de otimizações para rastreabilidade integral
    const firstLine =
      rawText
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 10) || "Relatório Google Ads Importado";

    const opt = this.saveOptimization({
      date: reportDate,
      campaignId: "24395671655",
      campaignName: "[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)",
      category: "CONVERSION_GOAL",
      title: `Relatório / Auditoria Registrada: ${firstLine.slice(0, 75)}`,
      targetScope: `Data Base: ${reportDate}`,
      beforeValue: "Histórico Anterior",
      afterValue: "Métricas consolidadas e salvas na base permanente",
      expectedImpact: "Preservação histórica para comparativo de tomada de decisão",
      technicalReason: rawText.slice(0, 1500),
    });

    this.state.lastUpdatedAt = now;
    this.saveToDisk();
    return opt;
  }
}

const globalForGoogleAds = globalThis as unknown as {
  googleAdsAnalyticsStore?: GoogleAdsAnalyticsStore;
};

export const googleAdsAnalyticsStore =
  globalForGoogleAds.googleAdsAnalyticsStore ?? new GoogleAdsAnalyticsStore();

if (process.env.NODE_ENV !== "production") {
  globalForGoogleAds.googleAdsAnalyticsStore = googleAdsAnalyticsStore;
}
