/**
 * Configurações de Pixels e Rastreamento de Tráfego Pago
 * Suporte a Google Ads / GA4, Meta Ads (Facebook/Instagram) e TikTok Ads
 */

export const pixelConfig = {
  // Google Analytics 4 / Google Ads (gtag.js)
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
  googleAdsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "",
  googleAdsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "",
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",

  // Meta Pixel (Facebook & Instagram)
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",

  // TikTok Pixel
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",

  // IndexNow API Key para indexação ultra-rápida (Bing, Yandex, etc.)
  indexNowKey: process.env.NEXT_PUBLIC_INDEXNOW_KEY || "f8a129d3c54e48b8b9812738fa092cb1",

  // Modo de depuração em desenvolvimento
  debug: process.env.NODE_ENV === "development",
};
