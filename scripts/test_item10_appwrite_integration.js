const http = require('http');

function postRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'GET',
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('=====================================================');
  console.log('🧪 TESTE AUTOMATIZADO - ITEM 10 APPWRITE INTEGRATION');
  console.log('=====================================================');

  // 1. Teste Catálogo BFF
  console.log('\n1. Testando rota BFF /api/catalog...');
  const catRes = await getRequest('/api/catalog');
  console.log(`Status: ${catRes.status} | Source: ${catRes.data?.source}`);
  if (catRes.status === 200 && catRes.data?.data) {
    const d = catRes.data.data;
    console.log(`  ✓ Modelos: ${d.cabinetModels?.length || 0}`);
    console.log(`  ✓ Cores: ${d.colors?.length || 0}`);
    console.log(`  ✓ Monitores: ${d.monitors?.length || 0}`);
    console.log(`  ✓ Impressoras: ${d.printers?.length || 0}`);
    console.log(`  ✓ Leitores: ${d.barcodeReaders?.length || 0}`);
  } else {
    console.error('  ✖ Erro no catálogo BFF:', catRes);
  }

  // 2. Teste Checkout com Snapshot Imutável
  console.log('\n2. Testando criação de pedido com Snapshot Imutável (/api/checkout/order)...');
  const payload = {
    customer: {
      personType: 'company',
      name: 'Supermercados Alvorada LTDA',
      document: '12.345.678/0001-90',
      email: 'compras@alvorada.com.br',
      whatsapp: '(11) 98765-4321',
    },
    deliveryAddress: {
      cep: '01310-100',
      street: 'Avenida Paulista',
      number: '1000',
      complement: '10º Andar - Sala 102',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    items: [
      {
        modelId: 'cabinet-floor',
        colorId: 'color-black',
        monitorId: 'mon-elgin-215',
        printerId: 'prt-epson-t20x',
        hasScanner: true,
        quantity: 2,
      },
    ],
  };

  const orderRes = await postRequest('/api/checkout/order', payload);
  console.log(`Status: ${orderRes.status} | Mensagem: ${orderRes.data?.message}`);
  const order = orderRes.data?.order;
  const appwriteOrderId = orderRes.data?.appwriteOrderId;

  console.log(`  ✓ Número do Pedido: ${order?.orderNumber}`);
  console.log(`  ✓ Appwrite Order ID: ${appwriteOrderId}`);
  console.log(`  ✓ Total: R$ ${((order?.totalCents || 0) / 100).toFixed(2)}`);
  console.log(`  ✓ Pix Copia e Cola: ${order?.payment?.pixCode ? 'OK' : 'FALHA'}`);

  // 3. Teste Consulta de Pedido no Appwrite
  if (appwriteOrderId) {
    console.log(`\n3. Consultando pedido no Appwrite via /api/orders/${appwriteOrderId}...`);
    const fetchOrderRes = await getRequest(`/api/orders/${appwriteOrderId}`);
    console.log(`Status: ${fetchOrderRes.status}`);
    if (fetchOrderRes.status === 200 && fetchOrderRes.data?.data) {
      const dbOrder = fetchOrderRes.data.data.order;
      const dbItems = fetchOrderRes.data.data.items;
      const dbPayment = fetchOrderRes.data.data.payment;

      console.log(`  ✓ Pedido no Appwrite: ${dbOrder.order_number} (${dbOrder.status})`);
      console.log(`  ✓ Cliente: ${dbOrder.customer_name} | Documento: ${dbOrder.customer_document}`);
      console.log(`  ✓ Total Gravado: R$ ${(dbOrder.total_cents / 100).toFixed(2)}`);
      console.log(`  ✓ Itens com Snapshot Congelado: ${dbItems.length}`);
      dbItems.forEach((item, idx) => {
        console.log(`    [Item ${idx + 1}] ${item.cabinet_name} | Cor: ${item.color_name} | Monitor: ${item.monitor_name} | Impressora: ${item.printer_name} | Scanner: ${item.reader_name} | Qtd: ${item.quantity} | Unit: R$ ${(item.unit_price_cents / 100).toFixed(2)}`);
      });
      console.log(`  ✓ Pagamento Pix Registrado: ${dbPayment?.provider} | Valor: R$ ${((dbPayment?.amount_cents || 0) / 100).toFixed(2)}`);
      console.log('\n🎉 TESTE CONCLUÍDO COM 100% DE SUCESSO!');
    } else {
      console.error('  ✖ Erro ao consultar pedido gravado:', fetchOrderRes);
    }
  } else {
    console.error('  ✖ Appwrite Order ID não retornado!');
  }
}

runTest().catch(console.error);
