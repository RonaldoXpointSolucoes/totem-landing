import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getAllVoucherUsages,
  getVoucherSummaryMetrics,
  updateVoucherPayout,
} from "@/lib/vouchers/voucherStore";
import { VoucherFilterOptions, VoucherPayoutStatus } from "@/types/voucher";

const COOKIE_NAME = "totem_admin_token";
const SESSION_SECRET = "xpt_totem_admin_session_auth_token_99";

async function verifyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === SESSION_SECRET;
}

export async function GET(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filters: VoucherFilterOptions = {
      voucherCode: searchParams.get("voucherCode") || undefined,
      payoutStatus: (searchParams.get("payoutStatus") as VoucherPayoutStatus | "all") || undefined,
      source: searchParams.get("source") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const [usages, metrics] = await Promise.all([
      getAllVoucherUsages(filters),
      getVoucherSummaryMetrics(),
    ]);

    return NextResponse.json({
      ok: true,
      total: usages.length,
      usages,
      metrics,
    });
  } catch (error: any) {
    console.error("Erro na API de Vouchers Admin:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao buscar dados de vouchers: " + error?.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json({ ok: false, error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, payoutStatus, payoutProof, payoutNotes } = body;

    if (!id || !payoutStatus) {
      return NextResponse.json(
        { ok: false, error: "ID e novo status do repasse são obrigatórios." },
        { status: 400 }
      );
    }

    const updated = await updateVoucherPayout(id, {
      payoutStatus,
      payoutProof,
      payoutNotes,
      paidAt: payoutStatus === "paid" ? new Date().toISOString() : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Registro de voucher não encontrado." },
        { status: 404 }
      );
    }

    const metrics = await getVoucherSummaryMetrics();

    return NextResponse.json({
      ok: true,
      usage: updated,
      metrics,
      message: `Status do repasse atualizado para ${payoutStatus.toUpperCase()} com sucesso.`,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar repasse de voucher:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao atualizar repasse: " + error?.message },
      { status: 500 }
    );
  }
}
