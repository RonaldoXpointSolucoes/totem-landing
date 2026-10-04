import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

const COOKIE_NAME = "totem_admin_token";
const SESSION_SECRET = "xpt_totem_admin_session_auth_token_99";
const SETTINGS_FILE = path.join(process.cwd(), "src", "data", "marketing_settings.json");
const ENV_FILE = path.join(process.cwd(), ".env");

async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === SESSION_SECRET;
}

function getStoredSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("[Settings Route] Error reading settings file:", err);
  }

  return {
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
    googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
    googleAdsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "",
    googleAdsLeadLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL || "",
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || "",
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
    tiktokPixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "",
    indexNowKey: process.env.NEXT_PUBLIC_INDEXNOW_KEY || "f8a129d3c54e48b8b9812738fa092cb1",
  };
}

function updateEnvFile(settings: Record<string, string>) {
  try {
    if (!fs.existsSync(ENV_FILE)) return;
    let content = fs.readFileSync(ENV_FILE, "utf-8");

    const mapping: Record<string, string> = {
      NEXT_PUBLIC_GA_MEASUREMENT_ID: settings.gaMeasurementId || "",
      NEXT_PUBLIC_GOOGLE_ADS_ID: settings.googleAdsId || "",
      NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL: settings.googleAdsPurchaseLabel || "",
      NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL: settings.googleAdsLeadLabel || "",
      NEXT_PUBLIC_GTM_ID: settings.gtmId || "",
      NEXT_PUBLIC_META_PIXEL_ID: settings.metaPixelId || "",
      NEXT_PUBLIC_TIKTOK_PIXEL_ID: settings.tiktokPixelId || "",
      NEXT_PUBLIC_INDEXNOW_KEY: settings.indexNowKey || "",
    };

    for (const [key, value] of Object.entries(mapping)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(ENV_FILE, content, "utf-8");
  } catch (err) {
    console.warn("[Settings Route] Warning updating .env:", err);
  }
}

export async function GET() {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  const settings = getStoredSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();

    const current = getStoredSettings();
    const updatedSettings = {
      ...current,
      gaMeasurementId: (body.gaMeasurementId ?? current.gaMeasurementId ?? "").trim(),
      googleAdsId: (body.googleAdsId ?? current.googleAdsId ?? "").trim(),
      googleAdsPurchaseLabel: (body.googleAdsPurchaseLabel ?? current.googleAdsPurchaseLabel ?? "").trim(),
      googleAdsLeadLabel: (body.googleAdsLeadLabel ?? current.googleAdsLeadLabel ?? "").trim(),
      gtmId: (body.gtmId ?? current.gtmId ?? "").trim(),
      metaPixelId: (body.metaPixelId ?? current.metaPixelId ?? "").trim(),
      tiktokPixelId: (body.tiktokPixelId ?? current.tiktokPixelId ?? "").trim(),
      indexNowKey: (body.indexNowKey ?? current.indexNowKey ?? "f8a129d3c54e48b8b9812738fa092cb1").trim(),
      updatedAt: new Date().toISOString(),
    };

    // Salva em JSON
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2), "utf-8");

    // Atualiza .env
    updateEnvFile(updatedSettings);

    // Se a chave IndexNow mudou, cria o arquivo txt correspondente em public/
    if (updatedSettings.indexNowKey) {
      try {
        const publicTxt = path.join(process.cwd(), "public", `${updatedSettings.indexNowKey}.txt`);
        fs.writeFileSync(publicTxt, updatedSettings.indexNowKey, "utf-8");
      } catch (keyErr) {
        console.warn("[Settings Route] Warning writing indexnow txt:", keyErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Configurações de SEO e Tráfego Pago salvas com sucesso!",
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error("[Settings Route] Error saving settings:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Erro ao salvar configurações." },
      { status: 500 }
    );
  }
}
