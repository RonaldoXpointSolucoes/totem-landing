import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

/**
 * Rota para envio de ping de Sitemap para mecanismos de busca (Google, Bing)
 */
export async function GET() {
  const sitemapUrl = encodeURIComponent(`${siteConfig.url}/sitemap.xml`);

  const pingTargets = [
    { name: "Google", url: `https://www.google.com/ping?sitemap=${sitemapUrl}` },
    { name: "Bing", url: `https://www.bing.com/ping?sitemap=${sitemapUrl}` },
  ];

  const results = await Promise.allSettled(
    pingTargets.map(async (target) => {
      try {
        const res = await fetch(target.url, { method: "GET" });
        return { name: target.name, status: res.status, ok: res.ok };
      } catch (err: any) {
        return { name: target.name, error: err.message };
      }
    })
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    sitemap: `${siteConfig.url}/sitemap.xml`,
    results,
  });
}
