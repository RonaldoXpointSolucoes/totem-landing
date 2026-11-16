# Especificação Técnica: Compartilhamento de Montagem & Checkout Direto (v3.5.8)

## 1. Visão Geral e Objetivos

Permitir que qualquer pessoa (cliente, parceiro, consultor comercial ou vendedor) configure um ou mais totens, gere um **link curto e compartilhável da montagem** e envie para terceiros. Ao abrir o link, o destinatário recebe o carrinho preenchido com exatidão técnica e preços recalculados pelo servidor, pronto para avançar diretamente ao **Checkout** e apenas selecionar sua **conta de login**, **entrega** e **forma de pagamento**.

### Regras Inegociáveis do Projeto
- **Soberania de Preços no Servidor**: O navegador nunca é autoridade sobre preços. Tanto a criação quanto a leitura do link compartilhado recalculam todos os valores no backend a partir do catálogo vivo do Appwrite (`getAppwriteCatalog()`) e do motor `calculateTotemPrice` + `calculateSelectiveCouponDiscount`.
- **Zero Vazamento de Dados Pessoais**: O snapshot compartilhado armazena exclusivamente especificações técnicas dos totens, cupom opcional e referência comercial/título opcional — nunca CPF, CNPJ, nome, e-mail, WhatsApp, endereço ou cookie de sessão de quem gerou o link.
- **Mobile-First**: Todos os botões, modais, tela de resolução de conflito de carrinho e bloco de seleção de conta no checkout seguem layout responsivo mobile-first sem rolagem horizontal.

---

## 2. Arquitetura de Persistência e Contratos (`Appwrite + Fallback`)

### 2.1. Nova Coleção no Appwrite (`totem_db.shared_carts`)
Adicionar `sharedCarts: "shared_carts"` em `APPWRITE_CONFIG.collections` (`src/lib/appwrite/config.ts`), acompanhado de script de provisionamento idempotente (`scripts/setup-shared-carts-collection.ts`) e auto-provisionamento sob demanda no store do servidor caso a coleção ainda não exista.

Atributos da coleção `shared_carts`:
- `share_code` (`string`, 64, obrigatório) — Código curto legível e único, ex.: `MNT-7K4P9A` (alfabeto sem caracteres ambíguos `0/O/I/1`).
- `title` (`string`, 160, opcional) — Título/referência amigável dada por quem compartilhou (ex.: *"Totem Caixa Loja 2"*).
- `coupon_code` (`string`, 64, opcional) — Código do cupom ativo no momento do compartilhamento (validado novamente na leitura).
- `items_count` (`integer`, obrigatório) — Soma das quantidades dos totens da montagem.
- `pix_total_cents` (`integer`, obrigatório) — Total estimado no PIX na criação (informativo; recalculado na leitura).
- `card_total_cents` (`integer`, obrigatório) — Total estimado no Cartão na criação (informativo; recalculado na leitura).
- `views_count` (`integer`, opcional, padrão `0`) — Contador de aberturas do link.
- `payload_json` (`string`, 65535, obrigatório) — JSON sanitizado com a lista de itens configurados e parâmetros técnicos.
- `created_at` (`string`, 64, obrigatório) — Timestamp ISO 8601.

Índice recomendado: `idx_share_code` (`unique` ou `key` em `["share_code"]`).

Fallback local auxiliar em `src/data/shared_carts.json` gerenciado por `src/lib/cart/sharedCartStore.ts` para resiliência em desenvolvimento offline, mantendo o Appwrite como fonte primária e persistente entre deploys no Coolify.

### 2.2. Estrutura do Item Sanitizado (`SharedCartItemInput`)
Cada item armazenado em `payload_json` guarda apenas identificadores e especificações técnicas:
```ts
export interface SharedCartItemInput {
  modelId: string;
  colorId: string;
  monitorId?: string | null;
  cutoutMonitorId?: string | null;
  cutoutMonitorName?: string | null;
  kitItems?: Array<{ id: string; selected: boolean }>;
  customMonitor?: Partial<MonitorOption> | null;
  printerId?: string | null;
  readerId?: string | null;
  hasScanner?: boolean;
  includeAssemblyService?: boolean;
  customizationNotes?: string;
  quantity: number;
}
```

