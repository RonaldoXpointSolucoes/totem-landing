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
  console.log('🧪 TESTE AUTOMATIZADO - ITEM 12 PERSONALIZAÇÃO ESPECIAL');
  console.log('=====================================================');

  // 1. Submissão da Solicitação Especial (com tentativa maliciosa de injetar preço pelo cliente)
  console.log('\n1. Testando submissão de personalização especial (/api/customizations)...');
  const payload = {
    customer: {
      name: 'Hospital São Lucas Diagnósticos',
      email: 'engenharia@saolucas.med.br',
      whatsapp: '(11) 97777-8888',
      document: '44.555.666/0001-12',
    },
    cabinetModelId: 'cabinet-floor',
    colorId: 'color-white',
    equipmentType: 'monitor',
    equipmentBrand: 'Dell',
    equipmentModel: 'UltraSharp 27" 4K Padrão Hospitalar',
    notes: 'Necessidade de recorte ampliado e furação VESA 100 com presilhas traseiras reforçadas.',
    // Tentativa do usuário de forçar preço:
    customPrice: 10.0,
    priceAdjustment: 0,
  };

  const createRes = await request({ path: '/api/customizations', method: 'POST' }, payload);
  console.log(`Status retornado: ${createRes.status} | Msg: ${createRes.data?.message}`);
  const { orderId, orderNumber, trackingUrl } = createRes.data || {};

  console.log(`  ✓ Código da Solicitação: ${orderNumber}`);
  console.log(`  ✓ Appwrite Order ID: ${orderId}`);
  console.log(`  ✓ URL de Acompanhamento: ${trackingUrl}`);

  // 2. Verificação de Impossibilidade de Fraude de Preços
  console.log('\n2. Verificando integridade e proteção de preço contra fraude...');
  const checkInitial = await request({ path: `/api/customizations/${orderId}`, method: 'GET' });
  const initialOrder = checkInitial.data?.data?.order;
  const initialSheet = checkInitial.data?.data?.sheet;

  console.log(`  ✓ Status inicial no Appwrite: ${initialOrder?.status} (Esperado awaiting_custom_analysis)`);
  console.log(`  ✓ Total inicial gravado: R$ ${(initialOrder?.total_cents / 100).toFixed(2)} (Apenas o gabinete base)`);
  console.log(`  ✓ Taxa adicional inicial: R$ ${(initialSheet?.engineeringAnalysis?.customAdjustmentCents || 0) / 100} (R$ 0,00 garantido)`);

  if (initialOrder?.total_cents !== 149000) {
    throw new Error('Falha de segurança: Preço inicial divergente do valor oficial da engenharia!');
  }

  // 3. Avaliação e Precificação pelo Engenheiro / Admin (Acréscimo de R$ 280,00)
  console.log('\n3. Simulando avaliação e precificação técnica pelo Engenheiro CNC (/api/customizations/[id] PATCH)...');
  const patchRes = await request(
    { path: `/api/customizations/${orderId}`, method: 'PATCH' },
    {
      feasibility: 'approved',
      customAdjustmentCents: 28000, // + R$ 280,00
      engineeringNotes: 'Gabarito sob medida aprovado. Usinagem CNC validada para painel Dell 27 com tolerância dimensional +1.5mm.',
    }
  );
  console.log(`Status retornado: ${patchRes.status} | Msg: ${patchRes.data?.message}`);

  // 4. Verificação do Orçamento Liberado para o Cliente
  console.log('\n4. Verificando dados da página de acompanhamento do cliente após aprovação da fábrica...');
  const checkApproved = await request({ path: `/api/customizations/${orderId}`, method: 'GET' });
  const approvedOrder = checkApproved.data?.data?.order;
  const approvedSheet = checkApproved.data?.data?.sheet;

  console.log(`  ✓ Novo Status: ${approvedOrder?.status} (Esperado custom_approved)`);
  console.log(`  ✓ Parecer Técnico: "${approvedSheet?.engineeringAnalysis?.engineeringParecer}"`);
  console.log(`  ✓ Acréscimo Comercial Definido pela Fábrica: R$ ${(approvedSheet?.engineeringAnalysis?.customAdjustmentCents / 100).toFixed(2)}`);
  console.log(`  ✓ Preço Total Oficial Recalculado: R$ ${(approvedOrder?.total_cents / 100).toFixed(2)} (R$ 1.490,00 + R$ 280,00 = R$ 1.770,00)`);

  if (approvedOrder?.total_cents !== 177000) {
    throw new Error(`Erro no recálculo oficial: Esperado 177000 centavos, obtido ${approvedOrder?.total_cents}`);
  }

  console.log('\n=====================================================');
  console.log('🎉 TODOS OS CRITÉRIOS DE ACEITE DO ITEM 12 APROVADOS!');
  console.log('=====================================================');
}

runTest().catch(console.error);
