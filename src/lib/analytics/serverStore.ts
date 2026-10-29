/**
 * Servidor de Agregação de Analytics, Snapshots Históricos e Plano de Melhorias (CRO)
 * Totem Landing Page — X-Point Soluções
 */

import fs from "fs";
import path from "path";
import { ANALYTICS_EVENTS, AnalyticsEventType, FUNNEL_STAGES, FunnelStageMetric } from "./events";
import { getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { siteConfig } from "@/config/site";
import { ID } from "node-appwrite";
import { adsLeadsCartsStore } from "./adsLeadsCartsStore";

export interface StoredAnalyticsEvent {
  id: string;
  eventName: AnalyticsEventType;
  sessionId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface FunnelBottleneckInsight {
  id: string;
  severity: "critical" | "warning" | "opportunity" | "success";
  stageId: string;
  stageLabel: string;
  title: string;
  diagnosis: string;
  recommendation: string;
  metricBadge: string;
}

export interface FunnelImprovementAction {
  id: string;
  title: string;
  targetStageId: string;
  targetStageLabel: string;
  problemIdentified: string;
  proposedAction: string;
  expectedImpact: string;
  measuredResult?: string;
  priority: "critica" | "alta" | "media" | "baixa";
  status: "planejada" | "em_andamento" | "em_teste_ab" | "concluida" | "validada";
  owner: string;
  versionTag: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebVitalsBenchmark {
  pagespeedMobile?: number;
  pagespeedDesktop?: number;
  accessibilityScore?: number;
  bestPracticesScore?: number;
  seoScore?: number;
  gtmetrixGrade?: string;
  gtmetrixPerformance?: number;
  gtmetrixStructure?: number;
  lcpMs?: number;
  tbtMs?: number;
  cls?: number;
  domElements?: number;
}

export interface AnalyticsSnapshot {
  id: string;
  title: string;
  periodLabel: string;
  siteVersion: string;
  createdAt: string;
  notes: string;
  appliedImprovements: string;
  futureGoals: string;
  tags: string[];
  webVitals?: WebVitalsBenchmark;
  metrics: {
    totalSessions: number;
    totalEvents: number;
    globalConversionRate: number;
    whatsappClicks: number;
    whatsappConversionRate: number;
    configuratorStarts: number;
    cartAdditions: number;
    checkoutsStarted: number;
    leadsCaptured: number;
    pixGenerated: number;
    purchasesCompleted: number;
    realOrdersCount: number;
    realRevenueCents: number;
    stages: FunnelStageMetric[];
    popularModels: Record<string, number>;
    whatsappSources: Record<string, number>;
    deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  };
}

export interface FunnelFilterOptions {
  period?: "today" | "7d" | "30d" | "all";
  device?: "all" | "mobile" | "desktop" | "tablet";
  search?: string;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");
const EVENTS_FILE = path.join(DATA_DIR, "analytics_events.json");
const SNAPSHOTS_FILE = path.join(DATA_DIR, "analytics_snapshots.json");
const IMPROVEMENTS_FILE = path.join(DATA_DIR, "analytics_improvements.json");

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function inferDeviceType(evt: StoredAnalyticsEvent): "mobile" | "desktop" | "tablet" {
  const sw = Number(evt.metadata?.screenWidth || 0);
  if (sw > 0 && sw < 768) return "mobile";
  if (sw >= 768 && sw < 1024) return "tablet";
  if (sw >= 1024) return "desktop";

  const ua = (evt.userAgent || "").toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
}

function inferTrafficSource(evt: StoredAnalyticsEvent): string {
  const ref = String(evt.metadata?.referrer || "").toLowerCase();
  const pathStr = String(evt.metadata?.pathname || "").toLowerCase();
  if (ref.includes("google.") || pathStr.includes("gclid")) return "Google Search / Ads";
  if (ref.includes("instagram.") || ref.includes("ig.")) return "Instagram";
  if (ref.includes("facebook.") || ref.includes("fb.")) return "Facebook / Meta Ads";
  if (ref.includes("tiktok.")) return "TikTok";
  if (ref.includes("wa.me") || ref.includes("whatsapp")) return "WhatsApp";
  if (!ref || ref.includes("xpointsolucoes.com.br")) return "Tráfego Direto / Orgânico";
  return "Outros Referenciadores";
}

class AnalyticsServerStore {
  private events: StoredAnalyticsEvent[] = [];
  private snapshots: AnalyticsSnapshot[] = [];
  private improvements: FunnelImprovementAction[] = [];
  private maxEvents = 5000;
  private initialized = false;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    if (this.initialized) return;
    this.initialized = true;
    ensureDataDir();

    // 1. Eventos
    try {
      if (fs.existsSync(EVENTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(EVENTS_FILE, "utf-8"));
        if (Array.isArray(raw)) {
          this.events = raw.slice(0, this.maxEvents);
        }
      }
    } catch (e) {
      console.error("[AnalyticsServerStore] Falha ao carregar analytics_events.json:", e);
    }

    // 2. Snapshots Históricos
    try {
      if (fs.existsSync(SNAPSHOTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(SNAPSHOTS_FILE, "utf-8"));
        if (Array.isArray(raw)) {
          this.snapshots = raw;
        }
      } else {
        this.snapshots = this.createDefaultSnapshots();
        this.saveSnapshotsToDisk();
      }
    } catch (e) {
      console.error("[AnalyticsServerStore] Falha ao carregar analytics_snapshots.json:", e);
      this.snapshots = this.createDefaultSnapshots();
    }

    // 3. Plano de Melhorias (CRO Backlog)
    try {
      if (fs.existsSync(IMPROVEMENTS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(IMPROVEMENTS_FILE, "utf-8"));
        if (Array.isArray(raw)) {
          this.improvements = raw;
        }
      } else {
        this.improvements = this.createDefaultImprovements();
        this.saveImprovementsToDisk();
      }
    } catch (e) {
      console.error("[AnalyticsServerStore] Falha ao carregar analytics_improvements.json:", e);
      this.improvements = this.createDefaultImprovements();
    }
  }

  private saveEventsToDisk(): void {
    try {
      ensureDataDir();
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(this.events.slice(0, this.maxEvents), null, 2), "utf-8");
    } catch (e) {
      console.error("[AnalyticsServerStore] Erro ao salvar eventos em disco:", e);
    }
  }

  private saveSnapshotsToDisk(): void {
    try {
      ensureDataDir();
      fs.writeFileSync(SNAPSHOTS_FILE, JSON.stringify(this.snapshots, null, 2), "utf-8");
    } catch (e) {
      console.error("[AnalyticsServerStore] Erro ao salvar snapshots em disco:", e);
    }
  }

  private saveImprovementsToDisk(): void {
    try {
      ensureDataDir();
      fs.writeFileSync(IMPROVEMENTS_FILE, JSON.stringify(this.improvements, null, 2), "utf-8");
    } catch (e) {
      console.error("[AnalyticsServerStore] Erro ao salvar melhorias em disco:", e);
    }
  }

  private createDefaultSnapshots(): AnalyticsSnapshot[] {
    return [
      {
        id: "snap_baseline_v321",
        title: "Marco v3.2.1 — Otimização Core Web Vitals, Contraste WCAG 100 & Imagens WebP",
        periodLabel: "Outubro 2026 (Baseline Pós-Otimização)",
        siteVersion: siteConfig.version || "3.2.1",
        createdAt: new Date().toISOString(),
        notes:
          "Marco de referência registrado após otimização profunda de performance Mobile/Desktop, eliminação de filtros CSS pesados no primeiro paint, redução da árvore DOM (profundidade máx. 12) e conversão das 21 fotos do catálogo para WebP 532x532.",
        appliedImprovements:
          "• PageSpeed Mobile: 99 Desempenho, 100 Acessibilidade, 100 Práticas Recomendadas, 100 SEO, 3/3 Navegação Agêntica\n• Eliminação da Long Task de 690ms de rasterização SVG/CSS antes do FCP/LCP (LCP reduzido para 339ms no trace)\n• Remoção de cadeias críticas (site.webmanifest e preloads duplicados)\n• Rastreamento GTM + Google Ads + GA4 para cliques em WhatsApp com deduplicação",
        futureGoals:
          "• Aumentar a taxa de avanço da Etapa 3 (Seleção de Modelo) para Etapa 4 (Adição ao Carrinho) acima de 35%\n• Monitorar conversão assistida pelo botão flutuante do WhatsApp vs. Checkout autônomo PIX\n• Ativar Proxy CDN Cloudflare no domínio para atingir 100% em Structure no GTmetrix",
        tags: ["Core Web Vitals", "PageSpeed 100", "GTmetrix", "WCAG AA", "WebP", "v3.2.1"],
        webVitals: {
          pagespeedMobile: 99,
          pagespeedDesktop: 100,
          accessibilityScore: 100,
          bestPracticesScore: 100,
          seoScore: 100,
          gtmetrixGrade: "A",
          gtmetrixPerformance: 96,
          gtmetrixStructure: 98,
          lcpMs: 339,
          tbtMs: 7,
          cls: 0,
          domElements: 890,
        },
        metrics: {
          totalSessions: 33,
          totalEvents: 93,
          globalConversionRate: 0,
          whatsappClicks: 4,
          whatsappConversionRate: 12.1,
          configuratorStarts: 33,
          cartAdditions: 6,
          checkoutsStarted: 3,
          leadsCaptured: 2,
          pixGenerated: 1,
          purchasesCompleted: 0,
          realOrdersCount: 2,
          realRevenueCents: 318000,
          stages: FUNNEL_STAGES.map((st, idx) => ({
            stageId: st.stageId,
            eventName: st.eventName,
            label: st.label,
            stepNumber: st.stepNumber,
            count: idx === 0 ? 33 : idx === 1 ? 60 : 0,
            uniqueSessions: idx === 0 ? 33 : idx === 1 ? 33 : 0,
            conversionRateFromPrevious: idx <= 1 ? 100 : 0,
            dropoffRateFromPrevious: idx === 0 ? 0 : idx === 1 ? 0 : 100,
            overallConversionRate: idx <= 1 ? 100 : 0,
          })),
          popularModels: {
            "cabinet-floor": 14,
            "cabinet-wall": 12,
            "cabinet-countertop": 7,
          },
          whatsappSources: {
            floating_whatsapp_discreet: 2,
            faq_bottom_cta: 1,
            b2b_reseller_card: 1,
          },
          deviceBreakdown: { mobile: 21, desktop: 11, tablet: 1 },
        },
      },
    ];
  }

  private createDefaultImprovements(): FunnelImprovementAction[] {
    const now = new Date().toISOString();
    return [
      {
        id: "imp_vitals_v321",
        title: "Otimização Extrema de LCP, Acessibilidade WCAG AA (100) e Imagens WebP",
        targetStageId: "stage_home",
        targetStageLabel: "1. Visita Landing Page",
        problemIdentified:
          "Imagens PNG remotas de 1.8MB, contraste insuficiente em badges/preços (nota 92) e Long Task de 690ms na rasterização de filtros CSS antes do FCP.",
        proposedAction:
          "Converter todo o catálogo para WebP 532x532 local, elevar contraste de todas as seções para WCAG AA (100), remover feGaussianBlur e backdrop-blur redundantes e reduzir profundidade do DOM de 15 para 12.",
        expectedImpact: "Nota 99-100 no PageSpeed Mobile/Desktop, LCP sub-segundo e menor rejeição no carregamento 4G.",
        measuredResult:
          "PageSpeed Mobile: 99 Performance / 100 Acessibilidade / 100 Best Practices / 100 SEO / 3/3 Agentic Browsing. LCP em 339ms.",
        priority: "critica",
        status: "validada",
        owner: "Engenharia X-Point",
        versionTag: "v3.2.1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "imp_whatsapp_tracking",
        title: "Rastreamento Unificado de Conversão de WhatsApp (GTM + GA4 + Google Ads)",
        targetStageId: "stage_configurator",
        targetStageLabel: "2. Início do Configurador",
        problemIdentified:
          "Muitos compradores B2B preferem fechar múltiplos gabinetes via WhatsApp em vez do checkout autônomo, o que subnotificava a conversão real do funil.",
        proposedAction:
          "Rastrear todos os cliques em links wa.me com identificação da origem (botão flutuante, FAQ, card B2B, rodapé) e contabilizar a Taxa de Conversão Assistida via WhatsApp no painel.",
        expectedImpact: "Visibilidade real dos leads gerados para o time comercial e otimização do lance no Google Ads.",
        measuredResult: "Evento contact_whatsapp ativo com deduplicação de 800ms e envio via transport beacon.",
        priority: "alta",
        status: "concluida",
        owner: "Marketing & Tráfego",
        versionTag: "v3.2.0",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "imp_configurator_to_cart",
        title: "Reduzir Drop-off entre Início do Configurador e Adição ao Carrinho",
        targetStageId: "stage_model_selected",
        targetStageLabel: "3. Seleção do Modelo de Gabinete",
        problemIdentified:
          "Usuários iniciam o configurador para simular preço, mas parte sai antes de clicar em Adicionar ao Carrinho.",
        proposedAction:
          "Destacar que a usinagem CNC sob medida para as peças do cliente não tem sobretaxa e exibir resumo claro de economia no PIX logo na primeira etapa do configurador.",
        expectedImpact: "Aumentar a taxa de passagem do Configurador para o Carrinho em +15% a +25%.",
        measuredResult: "Em monitoramento contínuo pós-deploy v3.2.1.",
        priority: "alta",
        status: "em_teste_ab",
        owner: "Produto & UX",
        versionTag: "v3.2.2",
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  public async recordEvent(event: Omit<StoredAnalyticsEvent, "id">): Promise<StoredAnalyticsEvent> {
    this.loadFromDisk();

    const fullEvent: StoredAnalyticsEvent = {
      ...event,
      id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36),
    };

    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    this.saveEventsToDisk();
    this.persistToAppwriteAsync(fullEvent).catch(() => {});
    adsLeadsCartsStore
      .upsertFromClientEvent({
        id: fullEvent.id,
        eventName: fullEvent.eventName,
        sessionId: fullEvent.sessionId,
        timestamp: fullEvent.timestamp,
        url: String(fullEvent.metadata?.url || fullEvent.metadata?.pathname || ""),
        userAgent: fullEvent.userAgent,
        ip: fullEvent.ip,
        metadata: fullEvent.metadata as Record<string, any>,
      })
      .catch(() => {});

    return fullEvent;
  }

  private async persistToAppwriteAsync(event: StoredAnalyticsEvent): Promise<void> {
    try {
      const db = getServerDatabases();
      await db.createDocument(
        APPWRITE_CONFIG.databaseId,
        "analytics_events",
        ID.unique(),
        {
          eventName: event.eventName,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          metadataJson: JSON.stringify(event.metadata || {}),
        }
      );
    } catch {
      // Silencioso caso a collection analytics_events não esteja criada no Appwrite
    }
  }

  public getFilteredEvents(options?: FunnelFilterOptions): StoredAnalyticsEvent[] {
    this.loadFromDisk();
    let list = [...this.events];

    if (options?.period && options.period !== "all") {
      const now = Date.now();
      let cutoffMs = 0;
      if (options.period === "today") {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        cutoffMs = startOfDay.getTime();
      } else if (options.period === "7d") {
        cutoffMs = now - 7 * 24 * 60 * 60 * 1000;
      } else if (options.period === "30d") {
        cutoffMs = now - 30 * 24 * 60 * 60 * 1000;
      }
      if (cutoffMs > 0) {
        list = list.filter((e) => new Date(e.timestamp).getTime() >= cutoffMs);
      }
    }

    if (options?.device && options.device !== "all") {
      list = list.filter((e) => inferDeviceType(e) === options.device);
    }

    if (options?.search && options.search.trim().length > 0) {
      const q = options.search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.eventName.toLowerCase().includes(q) ||
          e.sessionId.toLowerCase().includes(q) ||
          JSON.stringify(e.metadata || {}).toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getRecentEvents(limit = 50, options?: FunnelFilterOptions): StoredAnalyticsEvent[] {
    return this.getFilteredEvents(options).slice(0, limit);
  }

  public getCounts(options?: FunnelFilterOptions): Record<string, number> {
    const filtered = this.getFilteredEvents(options);
    const counts: Record<string, number> = {};
    Object.values(ANALYTICS_EVENTS).forEach((ev) => {
      counts[ev] = 0;
    });
    for (const evt of filtered) {
      counts[evt.eventName] = (counts[evt.eventName] || 0) + 1;
    }
    return counts;
  }

  public calculateFunnelMetrics(options?: FunnelFilterOptions) {
    const filtered = this.getFilteredEvents(options);
    const counts = this.getCounts(options);

    // Sessões únicas globais e por evento
    const allSessionIds = new Set<string>();
    const sessionsByEvent: Record<string, Set<string>> = {};
    Object.values(ANALYTICS_EVENTS).forEach((ev) => {
      sessionsByEvent[ev] = new Set<string>();
    });

    const popularModels: Record<string, number> = {};
    const popularColors: Record<string, number> = {};
    const popularMonitors: Record<string, number> = {};
    const popularPrinters: Record<string, number> = {};
    const whatsappSources: Record<string, number> = {};
    const trafficSources: Record<string, number> = {};
    const deviceBreakdown = { mobile: 0, desktop: 0, tablet: 0 };
    const seenSessionDevice = new Set<string>();
    const seenSessionSource = new Set<string>();

    for (const evt of filtered) {
      const sid = evt.sessionId || evt.id;
      allSessionIds.add(sid);
      if (!sessionsByEvent[evt.eventName]) {
        sessionsByEvent[evt.eventName] = new Set<string>();
      }
      sessionsByEvent[evt.eventName].add(sid);

      // Dispositivo e origem por sessão única
      if (!seenSessionDevice.has(sid)) {
        seenSessionDevice.add(sid);
        const dev = inferDeviceType(evt);
        deviceBreakdown[dev] = (deviceBreakdown[dev] || 0) + 1;
      }

      if (!seenSessionSource.has(sid)) {
        seenSessionSource.add(sid);
        const src = inferTrafficSource(evt);
        trafficSources[src] = (trafficSources[src] || 0) + 1;
      }

      // Modelos de Gabinete
      if (
        (evt.eventName === ANALYTICS_EVENTS.SELECT_CABINET_MODEL ||
          evt.eventName === ANALYTICS_EVENTS.START_CONFIGURATOR) &&
        evt.metadata?.modelId
      ) {
        const mId = String(evt.metadata.modelId);
        popularModels[mId] = (popularModels[mId] || 0) + 1;
      }

      // Cores
      if (evt.eventName === ANALYTICS_EVENTS.SELECT_COLOR) {
        const cKey = String(evt.metadata?.colorName || evt.metadata?.colorId || "Branco TX");
        popularColors[cKey] = (popularColors[cKey] || 0) + 1;
      }

      // Monitores
      if (evt.eventName === ANALYTICS_EVENTS.SELECT_MONITOR && evt.metadata?.monitorName) {
        const mKey = String(evt.metadata.monitorName);
        popularMonitors[mKey] = (popularMonitors[mKey] || 0) + 1;
      }

      // Impressoras
      if (evt.eventName === ANALYTICS_EVENTS.SELECT_PRINTER && evt.metadata?.printerName) {
        const pKey = String(evt.metadata.printerName);
        popularPrinters[pKey] = (popularPrinters[pKey] || 0) + 1;
      }

      // Origens de clique no WhatsApp
      if (evt.eventName === ANALYTICS_EVENTS.WHATSAPP_CLICK) {
        const wSrc = String(evt.metadata?.source || "floating_whatsapp_discreet");
        whatsappSources[wSrc] = (whatsappSources[wSrc] || 0) + 1;
      }
    }

    const totalSessions = allSessionIds.size;
    const homeSessions = sessionsByEvent[ANALYTICS_EVENTS.VIEW_HOME]?.size || 0;
    const topBaselineSessions = Math.max(totalSessions, homeSessions);

    const stages: FunnelStageMetric[] = [];
    let previousUnique = topBaselineSessions;

    FUNNEL_STAGES.forEach((stageDef, index) => {
      const rawCount = counts[stageDef.eventName] || 0;
      const stageUnique =
        index === 0
          ? topBaselineSessions
          : sessionsByEvent[stageDef.eventName]?.size || 0;

      let conversionFromPrev = 100;
      let dropoffFromPrev = 0;

      if (index === 0) {
        conversionFromPrev = topBaselineSessions > 0 ? 100 : 0;
        dropoffFromPrev = 0;
      } else if (previousUnique > 0) {
        conversionFromPrev = Math.min(100, Number(((stageUnique / previousUnique) * 100).toFixed(1)));
        dropoffFromPrev = Number((100 - conversionFromPrev).toFixed(1));
      } else {
        conversionFromPrev = stageUnique > 0 ? 100 : 0;
        dropoffFromPrev = stageUnique > 0 ? 0 : 100;
      }

      const overallConversion =
        topBaselineSessions > 0
          ? Math.min(100, Number(((stageUnique / topBaselineSessions) * 100).toFixed(2)))
          : 0;

      stages.push({
        stageId: stageDef.stageId,
        eventName: stageDef.eventName,
        label: stageDef.label,
        stepNumber: stageDef.stepNumber,
        count: index === 0 ? Math.max(rawCount, topBaselineSessions) : rawCount,
        uniqueSessions: stageUnique,
        conversionRateFromPrevious: conversionFromPrev,
        dropoffRateFromPrevious: dropoffFromPrev,
        overallConversionRate: overallConversion,
      });

      previousUnique = stageUnique;
    });

    const purchaseSessions = sessionsByEvent[ANALYTICS_EVENTS.PURCHASE]?.size || 0;
    const whatsappSessions = sessionsByEvent[ANALYTICS_EVENTS.WHATSAPP_CLICK]?.size || 0;
    const globalConversion =
      topBaselineSessions > 0 ? Number(((purchaseSessions / topBaselineSessions) * 100).toFixed(2)) : 0;
    const whatsappConversionRate =
      topBaselineSessions > 0 ? Number(((whatsappSessions / topBaselineSessions) * 100).toFixed(1)) : 0;

    const bottleneckInsights = this.generateBottleneckInsights(
      stages,
      totalSessions,
      counts[ANALYTICS_EVENTS.WHATSAPP_CLICK] || 0,
      counts[ANALYTICS_EVENTS.VIEW_3D_MODEL] || 0,
      counts[ANALYTICS_EVENTS.VIEW_FAQ] || 0
    );

    return {
      stages,
      totalSessions,
      totalEvents: filtered.length,
      globalConversionRate: globalConversion,
      whatsappClicks: counts[ANALYTICS_EVENTS.WHATSAPP_CLICK] || 0,
      whatsappUniqueSessions: whatsappSessions,
      whatsappConversionRate,
      view3dCount:
        (counts[ANALYTICS_EVENTS.VIEW_3D_MODEL] || 0) + (counts[ANALYTICS_EVENTS.INTERACT_3D] || 0),
      faqViewsCount: counts[ANALYTICS_EVENTS.VIEW_FAQ] || 0,
      popularModels,
      popularColors,
      popularMonitors,
      popularPrinters,
      whatsappSources,
      trafficSources,
      deviceBreakdown,
      bottleneckInsights,
    };
  }

  private generateBottleneckInsights(
    stages: FunnelStageMetric[],
    totalSessions: number,
    whatsappClicks: number,
    view3dCount: number,
    faqViewsCount: number
  ): FunnelBottleneckInsight[] {
    const insights: FunnelBottleneckInsight[] = [];

    if (totalSessions === 0) {
      insights.push({
        id: "ins_no_data",
        severity: "opportunity",
        stageId: "stage_home",
        stageLabel: "1. Visita Landing Page",
        title: "Aguardando Tráfego no Período Selecionado",
        diagnosis: "Ainda não há sessões registradas para o filtro de período/dispositivo ativo.",
        recommendation: "Selecione 'Todo o Período' ou navegue na loja para disparar eventos em tempo real.",
        metricBadge: "0 sessões",
      });
      return insights;
    }

    // Identifica maior gargalo entre etapas ativas
    let worstStage: FunnelStageMetric | null = null;
    for (let i = 1; i < stages.length; i++) {
      const prev = stages[i - 1];
      const curr = stages[i];
      if (prev.uniqueSessions >= 2 && curr.dropoffRateFromPrevious > (worstStage?.dropoffRateFromPrevious || 0)) {
        worstStage = curr;
      }
    }

    if (worstStage && worstStage.dropoffRateFromPrevious >= 50) {
      const recommendationsByStage: Record<string, string> = {
        stage_configurator:
          "Destaque o CTA 'Montar Meu Totem Agora' na primeira dobra e reforce que a simulação online leva menos de 1 minuto.",
        stage_model_selected:
          "Ao abrir o configurador, pré-selecione o modelo clicado na Home para avançar automaticamente à escolha de cor e periféricos.",
        stage_cart_added:
          "Exiba claramente o desconto de 17-18% no PIX e a mensagem 'Usinagem CNC sem sobretaxa para suas peças' junto ao botão Adicionar ao Carrinho.",
        stage_checkout:
          "No carrinho, mantenha o simulador de CEP rápido e botão direto 'Finalizar Pedido com PIX' visível no rodapé mobile.",
        stage_lead_captured:
          "Simplifique o preenchimento de dados no checkout com busca automática de endereço por CEP e máscara rápida de WhatsApp.",
        stage_pix_issued:
          "Garanta que a seleção da transportadora (PAC/SEDEX/Braspress) esteja pré-calculada para liberar a emissão do QR Code PIX em 1 clique.",
        stage_purchase_completed:
          "Acione recuperação ativa via WhatsApp para clientes que geraram o PIX Copia e Cola mas ainda não compensaram o pagamento.",
      };

      insights.push({
        id: `ins_bottleneck_${worstStage.stageId}`,
        severity: worstStage.dropoffRateFromPrevious >= 80 ? "critical" : "warning",
        stageId: worstStage.stageId,
        stageLabel: `${worstStage.stepNumber}. ${worstStage.label}`,
        title: `Maior Gargalo do Funil: ${worstStage.label} (${worstStage.dropoffRateFromPrevious}% de Abandono)`,
        diagnosis: `Das sessões que chegaram à etapa anterior, ${worstStage.dropoffRateFromPrevious}% não avançaram para "${worstStage.label}".`,
        recommendation:
          recommendationsByStage[worstStage.stageId] ||
          "Analise a fricção visual desta etapa no mobile e teste um CTA de apoio via WhatsApp.",
        metricBadge: `-${worstStage.dropoffRateFromPrevious}% drop-off`,
      });
    }

    // Insight de WhatsApp Assistido
    if (whatsappClicks > 0) {
      const waRate = Number(((whatsappClicks / Math.max(1, totalSessions)) * 100).toFixed(1));
      insights.push({
        id: "ins_whatsapp_channel",
        severity: "success",
        stageId: "stage_configurator",
        stageLabel: "Canal Comercial WhatsApp",
        title: `Conversão Assistida Ativa: ${whatsappClicks} clique(s) no WhatsApp (${waRate}% das visitas)`,
        diagnosis:
          "Compradores B2B frequentemente tiram dúvidas técnicas de furação VESA/impressora no WhatsApp antes de emitir o PIX.",
        recommendation:
          "Mantenha o atendimento técnico rápido no WhatsApp e envie o link direto do configurador pré-montado para fechar o pedido.",
        metricBadge: `${whatsappClicks} leads WhatsApp`,
      });
    }

    // Insight de Engajamento 3D e FAQ
    if (view3dCount > 0 || faqViewsCount > 0) {
      insights.push({
        id: "ins_engagement_3d_faq",
        severity: "opportunity",
        stageId: "stage_model_selected",
        stageLabel: "Engajamento Técnico (3D & FAQ)",
        title: `Interesse Técnico: ${view3dCount} interações 3D e ${faqViewsCount} consultas ao FAQ`,
        diagnosis:
          "Usuários que inspecionam o gabinete em 3D ou abrem dúvidas do FAQ demonstram alta intenção de compra.",
        recommendation:
          "Aproveite as perguntas mais abertas no FAQ para criar argumentos de venda diretos nos cards do configurador.",
        metricBadge: `${view3dCount + faqViewsCount} interações`,
      });
    }

    return insights;
  }

  // ============================================================================
  // GESTÃO DE SNAPSHOTS HISTÓRICOS (SALVAR E COMPARAR ANÁLISES NO FUTURO)
  // ============================================================================

  public getSnapshots(): AnalyticsSnapshot[] {
    this.loadFromDisk();
    return [...this.snapshots].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createSnapshot(input: {
    title: string;
    periodLabel?: string;
    siteVersion?: string;
    notes?: string;
    appliedImprovements?: string;
    futureGoals?: string;
    tags?: string[];
    webVitals?: WebVitalsBenchmark;
    realOrdersCount?: number;
    realRevenueCents?: number;
    periodFilter?: FunnelFilterOptions["period"];
  }): AnalyticsSnapshot {
    this.loadFromDisk();
    const funnel = this.calculateFunnelMetrics({ period: input.periodFilter || "all" });
    const counts = this.getCounts({ period: input.periodFilter || "all" });

    const newSnapshot: AnalyticsSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: input.title.trim() || `Análise de Funil — ${new Date().toLocaleDateString("pt-BR")}`,
      periodLabel: input.periodLabel?.trim() || "Período Integral",
      siteVersion: input.siteVersion?.trim() || siteConfig.version || "3.2.2",
      createdAt: new Date().toISOString(),
      notes: input.notes?.trim() || "",
      appliedImprovements: input.appliedImprovements?.trim() || "",
      futureGoals: input.futureGoals?.trim() || "",
      tags: Array.isArray(input.tags) && input.tags.length > 0 ? input.tags : [`v${siteConfig.version}`],
      webVitals: input.webVitals,
      metrics: {
        totalSessions: funnel.totalSessions,
        totalEvents: funnel.totalEvents,
        globalConversionRate: funnel.globalConversionRate,
        whatsappClicks: funnel.whatsappClicks,
        whatsappConversionRate: funnel.whatsappConversionRate,
        configuratorStarts: counts[ANALYTICS_EVENTS.START_CONFIGURATOR] || 0,
        cartAdditions: counts[ANALYTICS_EVENTS.ADD_TO_CART] || 0,
        checkoutsStarted: counts[ANALYTICS_EVENTS.BEGIN_CHECKOUT] || 0,
        leadsCaptured: counts[ANALYTICS_EVENTS.LEAD_SUBMITTED] || 0,
        pixGenerated: counts[ANALYTICS_EVENTS.PIX_GENERATED] || 0,
        purchasesCompleted: counts[ANALYTICS_EVENTS.PURCHASE] || 0,
        realOrdersCount: input.realOrdersCount || 0,
        realRevenueCents: input.realRevenueCents || 0,
        stages: funnel.stages,
        popularModels: funnel.popularModels,
        whatsappSources: funnel.whatsappSources,
        deviceBreakdown: funnel.deviceBreakdown,
      },
    };

    this.snapshots.unshift(newSnapshot);
    this.saveSnapshotsToDisk();
    return newSnapshot;
  }

  public deleteSnapshot(id: string): boolean {
    this.loadFromDisk();
    const initialLen = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.id !== id);
    if (this.snapshots.length !== initialLen) {
      this.saveSnapshotsToDisk();
      return true;
    }
    return false;
  }

  // ============================================================================
  // GESTÃO DO PLANO DE MELHORIAS CONTÍNUAS (CRO BACKLOG)
  // ============================================================================

  public getImprovements(): FunnelImprovementAction[] {
    this.loadFromDisk();
    return [...this.improvements].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public saveImprovement(
    input: Partial<FunnelImprovementAction> & { title: string }
  ): FunnelImprovementAction {
    this.loadFromDisk();
    const now = new Date().toISOString();

    if (input.id) {
      const idx = this.improvements.findIndex((item) => item.id === input.id);
      if (idx !== -1) {
        const updated: FunnelImprovementAction = {
          ...this.improvements[idx],
          ...input,
          title: input.title.trim(),
          updatedAt: now,
        };
        this.improvements[idx] = updated;
        this.saveImprovementsToDisk();
        return updated;
      }
    }

    const stageMatch = FUNNEL_STAGES.find((s) => s.stageId === input.targetStageId);
    const created: FunnelImprovementAction = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: input.title.trim(),
      targetStageId: input.targetStageId || "stage_home",
      targetStageLabel:
        input.targetStageLabel ||
        (stageMatch ? `${stageMatch.stepNumber}. ${stageMatch.label}` : "Funil Global"),
      problemIdentified: input.problemIdentified?.trim() || "",
      proposedAction: input.proposedAction?.trim() || "",
      expectedImpact: input.expectedImpact?.trim() || "",
      measuredResult: input.measuredResult?.trim() || "",
      priority: input.priority || "alta",
      status: input.status || "planejada",
      owner: input.owner?.trim() || "Engenharia & Produto",
      versionTag: input.versionTag?.trim() || `v${siteConfig.version}`,
      createdAt: now,
      updatedAt: now,
    };

    this.improvements.unshift(created);
    this.saveImprovementsToDisk();
    return created;
  }

  public deleteImprovement(id: string): boolean {
    this.loadFromDisk();
    const initialLen = this.improvements.length;
    this.improvements = this.improvements.filter((i) => i.id !== id);
    if (this.improvements.length !== initialLen) {
      this.saveImprovementsToDisk();
      return true;
    }
    return false;
  }

  public resetEventsWithAutoBackup(): AnalyticsSnapshot {
    const backup = this.createSnapshot({
      title: `Backup Automático Antes de Zeramento — ${new Date().toLocaleString("pt-BR")}`,
      notes: "Snapshot gerado automaticamente antes de limpar a contagem de eventos do ciclo atual.",
      tags: ["Auto-Backup", `v${siteConfig.version}`],
    });
    this.events = [];
    this.saveEventsToDisk();
    return backup;
  }
}

declare global {
  var __totemAnalyticsStore: AnalyticsServerStore | undefined;
}

export const analyticsServerStore =
  globalThis.__totemAnalyticsStore || (globalThis.__totemAnalyticsStore = new AnalyticsServerStore());
