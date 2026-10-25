"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  Compass,
  Server,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Laptop,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  Sparkles,
  Bug,
  Search,
  Filter,
  Info,
} from "lucide-react";
import { Card, Button } from "@/components/ui";
import {
  TelemetryErrorPayload,
  TelemetryStats,
  TelemetryErrorType,
  TelemetryErrorSeverity,
} from "@/lib/telemetry/types";
import { captureManualError } from "@/lib/telemetry/clientTelemetry";

export const TelemetryErrorsManager: React.FC = () => {
  const [errors, setErrors] = useState<TelemetryErrorPayload[]>([]);
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filtros
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const [search, setSearch] = useState("");

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);

  const fetchErrors = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (onlyUnresolved) params.set("resolved", "false");
      if (search) params.set("search", search);
      params.set("limit", "100");

      const res = await fetch(`/api/telemetry/errors?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setErrors(data.errors || []);
        setStats(data.stats || null);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Erro ao carregar telemetria de erros:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [typeFilter, severityFilter, onlyUnresolved]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchErrors();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Marca um erro como resolvido
  const handleResolve = async (id: string) => {
    try {
      const res = await fetch("/api/telemetry/errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: "Resolvido via painel de telemetria" }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchErrors();
      }
    } catch (err) {
      console.error("Erro ao resolver erro:", err);
    }
  };

  // Marca todos como resolvidos
  const handleResolveAll = async () => {
    try {
      const res = await fetch("/api/telemetry/errors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolveAll: true, notes: "Resolvidos em lote pelo administrador" }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchErrors();
      }
    } catch (err) {
      console.error("Erro ao resolver todos os erros:", err);
    }
  };

  // Limpa histórico
  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/telemetry/errors", { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setConfirmClearOpen(false);
        await fetchErrors();
      }
    } catch (err) {
      console.error("Erro ao limpar telemetria:", err);
    }
  };

  // Dispara erro simulado de teste
  const handleTriggerTestError = () => {
    captureManualError(
      new Error(`[TESTE DE TELEMETRIA] Simulação de falha controlada em ${window.location.pathname}`),
      {
        type: "navigation_error",
        severity: "warning",
        componentName: "TelemetryErrorsManager",
        message: "Teste de verificação do sentinela de erros e navegação",
      }
    );

    setTestSuccessMsg("Evento de teste disparado com sucesso! Atualizando...");
    setTimeout(() => {
      fetchErrors();
      setTestSuccessMsg(null);
    }, 1200);
  };

  // Copia relatório completo para colar para a IA
  const handleCopyReportForAI = () => {
    if (!stats) return;

    const unresolvedErrors = errors.filter((e) => !e.resolved);
    const summary = [
      `# 📋 Relatório de Diagnóstico de Falhas — Totem Pro (${new Date().toLocaleString("pt-BR")})`,
      `**URL do Site:** https://totem.xpointsolucoes.com.br/`,
      `**Índice de Estabilidade:** ${stats.stabilityScore}%`,
      `**Erros Críticos Ativos:** ${stats.criticalCount}`,
      `**Falhas de Navegação:** ${stats.navigationErrorCount}`,
      `**Falhas de API / Rede:** ${stats.apiFailureCount}`,
      `**Total de Erros Pendentes:** ${unresolvedErrors.length}`,
      "",
      "## 🚨 Ocorrências Recentes para Análise & Correção:",
      ...unresolvedErrors.slice(0, 10).map((err, i) => {
        return [
          `### [${i + 1}] ${err.severity.toUpperCase()} | ${err.type} em \`${err.pathname}\``,
          `- **Mensagem:** ${err.message}`,
          `- **Ocorrências:** ${err.occurrences}x (Primeira: ${err.firstSeen} | Última: ${err.lastSeen})`,
          `- **Dispositivo:** ${err.device?.type || "desktop"} (${err.device?.viewport || "n/a"})`,
          `- **Navegador:** ${err.device?.userAgent?.substring(0, 120) || "n/a"}`,
          `- **Últimos Passos (Breadcrumbs):**`,
          ...(err.breadcrumbs?.map((b) => `  * [${b.timestamp}] (${b.category}): ${b.message}`) || ["  * Nenhum rastro"]),
          `- **Stack Trace:**`,
          "```",
          err.stack || "Nenhum stack disponível",
          "```",
          "",
        ].join("\n");
      }),
      "Por favor, analise a causa raiz dos erros acima, identifique os arquivos responsáveis e proponha/aplique as correções no código.",
    ].join("\n");

    navigator.clipboard.writeText(summary);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // Copia diagnóstico de um erro individual
  const handleCopySingleError = (err: TelemetryErrorPayload) => {
    const text = [
      `### 🔍 Diagnóstico de Erro: ${err.type} em ${err.pathname}`,
      `- **ID:** ${err.id}`,
      `- **Gravidade:** ${err.severity}`,
      `- **Mensagem:** ${err.message}`,
      `- **Dispositivo:** ${err.device?.type} (${err.device?.viewport})`,
      `- **URL:** ${err.url}`,
      `- **Ocorrências:** ${err.occurrences}`,
      `- **Breadcrumbs:**`,
      ...(err.breadcrumbs?.map((b) => `  * ${b.timestamp} [${b.category}] ${b.message}`) || []),
      `- **Stack Trace:**`,
      "```",
      err.stack || "Sem stack",
      "```",
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedId(err.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getSeverityBadge = (sev: TelemetryErrorSeverity) => {
    switch (sev) {
      case "critical":
        return "bg-rose-500/10 text-rose-500 border-rose-500/30";
      case "error":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case "warning":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getTypeIcon = (type: TelemetryErrorType) => {
    switch (type) {
      case "navigation_error":
        return <Compass className="w-4 h-4 text-purple-400" />;
      case "api_network_failure":
        return <Server className="w-4 h-4 text-cyan-400" />;
      case "react_error_boundary":
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      default:
        return <Bug className="w-4 h-4 text-amber-400" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `há ${diffSec}s`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `há ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `há ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `há ${diffDays}d`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificação de teste */}
      {testSuccessMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{testSuccessMsg}</span>
        </div>
      )}

      {/* Cabeçalho de Status e Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Índice de Estabilidade */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estabilidade Geral</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">
              {stats ? `${stats.stabilityScore}%` : "100%"}
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-1 font-medium">
              {stats && stats.criticalCount > 0
                ? `${stats.criticalCount} críticos pendentes`
                : "Zero falhas críticas ativas"}
            </p>
          </div>
        </Card>

        {/* Card 2: Erros Críticos */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Erros Críticos</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className={`text-3xl font-extrabold ${stats && stats.criticalCount > 0 ? "text-rose-400" : "text-white"}`}>
              {stats?.criticalCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Requerem correção imediata</p>
          </div>
        </Card>

        {/* Card 3: Falhas de Navegação */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Navegação & Rotas</span>
            <Compass className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">
              {stats?.navigationErrorCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">404s ou chunks de rotas</p>
          </div>
        </Card>

        {/* Card 4: Falhas de API & Rede */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>APIs & Conexão</span>
            <Server className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">
              {stats?.apiFailureCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Status 4xx/5xx ou offline</p>
          </div>
        </Card>

        {/* Card 5: Ocorrências 24h */}
        <Card className="p-5 bg-slate-900/60 border-slate-800 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Últimas 24 horas</span>
            <Bug className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white">
              {stats?.errorsLast24h || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats?.unresolvedCount || 0} não resolvidos
            </p>
          </div>
        </Card>
      </div>

      {/* Barra de Ações Principais para IA & Engenharia */}
      <Card className="p-4 sm:p-5 bg-slate-900/80 border-slate-800 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm sm:text-base">
                Central de Telemetria e Diagnóstico da IA
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Ao Vivo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Captura em segundo plano todas as falhas de navegação, rotas e APIs dos clientes em produção.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão Copiar Relatório para IA */}
            <Button
              onClick={handleCopyReportForAI}
              variant="outline"
              size="sm"
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm"
              title="Gera um relatório técnico pronto para colar na conversa com o Antigravity"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Relatório Copiado!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copiar Relatório para IA (Antigravity)</span>
                </>
              )}
            </Button>

            {/* Botão Disparar Erro de Teste */}
            <Button
              onClick={handleTriggerTestError}
              variant="outline"
              size="sm"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Testar Captura</span>
            </Button>

            {/* Atualizar */}
            <Button
              onClick={fetchErrors}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </Button>

            {/* Resolver Todos */}
            {errors.some((e) => !e.resolved) && (
              <Button
                onClick={handleResolveAll}
                variant="outline"
                size="sm"
                className="bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border-emerald-800/40 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resolver Todos</span>
              </Button>
            )}

            {/* Limpar Histórico */}
            <Button
              onClick={() => setConfirmClearOpen(true)}
              variant="outline"
              size="sm"
              className="bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border-rose-900/40 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </Button>
          </div>
        </div>

        {/* Modal de confirmação de limpeza */}
        {confirmClearOpen && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Deseja realmente apagar todos os registros de telemetria salvos?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Confirmar Limpeza
              </button>
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por rota, mensagem, stack ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Filtro de Tipo */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos os Tipos</option>
            <option value="navigation_error">🧭 Navegação & Rotas</option>
            <option value="api_network_failure">⚡ Falhas de API / Rede</option>
            <option value="react_error_boundary">🛡️ React Crashes</option>
            <option value="js_runtime_error">⚠️ Runtime JavaScript</option>
            <option value="unhandled_rejection">⚡ Promises Rejeitadas</option>
            <option value="asset_load_failure">📦 Assets & Modelos 3D</option>
          </select>

          {/* Filtro de Gravidade */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas as Gravidades</option>
            <option value="critical">🔴 Apenas Críticos</option>
            <option value="error">🟡 Erros</option>
            <option value="warning">🔵 Avisos</option>
          </select>

          {/* Switch Apenas Não Resolvidos */}
          <label className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={onlyUnresolved}
              onChange={(e) => setOnlyUnresolved(e.target.checked)}
              className="rounded border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Apenas Não Resolvidos</span>
          </label>
        </div>
      </div>

      {/* Lista de Erros Registrados */}
      {errors.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900/40 border-slate-800/80 rounded-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-200 text-base">
              Nenhuma falha de navegação ou erro registrado!
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              O sentinela de telemetria está monitorando ativamente todas as páginas, requisições de API e interações do usuário.
            </p>
          </div>
          <button
            onClick={handleTriggerTestError}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            Disparar um erro de teste para validar
          </button>
        </Card>
      ) : (
        <div className="space-y-3">
          {errors.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <Card
                key={item.id}
                className={`bg-slate-900/70 border rounded-2xl transition-all ${
                  item.resolved
                    ? "border-slate-800/60 opacity-60"
                    : item.severity === "critical"
                    ? "border-rose-500/40 shadow-lg shadow-rose-950/10"
                    : "border-slate-800"
                }`}
              >
                {/* Linha Resumo */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/30 rounded-2xl"
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 shrink-0 mt-0.5 sm:mt-0">
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>

                        <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40">
                          {item.pathname}
                        </span>

                        {item.occurrences > 1 && (
                          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                            {item.occurrences}x
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500">
                          {formatRelativeTime(item.lastSeen)}
                        </span>

                        {item.resolved && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            ✓ Resolvido
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-200 truncate">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Dispositivo */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {item.device?.type === "mobile" ? (
                        <Smartphone className="w-3 h-3 text-cyan-400" />
                      ) : item.device?.type === "tablet" ? (
                        <Tablet className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Laptop className="w-3 h-3 text-cyan-400" />
                      )}
                      <span className="capitalize">{item.device?.type || "desktop"}</span>
                    </div>

                    {/* Botão de Expansão */}
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Acordeão de Detalhes Técnicos Expandido */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-800/80 mt-2 space-y-4">
                    {/* Botões de Ação para o Erro */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopySingleError(item);
                          }}
                          size="sm"
                          variant="outline"
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Copiar Diagnóstico para IA</span>
                            </>
                          )}
                        </Button>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir URL</span>
                        </a>
                      </div>

                      {!item.resolved && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(item.id);
                          }}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar como Resolvido</span>
                        </Button>
                      )}
                    </div>

                    {/* Mensagem Completa */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                        Mensagem de Erro:
                      </span>
                      <p className="font-mono text-rose-300 break-all">{item.message}</p>
                    </div>

                    {/* Stack Trace */}
                    {item.stack && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                          Stack Trace Completo:
                        </span>
                        <pre className="p-3 bg-slate-950 text-slate-300 text-[11px] font-mono rounded-xl border border-slate-800 overflow-x-auto max-h-56 leading-relaxed">
                          {item.stack}
                        </pre>
                      </div>
                    )}

                    {/* Breadcrumbs / Passos Anteriores do Usuário */}
                    {item.breadcrumbs && item.breadcrumbs.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                          Passos do Usuário Antes do Erro (Breadcrumbs):
                        </span>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                          {item.breadcrumbs.map((b, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2 text-slate-400">
                              <span className="text-slate-600 text-[10px]">[{b.timestamp}]</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-slate-300 uppercase font-bold">
                                {b.category}
                              </span>
                              <span className="text-slate-200">{b.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadados Técnicos do Cliente */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                          Dispositivo & Tela:
                        </span>
                        <p className="text-slate-300 font-mono text-[11px]">
                          {item.device?.screen} (viewport: {item.device?.viewport})
                        </p>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                          Conexão de Rede:
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          {item.network?.online !== false ? (
                            <>
                              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Online ({item.network?.effectiveType || "4g"})</span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-rose-400">Offline</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                          Usuário Identificado:
                        </span>
                        <p className="text-slate-300 font-mono text-[11px] truncate">
                          {item.user?.email || "Anônimo (Cliente)"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