### 2.3. Reidratação e Recálculo no Servidor (`src/modules/cart/sharedAssembly.ts`)
1. Ao criar (`POST /api/carts/share`):
   - Valida `items` (1 a 20 itens distintos, `quantity` inteira entre 1 e 100 por item).
   - Resolve `model`, `color`, `monitor` (incluindo `customDimensions` se sob medida), sub-itens do Kit via `mergeServerCatalogKitItems`, `cutoutMonitor`, `printer` e `barcodeReader` contra o catálogo vivo (`getAppwriteCatalog()`).
   - Recalcula `calculateTotemPrice` por item.
   - Se `couponCode` foi enviado, valida via `findUserByCoupon`; se inválido/inativo, ignora silenciosamente ou informa aviso sem bloquear a geração.
   - Gera `shareCode` único `MNT-XXXXXX` e persiste na coleção `shared_carts`.
2. Ao ler (`GET /api/carts/share/[code]`):
   - Localiza pelo `share_code` (case-insensitive normalizado).
   - Reidrata todos os itens contra o catálogo **atual** do Appwrite e recalcula preços PIX/Cartão e desconto do cupom no momento da abertura.
   - Se algum componente do catálogo tiver sido desativado, inclui aviso claro em `unavailableWarnings` para transparência ao comprador.
   - Incrementa `views_count` de forma assíncrona não-bloqueante.

---

## 3. Endpoints da API

### 3.1. `POST /api/carts/share` (`src/app/api/carts/share/route.ts`)
- **Entrada JSON**:
  - `title?: string` (máx. 120 caracteres)
  - `couponCode?: string | null`
  - `items: SharedCartItemInput[]`
- **Resposta `201 Created`**:
  ```json
  {
    "ok": true,
    "shareCode": "MNT-7K4P9A",
    "sharePath": "/montagem/MNT-7K4P9A",
    "title": "Totens Loja Centro",
    "itemsCount": 2,
    "pixTotalCents": 980000,
    "cardTotalCents": 1089000,
    "whatsappSummaryText": "..."
  }
  ```

### 3.2. `GET /api/carts/share/[code]` (`src/app/api/carts/share/[code]/route.ts`)
- **Resposta `200 OK`**:
  ```json
  {
    "ok": true,
    "assembly": {
      "shareCode": "MNT-7K4P9A",
      "title": "Totens Loja Centro",
      "createdAt": "2026-11-16T23:00:00.000Z",
      "items": [ /* CartItem[] recalculados */ ],
      "coupon": { /* SelectiveCoupon válido ou null */ },
      "couponDiscountCents": 0,
      "pixTotalCents": 980000,
      "cardTotalCents": 1089000,
      "unavailableWarnings": []
    }
  }
  ```
- **Erro `404`**: `{ ok: false, error: "Montagem compartilhada não encontrada ou expirada." }`

---

## 4. Fluxo de Compartilhamento (Quem Monta e Envia)

### 4.1. Componente `ShareAssemblyModal` (`src/components/cart/ShareAssemblyModal.tsx`)
Modal reutilizável Mobile-First com os seguintes recursos:
1. Aceita `itemsToShare: CartItem[]`, `mode: "cart" | "single_item"`, `appliedCoupon?: SelectiveCoupon | null` e opcionalmente um identificador da origem.
2. Exibe prévia enxuta da configuração a ser compartilhada (modelos, cores, resumo do kit/monitor/impressora e total PIX / Cartão).
3. Campo opcional **Nome / Referência da Montagem** (permite gerar novamente com título personalizado).
4. Quando há `appliedCoupon`, checkbox marcada por padrão: *"Enviar junto o cupom de desconto (`CODIGO`)"*.
5. Assim que aberto (e também ao atualizar o título/cupom), gera/atualiza o link curto via `POST /api/carts/share`.
6. Ações de envio:
   - **Copiar Link** (botão de 1 toque com feedback `Link Copiado ✓`).
   - **Compartilhar no WhatsApp** (abre `wa.me/?text=...` com resumo legível + link `/montagem/MNT-XXXXXX`).
   - **Compartilhar do Sistema (`navigator.share`)** quando suportado no celular.

