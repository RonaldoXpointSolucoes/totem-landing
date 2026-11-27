# Especificação Técnica: Pedidos em Andamento (Tempo Real) no Painel Admin

**Data:** 2026-11-27  
**Branch alvo:** `develop`  
**Escopo:** Captura em tempo real de montagens no configurador, carrinhos ativos e rascunhos de checkout + visualização ao vivo na tela de Pedidos & Produção CNC (`/admin?tab=orders`).

---

## 1. Visão Geral e Objetivos

Hoje, o painel de Pedidos (`/admin?tab=orders`) exibe apenas pedidos efetivamente submetidos em `/api/checkout/order`. Clientes que estão **montando um totem no Configurador (`/monte-seu-totem`)**, simulando frete no **Carrinho (`/carrinho`)** ou preenchendo dados no **Checkout (`/checkout`)** sem concluir o envio ficam dispersos no botão histórico `ADS`, sem presença ao vivo, sem atualização rápida e sem separação clara do que ainda está em aberto versus o que já foi convertido em pedido.

### Objetivos Aprovados
1. Exibir na tela de **Pedidos & Produção CNC** um novo botão/filtro **`Em Andamento (Ao Vivo)`** logo ao lado de **`Todos`**, com contador em tempo real e atualização silenciosa rápida (**6 segundos** quando visível).
2. Separar visualmente os registros em duas faixas:
   - **🟢 Ativos no site agora:** visitantes com atividade nos últimos **120 segundos** (2 minutos).
   - **🟡 Abandonados recentes:** visitantes parados há mais de **2 minutos** (janela recente de até **7 dias**) com montagem iniciada, carrinho montado ou dados de contato preenchidos.
3. Permitir visualizar **em tempo real** os itens configurados/no carrinho (modelo, cor, modalidade `Só Gabinete` vs `Kit`, periféricos, serviço de montagem, frete, cupom e totais PIX/Cartão) e os **dados do cliente disponíveis** (digitados ao vivo no checkout/orçamento, recuperados da sessão logada `/api/auth/customer/session`, CEP ou geolocalização Cidade/UF + IP + dispositivo).
4. Disponibilizar ações rápidas em cada cartão: **Chamar no WhatsApp**, **Copiar Link Exato da Montagem/Carrinho** e **Arquivar / Remover**.
5. Garantir remoção **automática** de `Em Andamento` no instante em que o cliente finalizar o pedido (`/api/checkout/order`) ou tiver compra aprovada.

### Regras Inegociáveis do Projeto
- **Zero poluição de pixels de anúncios:** o canal de sincronização ao vivo e heartbeats **nunca** pode acionar Google Tag Manager (`dataLayer`), Google Ads (`gtag`), Meta Pixel (`fbq`) ou TikTok Pixel (`ttq`).
- **Segurança & Privacidade Admin:** leitura e gestão das sessões em andamento exigem autenticação administrativa (`verifyAdminAuth`). O link compartilhável gerado para carrinho (`/montagem/[code]`) continua sem conter dados pessoais (apenas especificações técnicas e cupom).
- **Compactação segura no Appwrite:** o campo `payload_json` na coleção `ads_leads_carts` possui limite de `9950` caracteres; todo snapshot salvo deve permanecer enxuto e íntegro (sem descrições textuais extensas redundantes).
- **Desenvolvimento estritamente Mobile-First:** lista, badges e ações responsivas no celular e desktop sem rolagem horizontal quebrada.

---

## 2. Arquitetura Geral (Abordagem Híbrida sobre `adsLeadsCartsStore`)

Reutilizaremos `AdsLeadsCartsStore` (`totem_db.ads_leads_carts` + cache local `src/data/ads_leads_carts.json`) combinado a um índice rápido em memória (`liveSessionStateMap`) para dados voláteis de presença (`lastHeartbeatAt`, aba visível, URL/etapa exata do configurador).

### Fluxo de Dados End-to-End

```text
[Configurador / Carrinho / Checkout / Sessão Logada]
       │  (debounce ~600ms em mudanças + heartbeat 15s + sendBeacon ao sair)
       ▼
POST /api/live-carts   ──► LiveCartPresenceStore (memória rápida p/ presença + URL/etapa)
                       ──► AdsLeadsCartsStore (persiste rascunho/carrinho/cliente no Appwrite)
       ▲
       │  (polling silencioso a cada 6s na aba "Em Andamento")
GET /api/admin/live-carts (verifyAdminAuth)
       ├─ Mescla LiveCartPresenceStore + AdsLeadsCartsStore
       ├─ Filtra pedidos já finalizados via Orders (sessionId / linkedOrderNumber / CPF/WhatsApp/E-mail)
       └─ Separa: [Ativos Agora (< 2 min)] e [Abandonados Recentes]
```

