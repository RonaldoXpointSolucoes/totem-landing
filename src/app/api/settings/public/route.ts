import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "src", "data", "marketing_settings.json");

export async function GET() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      return NextResponse.json({
        gaMeasurementId: data.gaMeasurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "GT-5NX4XT3Z",
        googleAdsId: data.googleAdsId || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-944115229",
        googleAdsPurchaseLabel: data.googleAdsPurchaseLabel || process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "IR8ZCPThqakdEJ2cmMID",
        googleAdsBeginCheckoutLabel: data.googleAdsBeginCheckoutLabel || process.env.NEXT_PUBLIC_GOOGLE_ADS_BEGIN_CHECKOUT_LABEL || "JjgUCKfrqakdEJ2cmMID",
        googleAdsAddToCartLabel: data.googleAdsAddToCartLabel || process.env.NEXT_PUBLIC_GOOGLE_ADS_ADD_TO_CART_LABEL || "xAc_CPHtqakdEJ2cmMID",
        googleAdsLeadLabel: data.googleAdsLeadLabel || process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "VumdCIjzqakdEJ2cmMID",
        googleAdsWhatsappLabel: data.googleAdsWhatsappLabel || process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL || "2vTuCKyvo6kdEJ2cmMID",
        gtmId: data.gtmId || process.env.NEXT_PUBLIC_GTM_ID || "GTM-W4N3KKL7",
        metaPixelId: data.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
        tiktokPixelId: data.tiktokPixelId || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
        indexNowKey: data.indexNowKey || process.env.NEXT_PUBLIC_INDEXNOW_KEY || "f8a129d3c54e48b8b9812738fa092cb1",
      });
    }
  } catch (err) {
    console.error("[Settings Public] Error:", err);
  }

  return NextResponse.json({
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "GT-5NX4XT3Z",
    googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-944115229",
    googleAdsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "IR8ZCPThqakdEJ2cmMID",
    googleAdsBeginCheckoutLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_BEGIN_CHECKOUT_LABEL || "JjgUCKfrqakdEJ2cmMID",
    googleAdsAddToCartLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_ADD_TO_CART_LABEL || "xAc_CPHtqakdEJ2cmMID",
    googleAdsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "VumdCIjzqakdEJ2cmMID",
    googleAdsWhatsappLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL || "2vTuCKyvo6kdEJ2cmMID",
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || "GTM-W4N3KKL7",
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
    tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
    indexNowKey: process.env.NEXT_PUBLIC_INDEXNOW_KEY || "f8a129d3c54e48b8b9812738fa092cb1",
  });
}
