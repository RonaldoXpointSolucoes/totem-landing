import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ensureAppSettingsCollection,
  invalidatePersistentCorreiosConfigCache,
  loadPersistentCorreiosConfig,
  savePersistentCorreiosConfig,
  type AppSettingsDatabasesLike,
} from "../src/modules/shipping/correiosSettingsPersistence";
import {
  authenticateCorreiosCws,
  getCorreiosContractConfig,
  launchOrderCorreiosPrepostagem,
  listCorreiosPanelPrepostagens,
  saveCorreiosContractConfigAsync,
} from "../src/modules/shipping/correiosPrepostagemService";

function createMockDatabases() {
  let hasCollection = false;
  let storedDoc: Record<string, any> | null = null;
  const createdAttrs: string[] = [];

  const db: AppSettingsDatabasesLike = {
    async getCollection() {
      if (!hasCollection) {
        const err: any = new Error("Collection not found");
        err.code = 404;
        err.type = "collection_not_found";
        throw err;
      }
      return { $id: "app_settings" };
    },
    async createCollection(_databaseId, _collectionId) {
      hasCollection = true;
      return { $id: "app_settings" };
    },
    async listAttributes() {
      return {
        attributes: createdAttrs.map((key) => ({ key, status: "available" })),
      };
    },
    async createStringAttribute(_databaseId, _collectionId, key) {
      createdAttrs.push(key);
      return { key };
    },
    async getDocument() {
      if (!storedDoc) {
        const err: any = new Error("Document not found");
        err.code = 404;
        err.type = "document_not_found";
        throw err;
      }
      return storedDoc;
    },
    async updateDocument(_dbId, _colId, _docId, data) {
      if (!storedDoc) {
        const err: any = new Error("Document not found");
        err.code = 404;
        err.type = "document_not_found";
        throw err;
      }
      storedDoc = { ...storedDoc, ...data };
      return storedDoc;
    },
    async createDocument(_dbId, _colId, docId, data) {
      storedDoc = { $id: docId, ...data };
      return storedDoc;
    },
  };

  return {
    db,
    getState: () => ({ hasCollection, createdAttrs, storedDoc }),
  };
}