### Por que essa arquitetura
1. Evita criar e provisionar uma nova coleção Appwrite em produção mantendo compatibilidade total com `ads_leads_carts`.
2. Evita gravar no banco Appwrite a cada 15 segundos durante heartbeats puros: o Appwrite recebe gravação apenas quando há mudança real de montagem, carrinho, frete ou dados digitados do cliente (ou na primeira entrada relevante), enquanto a presença (`lastHeartbeatAt`) fica em memória com custo zero de I/O.
3. Reaproveita a lógica existente de resolução de CEP (`resolveCepGeo`), Geo-IP (`resolveIpGeo`) e diagnóstico de parada já presentes em `adsLeadsCartsStore.ts`.

---

## 3. Contratos e Mudanças por Camada

### 3.1. Captura em Tempo Real na Loja (Sem Pixels)

Criar `src/lib/analytics/liveCartSync.ts` e o componente observador `src/components/analytics/LiveCartTracker.tsx` montado dentro de `<CartProvider>` em `src/app/layout.tsx`:

1. **Identidade de Sessão:** reutiliza `getOrCreateSessionId()` (`totem_analytics_session_id` em `sessionStorage`) e inclui um campo auxiliar persistente em `localStorage` (`totem_browser_client_id_v1`) para manter referência consistente se abrir nova aba no mesmo navegador antes de concluir o pedido.
2. **Fontes observadas pelo sincronizador:**
   - **Configurador (`ConfiguratorWizard.tsx`):** emite estado ao vivo via função/evento dedicado sempre que houver mudança em modelo, cor, modalidade (`choice` / `cabinet` / `kit`), monitor/kit/peças, impressora, leitor, montagem de fábrica, etapa (`1..6`) ou URL sincronizada (`/monte-seu-totem?...`).
     - Inclui um booleano `hasConfiguredProgress`: `true` se o usuário avançou da Etapa 1 ou alterou modelo/cor/equipamento (evita encher o painel com acessos estáticos de leitura que não tocaram no configurador).
   - **Carrinho (`CartContext.tsx` e `CartView.tsx`):**
     - Ao adicionar, editar, duplicar, remover ou alterar quantidade de itens (inclusive ao esvaziar o carrinho via `clearCart` / remoção do último item), dispara sync debounced (~600ms) com os itens completos, totais PIX/Cartão e cupom aplicado.
     - No `/carrinho`, ao simular CEP/frete ou preencher o formulário de orçamento rápido (`quoteName`, `quoteWhatsapp`, `quoteDocOrEmail`), envia imediatamente para o estado ao vivo.
   - **Checkout (`CheckoutView.tsx`):**
     - Ao entrar no `/checkout` (`begin_checkout` já existente) e durante digitação dos campos (`name`, `whatsapp`, `email`, `document`, `personType`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `selectedShippingQuote`, `paymentMethod`) envia ao canal `/api/live-carts` (substituindo/complementando `CHECKOUT_DRAFT` sem duplicar eventos de pixel).
     - Ao chamar `POST /api/checkout/order`, garante o envio explícito do `sessionId` atual (de `getOrCreateSessionId()`) para vinculação imediata e remoção instantânea de `Em Andamento`.
   - **Sessão Logada do Cliente (`/api/auth/customer/session`):**
     - Quando o visitante já estiver autenticado (ou fizer login pelo modal/portal durante a navegação), `LiveCartTracker` anexa os dados do perfil logado (`name`, `whatsapp`, `email`, `document`, endereço principal) ao rascunho em andamento caso não haja dados digitados manualmente no checkout.
3. **Heartbeat e Visibilidade:**
   - Enquanto houver atividade no configurador (`/monte-seu-totem`), `/carrinho`, `/checkout` ou carrinho com `items.length > 0` **e** `document.visibilityState === "visible"`, envia heartbeat leve a cada **15 segundos** (`mode: "heartbeat"`).
   - Ao ocultar a aba (`visibilitychange` -> `"hidden"`) ou sair (`pagehide`), envia atualização via `navigator.sendBeacon` marcando `isTabVisible: false`.

---

### 3.2. Store de Sessões Ao Vivo & Regras de Exclusão (`src/lib/analytics/liveCartsStore.ts`)

