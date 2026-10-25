import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession, LEGACY_ADMIN_COOKIE, LEGACY_SECRET } from "@/lib/auth/session";
import {
  broadcastAdminWhatsAppNotification,
  DEFAULT_ORDER_NOTIFICATION_RECIPIENTS,
} from "@/lib/notifications/whatsappNotifier";
import { formatBRL } from "@/modules/pricing/pricingEngine";

async function verifyAdminAuth(): Promise<boolean> {
  const session = await getAuthSession();
  if (session && session.role === "admin") return true;

  const cookieStore = await cookies();
  const token = cookieStore.get(LEGACY_ADMIN_COOKIE)?.value;
  return token === LEGACY_SECRET;
}

export async function POST(req: Request) {
  const isAuthorized = await verifyAdminAuth();
  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.mode === "test") {
      const testMessage =
        `🔔 *TESTE DE NOTIFICAÇÃO — TOTEM PRO*\n\n` +
        `As notificações automáticas de novos pedidos estão *ATIVAS* para:\n` +
        DEFAULT_ORDER_NOTIFICATION_RECIPIENTS.map((r) => `• *${r.name}:* ${r.number}`).join("\n") +
        `\n\n🕒 Horário: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

      const result = await broadcastAdminWhatsAppNotification(testMessage, "Teste de Integração WhatsApp");
      return NextResponse.json({
        ok: result.sentCount > 0,
        sentCount: result.sentCount,
        results: result.results,
      });
    }

    const order = body.order;
    if (!order || !order.order_number) {
      return NextResponse.json({ ok: false, error: "Dados do pedido inválidos." }, { status: 400 });
    }

    let addr: any = {};
    try {
      if (order.delivery_address_json) {
        addr = JSON.parse(order.delivery_address_json);
      }
    } catch {
      addr = {};
    }

    const itemsSummary = Array.isArray(order.items)
      ? order.items
          .map(
            (it: any, idx: number) =>
              `*${idx + 1}. ${it.quantity}x ${it.cabinet_name}*\n` +
              `   • Cor: ${it.color_name}\n` +
              `   • Monitor: ${it.monitor_name || "Nenhum"}\n` +
              `   • Impressora: ${it.printer_name || "Nenhuma"}\n` +
              `   • Leitor: ${it.reader_name || "Sem leitor"}\n` +
              `   • Subtotal: *${formatBRL(it.subtotal_cents || 0)}*`
          )
          .join("\n\n")
      : "Itens não listados";

    const shippingName = addr?.shippingMethod?.name || (order.shipping_cents > 0 ? "Correios / Transportadora" : "Grátis");
    const addressLine = addr?.street
      ? `${addr.street}, nº ${addr.number || "S/N"}${addr.complement ? ` (${addr.complement})` : ""} — ${addr.neighborhood || ""}, ${addr.city || ""}/${addr.state || "SP"} (CEP: ${addr.cep || ""})`
      : "Endereço não informado";

    const message =
      `📦 *RESUMO DO PEDIDO — TOTEM PRO* 📦\n\n` +
      `🔢 *Pedido:* #${order.order_number}\n` +
      `👤 *Cliente:* ${order.customer_name}\n` +
      `🪪 *CPF/CNPJ:* ${order.customer_document || "—"}\n` +
      `📱 *WhatsApp:* ${order.customer_whatsapp || "—"}\n` +
      `✉️ *E-mail:* ${order.customer_email || "—"}\n\n` +
      `🛒 *ITENS DO PEDIDO*\n${itemsSummary}\n\n` +
      `🚚 *ENTREGA (${shippingName})*\n` +
      `• Frete: ${formatBRL(order.shipping_cents || 0)}\n` +
      `• Endereço: ${addressLine}\n\n` +
      `💰 *TOTAL DO PEDIDO: ${formatBRL(order.total_cents || 0)}*\n\n` +
      `🔗 *Painel Admin:* https://totem.xpointsolucoes.com.br/admin`;

    const result = await broadcastAdminWhatsAppNotification(message, `Reenvio Pedido #${order.order_number}`);
    return NextResponse.json({
      ok: result.sentCount > 0,
      sentCount: result.sentCount,
      results: result.results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao disparar notificação no WhatsApp." },
      { status: 500 }
    );
  }
}
