"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Zap,
  Globe,
  Share2,
  BarChart,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

interface SettingsState {
  gaMeasurementId: string;
  googleAdsId: string;
  googleAdsPurchaseLabel: string;
  googleAdsLeadLabel: string;
  gtmId: string;
  metaPixelId: string;
  tiktokPixelId: string;
  indexNowKey: string;
}

export function MarketingSettingsManager() {
  const [settings, setSettings] = useState<SettingsState>({
    gaMeasurementId: "",
    googleAdsId: "",
    googleAdsPurchaseLabel: "",
    googleAdsLeadLabel: "",
    gtmId: "",
    metaPixelId: "",
    tiktokPixelId: "",
    indexNowKey: "f8a129d3c54e48b8b9812738fa092cb1",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // Estados dos disparadores de Ping
  const [isPingingIndexNow, setIsPingingIndexNow] = useState(false);
  const [indexNowResult, setIndexNowResult] = useState<string | null>(null);

  const [isPingingSitemap, setIsPingingSitemap] = useState(false);
  const [sitemapPingResult, setSitemapPingResult] = useState<string | null>(null);

  // Acordeões de Instruções
  const [openGuides, setOpenGuides] = useState<Record<string, boolean>>({
    google: false,
    meta: false,
    tiktok: false,
    seo: false,
  });

  const toggleGuide = (guide: string) => {
    setOpenGuides((prev) => ({ ...prev, [guide]: !prev[guide] }));
  };

  // Carregar configurações salvas
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.ok && data.settings) {
        setSettings({
          gaMeasurementId: data.settings.gaMeasurementId || "",
          googleAdsId: data.settings.googleAdsId || "",
          googleAdsPurchaseLabel: data.settings.googleAdsPurchaseLabel || "",
          googleAdsLeadLabel: data.settings.googleAdsLeadLabel || "",
          gtmId: data.settings.gtmId || "",
          metaPixelId: data.settings.metaPixelId || "",
          tiktokPixelId: data.settings.tiktokPixelId || "",
          indexNowKey: data.settings.indexNowKey || "f8a129d3c54e48b8b9812738fa092cb1",
        });
      }
    } catch (err: any) {
      console.error("Erro ao carregar configurações:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Salvar configurações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Falha ao salvar configurações.");
      }

      setSaveSuccess(data.message || "Configurações salvas com sucesso!");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      setSaveError(err.message || "Erro inesperado ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Disparar Ping IndexNow
  const handleTriggerIndexNow = async () => {
    setIsPingingIndexNow(true);
    setIndexNowResult(null);
    try {
      const res = await fetch("/api/seo/indexnow", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIndexNowResult(`✓ Sucesso! ${data.urlCount} URLs submetidas ao Bing/IndexNow.`);
      } else {
        setIndexNowResult(`✗ Erro: ${data.error}`);
      }
    } catch (err: any) {
      setIndexNowResult(`✗ Erro de conexão: ${err.message}`);
    } finally {
      setIsPingingIndexNow(false);
    }
  };

  // Disparar Ping Sitemap
  const handleTriggerSitemapPing = async () => {
    setIsPingingSitemap(true);
    setSitemapPingResult(null);
    try {
      const res = await fetch("/api/seo/ping");
      const data = await res.json();
      setSitemapPingResult(`✓ Notificação de sitemap enviada com sucesso para Google & Bing.`);
    } catch (err: any) {
      setSitemapPingResult(`✗ Falha ao enviar ping: ${err.message}`);
    } finally {
      setIsPingingSitemap(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        <p className="text-sm">Carregando painel de pixels e SEO...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 animate-fade-in">
      {/* Top Banner de Ações Rápidas & Feedback */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Central de Pixels, Tráfego Pago & SEO de Última Geração
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure campanhas no Google Ads, Meta Facebook e TikTok, e gerencie a indexação automática no Google e Bing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Salvar Configurações</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-center gap-2 shadow-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Grid Principal dos Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: GOOGLE ADS & GOOGLE ANALYTICS 4 */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <BarChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Google Ads & GA4</h3>
                <span className="text-[11px] text-slate-400">Google Tag (gtag.js)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide("google")}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Instruções</span>
              {openGuides.google ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {openGuides.google && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-white">Como obter seus identificadores do Google:</p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li><strong>GA4 Measurement ID</strong>: Acesse o Google Analytics &gt; Administrador &gt; Fluxos de Dados &gt; Web &gt; Copie o ID da métrica que começa com <code>G-</code>.</li>
                <li><strong>Google Ads ID</strong>: Acesse o Google Ads &gt; Ferramentas &gt; Gerenciador de Públicos-Alvo ou Metas de Conversão &gt; Tag do Google &gt; Copie o ID que começa com <code>AW-</code>.</li>
                <li><strong>Purchase Conversion Label</strong>: No Google Ads &gt; Conversões &gt; Compra &gt; "Instalar a tag por conta própria" &gt; Copie o snippet do rótulo da conversão (ex: <code>AbC_D1e2F3g4H5i</code>).</li>
                <li><strong>Lead Conversion Label</strong>: O mesmo para a conversão de Cadastro/Lead no checkout.</li>
              </ol>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google Analytics 4 Measurement ID
              </label>
              <input
                type="text"
                placeholder="Ex: G-XXXXXXXXXX"
                value={settings.gaMeasurementId}
                onChange={(e) => setSettings({ ...settings, gaMeasurementId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google Ads Conversion ID
              </label>
              <input
                type="text"
                placeholder="Ex: AW-123456789"
                value={settings.googleAdsId}
                onChange={(e) => setSettings({ ...settings, googleAdsId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Label de Conversão (Compra)
                </label>
                <input
                  type="text"
                  placeholder="Ex: AbC_D1e2F3g4H5i"
                  value={settings.googleAdsPurchaseLabel}
                  onChange={(e) =>
                    setSettings({ ...settings, googleAdsPurchaseLabel: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Label de Conversão (Lead)
                </label>
                <input
                  type="text"
                  placeholder="Ex: XyZ_987654321"
                  value={settings.googleAdsLeadLabel}
                  onChange={(e) =>
                    setSettings({ ...settings, googleAdsLeadLabel: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Google Tag Manager Container ID <span className="text-slate-500">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: GTM-XXXXXXX"
                value={settings.gtmId}
                onChange={(e) => setSettings({ ...settings, gtmId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: META ADS (FACEBOOK & INSTAGRAM) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Meta Pixel</h3>
                <span className="text-[11px] text-slate-400">Facebook & Instagram Ads</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide("meta")}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Instruções</span>
              {openGuides.meta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {openGuides.meta && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-white">Como obter seu Pixel da Meta:</p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>Acesse o <strong>Gerenciador de Eventos da Meta</strong> (Events Manager).</li>
                <li>Selecione <strong>Fontes de Dados</strong> &gt; Clique no seu Pixel ou Conjunto de Dados.</li>
                <li>Na aba <strong>Configurações</strong>, localize e copie o <strong>ID do Conjunto de Dados / Pixel ID</strong> (sequência numérica de ~15 ou 16 dígitos).</li>
                <li>Instale a extensão gratuita <strong>Meta Pixel Helper</strong> no Chrome para auditar os disparos em tempo real ao navegar pelo site.</li>
              </ol>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Meta Pixel ID
              </label>
              <input
                type="text"
                placeholder="Ex: 123456789012345"
                value={settings.metaPixelId}
                onChange={(e) => setSettings({ ...settings, metaPixelId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Eventos Nativos Já Pré-Configurados:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                <code>PageView</code>, <code>ViewContent</code>, <code>AddToCart</code>, <code>InitiateCheckout</code>, <code>Lead</code>, <code>AddPaymentInfo</code> (Pix), <code>Purchase</code>, <code>Contact</code> (WhatsApp) e <code>StartConfigurator</code>.
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: TIKTOK ADS PIXEL */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">TikTok Pixel</h3>
                <span className="text-[11px] text-slate-400">TikTok For Business Ads</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide("tiktok")}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Instruções</span>
              {openGuides.tiktok ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {openGuides.tiktok && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-white">Como obter seu Pixel do TikTok:</p>
              <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                <li>Acesse o <strong>TikTok Ads Manager</strong> &gt; Menu <strong>Assets</strong> &gt; <strong>Events</strong>.</li>
                <li>Clique em <strong>Web Events</strong> &gt; <strong>Manage</strong> &gt; Selecione seu Pixel.</li>
                <li>Copie o <strong>Pixel ID</strong> (código alfanumérico que começa frequentemente com <code>C</code>).</li>
                <li>Utilize a extensão <strong>TikTok Pixel Helper</strong> no Chrome para verificar se os eventos estão sendo registrados.</li>
              </ol>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                TikTok Pixel ID
              </label>
              <input
                type="text"
                placeholder="Ex: C1234567890ABCDEF"
                value={settings.tiktokPixelId}
                onChange={(e) => setSettings({ ...settings, tiktokPixelId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Check className="w-4 h-4 text-cyan-400" />
                <span>Eventos de Vídeo e E-commerce:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Rastreia <code>ViewContent</code> no 3D, adições ao carrinho, cadastros concluídos e pagamentos Pix com valor monetário em BRL.
              </p>
            </div>
          </div>
        </div>

        {/* CARD 4: SEO, INDEXNOW & AUDITORIA DE BUSCA */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Indexação & SEO Google</h3>
                <span className="text-[11px] text-slate-400">IndexNow, Rich Snippets & Sitemap</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleGuide("seo")}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Instruções</span>
              {openGuides.seo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {openGuides.seo && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-white">Protocolo de Indexação Imediata:</p>
              <p className="text-slate-400 text-[11px]">
                O <strong>IndexNow</strong> avisa instantaneamente o Bing e dezenas de mecanismos que indexam o conteúdo em minutos, sem precisar esperar semanas pelos robôs automáticos. Já o <strong>Ping de Sitemap</strong> notifica o Google sobre novas páginas e imagens.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chave de Verificação IndexNow
              </label>
              <input
                type="text"
                value={settings.indexNowKey}
                onChange={(e) => setSettings({ ...settings, indexNowKey: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Ações de Disparo Imediato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleTriggerIndexNow}
                disabled={isPingingIndexNow}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPingingIndexNow ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>Submeter IndexNow</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerSitemapPing}
                disabled={isPingingSitemap}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPingingSitemap ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Ping Google Sitemap</span>
              </button>
            </div>

            {indexNowResult && (
              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {indexNowResult}
              </p>
            )}

            {sitemapPingResult && (
              <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {sitemapPingResult}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CARD 5: AUDITORIAS E FERRAMENTAS OFICIAIS DE TESTE */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            Ferramentas Oficiais de Teste e Validação para Destaque no Google
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Clique nos links abaixo para auditar ao vivo o site em produção e garantir nota máxima nos validadores:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <a
            href="https://search.google.com/test/rich-results?url=https://totem.xpointsolucoes.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-cyan-400">Google Rich Results</p>
              <p className="text-[10px] text-slate-400">Validador de Snippets</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
          </a>

          <a
            href="https://validator.schema.org/#url=https://totem.xpointsolucoes.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-indigo-400">Schema.org Validator</p>
              <p className="text-[10px] text-slate-400">Auditoria JSON-LD</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
          </a>

          <a
            href="https://pagespeed.web.dev/analysis?url=https://totem.xpointsolucoes.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-emerald-400">PageSpeed Insights</p>
              <p className="text-[10px] text-slate-400">Performance & Vitals</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
          </a>

          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 transition-all flex items-center justify-between group"
          >
            <div>
              <p className="text-xs font-bold text-white group-hover:text-amber-400">Google Search Console</p>
              <p className="text-[10px] text-slate-400">Indexação e Palavras-chave</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
          </a>
        </div>
      </div>

      {/* CARD 6: DICIONÁRIO DE EVENTOS DE TELEMETRIA */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              Dicionário de Rastreamento de Conversões (Telemetria do Funil)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Todos os eventos são despachados de forma simultânea e não-bloqueante para Google, Meta, TikTok e Appwrite:
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Ação do Usuário</th>
                <th className="p-3">Google Ads / GA4</th>
                <th className="p-3">Meta Pixel (Facebook/Instagram)</th>
                <th className="p-3">TikTok Pixel</th>
                <th className="p-3">Parâmetros Enviados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-white">Visita na Landing Page</td>
                <td className="p-3 font-mono text-cyan-400">page_view</td>
                <td className="p-3 font-mono text-indigo-400">PageView</td>
                <td className="p-3 font-mono text-slate-300">ViewContent</td>
                <td className="p-3 text-slate-400">url, referrer, resolução</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-white">Abrir o Configurador</td>
                <td className="p-3 font-mono text-cyan-400">select_content</td>
                <td className="p-3 font-mono text-indigo-400">StartConfigurator</td>
                <td className="p-3 font-mono text-slate-300">ClickButton</td>
                <td className="p-3 text-slate-400">modelId, source</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-white">Interação 3D / Girar Totem</td>
                <td className="p-3 font-mono text-cyan-400">video_view</td>
                <td className="p-3 font-mono text-indigo-400">View3DModel</td>
                <td className="p-3 font-mono text-slate-300">ViewContent</td>
                <td className="p-3 text-slate-400">modelName, mode, action</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-white">Adição ao Carrinho</td>
                <td className="p-3 font-mono text-cyan-400">add_to_cart</td>
                <td className="p-3 font-mono text-indigo-400">AddToCart</td>
                <td className="p-3 font-mono text-slate-300">AddToCart</td>
                <td className="p-3 text-slate-400">currency: BRL, value, content_ids</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-white">Início de Checkout</td>
                <td className="p-3 font-mono text-cyan-400">begin_checkout</td>
                <td className="p-3 font-mono text-indigo-400">InitiateCheckout</td>
                <td className="p-3 font-mono text-slate-300">InitiateCheckout</td>
                <td className="p-3 text-slate-400">value, items_count</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-emerald-400">Cadastro de Lead (Formulário)</td>
                <td className="p-3 font-mono text-cyan-400">generate_lead</td>
                <td className="p-3 font-mono text-indigo-400">Lead</td>
                <td className="p-3 font-mono text-slate-300">CompleteRegistration</td>
                <td className="p-3 text-slate-400">nome, email, whatsapp, cidade</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-amber-400">Geração de Pix (QR Code)</td>
                <td className="p-3 font-mono text-cyan-400">add_payment_info</td>
                <td className="p-3 font-mono text-indigo-400">AddPaymentInfo</td>
                <td className="p-3 font-mono text-slate-300">AddPaymentInfo</td>
                <td className="p-3 text-slate-400">payment_type: PIX, value, orderId</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-emerald-400">Confirmação de Venda (Purchase)</td>
                <td className="p-3 font-mono text-cyan-400">purchase + conversion</td>
                <td className="p-3 font-mono text-indigo-400">Purchase</td>
                <td className="p-3 font-mono text-slate-300">CompletePayment</td>
                <td className="p-3 text-slate-400">transaction_id, value, currency</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-semibold text-white">Clique no WhatsApp</td>
                <td className="p-3 font-mono text-cyan-400">contact</td>
                <td className="p-3 font-mono text-indigo-400">Contact</td>
                <td className="p-3 font-mono text-slate-300">ClickButton</td>
                <td className="p-3 text-slate-400">channel: WhatsApp, source</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
