/**
 * Script de Provisionamento e Seed do Banco de Dados Appwrite para o Totem Pro
 * Endpoint: https://appwrite-inwbueezn2gkpm4tqwvzkswy.179.199.142.157.sslip.io/v1
 * Database: totem_db
 */

const https = require('https');

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite-inwbueezn2gkpm4tqwvzkswy.179.199.142.157.sslip.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || 'chatboot-production';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_bc50daa650a82f0d19717cbbc3b277af8c84ee084ab50232baf2b21cfaaabc4fa80ca0af9669163cd644c8676097eefbe001d9cd77a01b60e9b598222ab8117f341729ad3e5330e06af8c63da6e79e8cc3affa6e54cb87056f542c01f934bf21c37b43d1ddaaa5be0c7aff2f0ff2a060dc7d452ee763a2e22830b35da14db7b1';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'totem_db';

function appwriteRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(APPWRITE_ENDPOINT + path);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
        'Content-Type': 'application/json',
      },
      rejectUnauthorized: false,
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function createCollection(collectionId, name, permissions = []) {
  console.log(`[Collection] Criando/verificando: ${name} (${collectionId})...`);
  const res = await appwriteRequest(`/databases/${DATABASE_ID}/collections`, 'POST', {
    collectionId,
    name,
    permissions,
    documentSecurity: false
  });

  if (res.status === 201) {
    console.log(`  ✓ Coleção criada com sucesso: ${collectionId}`);
    return res.data;
  } else if (res.status === 409) {
    console.log(`  ℹ Coleção já existe: ${collectionId}`);
    return { $id: collectionId };
  } else {
    console.error(`  ✖ Erro ao criar coleção ${collectionId}:`, res.data);
    throw new Error(res.data?.message || 'Falha ao criar coleção');
  }
}

async function addStringAttribute(collectionId, key, size = 255, required = false, defaultValue = null) {
  const body = { key, size, required };
  if (!required && defaultValue !== null) {
    body.default = defaultValue;
  }
  const res = await appwriteRequest(`/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`, 'POST', body);
  if (res.status === 201 || res.status === 202) {
    console.log(`  + Atributo string [${key}] adicionado.`);
  } else if (res.status === 409) {
    // Já existe
  } else {
    console.warn(`  ! Atributo [${key}]:`, res.data?.message || res.status);
  }
}

async function addIntegerAttribute(collectionId, key, required = false, defaultValue = null) {
  const body = { key, required };
  if (!required && defaultValue !== null) {
    body.default = defaultValue;
  }
  const res = await appwriteRequest(`/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`, 'POST', body);
  if (res.status === 201 || res.status === 202) {
    console.log(`  + Atributo integer [${key}] adicionado.`);
  } else if (res.status === 409) {
    // Já existe
  } else {
    console.warn(`  ! Atributo integer [${key}]:`, res.data?.message || res.status);
  }
}

async function addBooleanAttribute(collectionId, key, required = false, defaultValue = false) {
  const body = { key, required };
  if (!required && defaultValue !== null) {
    body.default = defaultValue;
  }
  const res = await appwriteRequest(`/databases/${DATABASE_ID}/collections/${collectionId}/attributes/boolean`, 'POST', body);
  if (res.status === 201 || res.status === 202) {
    console.log(`  + Atributo boolean [${key}] adicionado.`);
  } else if (res.status === 409) {
    // Já existe
  } else {
    console.warn(`  ! Atributo boolean [${key}]:`, res.data?.message || res.status);
  }
}

async function addIndex(collectionId, key, type = 'key', attributes = []) {
  const res = await appwriteRequest(`/databases/${DATABASE_ID}/collections/${collectionId}/indexes`, 'POST', {
    key,
    type,
    attributes
  });
  if (res.status === 201 || res.status === 202) {
    console.log(`  * Índice [${key}] criado com sucesso.`);
  } else if (res.status === 409) {
    // Já existe
  } else {
    console.warn(`  ! Índice [${key}]:`, res.data?.message || res.status);
  }
}

