const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://appwrite-inwbueezn2gkpm4tqwvzkswy.179.199.142.157.sslip.io/v1')
  .setProject('chatboot-production')
  .setKey('standard_bc50daa650a82f0d19717cbbc3b277af8c84ee084ab50232baf2b21cfaaabc4fa80ca0af9669163cd644c8676097eefbe001d9cd77a01b60e9b598222ab8117f341729ad3e5330e06af8c63da6e79e8cc3affa6e54cb87056f542c01f934bf21c37b43d1ddaaa5be0c7aff2f0ff2a060dc7d452ee763a2e22830b35da14db7b1');

const db = new Databases(client);
const DB_ID = 'totem_db';

async function testAll() {
  console.log('=== TESTE DE CADASTRO 100% EM TODAS AS COLECOES ===');

  const testCases = [
    {
      col: 'cabinet_models',
      label: 'Modelos de Gabinete',
      initial: {
        name: 'Gabinete Teste Total',
        slug: 'gabinete-teste-total',
        description: 'Descricao de teste com 100% de integridade',
        base_price_cents: 145000,
        active: true,
        sort_order: 5,
        main_image: 'https://exemplo.com/fotos/totem-teste.jpg',
        dimensions_json: JSON.stringify({ heightMm: 1200, widthMm: 450, depthMm: 350, material: 'MDF 15mm' }),
      },
      update: {
        description: 'Descricao atualizada com sucesso',
        main_image: 'https://exemplo.com/fotos/totem-atualizado.jpg',
        sort_order: 2,
      },
    },
    {
      col: 'colors',
      label: 'Cores e Acabamentos',
      initial: {
        name: 'Preto Fosco Microtexturizado Teste',
        slug: 'preto-fosco-teste',
        hex_reference: '#1e293b',
        price_adjustment_cents: 5000,
        active: true,
        image: 'https://exemplo.com/fotos/cor-teste.jpg',
        sort_order: 3,
        description: 'Pintura eletrostatica a po de altissima durabilidade',
      },
      update: {
        hex_reference: '#0f172a',
        image: 'https://exemplo.com/fotos/cor-atualizada.jpg',
        sort_order: 1,
      },
    },
    {
      col: 'monitors',
      label: 'Monitores Homologados',
      initial: {
        brand: 'Samsung',
        model: 'Smart Touch 24',
        display_name: 'Samsung Smart Touch 24 Polegadas',
        slug: 'samsung-smart-touch-24',
        size: '23.8',
        vesa_pattern: '100x100',
        technical_code: 'SAM-ST24-V100',
        notes: 'Monitor capacitivo multi-touch com vidro temperado 4mm',
        active: true,
        sort_order: 2,
        image: 'https://exemplo.com/fotos/monitor-samsung-24.jpg',
      },
      update: {
        slug: 'samsung-smart-touch-24-rev2',
        image: 'https://exemplo.com/fotos/monitor-samsung-24-novo.jpg',
        notes: 'Notas atualizadas para teste',
        sort_order: 1,
      },
    },
    {
      col: 'printers',
      label: 'Impressoras Homologadas',
      initial: {
        brand: 'Daruma',
        model: 'DR800 L',
        display_name: 'Daruma DR800 Guilhotina',
        slug: 'daruma-dr800-l',
        paper_width_mm: 80,
        technical_code: 'DAR-DR800-80',
        notes: 'Impressora termica veloz com corte automatico',
        active: true,
        sort_order: 4,
        image: 'https://exemplo.com/fotos/impressora-daruma.jpg',
      },
      update: {
        slug: 'daruma-dr800-l-v2',
        image: 'https://exemplo.com/fotos/impressora-daruma-v2.jpg',
        sort_order: 2,
      },
    },
    {
      col: 'barcode_readers',
      label: 'Leitores Homologados',
      initial: {
        brand: 'Zebra',
        model: 'DS9308',
        display_name: 'Zebra DS9308 2D Imager',
        slug: 'zebra-ds9308-2d',
        is_2d: true,
        technical_code: 'ZEB-DS9308-2D',
        notes: 'Leitor ultra-rapido para QR Code na tela de smartphones',
        active: true,
        sort_order: 1,
        image: 'https://exemplo.com/fotos/leitor-zebra.jpg',
      },
      update: {
        slug: 'zebra-ds9308-2d-atualizado',
        image: 'https://exemplo.com/fotos/leitor-zebra-v2.jpg',
        sort_order: 3,
      },
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    console.log(`\n--- Testando colecao: ${tc.label} (${tc.col}) ---`);
    let docId = 'test-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    try {
      // 1. Criar
      const created = await db.createDocument(DB_ID, tc.col, docId, tc.initial);
      console.log('1. Criado com sucesso! ID:', created.$id);

      // 2. Validar campos salvos
      for (const [k, v] of Object.entries(tc.initial)) {
        if (created[k] !== v) {
          console.error(`ERRO: Campo ${k} nao salvou corretamente! Esperado: ${v}, Recebido: ${created[k]}`);
          allPassed = false;
        } else {
          console.log(`   OK: [${k}] = ${JSON.stringify(v)}`);
        }
      }

      // 3. Atualizar
      const updated = await db.updateDocument(DB_ID, tc.col, docId, tc.update);
      console.log('2. Atualizado com sucesso!');
      for (const [k, v] of Object.entries(tc.update)) {
        if (updated[k] !== v) {
          console.error(`ERRO no update: Campo ${k} nao atualizou! Esperado: ${v}, Recebido: ${updated[k]}`);
          allPassed = false;
        } else {
          console.log(`   OK Update: [${k}] = ${JSON.stringify(v)}`);
        }
      }

      // 4. Limpeza
      await db.deleteDocument(DB_ID, tc.col, docId);
      console.log('3. Item de teste removido apos validacao.');
    } catch (err) {
      console.error(`FALHA CRITICA na colecao ${tc.col}:`, err.message);
      allPassed = false;
    }
  }

  // Atualizar tambem o mon-elgin-215 (o que o usuario tentou editar no print)
  console.log('\n--- Atualizando mon-elgin-215 com dados do print do usuario ---');
  try {
    const updatedUserMonitor = await db.updateDocument(DB_ID, 'monitors', 'mon-elgin-215', {
      brand: 'Aytek',
      model: 'T5214',
      display_name: 'Aytek AIO-T5214',
      slug: 'aytek-aio-t5214',
      size: '23.8',
      vesa_pattern: '100x100',
      technical_code: 'AYT-T5214-V100',
      notes: 'Tela Touch + PC Core I5',
      active: true,
      sort_order: 1,
      image: 'https://http2.mlstatic.com/D_NQ_NP_2X_657397-MLB91414180451_092025-F-computador-allinone-238-touch-screen-intel-core-i5-3320.webp',
    });
    console.log('Monitor mon-elgin-215 atualizado com sucesso! Slug:', updatedUserMonitor.slug, 'Image:', updatedUserMonitor.image);
  } catch (err) {
    console.error('Erro ao atualizar mon-elgin-215:', err.message);
  }

  if (allPassed) {
    console.log('\n>>> SUCESSO TOTAL: 100% DOS CAMPOS SALVANDO E ATUALIZANDO EM TODAS AS TELAS! <<<');
  } else {
    console.log('\n>>> ALGUNS CAMPOS FALHARAM! REVISAR LOG ACIMA! <<<');
  }
}

testAll();
