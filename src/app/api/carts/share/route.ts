import { NextResponse } from "next/server";
import { createSharedCart } from "@/lib/cart/sharedCartStore";
import { buildSharedWhatsappSummaryText } from "@/modules/cart/sharedAssembly";
import { siteConfig } from "@/config/site";

function resolvePublicOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const host = req.headers.get("host");
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    return `https://${host}`;
  }
  try {
    const reqUrl = new URL(req.url);
    if (reqUrl.origin && !reqUrl.origin.includes("0.0.0.0")) {
      return reqUrl.origin;
    }
  } catch {}
  return siteConfig.url;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const title = typeof body?.title === "string" ? body.title : "";
    const couponCode = typeof body?.couponCode === "string" ? body.couponCode : null;

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Adicione pelo menos 1 totem no carrinho para gerar o link compartilhável." },
        { status: 400 }
      );
    }

    const { record, hydrated } = await createSharedCart({
      title,
      couponCode,
      items,
    });

    const sharePath = `/montagem/${record.shareCode}`;
    const origin = resolvePublicOrigin(req);
    const shareUrl = `${origin}${sharePath}`;

    const whatsappSummaryText = buildSharedWhatsappSummaryText({
      shareUrl,
      title: record.title,
      items: hydrated.items,
      pixTotalCents: hydrated.pixTotalCents,
      cardTotalCents: hydrated.cardTotalCents,
      coupon: hydrated.coupon,
    });

    return NextResponse.json(
      {
        ok: true,
        shareCode: record.shareCode,
        sharePath,
        shareUrl,
        title: record.title,
        itemsCount: hydrated.itemsCount,
        pixTotalCents: hydrated.pixTotalCents,
        cardTotalCents: hydrated.cardTotalCents,
        whatsappSummaryText,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/carts/share] Erro:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Não foi possível gerar o link compartilhável." },
      { status: 400 }
    );
  }
}