Criar `src/lib/analytics/liveCartsStore.ts` integrado ao `adsLeadsCartsStore` existente:

#### Estrutura de Presença e Resumo (`LiveInProgressItem`)
```ts
export interface LiveInProgressItem {
  id: string;                 // ex: sess_<sessionClean>
  recordId: string;           // ex: CART-20261127-XXXXXX ou ADS-...
  sessionId: string;
  presenceStatus: "active_now" | "abandoned_recent";
  isTabVisible: boolean;
  lastHeartbeatAt: string;    // ISO 8601
  secondsSinceLastSeen: number;
  timeOnSiteSeconds: number;
  currentPath: string;        // ex: "/monte-seu-totem", "/carrinho", "/checkout"
  currentStageLabel: string;  // ex: "Configurador Etapa 3 (Monitor/Kit)", "Carrinho (Simulou Frete)", "Checkout (Preenchendo Dados)"
  configuratorUrl?: string;   // URL exata relativa do configurador com query params
  sourceType: "configurator_draft" | "cart" | "checkout";
  customer: AdsLeadCartRecord["customer"];
  hasContactIdentified: boolean;
  cart: {
    items: AdsCartItemSnapshot[];
    draftConfigItem?: AdsCartItemSnapshot | null; // Item em montagem antes de clicar em Adicionar ao Carrinho
    itemsCount: number;
    subtotalCents: number;
    shippingCents: number;
    shippingCarrier: string;
    shippingDeliveryDays: number;
    discountCents: number;
    couponCode: string;
    totalCents: number;
    pixTotalCents: number;
    cardTotalCents: number;
    paymentMethod: "pix" | "credit_card" | "undecided";
  };
  attribution: {
    source: "google_ads" | "organic_or_direct";
    campaignName: string;
    keyword: string;
    gclid: string;
  };
  telemetry: {
    device: "MOBILE" | "DESKTOP" | "TABLET" | string;
    ip: string;
    isp?: string;
    stepsJourney: string[];
    abandonmentDiagnosis?: NonNullable<AdsLeadCartRecord["telemetry"]["abandonmentDiagnosis"]>;
  };
  commercialNotes: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Regras Rígidas de Elegibilidade para "Em Andamento (Ao Vivo)"
Um registro só entra em `activeNow` ou `abandonedRecent` se passar por **todas** as condições abaixo:
1. **Não arquivado / não histórico seed:** `rec.status !== "archived"` e não pertence aos seeds históricos fixos (`SEED_ADS_RECORDS`).
2. **Janela temporal:**
   - **Ativo Agora (`active_now`):** `now - lastHeartbeatAt <= 120_000` (2 minutos).
   - **Abandonado Recente (`abandoned_recent`):** `now - lastSeenAt > 120_000` e `now - lastSeenAt <= 7 * 24 * 60 * 60 * 1000` (últimos 7 dias).
3. **Possui intenção comercial concreta:**
   - `cart.items.length > 0` **OU** `draftConfigItem != null` (cliente montando no configurador) **OU** `hasContactIdentified === true` (preencheu nome real, WhatsApp, e-mail ou CPF/CNPJ no checkout/orçamento).
   - *(Exclui cliques soltos sem item/contato e exclui sessões cujo usuário esvaziou manualmente todo o carrinho sem dados de contato.)*
4. **Não foi convertido em Pedido (`orders`):**
   - Excluir automaticamente se `rec.status === "converted_order"` ou `rec.funnelStage === "purchase"` ou `rec.funnelStage === "pix_generated"` ou `Boolean(rec.linkedOrderNumber)`.
   - Verificação cruzada adicional contra os pedidos recentes (Appwrite `orders` + local store, com cache em memória de 5s): excluir também qualquer sessão cujo `sessionId`, `customer.document` (CPF/CNPJ normalizado >= 11 dígitos), `customer.whatsapp` (últimos 10–11 dígitos) ou `customer.email` corresponda a um pedido criado igual ou posterior a `rec.createdAt` (exceto se o pedido tiver sido cancelado antes de nova tentativa posterior).
   - Quando `POST /api/checkout/order` cria um pedido com sucesso, ele também notifica `liveCartsStore.markSessionConverted(sessionId, orderNumber)` para limpeza imediata da presença em memória e vínculo em `adsLeadsCartsStore`.

#### Segurança de Serialização no Appwrite (`payload_json`)
Ao gravar em `ads_leads_carts` via `adsLeadsCartsStore.ts`:
- Cada `AdsCartItemSnapshot` preserva apenas campos essenciais (`itemId`, `cabinetModelId`, `cabinetName`, `colorId`, `colorName`, `monitorId`, `monitorName`, `printerId`, `printerName`, `barcodeReaderId`, `barcodeReaderName`, `purchaseMode`, `assemblyServiceSelected`, `assemblyFeeCents`, `customizationNotes` limitada a 240 chars, `quantity`, `unitPriceCents`, `pixPriceCents`, `cardPriceCents`, `subtotalCents`, `kitSummaryText`).
- `telemetry.stepsJourney` mantém até os últimos `20` passos deduplicados.
- Isso mantém `JSON.stringify(record)` confortavelmente abaixo dos `9950` caracteres suportados pelo atributo `payload_json`.

---

### 3.3. APIs REST (`/api/live-carts` e `/api/admin/live-carts`)

1. **`POST /api/live-carts` (`src/app/api/live-carts/route.ts`)**
   - Recebe o payload do cliente (`sessionId`, `pathname`, `stageLabel`, `mode: "state" | "heartbeat" | "leave"`, `isTabVisible`, `configuratorDraft`, `cartItems`, `customerDraft`, `shipping`, `couponCode`, `attribution`, `timeOnSiteSeconds`).
   - Ignora bots óbvios pelo `User-Agent` (`bot|crawler|spider|headless` sem interação) e valida que `sessionId` é não-vazio.
   - Extrai IP (`cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`), cidade/UF por header ou `resolveCepGeo`/`resolveIpGeo`.
   - Atualiza imediatamente o estado em memória (`liveCartsStore`).
   - Quando `mode === "state"` (mudança de itens, montagem, CEP ou dados do cliente) ou primeiro snapshot de uma sessão com montagem/carrinho/contato, persiste em `adsLeadsCartsStore` (sem tocar no funil de pixels).
   - Retorna `{ ok: true }` (status `200`, resposta mínima rápida).

2. **`GET /api/admin/live-carts` (`src/app/api/admin/live-carts/route.ts`)**
   - Protegido com `verifyAdminAuth()` (aceita sessão admin ou seller, mais cookie legado administrativo consistente com `/api/admin/remarketing` e `/api/admin/orders`).
   - Retorna:
     ```json
     {
       "ok": true,
       "serverTime": "2026-11-27T16:15:00.000Z",
       "summary": {
         "activeNowCount": 2,
         "abandonedRecentCount": 5,
         "totalInProgressCount": 7,
         "identifiedContactsCount": 4,
         "totalPotentialPixCents": 1845000
       },
       "activeNow": [...],
       "abandonedRecent": [...]
     }
     ```
3. **`PATCH /api/admin/live-carts`** (protegido com `verifyAdminAuth()`):
   - Permite atualizar `commercialNotes` ou arquivar (`status: "archived"`).
4. **`DELETE /api/admin/live-carts?id=...`** (protegido com `verifyAdminAuth()`):
   - Remove o registro tanto da presença em memória quanto de `adsLeadsCartsStore` / Appwrite.

---

### 3.4. Interface do Painel Admin (`src/app/admin/page.tsx` + `src/components/admin/LiveInProgressCartsPanel.tsx`)

#### Integração em `src/app/admin/page.tsx`
1. **Novo filtro de status `"live"`:**
   - Posicionado na **Faixa 2** logo após o botão **`Todos`** (e antes de `ADS`):
     - Label: **`Em Andamento (Ao Vivo)`**
     - Indicador visual: ponto verde pulsante quando `liveSummary.activeNowCount > 0`, acompanhado de badge mostrando a contagem total em andamento (`liveSummary.totalInProgressCount`), com tooltip detalhando `X ativo(s) agora • Y abandonado(s)`.
   - Sincronizado via parâmetro de URL `&status=live`.
2. **Polling Oculto & Responsivo:**
   - Quando `statusFilter === "live"` e `document.visibilityState === "visible"`, dispara `loadLiveCarts({ silent: true })` a cada **6 segundos** (`6000ms`), comparando assinatura leve dos registros para atualizar a tela suavemente sem flickers nem reset de cards expandidos.
   - Enquanto o admin está em outra aba/filtro (ex.: `Todos`), atualiza os contadores de `Em Andamento` no sync de 45s para manter o badge vivo atualizado.
3. **Filtro por busca e modo de visão:**
   - Respeita `searchQuery` já presente na barra superior (busca por nome, WhatsApp, e-mail, CPF/CNPJ, CEP, cidade, modelo de gabinete, placa/código de sessão).
   - Adapta a densidade do cartão conforme `ordersViewMode === "simplified"` vs `"detailed"`.

#### Novo Componente `src/components/admin/LiveInProgressCartsPanel.tsx`
- **Resumo Superior (4 cards compactos em grid responsivo):**
  - `🟢 Ativos no Site Agora`
  - `🟡 Abandonados Recentes`
  - `📞 Com Contato Identificado`
  - `💰 Potencial em Aberto (PIX)`
- **Seção 1 — Ativos no Site Agora (Tempo Real):**
  - Cartões com realce esmeralda discreto, selo pulsante **`AO VIVO • há Xs`**, indicador de visibilidade da aba, etapa exata atual (ex.: *Montando Etapa 3 (Monitor/Kit)*, *No Carrinho (Simulou Frete)*, *No Checkout (Preenchendo CPF/Endereço)*).
- **Seção 2 — Abandonados Recentes (Últimos 7 dias):**
  - Cartões com realce âmbar discreto, timestamp relativo (*Parou há 18 min*, *Ontem às 15:40*), além do diagnóstico automático (*Simulou frete por CEP e pausou*, *Parou no preenchimento do checkout*, etc.).
- **Conteúdo do Cartão:**
  - **Bloco Cliente & Origem:** Nome real (ou `Visitante • Cidade/UF`), WhatsApp formatado, E-mail, CPF/CNPJ, endereço + CEP, dispositivo (`Mobile` / `Desktop`), tempo no site e badge de origem (`Google Ads` + palavra-chave ou `Orgânico/Direto`).
  - **Bloco Carrinho / Montagem Atual:** Lista dos itens no carrinho (ou item pré-montado no configurador com badge `Em montagem`), mostrando modelo, cor, modalidade (`Kit Completo` / `Kit Parcial` / `Só Gabinete CNC`), monitor/impressora/leitor/montagem de fábrica, frete simulado, cupom, subtotal no **PIX** e valor no **Cartão (1x / 10x MP)**.
  - **Barra de Ações Rápidas:**
    1. **💬 Chamar no WhatsApp:** habilitado com link direto `wa.me/55...` e mensagem comercial amigável citando os itens montados e valor no PIX; desabilitado com dica visual se o visitante ainda não informou WhatsApp.
    2. **🔗 Copiar Link Exato:**
       - Se houver itens fechados no carrinho, aciona `POST /api/carts/share` para gerar/copiar o link curto `/montagem/MNT-XXXXXX` (com estado visual `✓ Link Copiado!`).
       - Se o visitante ainda estiver montando no Configurador (`configuratorUrl`), copia o link direto completo `https://totem.xpointsolucoes.com.br/monte-seu-totem?...` com as escolhas exatas dele.
    3. **👁️ Ver Jornada / Notas Comerciais:** expansível (ou sempre aberto no modo `Visão Detalhada`) exibindo a timeline de passos (`stepsJourney`) e campo para anotação rápida salva via `PATCH /api/admin/live-carts`.
    4. **🗑️ Arquivar / Remover:** move para arquivado ou exclui o registro via `PATCH`/`DELETE /api/admin/live-carts`.

