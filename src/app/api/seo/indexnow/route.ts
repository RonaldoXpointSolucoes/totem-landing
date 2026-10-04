import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { pixelConfig } from "@/config/pixels";

/**
 * Endpoint de Indexação Imediata via Protocolo IndexNow (Bing, Yandex, Seznam, Naver)
 * Permite notificar os mecanismos de busca instantaneamente quando há novas atualizações.
 */
export async function POST(request: Request) {
  try {
    const host = new URL(siteConfig.url).host;
    const key = pixelConfig.indexNowKey;
    const keyLocation = `${siteConfig.url}/${key}.txt`;

    const defaultUrls = [
      `${siteConfig.url}/`,
      `${siteConfig.url}/#modelos`,
      `${siteConfig.url}/#como-funciona`,
      `${siteConfig.url}/#diferenciais`,
      `${siteConfig.url}/#faq`,
    ];

    let customUrls: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.urls) && body.urls.length > 0) {
        customUrls = body.urls;
      }
    } catch {
      // Usa lista padrão
    }

    const urlList = customUrls.length > 0 ? customUrls : defaultUrls;

    const payload = {
      host,
      key,
      keyLocation,
      urlList,
    };

    // Envia requisições paralelas para os endpoints IndexNow
    const endpoints = [
      "https://api.indexnow.org/indexnow",
      "https://www.bing.com/indexnow",
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(payload),
        });
        return {
          endpoint,
          status: response.status,
          ok: response.ok,
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: "IndexNow ping submetido aos mecanismos de busca com sucesso.",
      urlCount: urlList.length,
      results,
    });
  } catch (error: any) {
    console.error("[IndexNow Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Falha ao processar solicitação do IndexNow.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    protocol: "IndexNow 1.0",
    keyVerification: `${siteConfig.url}/${pixelConfig.indexNowKey}.txt`,
    targetHost: new URL(siteConfig.url).host,
  });
}
