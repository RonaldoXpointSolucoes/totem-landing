import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "src", "data", "marketing_settings.json");

export async function GET() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      return NextResponse.json({
        gaMeasurementId: data.gaMeasurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
        googleAdsId: data.googleAdsId || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
        googleAdsPurchaseLabel: data.googleAdsPurchaseLabel || process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "",
        googleAdsLeadLabel: data.googleAdsLeadLabel || process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "",
        gtmId: data.gtmId || process.env.NEXT_PUBLIC_GTM_ID || "",
        metaPixelId: data.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
        tiktokPixelId: data.tiktokPixelId || process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
        indexNowKey: data.indexNowKey || process.env.NEXT_PUBLIC_INDEXNOW_KEY || "f8a129d3c54e48b8b9812738fa092cb1",
      });
    }
  } catch (err) {
    console.error("[Settings Public] Error:", err);
  }

  return NextResponse.json({
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
    googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
    googleAdsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "",
    googleAdsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "",
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
    tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
    indexNowKey: process.env.NEXT_PUBLIC_INDEXNOW_KEY || "f8a129d3c54e48b8b9812738fa092cb1",
  });
}