async function createOrUpdateDocument(collectionId, documentId, data) {
  const getRes = await appwriteRequest(`/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`, 'GET');
  if (getRes.status === 200) {
    const updateRes = await appwriteRequest(`/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`, 'PATCH', {
      data
    });
    console.log(`  ↻ Documento atualizado: ${collectionId} -> ${documentId}`);
    return updateRes.data;
  } else {
    const createRes = await appwriteRequest(`/databases/${DATABASE_ID}/collections/${collectionId}/documents`, 'POST', {
      documentId,
      data
    });
    if (createRes.status === 201) {
      console.log(`  ✓ Documento inserido: ${collectionId} -> ${documentId}`);
      return createRes.data;
    } else {
      console.error(`  ✖ Falha ao inserir doc ${documentId}:`, createRes.data);
    }
  }
}

async function main() {
  console.log('=====================================================');
  console.log('🚀 INICIANDO MODELAGEM E SEED DO APPWRITE (TOTEM PRO)');
  console.log('=====================================================');
  console.log(`Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`Database: ${DATABASE_ID}`);

  // Permissões: Leitura pública para catálogo
  const publicReadPerms = ['read("any")'];

  // 1. cabinet_models
  await createCollection('cabinet_models', 'Modelos de Gabinete', publicReadPerms);
  await addStringAttribute('cabinet_models', 'name', 128, true);
  await addStringAttribute('cabinet_models', 'slug', 64, true);
  await addStringAttribute('cabinet_models', 'description', 2000, false);
  await addIntegerAttribute('cabinet_models', 'base_price_cents', true);
  await addBooleanAttribute('cabinet_models', 'active', false, true);
  await addIntegerAttribute('cabinet_models', 'sort_order', false, 1);
  await addStringAttribute('cabinet_models', 'main_image', 2000, false);
  await addStringAttribute('cabinet_models', 'dimensions_json', 65535, false);

  // 2. colors
  await createCollection('colors', 'Cores e Acabamentos', publicReadPerms);
  await addStringAttribute('colors', 'name', 128, true);
  await addStringAttribute('colors', 'slug', 64, true);
  await addStringAttribute('colors', 'hex_reference', 255, true);
  await addIntegerAttribute('colors', 'price_adjustment_cents', false, 0);
  await addBooleanAttribute('colors', 'active', false, true);
  await addStringAttribute('colors', 'image', 500, false);

  // 3. monitors
  await createCollection('monitors', 'Monitores Homologados', publicReadPerms);
  await addStringAttribute('monitors', 'brand', 64, true);
  await addStringAttribute('monitors', 'model', 128, true);
  await addStringAttribute('monitors', 'display_name', 150, true);
  await addStringAttribute('monitors', 'size', 32, false);
  await addStringAttribute('monitors', 'vesa_pattern', 32, false);
  await addStringAttribute('monitors', 'technical_code', 64, false);
  await addStringAttribute('monitors', 'notes', 1000, false);
  await addBooleanAttribute('monitors', 'active', false, true);
  await addStringAttribute('monitors', 'image', 500, false);

  // 4. printers
  await createCollection('printers', 'Impressoras Térmicas', publicReadPerms);
  await addStringAttribute('printers', 'brand', 64, true);
  await addStringAttribute('printers', 'model', 128, true);
  await addStringAttribute('printers', 'display_name', 150, true);
  await addIntegerAttribute('printers', 'paper_width_mm', false, 80);
  await addStringAttribute('printers', 'technical_code', 64, false);
  await addStringAttribute('printers', 'notes', 1000, false);
  await addBooleanAttribute('printers', 'active', false, true);
  await addStringAttribute('printers', 'image', 500, false);

  // 5. barcode_readers
  await createCollection('barcode_readers', 'Leitores Ópticos de Código/QR', publicReadPerms);
  await addStringAttribute('barcode_readers', 'brand', 64, true);
  await addStringAttribute('barcode_readers', 'model', 128, true);
  await addStringAttribute('barcode_readers', 'display_name', 150, true);
  await addBooleanAttribute('barcode_readers', 'is_2d', false, true);
  await addStringAttribute('barcode_readers', 'technical_code', 64, false);
  await addStringAttribute('barcode_readers', 'notes', 1000, false);
  await addBooleanAttribute('barcode_readers', 'active', false, true);
  await addStringAttribute('barcode_readers', 'image', 500, false);

  // 6. compatibility_rules
  await createCollection('compatibility_rules', 'Regras de Compatibilidade', publicReadPerms);
  await addStringAttribute('compatibility_rules', 'cabinet_model_id', 64, true);
  await addStringAttribute('compatibility_rules', 'equipment_type', 32, true);
  await addStringAttribute('compatibility_rules', 'equipment_id', 64, true);
  await addBooleanAttribute('compatibility_rules', 'is_compatible', false, true);
  await addStringAttribute('compatibility_rules', 'notes', 1000, false);

  // 7. carts
  await createCollection('carts', 'Carrinhos de Compras', []);
  await addStringAttribute('carts', 'session_id', 128, true);
  await addStringAttribute('carts', 'customer_id', 64, false);
  await addStringAttribute('carts', 'status', 32, false, 'active');
  await addIntegerAttribute('carts', 'total_price_cents', false, 0);

  // 8. cart_items
  await createCollection('cart_items', 'Itens do Carrinho', []);
  await addStringAttribute('cart_items', 'cart_id', 64, true);
  await addStringAttribute('cart_items', 'model_id', 64, true);
  await addStringAttribute('cart_items', 'color_id', 64, true);
  await addStringAttribute('cart_items', 'monitor_id', 64, false);
  await addStringAttribute('cart_items', 'printer_id', 64, false);
  await addStringAttribute('cart_items', 'reader_id', 64, false);
  await addIntegerAttribute('cart_items', 'quantity', false, 1);
  await addIntegerAttribute('cart_items', 'unit_price_cents', true);
  await addIntegerAttribute('cart_items', 'subtotal_cents', true);

  // 9. orders
  await createCollection('orders', 'Ordens de Pedidos Totem Pro', []);
  await addStringAttribute('orders', 'order_number', 64, true);
  await addStringAttribute('orders', 'status', 32, false, 'awaiting_payment');
  await addStringAttribute('orders', 'customer_name', 255, true);
  await addStringAttribute('orders', 'customer_document', 32, true);
  await addStringAttribute('orders', 'customer_email', 255, true);
  await addStringAttribute('orders', 'customer_whatsapp', 32, true);
  await addStringAttribute('orders', 'delivery_address_json', 2000, true);
  await addIntegerAttribute('orders', 'subtotal_cents', true);
  await addIntegerAttribute('orders', 'shipping_cents', false, 0);
  await addIntegerAttribute('orders', 'total_cents', true);
  await addStringAttribute('orders', 'manufacturing_sheet_json', 10000, false);

  // 10. order_items
  await createCollection('order_items', 'Itens Faturados de Pedidos', []);
  await addStringAttribute('order_items', 'order_id', 64, true);
  await addStringAttribute('order_items', 'cabinet_name', 128, true);
  await addStringAttribute('order_items', 'color_name', 64, true);
  await addStringAttribute('order_items', 'monitor_name', 128, false);
  await addStringAttribute('order_items', 'printer_name', 128, false);
  await addStringAttribute('order_items', 'reader_name', 128, false);
  await addIntegerAttribute('order_items', 'unit_price_cents', true);
  await addIntegerAttribute('order_items', 'quantity', false, 1);
  await addIntegerAttribute('order_items', 'subtotal_cents', true);

  // 11. payments
  await createCollection('payments', 'Transações e Cobranças Pix', []);
  await addStringAttribute('payments', 'order_id', 64, true);
  await addStringAttribute('payments', 'provider', 32, false, 'pix_xpoint');
  await addIntegerAttribute('payments', 'amount_cents', true);
  await addStringAttribute('payments', 'status', 32, false, 'pending');
  await addStringAttribute('payments', 'pix_code', 2000, false);
  await addStringAttribute('payments', 'expires_at', 64, false);
  await addStringAttribute('payments', 'paid_at', 64, false);

  console.log('\n⏳ Aguardando 4 segundos para propagação dos atributos no Appwrite...');
  await sleep(4000);

  // ==========================================
  // CARGA INICIAL DE DADOS (SEEDS)
  // ==========================================
  console.log('\n=====================================================');
  console.log('🌱 POPULANDO CATÁLOGO COM DADOS DE ENGENHARIA (SEEDS)');
  console.log('=====================================================');

  // Seed Cabinet Models
  const models = [
    {
      id: 'cabinet-floor',
      name: 'Gabinete de Chão',
      slug: 'floor',
      description: 'Design imponente e estruturado com base de alta estabilidade, fechaduras traseiras duplas e compartimento interno dedicado para CPU, nobreak e guilhotina.',
      base_price_cents: 149000,
      active: true,
      sort_order: 1,
      main_image: '/models/cabinet-floor.svg',
      dimensions_json: JSON.stringify({ heightMm: 1650, widthMm: 480, depthMm: 380 })
    },
    {
      id: 'cabinet-wall',
      name: 'Gabinete de Parede',
      slug: 'wall',
      description: 'Máximo aproveitamento do espaço físico em ambientes de tráfego intenso. Fixação vertical reforçada com passagem interna oculta para cabeamento e ventilação ativa.',
      base_price_cents: 99000,
      active: true,
      sort_order: 2,
      main_image: '/models/cabinet-wall.svg',
      dimensions_json: JSON.stringify({ heightMm: 850, widthMm: 440, depthMm: 220 })
    },
    {
      id: 'cabinet-countertop',
      name: 'Gabinete de Balcão',
      slug: 'countertop',
      description: 'Formato compacto e altamente ergonômico, ideal para checkouts expressos, balcões de atendimento, recepções clínicas e pagamentos rápidos.',
      base_price_cents: 89000,
      active: true,
      sort_order: 3,
      main_image: '/models/cabinet-countertop.svg',
      dimensions_json: JSON.stringify({ heightMm: 620, widthMm: 400, depthMm: 290 })
    }
  ];

  for (const m of models) {
    const { id, ...data } = m;
    await createOrUpdateDocument('cabinet_models', id, data);
  }

  // Seed Colors
  const colors = [
    {
      id: 'color-white',
      name: 'Branco Neve Industrial',
      slug: 'white',
      hex_reference: '#f8fafc',
      price_adjustment_cents: 0,
      active: true,
      image: ''
    },
    {
      id: 'color-black',
      name: 'Preto Fosco Titanium',
      slug: 'black',
      hex_reference: '#0f172a',
      price_adjustment_cents: 10000,
      active: true,
      image: ''
    },
    {
      id: 'color-black-white',
      name: 'Black & White Dual-Tone',
      slug: 'black-white',
      hex_reference: 'linear-gradient(135deg, #0f172a 50%, #f8fafc 50%)',
      price_adjustment_cents: 15000,
      active: true,
      image: ''
    }
  ];

  for (const c of colors) {
    const { id, ...data } = c;
    await createOrUpdateDocument('colors', id, data);
  }

  // Seed Monitors
  const monitors = [
    {
      id: 'mon-elgin-215',
      brand: 'Elgin',
      model: 'Touch Pro 21.5"',
      display_name: 'Elgin Touch 21.5" Full HD',
      size: '21.5',
      vesa_pattern: '100x100',
      technical_code: 'ELG-M215-V100',
      notes: 'Moldura standard com furação VESA 100 e vedação perimetral.',
      active: true,
      image: ''
    },
    {
      id: 'mon-gertec-156',
      brand: 'Gertec',
      model: 'TS-150 Touch 15.6"',
      display_name: 'Gertec TS-150 15.6" Widescreen',
      size: '15.6',
      vesa_pattern: '75x75',
      technical_code: 'GER-TS150-V75',
      notes: 'Abertura compacta para totem de parede e balcão.',
      active: true,
      image: ''
    },
    {
      id: 'mon-bematech-185',
      brand: 'Bematech',
      model: 'RC-185 Touch 18.5"',
      display_name: 'Bematech RC-185 18.5" HD',
      size: '18.5',
      vesa_pattern: '100x100',
      technical_code: 'BEM-RC185-V100',
      notes: 'Padrão de corte horizontal com presilhas traseiras de pressão.',
      active: true,
      image: ''
    },
    {
      id: 'mon-prolan-24',
      brand: 'Prolan',
      model: 'Industrial Pro 23.8"',
      display_name: 'Prolan Industrial 23.8" Frameless',
      size: '23.8',
      vesa_pattern: '100x100',
      technical_code: 'PRO-IND24-V100',
      notes: 'Furação reforçada para uso intensivo de 24 horas.',
      active: true,
      image: ''
    }
  ];

  for (const mon of monitors) {
    const { id, ...data } = mon;
    await createOrUpdateDocument('monitors', id, data);
  }

  // Seed Printers
  const printers = [
    {
      id: 'prt-epson-t20x',
      brand: 'EPSON',
      model: 'TM-T20X Térmica',
      display_name: 'EPSON TM-T20X (80mm)',
      paper_width_mm: 80,
      technical_code: 'EPS-T20X-CUT80',
      notes: 'Gaveta com suporte para bobina de 80mm e rasgo para guilhotina frontal.',
      active: true,
      image: ''
    },
    {
      id: 'prt-elgin-i9',
      brand: 'Elgin',
      model: 'i9 Térmica USB/Ethernet',
      display_name: 'Elgin i9 High-Speed (80mm)',
      paper_width_mm: 80,
      technical_code: 'ELG-I9-CUT80',
      notes: 'Trilho deslizante e passagem de fita frontal em aço escovado.',
      active: true,
      image: ''
    },
    {
      id: 'prt-bematech-4200',
      brand: 'Bematech',
      model: 'MP-4200 TH',
      display_name: 'Bematech MP-4200 TH (80mm)',
      paper_width_mm: 80,
      technical_code: 'BEM-MP4200-CUT80',
      notes: 'Gabinete preparado para fácil troca rápida de bobina sem chave.',
      active: true,
      image: ''
    },
    {
      id: 'prt-daruma-dr800',
      brand: 'Daruma',
      model: 'DR800 L',
      display_name: 'Daruma DR800 L (80mm)',
      paper_width_mm: 80,
      technical_code: 'DAR-DR800-CUT80',
      notes: 'Recorte padrão com suporte metálico antivibração.',
      active: true,
      image: ''
    }
  ];

  for (const p of printers) {
    const { id, ...data } = p;
    await createOrUpdateDocument('printers', id, data);
  }

  // Seed Barcode Readers
  const readers = [
    {
      id: 'rdr-honeywell-hf680',
      brand: 'Honeywell',
      model: 'Orbit HF680 2D Imager',
      display_name: 'Honeywell Orbit HF680 (1D/2D / QR Code)',
      is_2d: true,
      technical_code: 'HON-HF680-WIN',
      notes: 'Abertura frontal angular para leitura rápida de smartphones e papel.',
      active: true,
      image: ''
    },
    {
      id: 'rdr-elgin-flash',
      brand: 'Elgin',
      model: 'Flash 2D Fixo',
      display_name: 'Elgin Flash 2D Fixo de Embutir',
      is_2d: true,
      technical_code: 'ELG-FLASH-2D',
      notes: 'Vidro frontal temperado anti-risco de alta durabilidade.',
      active: true,
      image: ''
    },
    {
      id: 'rdr-bematech-i500',
      brand: 'Bematech',
      model: 'I-500 Omnidirecional',
      display_name: 'Bematech I-500 Omnidirecional 2D',
      is_2d: true,
      technical_code: 'BEM-I500-2D',
      notes: 'Encaixe embutido com inclinação otimizada para autosserviço.',
      active: true,
      image: ''
    }
  ];

  for (const r of readers) {
    const { id, ...data } = r;
    await createOrUpdateDocument('barcode_readers', id, data);
  }

  console.log('\n=====================================================');
  console.log('✅ MODELAGEM E SEEDS CONCLUÍDOS COM SUCESSO NO APPWRITE!');
  console.log('=====================================================');
}

main().catch(err => {
  console.error('ERRO FATAL NA EXECUÇÃO:', err);
  process.exit(1);
});
