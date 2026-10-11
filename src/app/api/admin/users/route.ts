import { NextResponse } from "next/server";
import {
  getWhitelistUsers,
  addWhitelistUser,
  updateWhitelistUser,
  deleteWhitelistUser,
} from "@/lib/auth/whitelistStore";
import { getAuthSession } from "@/lib/auth/session";

async function requireAdminAuth(): Promise<boolean> {
  const session = await getAuthSession();
  return !!session && session.role === "admin";
}

export async function GET() {
  const isAdmin = await requireAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
  }

  const users = await getWhitelistUsers();
  return NextResponse.json({ ok: true, data: users });
}

export async function POST(req: Request) {
  const isAdmin = await requireAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const result = await addWhitelistUser(body);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: result.user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Erro ao adicionar usuário." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const isAdmin = await requireAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
  }

  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ ok: false, error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    const result = await updateWhitelistUser(id, updates);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Erro ao atualizar usuário." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const isAdmin = await requireAdminAuth();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Acesso restrito a administradores." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    const deleted = await deleteWhitelistUser(id);
    return NextResponse.json({ ok: deleted });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Erro ao excluir usuário." }, { status: 500 });
  }
}
