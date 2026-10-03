/**
 * Servidor de Agregação de Analytics e Métricas do Funil
 * Totem Landing Page — X-Point Soluções
 */

import { ANALYTICS_EVENTS, AnalyticsEventType, FUNNEL_STAGES, FunnelStageMetric } from "./events";
import { getServerDatabases } from "@/lib/appwrite/server";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";
import { ID } from "node-appwrite";

export interface StoredAnalyticsEvent {
  id: string;
  eventName: AnalyticsEventType;
  sessionId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

// In-Memory Ring Buffer para respostas de altíssima performance no Next.js
class AnalyticsServerStore {
  private events: StoredAnalyticsEvent[] = [];
  private maxEvents = 2000;
  private eventCounts: Record<string, number> = {};

  constructor() {
    // Inicializa contadores zerados para todos os eventos canônicos
    Object.values(ANALYTICS_EVENTS).forEach((ev) => {
      this.eventCounts[ev] = 0;
    });
  }

  public async recordEvent(event: Omit<StoredAnalyticsEvent, "id">): Promise<StoredAnalyticsEvent> {
    const fullEvent: StoredAnalyticsEvent = {
      ...event,
      id: "evt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36),
    };

    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    this.eventCounts[fullEvent.eventName] = (this.eventCounts[fullEvent.eventName] || 0) + 1;

    // Persistência assíncrona no Appwrite se configurado
    this.persistToAppwriteAsync(fullEvent).catch(() => {});

    return fullEvent;
  }

  private async persistToAppwriteAsync(event: StoredAnalyticsEvent): Promise<void> {
    try {
      const db = getServerDatabases();
      // Tentativa de salvar na collection 'analytics_events' caso criada
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
      // Falha esperada caso a collection analytics_events ainda não tenha sido provisionada no Appwrite
    }
  }

  public getRecentEvents(limit = 100): StoredAnalyticsEvent[] {
    return this.events.slice(0, limit);
  }

  public getCounts(): Record<string, number> {
    return { ...this.eventCounts };
  }

  public calculateFunnelMetrics(): {
    stages: FunnelStageMetric[];
    totalSessions: number;
    globalConversionRate: number;
    popularModels: Record<string, number>;
  } {
    const stages: FunnelStageMetric[] = [];
    const topOfFunnelCount = this.eventCounts[ANALYTICS_EVENTS.VIEW_HOME] || 0;
    let previousCount = topOfFunnelCount;

    // Métricas por modelo
    const popularModels: Record<string, number> = {};
    for (const evt of this.events) {
      if (evt.eventName === ANALYTICS_EVENTS.SELECT_CABINET_MODEL && evt.metadata?.modelId) {
        const mId = String(evt.metadata.modelId);
        popularModels[mId] = (popularModels[mId] || 0) + 1;
      }
    }

    FUNNEL_STAGES.forEach((stageDef, index) => {
      const count = this.eventCounts[stageDef.eventName] || 0;
      let conversionFromPrev = 100;
      let dropoffFromPrev = 0;

      if (index === 0) {
        conversionFromPrev = 100;
        dropoffFromPrev = 0;
      } else if (previousCount > 0) {
        conversionFromPrev = Math.min(100, Number(((count / previousCount) * 100).toFixed(1)));
        dropoffRateFromPrevious: dropoffFromPrev = Number((100 - conversionFromPrev).toFixed(1));
      } else {
        conversionFromPrev = count > 0 ? 100 : 0;
        dropoffFromPrev = count > 0 ? 0 : 100;
      }

      const overallConversion =
        topOfFunnelCount > 0
          ? Number(((count / topOfFunnelCount) * 100).toFixed(2))
          : count > 0
          ? 100
          : 0;

      stages.push({
        stageId: stageDef.stageId,
        eventName: stageDef.eventName,
        label: stageDef.label,
        stepNumber: stageDef.stepNumber,
        count,
        conversionRateFromPrevious: conversionFromPrev,
        dropoffRateFromPrevious: dropoffFromPrev,
        overallConversionRate: overallConversion,
      });

      previousCount = count;
    });

    const purchases = this.eventCounts[ANALYTICS_EVENTS.PURCHASE] || 0;
    const globalConversion =
      topOfFunnelCount > 0 ? Number(((purchases / topOfFunnelCount) * 100).toFixed(2)) : 0;

    // Sessões únicas calculadas
    const uniqueSessions = new Set(this.events.map((e) => e.sessionId)).size;

    return {
      stages,
      totalSessions: uniqueSessions || (topOfFunnelCount > 0 ? topOfFunnelCount : 0),
      globalConversionRate: globalConversion,
      popularModels,
    };
  }
}

// Instância singleton global no processo Node
declare global {
  var __totemAnalyticsStore: AnalyticsServerStore | undefined;
}

export const analyticsServerStore =
  globalThis.__totemAnalyticsStore || (globalThis.__totemAnalyticsStore = new AnalyticsServerStore());
