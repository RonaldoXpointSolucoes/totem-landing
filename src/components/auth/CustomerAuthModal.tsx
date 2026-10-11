"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Smartphone, Mail, User, ArrowRight, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { formatPhone, normalizePhone } from "@/lib/customers/phoneUtils";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: any) => void;
  initialTab?: "whatsapp" | "google";
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "whatsapp",
}) => {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "google">(initialTab);
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleNameInput, setGoogleNameInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (raw.length <= 11) {
      setPhoneInput(formatPhone(raw));
    }
    if (errorMsg) setErrorMsg("");
  };

  const handleWhatsappSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = normalizePhone(phoneInput);
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMsg("Informe um número de WhatsApp válido com DDD (ex: 11 98888-7777).");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "whatsapp",
          whatsapp: cleanDigits,
          name: nameInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg("Identificado com sucesso!");
        if (onSuccess) onSuccess(data.customer);
        setTimeout(() => {
          onClose();
          window.location.href = "/cliente";
        }, 600);
      } else {
        setErrorMsg(data.error || "Falha ao entrar com WhatsApp.");
      }
    } catch (err: any) {
      setErrorMsg("Erro de comunicação: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async (emailToLogin: string, nameToLogin?: string) => {
    const cleanEmail = emailToLogin.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Informe um e-mail válido da sua Conta Google.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "google",
          email: cleanEmail,
          name: nameToLogin || cleanEmail.split("@")[0],
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg("Autenticado com Google!");
        if (onSuccess) onSuccess(data.customer);
        setTimeout(() => {
          onClose();
          window.location.href = "/cliente";
        }, 600);
      } else {
        setErrorMsg(data.error || "Falha ao autenticar com Google.");
      }
    } catch (err: any) {
      setErrorMsg("Erro de comunicação com o servidor: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-black/10 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200 text-[#1d1d1f] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0071e3] dark:text-cyan-400 text-[10px] font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-900">
            <ShieldCheck className="w-3 h-3" />
            <span>Área do Cliente • TotemPro</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Acesse seus Pedidos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o corte na Router CNC, faturamento Pix e envio do seu totem.
          </p>
        </div>

        {/* Abas: WhatsApp ou Google */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-black/5 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("whatsapp");
              setErrorMsg("");
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "whatsapp"
                ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("google");
              setErrorMsg("");
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "google"
                ? "bg-white dark:bg-slate-800 text-[#0071e3] dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
            <span>Conta Google</span>
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ABA 1: WHATSAPP */}
        {activeTab === "whatsapp" && (
          <form onSubmit={handleWhatsappSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Seu WhatsApp com DDD *
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="(11) 98888-7777"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-black/15 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Se você já comprou com este número, todos os seus totens serão localizados automaticamente.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Seu Nome Completo (opcional se for primeiro acesso)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-black/15 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !phoneInput}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Entrar / Localizar Pedidos</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ABA 2: CONTA GOOGLE */}
        {activeTab === "google" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                E-mail da sua Conta Google
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="seu.email@gmail.com"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && googleEmailInput) {
                      e.preventDefault();
                      handleGoogleSubmit(googleEmailInput, googleNameInput);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-black/15 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Seu Nome (opcional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nome de exibição"
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-black/15 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-blue-500 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading || !googleEmailInput}
              onClick={() => handleGoogleSubmit(googleEmailInput, googleNameInput)}
              className="w-full py-3 bg-[#0071e3] hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Continuar com Google</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-black/5 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Seus dados estão protegidos sob conexão criptografada SSL.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
