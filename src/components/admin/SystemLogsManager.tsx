"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  CreditCard,
  Users,
  Tag,
  Truck,
  Layers,
  Lock,
  Server,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Clock,
  Filter,
} from "lucide-react";
import { Card, Button } from "@/components/ui";

interface LogItem {
  id: string;
  timestamp: string;
  category: "orders" | "payments" | "customers" | "vouchers" | "shipping" | "catalog" | "auth" | "system";
  level: "info" | "success" | "warn" | "error";
  action: string;
  target: string;
  details: string;
  actor: string;
  metadata?: Record<string, any>;
}

export const SystemLogsManager: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (search) params.set("search", search);
      params.set("limit", "150");

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setLogs(json.logs || []);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.error("Erro ao buscar logs do ecossistema:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [categoryFilter, levelFilter]);

  // Busca textual com debounce simples
  useEffect(() => {
    const handler = setTimeout(() => {
      loadLogs();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setConfirmClearOpen(false);
        await loadLogs();
      }
    } catch (err) {
      console.error("Erro ao limpar logs:", err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `totempro_logs_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copyMetadata = (id: string, metadata: any) => {
    navigator.clipboard.writeText(JSON.stringify(metadata, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Métricas
  const totalSuccess = logs.filter((l) => l.level === "success").length;
  const totalWarn = logs.filter((l) => l.level === "warn").length;
  const totalError = logs.filter((l) => l.level === "error").length;

  const getCategoryConfig = (cat: string) => {
    switch (cat) {
      case "orders":
        return { label: "Pedidos", icon: Package, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
      case "payments":
        return { label: "Pagamentos", icon: CreditCard, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "customers":
        return { label: "Clientes", icon: Users, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
      case "vouchers":
        return { label: "Vouchers", icon: Tag, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "shipping":
        return { label: "Frete", icon: Truck, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
      case "catalog":
        return { label: "Catálogo", icon: Layers, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
      case "auth":
        return { label: "Acesso", icon: Lock, color: "text-slate-300 bg-slate-500/10 border-slate-500/20" };
      default:
        return { label: "Sistema", icon: Server, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "success":
        return {
          icon: CheckCircle2,
          classes: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          label: "Sucesso",
        };
      case "warn":
        return {
          icon: AlertTriangle,
          classes: "text-amber-400 bg-amber-500/10 border-amber-500/30",
          label: "Atenção",
        };
      case "error":
        return {
          icon: AlertCircle,
          classes: "text-rose-400 bg-rose-500/10 border-rose-500/30",
          label: "Erro",
        };
      default:
        return {
          icon: Info,
          classes: "text-sky-400 bg-sky-500/10 border-sky-500/30",
          label: "Info",
        };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "agora mesmo";
      if (diffMin < 60) return `há ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `há ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      return `há ${diffDays} d`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Eventos Totais</p>
            <p className="text-2xl font-black text-white mt-1">{total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Operações com Sucesso</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{totalSuccess}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alertas & Avisos</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{totalWarn}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Falhas / Erros</p>
            <p className="text-2xl font-black text-rose-400 mt-1">{totalError}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Barra de Filtros e Ferramentas */}
      <Card className="p-4 bg-slate-900 border-slate-800 space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Busca Textual */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ação, alvo, ator, pedido ou mensagem de log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={isLoading}
              className="text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={logs.length === 0}
              className="text-xs font-semibold gap-1.5 text-slate-300 hover:text-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmClearOpen(true)}
              disabled={logs.length === 0}
              className="text-xs font-semibold gap-1.5 bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white border border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </Button>
          </div>
        </div>

        {/* Seletores de Filtros em Badges Modernas */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Filter className="w-3 h-3" />
            <span>Módulos:</span>
          </span>

          {[
            { id: "all", label: "Todos" },
            { id: "orders", label: "Pedidos" },
            { id: "payments", label: "Pagamentos" },
            { id: "customers", label: "Clientes" },
            { id: "vouchers", label: "Vouchers" },
            { id: "shipping", label: "Frete" },
            { id: "catalog", label: "Catálogo" },
            { id: "auth", label: "Acessos" },
            { id: "system", label: "Sistema" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                categoryFilter === cat.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}

          <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mr-1">
            Nível:
          </span>

          {[
            { id: "all", label: "Todos" },
            { id: "success", label: "Sucesso" },
            { id: "info", label: "Info" },
            { id: "warn", label: "Atenção" },
            { id: "error", label: "Erro" },
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => setLevelFilter(lvl.id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                levelFilter === lvl.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Feed da Linha do Tempo (Interactive Audit Timeline) */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <Card className="p-12 bg-slate-900 border-slate-800 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="font-bold text-white text-sm">Nenhum evento registrado com os filtros aplicados</p>
            <p className="text-xs text-slate-400">
              Conforme as interações ocorrerem no ecossistema (pedidos, pagamentos, logins), os eventos aparecerão aqui.
            </p>
          </Card>
        ) : (
          logs.map((log) => {
            const cat = getCategoryConfig(log.category);
            const lvl = getLevelBadge(log.level);
            const CatIcon = cat.icon;
            const LvlIcon = lvl.icon;
            const isExpanded = expandedLogId === log.id;
            const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

            return (
              <Card
                key={log.id}
                className="p-4 bg-slate-900/90 border-slate-800 hover:border-slate-700/80 transition-all duration-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Bloco de Ícone + Badges + Ação */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${cat.color}`}
                    >
                      <CatIcon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cat.color}`}>
                          {cat.label}
                        </span>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${lvl.classes}`}>
                          <LvlIcon className="w-3 h-3" />
                          <span>{lvl.label}</span>
                        </span>

                        <span className="font-black text-white text-xs sm:text-sm tracking-tight">
                          {log.action}
                        </span>

                        {log.target && (
                          <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                            {log.target}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{log.details}</p>
                    </div>
                  </div>

                  {/* Ator + Timestamp */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 text-[11px] text-slate-400 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>{log.actor}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 font-mono text-[10px]" title={log.timestamp}>
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(log.timestamp)}</span>
                      <span className="hidden lg:inline text-slate-600">
                        • {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acordeão de Metadados JSON */}
                {hasMetadata && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span>{isExpanded ? "Ocultar Dados Técnicos (JSON)" : "Inspecionar Payload & Metadados"}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 relative font-mono text-[11px] text-slate-300 animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={() => copyMetadata(log.id, log.metadata)}
                          className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
                          title="Copiar JSON"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                        <pre className="overflow-x-auto pr-16">{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de Confirmação para Limpeza de Logs */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setConfirmClearOpen(false)}
        >
          <div
            className="bg-slate-900 border-2 border-rose-500/40 rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Limpar Histórico de Auditoria?</h3>
                <p className="text-xs text-slate-400">
                  Esta ação reiniciará a base de logs persistente do ecossistema.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 p-3 rounded-xl bg-slate-950 border border-slate-800">
              Todos os {logs.length} eventos registrados serão removidos. Uma entrada informando a limpeza pelo
              administrador será criada automaticamente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClearOpen(false)}
                disabled={isClearing}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleClearLogs}
                disabled={isClearing}
                className="gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Limpando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar e Limpar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
