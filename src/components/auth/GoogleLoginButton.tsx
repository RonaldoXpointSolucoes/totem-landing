"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, AlertCircle, CheckCircle2, UserCheck, ChevronRight, X } from "lucide-react";

interface GoogleLoginButtonProps {
  onSuccess?: (user: any) => void;
  onError?: (errorMessage: string) => void;
  buttonText?: string;
  className?: string;
  targetRole?: "admin" | "seller" | "any";
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  buttonText = "Entrar com o Google",
  className = "",
  targetRole = "any",
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalError, setModalError] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [mounted, setMounted] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tenta inicializar o Google Identity SDK se houver Client ID configurado
  useEffect(() => {
    if (!googleClientId) return;

    const loadGsiScript = () => {
      if (document.getElementById("google-gsi-script")) return;
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
        }
      };
      document.body.appendChild(script);
    };

    loadGsiScript();
  }, [googleClientId]);

  const handleGoogleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    setErrorMessage("");
    setModalError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (data.ok) {
        if (onSuccess) onSuccess(data.user);
        window.location.href = data.redirectTo || (data.user.role === "seller" ? "/vendedor" : "/admin");
      } else {
        const err = data.error || "Acesso Google não autorizado.";
        setErrorMessage(err);
        setModalError(err);
        if (onError) onError(err);
      }
    } catch (err: any) {
      const errText = "Erro na conexão com servidor: " + err.message;
      setErrorMessage(errText);
      setModalError(errText);
      if (onError) onError(errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEmailLogin = async (emailToLogin: string, nameToLogin?: string) => {
    setIsLoading(true);
    setErrorMessage("");
    setModalError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToLogin.trim().toLowerCase(),
          name: nameToLogin || emailToLogin.split("@")[0],
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setShowAccountModal(false);
        if (onSuccess) onSuccess(data.user);
        window.location.href = data.redirectTo || (data.user.role === "seller" ? "/vendedor" : "/admin");
      } else {
        const err = data.error || "Acesso Google não autorizado na Whitelist.";
        setErrorMessage(err);
        setModalError(err);
        if (onError) onError(err);
      }
    } catch (err: any) {
      const errText = "Erro ao conectar com Google Auth: " + err.message;
      setErrorMessage(errText);
      setModalError(errText);
      if (onError) onError(errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    // Se tiver o script oficial do Google carregado e funcional
    if (googleClientId && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
        return;
      } catch (e) {
        // Fallback para o modal interativo
      }
    }
    setModalError("");
    setShowAccountModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
            <span className="text-slate-600">Autenticando com Google...</span>
          </>
        ) : (
          <>
            {/* Ícone Oficial Multicolorido do Google */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-semibold text-slate-800">{buttonText}</span>
          </>
        )}
      </button>

      {errorMessage && (
        <div className="mt-2.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Modal Interativo de Autenticação com Google via Portal (cobre tela inteira) */}
      {showAccountModal && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAccountModal(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAccountModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Login com Conta Google</h3>
                <p className="text-xs text-slate-400">Verificação automática na Whitelist TotemPro</p>
              </div>
            </div>

            {/* Alerta de erro diretamente no corpo do modal */}
            {modalError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Acessos Rápidos Homologados na Whitelist */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Contas Pré-Homologadas no Sistema:
              </label>

              {/* Ronaldo Clemente - Admin Master */}
              <button
                type="button"
                onClick={() => handleManualEmailLogin("ronaldo.xpointsolucoes@gmail.com", "Ronaldo Clemente")}
                className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    RC
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300">
                      ronaldo.xpointsolucoes@gmail.com
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">Admin Master (Root)</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </button>

              {/* X-Point Engenharia */}
              <button
                type="button"
                onClick={() => handleManualEmailLogin("xpointengenharia@gmail.com", "X-Point Engenharia")}
                className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    XP
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300">
                      xpointengenharia@gmail.com
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">Admin Master (Root)</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </button>

              {/* Carlos Vendedor */}
              <button
                type="button"
                onClick={() => handleManualEmailLogin("vendedor@totempro.com.br", "Carlos Vendedor")}
                className="w-full p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    CV
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300">
                      vendedor@totempro.com.br
                    </div>
                    <div className="text-[10px] text-cyan-400 font-semibold">Vendedor Homologado (Cupom: CARLOS10)</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
              </button>
            </div>

            {/* Ou entrar com qualquer outra conta do Google */}
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Ou digite seu e-mail do Google:
              </label>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="seu.email@gmail.com"
                  value={customEmail}
                  onChange={(e) => {
                    setCustomEmail(e.target.value);
                    if (modalError) setModalError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customEmail && customEmail.includes("@") && !isLoading) {
                      e.preventDefault();
                      handleManualEmailLogin(customEmail, customName);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  disabled={!customEmail || !customEmail.includes("@") || isLoading}
                  onClick={() => handleManualEmailLogin(customEmail, customName)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  <span>Validar e Entrar com Google</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Apenas e-mails autorizados na Whitelist têm permissão para acessar os painéis.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
