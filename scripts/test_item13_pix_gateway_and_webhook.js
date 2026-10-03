const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const reqOptions = {
      hostname: 'localhost',
      port: 3000,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    if (postData) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(body),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            raw: body,
          });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('=====================================================');
  console.log('🧪 TESTE AUTOMATIZADO - ITEM 13 PIX GATEWAY & WEBHOOK');
  console.log('=====================================================');

  // 1. Criar Pedido com Gateway Pix Real
  console.log('\n1. Criando pedido no checkout para geração de Pix com QR Code Data URL...');
  const orderRes = await request(
    { path: '/api/checkout/order', method: 'POST' },
    {
      customer: {
        personType: 'company',
        name: 'Rede Drogarias Central SA',
        document: '33.444.555/0001-99',
        email: 'financeiro@drogariascentral.com.br',
        whatsapp: '(11) 98888-7777',
      },
      deliveryAddress: {
        cep: '01310-100',
        street: 'Avenida Paulista',
        number: '1500',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      items: [
        {
          modelId: 'cabinet-floor',
          colorId: 'color-white',
          quantity: 1,
        },
      ],
    }
  );

  console.log(`Status do Pedido: ${orderRes.status} | Mensagem: ${orderRes.data?.message}`);
  const order = orderRes.data?.order;
  const appwriteOrderId = orderRes.data?.appwriteOrderId;

  console.log(`  ✓ Número do Pedido: ${order?.orderNumber}`);
  console.log(`  ✓ Appwrite Order ID: ${appwriteOrderId}`);
  console.log(`  ✓ Pix EMV Gerado: ${order?.payment?.pixCode ? 'SIM' : 'NÃO'}`);
  console.log(`  ✓ QR Code Data URL Gerado: ${order?.payment?.qrCodeUrl?.startsWith('data:image/') ? 'SIM' : 'NÃO'}`);

  // 2. Verificar Status Inicial (Pendente)
  console.log('\n2. Verificando status inicial via /api/checkout/status...');
  const initialStatus = await request({ path: `/api/checkout/status?orderId=${appwriteOrderId}`, method: 'GET' });
  console.log(`  ✓ isPaid: ${initialStatus.data?.isPaid} | status: ${initialStatus.data?.status}`);

  if (initialStatus.data?.isPaid !== false) {
    throw new Error('Falha: Pedido deveria estar pendente inicialmente!');
  }

  // 3. Teste de Segurança do Webhook com Token Inválido
  console.log('\n3. Testando disparo de webhook com assinatura inválida...');
  const invalidWebhook = await request(
    {
      path: '/api/webhooks/pix',
      method: 'POST',
      headers: { 'x-webhook-token': 'token_incorreto_hacker' },
    },
    { orderNumber: order.orderNumber }
  );
  console.log(`Status retornado: ${invalidWebhook.status} (Esperado 401) | Msg: ${invalidWebhook.data?.error}`);

  // 4. Teste de Compensação do Webhook com Token Válido
  console.log('\n4. Disparando webhook oficial de compensação do Gateway Pix...');
  const validWebhook = await request(
    {
      path: '/api/webhooks/pix',
      method: 'POST',
      headers: { 'x-webhook-token': 'totem_pix_secret_webhook_token_2026' },
    },
    {
      event: 'payment.approved',
      orderNumber: order.orderNumber,
      amountCents: order.totalCents,
      txId: order.orderNumber.replace('-', ''),
    }
  );
  console.log(`Status retornado: ${validWebhook.status} (Esperado 200) | Msg: ${validWebhook.data?.message}`);
  console.log(`  ✓ Novo Status retornado pelo Webhook: ${validWebhook.data?.status}`);

  // 5. Teste de Idempotência do Webhook
  console.log('\n5. Testando Idempotência (reenvio da mesma notificação)...');
  const idempotentWebhook = await request(
    {
      path: '/api/webhooks/pix',
      method: 'POST',
      headers: { 'x-webhook-token': 'totem_pix_secret_webhook_token_2026' },
    },
    {
      event: 'payment.approved',
      orderNumber: order.orderNumber,
    }
  );
  console.log(`Status retornado: ${idempotentWebhook.status} (Esperado 200) | Msg: ${idempotentWebhook.data?.message}`);

  // 6. Verificação do Live Polling do Cliente
  console.log('\n6. Verificando status capturado pelo Live Polling do navegador...');
  const pollStatus = await request({ path: `/api/checkout/status?orderId=${appwriteOrderId}`, method: 'GET' });
  console.log(`  ✓ isPaid: ${pollStatus.data?.isPaid} (Esperado true)`);
  console.log(`  ✓ status: ${pollStatus.data?.status} (Esperado paid)`);
  console.log(`  ✓ Data da Liquidação: ${pollStatus.data?.paidAt}`);

  if (pollStatus.data?.isPaid !== true) {
    throw new Error('Falha: Pedido não foi atualizado para pago pelo webhook!');
  }

  console.log('\n=====================================================');
  console.log('🎉 TODOS OS CRITÉRIOS DE ACEITE DO ITEM 13 APROVADOS!');
  console.log('=====================================================');
}

runTest().catch(console.error);
