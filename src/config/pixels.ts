/**
 * Configurações de Pixels e Rastreamento de Tráfego Pago
 * Suporte a Google Ads / GA4, Google Tag Manager (GTM), Meta Ads e TikTok Ads
 * Com Conversões Otimizadas (Enhanced Conversions) e Vinculador de Conversões
 */

export const pixelConfig = {
  // Google Analytics 4 / Google Tag (gtag.js)
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "GT-5NX4XT3Z",
  
  // Google Ads (Conta AW-944115229)
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-944115229",
  googleAdsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "",
  googleAdsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "wfA1CIiPpfkaEJ2cmMID",
  googleAdsWhatsappLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL || "NpfaCKn1tYkbEJ2cmMID",
  
  // Google Tag Manager (GTM Container)
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",

  // Ativação de Conversões Otimizadas (Enhanced Conversions)
  enhancedConversions: true,

  // Meta Pixel (Facebook & Instagram)
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",

  // TikTok Pixel
  tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",

  // IndexNow API Key para indexação ultra-rápida (Bing, Yandex, etc.)
  indexNowKey: process.env.NEXT_PUBLIC_INDEXNOW_KEY || "f8a129d3c54e48b8b9812738fa092cb1",

  // Modo de depuração em desenvolvimento
  debug: process.env.NODE_ENV === "development",
};