---

## 4. Plano de Testes e Verificação

1. **Testes Automatizados (`scripts/validate-live-carts.ts`):**
   - Criar suíte isolada de verificação validando:
     - Criação de rascunho a partir do Configurador (`configurator_draft`), evolução para Carrinho (`cart`) e preenchimento incremental no Checkout (`checkout`).
     - Classificação exata `active_now` (`<= 120s`) vs `abandoned_recent` (`> 120s`).
     - Exclusão de itens históricos seed e exclusão automática quando o carrinho é esvaziado sem contato ou quando `markSessionConverted` vincula a um pedido real (`TOT-...`).
     - Segurança de compactação mantendo `payload_json` abaixo de `9950` bytes.
2. **Build & Tipos:**
   - `npx tsc --noEmit` e `npm run build` sem erros.
3. **Validação Ponta a Ponta Ao Vivo (Chrome DevTools):**
   - Abrir a loja em uma aba simulando um cliente montando um totem no Configurador, adicionando ao Carrinho e digitando dados no Checkout.
   - Abrir `/admin?tab=orders&status=live` em paralelo e validar que os itens e os dados digitados aparecem em tempo real (sem disparar eventos de conversão falsa no `dataLayer` para heartbeats), testar os botões **Copiar Link Exato**, **WhatsApp** e remoção ao finalizar pedido.
