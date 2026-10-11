import { NextResponse } from "next/server";
import { clearAuthSession } from "@/lib/auth/session";

export async function POST() {
  await clearAuthSession();
  return NextResponse.json({ ok: true, message: "Sessão encerrada com sucesso." });
}

export async function DELETE() {
  await clearAuthSession();
  return NextResponse.json({ ok: true, message: "Sessão encerrada com sucesso." });
}