### 4.2. Pontos de Entrada na UI
1. **Carrinho (`src/components/cart/CartView.tsx`)**:
   - **Cabeçalho e Coluna de Resumo**: Botão destacado **`Compartilhar Montagem`** para compartilhar todos os itens do carrinho.
   - **Barra de ações de cada Item**: Botão **`Compartilhar`** ao lado de *Duplicar / Editar / Excluir* para compartilhar apenas aquele item específico.
2. **Modal de Conclusão do Configurador (`src/components/configurator/ConfiguratorWizard.tsx`)**:
   - No modal *"Gabinete Adicionado ao Carrinho!"*, botão **`Compartilhar Montagem`** para gerar e enviar o link do item recém-montado imediatamente (usando o item salvo em `lastAddedItemId` ou a configuração atual).

---

## 5. Fluxo de Abertura pelo Destinatário (`/montagem/[code]` -> `/checkout`)

### 5.1. Evolução de `CartContext` (`src/modules/cart/CartContext.tsx`)
Adicionar ao contexto e exportar tipagem para metadado de montagem compartilhada (`SharedAssemblyMeta`: `{ shareCode, title, loadedAt }`):
- `activeSharedAssembly: SharedAssemblyMeta | null` (persistido em `sessionStorage` chave `totem_active_shared_assembly_v1`).
- `replaceCartFromSharedAssembly(newItems: CartItem[], coupon?: SelectiveCoupon | null, meta?: SharedAssemblyMeta | null)` — substitui os itens atuais de forma síncrona no `localStorage` e estado React, e aplica ou limpa o cupom.
- `mergeCartFromSharedAssembly(newItems: CartItem[], coupon?: SelectiveCoupon | null, meta?: SharedAssemblyMeta | null)` — anexa os novos itens ao carrinho existente (gerando IDs únicos novos para não colidir) e aplica o cupom da montagem se não houver outro cupom ativo no carrinho.
- `clearActiveSharedAssembly()` — limpa o banner/metadado (chamado também em `clearCart`).

### 5.2. Rota Dedicada `src/app/montagem/[code]/page.tsx` + `SharedAssemblyLoader.tsx`
- **Metadata Dinâmica Server-Side (`generateMetadata`)**: Consulta `sharedCartStore` para montar título e `openGraph` ricos no WhatsApp/Redes (ex.: *"Montagem Totem Pro: Gabinete de Piso + Kit Completo — Confira e finalize seu pedido"*).
- **Lógica do `SharedAssemblyLoader.tsx`**:
  1. Exibe skeleton/loading claro *"Carregando montagem configurada..."*.
  2. Busca `GET /api/carts/share/[code]` e aguarda `isInitialized` do `CartContext`.
  3. **Decisão sobre conflito de carrinho existente**:
     - Se `items.length === 0` **OU** se o visitante já estiver com o `activeSharedAssembly?.shareCode === code` e o mesmo conteúdo (recarregamento):
       - Executa `replaceCartFromSharedAssembly(...)` e navega direto via `router.replace('/checkout?montagem=' + code)`.
     - Se `items.length > 0` (há outros totens salvos no navegador do visitante):
       - **Pergunta explicitamente antes de alterar o carrinho**, apresentando dois blocos visuais lado a lado / empilhados no mobile:
         - **Seu Carrinho Atual** (`X` itens + valor PIX)
         - **Montagem do Link (`MNT-XXXXXX`)** (título, lista de itens + valor PIX)
       - Dois botões principais de decisão:
         - **`Substituir meu carrinho por esta montagem`** → aplica substituição e redireciona para `/checkout?montagem=[code]`.
         - **`Somar esta montagem ao meu carrinho`** → mescla preservando os itens anteriores e redireciona para `/checkout?montagem=[code]`.
       - Ação secundária discreta: `"Manter apenas meu carrinho atual"` (leva para `/carrinho`).
  4. **Link inválido ou expirado**: Mensagem amigável com CTA para `/monte-seu-totem`.

