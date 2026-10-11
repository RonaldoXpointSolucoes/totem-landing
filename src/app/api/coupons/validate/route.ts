import { NextResponse } from "next/server";
import { findUserByCoupon } from "@/lib/auth/whitelistStore";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (
      searchParams.get("code") ||
      searchParams.get("voucher") ||
      searchParams.get("cupom")
    )?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ ok: false, error: "Informe o código do cupom ou voucher." }, { status: 400 });
    }

    const seller = await findUserByCoupon(code);

    if (!seller || seller.status !== "active") {
      return NextResponse.json(
        { ok: false, error: `Cupom "${code}" inválido, inativo ou expirado.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      coupon: {
        code: seller.couponCode!,
        sellerId: seller.id,
        sellerEmail: seller.email,
        sellerName: seller.name,
        discountPercent: seller.discountPercent || 10,
        commissionPercent: seller.commissionPercent || 8,
        active: true,
        eligibleCategory: "cabinet_only",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao validar cupom." },
      { status: 500 }
    );
  }
}
