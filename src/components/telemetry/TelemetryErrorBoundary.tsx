"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { sendTelemetryReport } from "@/lib/telemetry/clientTelemetry";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class TelemetryErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    try {
      const componentStack = errorInfo.componentStack || "";
      const firstComponentMatch = componentStack.match(/in\s+([A-Za-z0-9_]+)/);
      const componentName = firstComponentMatch ? firstComponentMatch[1] : undefined;

      sendTelemetryReport({
        type: "react_error_boundary",
        severity: "critical",
        message: `React Crash em <${componentName || "Componente"}>: ${error.message}`,
        stack: `${error.stack || ""}\n\nComponent Stack:${componentStack}`,
        componentName,
      });
    } catch {}
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0a0c12]">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {this.props.fallbackTitle || "Instabilidade temporária detectada"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {this.props.fallbackMessage ||
                  "Identificamos um erro de renderização nesta seção. O relatório detalhado foi enviado automaticamente para nossa central de diagnóstico da engenharia."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </button>
            </div>

            {this.state.error && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-mono flex items-center gap-1 cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  {this.state.showDetails ? "Ocultar diagnóstico técnico" : "Ver diagnóstico técnico"}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-3 p-3 bg-slate-950 text-rose-300 text-[11px] font-mono rounded-xl overflow-x-auto max-h-48 border border-rose-900/40">
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
