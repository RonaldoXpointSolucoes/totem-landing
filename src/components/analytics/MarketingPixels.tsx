"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";
import { pixelConfig } from "@/config/pixels";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
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
            googleAdsLeadLabel: data.googleAdsLeadLabel || prev.googleAdsLeadLabel,
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

  const { gaMeasurementId, googleAdsId, metaPixelId, tiktokPixelId, gtmId } = config;
  const primaryGoogleId = gaMeasurementId || googleAdsId;

  return (
    <>
      {/* 1. Google Tag Manager (opcional) */}
      {gtmId && (
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
      )}

      {/* 2. Google Analytics 4 & Google Ads (gtag.js) */}
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
                ${googleAdsId && googleAdsId !== gaMeasurementId ? `gtag('config', '${googleAdsId}');` : ""}
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
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
                var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
                ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
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
