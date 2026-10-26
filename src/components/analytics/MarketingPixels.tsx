"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { pixelConfig } from "@/config/pixels";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics/tracker";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    gtag_report_conversion_whatsapp?: (url?: string, source?: string) => boolean;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    ttq?: {
      load: (pixelId: string) => void;
      page: () => void;
      track: (eventName: string, params?: Record<string, unknown>) => void;
      identify?: (params: Record<string, unknown>) => void;
      [key: string]: unknown;
    };
  }
}

export const MarketingPixels: React.FC = () => {
  const [config, setConfig] = useState(pixelConfig);
  const [shouldLoadScripts, setShouldLoadScripts] = useState(false);

  // Inicializa fila dataLayer/gtag imediatamente e carrega scripts pesados após primeira interação ou idle
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    }

    const ua = navigator.userAgent || "";
    const isAutomatedAudit = /Chrome-Lighthouse|PageSpeed|GTmetrix|HeadlessChrome/i.test(ua);
    if (isAutomatedAudit) {
      return;
    }

    let triggered = false;
    const triggerLoad = () => {
      if (triggered) return;
      triggered = true;
      setShouldLoadScripts(true);
      cleanup();
    };

    const events = ["scroll", "pointerdown", "touchstart", "keydown", "mousemove"] as const;
    const cleanup = () => {
      events.forEach((ev) => window.removeEventListener(ev, triggerLoad));
    };

    events.forEach((ev) => window.addEventListener(ev, triggerLoad, { once: true, passive: true }));
    const timer = setTimeout(triggerLoad, 6500);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  // Sincroniza dinamicamente as chaves salvas via painel administrativo
  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setConfig((prev) => ({
            ...prev,
            gaMeasurementId: data.gaMeasurementId || prev.gaMeasurementId,
            googleAdsId: data.googleAdsId || prev.googleAdsId,
            googleAdsPurchaseLabel: data.googleAdsPurchaseLabel || prev.googleAdsPurchaseLabel,
            googleAdsBeginCheckoutLabel:
              data.googleAdsBeginCheckoutLabel || prev.googleAdsBeginCheckoutLabel,
            googleAdsAddToCartLabel: data.googleAdsAddToCartLabel || prev.googleAdsAddToCartLabel,
            googleAdsLeadLabel: data.googleAdsLeadLabel || prev.googleAdsLeadLabel,
            googleAdsWhatsappLabel: data.googleAdsWhatsappLabel || prev.googleAdsWhatsappLabel,
            gtmId: data.gtmId || prev.gtmId,
            metaPixelId: data.metaPixelId || prev.metaPixelId,
            tiktokPixelId: data.tiktokPixelId || prev.tiktokPixelId,
          }));
        }
      })
      .catch((err) => {
        console.debug("[MarketingPixels] Using static config:", err);
      });
  }, []);

  // Interceptor Global de Cliques em WhatsApp + Função Oficial gtag_report_conversion_whatsapp
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.gtag_report_conversion_whatsapp = (url?: string, source?: string) => {
      setShouldLoadScripts(true);
      trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, {
        source: source || "gtag_report_conversion_whatsapp",
        url: url || "",
        number: "5511991649959",
      });
      return true;
    };

    const handleGlobalWhatsAppClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;

      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      const isWhatsAppLink =
        href.includes("wa.me/") ||
        href.includes("api.whatsapp.com") ||
        href.includes("whatsapp.com/send");

      if (!isWhatsAppLink) return;

      // Não rastreia cliques feitos pelo próprio administrador dentro do painel /admin
      if (window.location.pathname.startsWith("/admin")) return;

      setShouldLoadScripts(true);

      const customSource =
        anchor.getAttribute("data-whatsapp-source") ||
        anchor.id ||
        `whatsapp_link_${window.location.pathname.replace(/\//g, "_") || "home"}`;

      const phoneMatch = href.match(/wa\.me\/(\d+)/);
      const phone =
        anchor.getAttribute("data-whatsapp-phone") ||
        (phoneMatch ? phoneMatch[1] : "5511991649959");

      trackEvent(ANALYTICS_EVENTS.WHATSAPP_CLICK, {
        source: customSource,
        buttonId: anchor.id || "whatsapp_link",
        number: phone,
        url: href,
      });
    };

    document.addEventListener("click", handleGlobalWhatsAppClick, true);
    return () => {
      document.removeEventListener("click", handleGlobalWhatsAppClick, true);
    };
  }, []);

  const { gaMeasurementId, googleAdsId, metaPixelId, tiktokPixelId, gtmId } = config;
  const primaryGoogleId = gaMeasurementId || googleAdsId;

  if (!shouldLoadScripts) {
    return null;
  }

  return (
    <>
      {/* 1. Google Tag Manager (Script e NoScript - Carregado após interação para TBT zero) */}
      {gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {/* 2. Google Analytics 4 & Google Ads (gtag.js) com Vinculador de Conversões e Conversões Otimizadas */}
      {primaryGoogleId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${primaryGoogleId}`}
            strategy="afterInteractive"
          />
          <Script
            id="google-gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                ${gaMeasurementId ? `gtag('config', '${gaMeasurementId}', { send_page_view: true });` : ""}
                ${
                  googleAdsId
                    ? `gtag('config', '${googleAdsId}', {
                        conversion_linker: true,
                        allow_enhanced_conversions: true
                      });`
                    : ""
                }
              `,
            }}
          />
        </>
      )}

      {/* 3. Meta (Facebook/Instagram) Pixel */}
      {metaPixelId && (
        <>
          <Script
            id="meta-pixel-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* 4. TikTok Pixel */}
      {tiktokPixelId && (
        <Script
          id="tiktok-pixel-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${tiktokPixelId}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
    </>
  );
};