async function runTests() {
  const settingsFilePath = path.join(process.cwd(), "src", "data", "correios_contract_settings.json");
  const envFilePath = path.join(process.cwd(), ".env");
  const settingsExistedBefore = fs.existsSync(settingsFilePath);
  const previousSettingsContent = settingsExistedBefore ? fs.readFileSync(settingsFilePath, "utf-8") : null;
  const envExistedBefore = fs.existsSync(envFilePath);
  const previousEnvContent = envExistedBefore ? fs.readFileSync(envFilePath, "utf-8") : null;
  const previousEnvUsuario = process.env.CORREIOS_USUARIO;
  const previousEnvSenha = process.env.CORREIOS_SENHA_API;
  const previousAppwriteKey = process.env.APPWRITE_API_KEY;
  const previousFetch = globalThis.fetch;

  // Garante isolamento total do Appwrite em testes unitários
  process.env.APPWRITE_API_KEY = "";

  try {
    // 1. Teste de persistência Appwrite (criação idempotente de app_settings + round-trip)
    invalidatePersistentCorreiosConfigCache();
    const { db, getState } = createMockDatabases();
    const ready = await ensureAppSettingsCollection(db);
    assert.equal(ready, true, "Coleção app_settings deve ser criada automaticamente no primeiro uso");
    assert.deepEqual(
      getState().createdAttrs,
      ["key", "value_json", "updated_at"],
      "Atributos de app_settings devem ser provisionados"
    );

    const savedOk = await savePersistentCorreiosConfig(
      { cwsUser: "xpoint_test", cwsPassword: "TOKEN_TESTE_CWS_999" },
      db
    );
    assert.equal(savedOk, true, "Configuração deve persistir no Appwrite");

    invalidatePersistentCorreiosConfigCache();
    const loadedFromAppwrite = await loadPersistentCorreiosConfig({ forceRefresh: true, db });
    assert.equal(loadedFromAppwrite?.cwsUser, "xpoint_test");
    assert.equal(loadedFromAppwrite?.cwsPassword, "TOKEN_TESTE_CWS_999");

    // 2. Preservação do token ao salvar formulário sem redigitar senha ("" ou "***")
    await saveCorreiosContractConfigAsync({
      cwsUser: "11040282000177",
      cwsPassword: "TOKEN_PRESERVADO_123",
    });
    const afterBlankSave = await saveCorreiosContractConfigAsync({
      cwsPassword: "",
      selectedPickupAddressId: "pickup_xpoint_matriz",
    });
    assert.equal(
      afterBlankSave.config.cwsPassword,
      "TOKEN_PRESERVADO_123",
      "Salvar com cwsPassword='' nunca pode apagar o token já salvo"
    );
    const afterMaskSave = await saveCorreiosContractConfigAsync({
      cwsPassword: "***",
    });
    assert.equal(
      afterMaskSave.config.cwsPassword,
      "TOKEN_PRESERVADO_123",
      "Salvar com cwsPassword mascarado ('***') deve preservar o token real"
    );
    assert.equal(getCorreiosContractConfig().cwsPassword, "TOKEN_PRESERVADO_123");

    // 3. Fluxo completo CWS Live: idCorreios canônico + NF-e com itensDeclaracaoConteudo + polling PDF + V2 Panel Sync
    const capturedCalls: Array<{ url: string; method: string; body?: any }> = [];
    let asyncDownloadAttempts = 0;
    let rejectWithCienteFormatOnce = true;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method || "GET";
      const parsedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      capturedCalls.push({ url, method, body: parsedBody });

      if (url.includes("/token/v1/autentica/cartaopostagem")) {
        return new Response(
          JSON.stringify({
            ambiente: "PRODUCAO",
            id: "xpoint_meu_correios_id",
            cnpj: "11040282000177",
            cartaoPostagem: {
              numero: "0079659128",
              contrato: "9912722993",
              dr: 72,
              api: [36, 93],
            },
            expiraEm: "2026-11-15T00:00:00",
            token: "eyJhbGciOiJSUzUxMiJ9.fake_token",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/prepostagem/v1/prepostagens/rotulo/assincrono/pdf")) {
        return new Response(JSON.stringify({ idRecibo: "RECIBO-TESTE-01" }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/prepostagem/v1/prepostagens/rotulo/download/assincrono/RECIBO-TESTE-01")) {
        asyncDownloadAttempts++;
        if (asyncDownloadAttempts === 1) {
          return new Response("", { status: 202 });
        }
        return new Response(JSON.stringify({ dados: "JVBERi0xLjQKJUZBS0VQREY=" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/prepostagem/v2/prepostagens")) {
        return new Response(
          JSON.stringify({
            itens: [
              {
                id: "PR_CORREIOS_ID_1",
                codigoObjeto: "AB123456789BR",
                status: "PREPOSTADO",
                codigoServico: "03220",
                destinatario: { nome: "Cliente Teste", endereco: { cep: "01310100" } },
                dataHoraPrePostagem: "2026-11-13T23:30:00",
              },
            ],
            page: { totalElements: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/prepostagem/v1/prepostagens")) {
        if (rejectWithCienteFormatOnce && parsedBody?.cienteObjetoNaoProibido === "1") {
          rejectWithCienteFormatOnce = false;
          return new Response(
            JSON.stringify({ msgs: ["Campo cienteObjetoNaoProibido inválido"] }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            id: "PR_CORREIOS_ID_1",
            codigoObjeto: "AB123456789BR",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("viacep.com.br")) {
        return new Response(
          JSON.stringify({
            cep: "01310-100",
            logradouro: "Avenida Paulista",
            bairro: "Bela Vista",
            localidade: "São Paulo",
            uf: "SP",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("{}", { status: 404 });
    }) as typeof fetch;

    const authCheck = await authenticateCorreiosCws();
    assert.equal(authCheck.ok, true);
    assert.equal(authCheck.canonicalIdCorreios, "xpoint_meu_correios_id");

    const launchRes = await launchOrderCorreiosPrepostagem({
      orderId: "ord_test_1",
      orderNumber: "TOT-2026-TEST01",
      mode: "cws_live",
      serviceCode: "03220",
      invoiceNumber: "1029",
      invoiceKey: "35261111040282000177550010000010291000010291",
      recipient: {
        name: "Cliente Teste Totem",
        document: "123.456.789-09",
        phone: "(11) 98888-7777",
        email: "cliente@teste.com",
        cep: "01310-100",
        street: "Avenida Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
      volumes: [
        {
          volumeIndex: 1,
          totalVolumes: 1,
          label: "Totem",
          heightCm: 23,
          widthCm: 45,
          lengthCm: 68,
          weightGrams: 16000,
          declaredValueReais: 1100,
          contentItems: [{ conteudo: "Box", quantidade: 1, valorReais: 1100 }],
        },
      ],
    });

    assert.equal(
      launchRes.ok,
      true,
      `Lançamento CWS Live deve concluir com sucesso. Erro: ${launchRes.error} | Breadcrumbs: ${JSON.stringify(launchRes.breadcrumbs.map((b) => ({ step: b.step, status: b.status, summary: b.summary })))}`
    );
    assert.equal(launchRes.shipment.mode, "cws_live");
    assert.equal(launchRes.shipment.volumes[0].trackingCode, "AB123456789BR");
    assert.equal(launchRes.shipment.volumes[0].prepostagemId, "PR_CORREIOS_ID_1");
    assert.equal(
      launchRes.shipment.officialLabelPdfBase64,
      "JVBERi0xLjQKJUZBS0VQREY=",
      "Polling assíncrono deve aguardar HTTP 202 e recuperar o PDF na tentativa seguinte"
    );
    assert.equal(asyncDownloadAttempts, 2, "Polling deve ter feito 2 tentativas até obter o PDF");

    const postPrepostagens = capturedCalls.filter((c) => c.url.endsWith("/prepostagem/v1/prepostagens"));
    assert.equal(postPrepostagens.length, 2, "Deve ter feito retry automático para cienteObjetoNaoProibido='S'");
    const finalPayload = postPrepostagens[1].body;
    assert.equal(finalPayload.idCorreios, "xpoint_meu_correios_id", "Deve enviar idCorreios canônico retornado na autenticação");
    assert.equal(finalPayload.cienteObjetoNaoProibido, "S");
    assert.equal(finalPayload.chaveNFe, "35261111040282000177550010000010291000010291");
    assert.ok(
      Array.isArray(finalPayload.itensDeclaracaoConteudo) && finalPayload.itensDeclaracaoConteudo.length === 1,
      "itensDeclaracaoConteudo deve SEMPRE ser enviado mesmo com chaveNFe de 44 dígitos"
    );
    assert.ok(
      finalPayload.itensDeclaracaoConteudo[0].conteudo.length >= 5,
      "Descrição do conteúdo deve ter >= 5 caracteres para não ser rejeitada pelos Correios"
    );

    const panelRes = await listCorreiosPanelPrepostagens({ size: 10 });
    assert.equal(panelRes.ok, true);
    assert.equal(panelRes.totalElements, 1);
    assert.equal(panelRes.items[0].codigoObjeto, "AB123456789BR");

    // 4. Rejeita resposta 200 sem codigoObjeto/id (nunca finge registro no painel Correios)
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/token/v1/autentica/cartaopostagem")) {
        return new Response(JSON.stringify({ id: "xpoint_meu_correios_id", token: "jwt_ok" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/prepostagem/v1/prepostagens")) {
        return new Response(JSON.stringify({ id: "ONLY_ID_WITHOUT_TRACKING" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 404 });
    }) as typeof fetch;

    const brokenRes = await launchOrderCorreiosPrepostagem({
      orderId: "ord_test_2",
      orderNumber: "TOT-2026-TEST02",
      mode: "cws_live",
      serviceCode: "03220",
      recipient: {
        name: "Cliente Teste Totem",
        document: "123.456.789-09",
        phone: "(11) 98888-7777",
        email: "cliente@teste.com",
        cep: "01310-100",
        street: "Avenida Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
      volumes: [
        {
          volumeIndex: 1,
          totalVolumes: 1,
          label: "Gabinete Totem",
          heightCm: 23,
          widthCm: 45,
          lengthCm: 68,
          weightGrams: 16000,
          declaredValueReais: 1100,
        },
      ],
    });
    assert.equal(brokenRes.ok, false, "Sem codigoObjeto e id, nunca pode considerar registrada nos Correios");

    console.log("✅ TODOS OS TESTES DO MOTOR CORREIOS CWS & PERSISTÊNCIA PASSARAM!");
  } finally {
    globalThis.fetch = previousFetch;
    invalidatePersistentCorreiosConfigCache();
    if (previousEnvUsuario === undefined) delete process.env.CORREIOS_USUARIO;
    else process.env.CORREIOS_USUARIO = previousEnvUsuario;
    if (previousEnvSenha === undefined) delete process.env.CORREIOS_SENHA_API;
    else process.env.CORREIOS_SENHA_API = previousEnvSenha;
    if (previousAppwriteKey === undefined) delete process.env.APPWRITE_API_KEY;
    else process.env.APPWRITE_API_KEY = previousAppwriteKey;

    if (settingsExistedBefore && previousSettingsContent !== null) {
      fs.writeFileSync(settingsFilePath, previousSettingsContent, "utf-8");
    } else if (!settingsExistedBefore && fs.existsSync(settingsFilePath)) {
      fs.unlinkSync(settingsFilePath);
    }

    if (envExistedBefore && previousEnvContent !== null) {
      fs.writeFileSync(envFilePath, previousEnvContent, "utf-8");
    }
  }
}

runTests().catch((err) => {
  console.error("❌ FALHA NOS TESTES CORREIOS:", err);
  process.exit(1);
});