---

## 6. Checkout com Seleção de Conta de Login, Entrega e Pagamento

### 6.1. Ajuste no `CustomerAuthModal` (`src/components/auth/CustomerAuthModal.tsx`)
- Adicionar prop opcional `redirectOnSuccess?: string | null` (valor padrão `"/cliente"` para não alterar em nada o fluxo atual da `Navbar` e `/cliente`).
- Quando `redirectOnSuccess === null`: após login com **WhatsApp** ou **Conta Google**, chama `onSuccess(data.customer)`, fecha o modal sem navegar para `/cliente` e dispara atualização de sessão no próprio checkout (`Navbar` também ouve evento customizado `totem:customer-auth-changed` para atualizar o header em sincronia).

### 6.2. Experiência Guiada no `CheckoutView` (`src/components/checkout/CheckoutView.tsx`)
1. **Faixa de Contexto da Montagem Compartilhada**:
   - Quando `activeSharedAssembly` estiver ativo (ou query `?montagem=`), exibe no topo do Checkout um banner discreto confirmando: *"Montagem compartilhada carregada ✓"* (exibindo o título, caso exista, e eventuais avisos se algum item saiu de catálogo) com link rápido **"Revisar ou alterar itens no carrinho"** (`/carrinho`).
2. **Bloco Destacado `1. Conta de Login & Dados do Comprador`**:
   - Reutiliza lógica compartilhada `applyCustomerToForm(cust)` tanto na montagem inicial quanto ao autenticar pelo modal dentro do Checkout!
   - **Se NÃO estiver logado**:
     - Exibe um cartão interativo no topo da seção 1: **"Entre ou selecione sua conta (WhatsApp ou Google)"** com dois botões claros de 1 toque:
       - **`Entrar com WhatsApp`** (abre `CustomerAuthModal` na aba `whatsapp`, `redirectOnSuccess={null}`)
       - **`Entrar com Conta Google`** (abre `CustomerAuthModal` na aba `google`, `redirectOnSuccess={null}`)
     - Texto auxiliar: *"Já tem conta ou comprou antes? Seus dados e endereços carregam na hora. Ou preencha diretamente nos campos abaixo."*
   - **Se JÁ estiver logado**:
     - Mantém o banner de conta identificada e adiciona o botão **`Trocar de Conta`** (permite trocar rapidamente de conta WhatsApp/Google dentro do próprio Checkout sem perder o carrinho).
3. **Entrega e Pagamento**:
   - Após selecionar a conta (ou preencher CEP), o endereço é carregado/validado, os fretes são cotados automaticamente e o cliente escolhe a modalidade de entrega e conclui por **PIX** ou **Cartão até 10x**.

---

## 7. Estratégia de Testes e Verificação

1. **Testes Automatizados (`scripts/validate-shared-cart.ts`)**:
   - Validação do payload sanitizado (garantindo ausência de dados pessoais).
   - Reidratação de montagem com item padrão, item com Kit personalizado (sub-itens desmarcados + monitor de furação separado) e item com monitor sob medida (`customDimensions`).
   - Prova de recálculo server-side (alterando valores manipulados no payload e verificando que o servidor ignora e recalcula pelo catálogo oficial).
   - Teste de ciclo completo criação + leitura + incremento de visualizações + cupom válido/inválido.
2. **Verificação de Tipagem e Build**:
   - `npx tsc --noEmit` com exit code 0.
   - Verificação visual / fluxo em Mobile e Desktop após deploy.
