import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/whitelistStore";

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ ok: false, authenticated: false });
  }

  // Busca dados mais recentes do usuário na Whitelist
  const liveUser = await findUserByEmail(session.email);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: liveUser
      ? {
          id: liveUser.id,
          email: liveUser.email,
          name: liveUser.name,
          avatarUrl: liveUser.avatarUrl,
          role: liveUser.role,
          couponCode: liveUser.couponCode,
          discountPercent: liveUser.discountPercent,
          commissionPercent: liveUser.commissionPercent,
          pixKey: liveUser.pixKey,
        }
      : {
          id: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
          couponCode: session.couponCode,
        },
  });
}
