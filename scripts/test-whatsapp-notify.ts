import { broadcastAdminWhatsAppNotification, DEFAULT_ORDER_NOTIFICATION_RECIPIENTS } from "../src/lib/notifications/whatsappNotifier";

async function main() {
  console.log("Testando envio de notificação WhatsApp FooodNext para:", DEFAULT_ORDER_NOTIFICATION_RECIPIENTS);

  const testMessage =
    `✅ *NOTIFICAÇÕES DE PEDIDOS ATIVADAS — TOTEM PRO*\n\n` +
    `O sistema agora notificará automaticamente neste WhatsApp sempre que houver:\n` +
    `• 🚨 *Novo Pedido no Checkout*\n` +
    `• 🛠️ *Nova Solicitação Sob Medida*\n` +
    `• 💰 *Pagamento Confirmado (PIX / Cartão)*\n\n` +
    `👥 *Destinatários configurados:*\n` +
    `• Ronaldo (5511975960999)\n` +
    `• Daniela (5511947020103)`;

  const res = await broadcastAdminWhatsAppNotification(testMessage, "Teste Inicial de Ativação");
  console.log("Resultado:", JSON.stringify(res, null, 2));

  if (res.sentCount === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
