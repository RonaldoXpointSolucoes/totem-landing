# Compartilhamento de Montagem & Checkout Direto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que qualquer usuário compartilhe um link curto de montagem (`/montagem/MNT-XXXXXX`) de um item específico ou do carrinho inteiro para que outras pessoas abram o link com o carrinho preenchido (com decisão explícita se já houver itens salvos) e sigam direto para selecionar conta de login, entrega e pagamento no Checkout.

**Architecture:** Um módulo isomórfico (`src/modules/cart/sharedAssembly.ts`) sanitiza os itens técnicos da montagem sem dados pessoais e recalcula todos os preços no servidor contra o catálogo vivo do Appwrite (`calculateTotemPrice` + `calculateSelectiveCouponDiscount`). A camada de persistência (`src/lib/cart/sharedCartStore.ts`) armazena e lê snapshots curtos na coleção `totem_db.shared_carts` do Appwrite (com auto-provisionamento + fallback local), servidos via `/api/carts/share` e `/api/carts/share/[code]`, consumidos pelo `ShareAssemblyModal`, pela rota `/montagem/[code]` e pelo fluxo guiado de Conta + Entrega + Pagamento no `CheckoutView`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.7, Tailwind CSS 4, `node-appwrite`, `lucide-react`, `tsx` para scripts de validação.

**Spec:** [2026-11-16-shared-cart-assembly-design.md](file:///c:/Users/NOTE-(FORM)02JUL26/Documents/Projetos/Antigravity/Totem-Landing/docs/superpowers/specs/2026-11-16-shared-cart-assembly-design.md)

## Global Constraints

- Todo preço (PIX, Cartão, Kit, Montagem de Fábrica e Cupom) deve ser recalculado obrigatoriamente pelo backend/BFF usando o catálogo vivo do Appwrite (`getAppwriteCatalog()`); o navegador nunca é autoridade sobre o preço.
- O snapshot compartilhado nunca pode gravar ou retornar dados pessoais de quem gerou o link (CPF, CNPJ, nome, e-mail, WhatsApp, endereço ou cookies de sessão).
- O configurador mantém suas regras comerciais independentes do visualizador 3D.
- Desenvolvimento estritamente **Mobile-First** e toda a interface, mensagens e comunicação em **Português do Brasil (`pt-BR`)**.
- Versionamento de dígito único (`0` a `9` por campo): próxima versão `3.5.8` em `package.json` e `src/config/site.ts`.

## Review Focus

1. **Manipulação de preços no payload de compartilhamento (`POST` e `GET`)** — Cliente envia `unitPriceCents: 100` ou `calculatedPriceCents: 100`; servidor deve ignorar valores enviados e recalcular pelo catálogo oficial em `hydrateSharedCartFromCatalog` (testado em Task 1 e Task 2).
2. **Preservação de Kit personalizado (sub-itens desmarcados + monitor/impressora de recorte) e Monitor Sob Medida (`customDimensions`)** — Ao serializar e reidratar, itens desmarcados do kit devem permanecer `selected: false`, `cutoutMonitor` e `customDimensions` devem ser mantidos integralmente (testado em Task 1).
3. **Resiliência quando a coleção `shared_carts` ainda não existir no Appwrite ou em fallback offline** — Auto-provisionamento/fallback local não pode quebrar `POST` nem `GET`, e código inexistente deve retornar `null` / HTTP `404` limpo (testado em Task 2).
4. **Conflito com carrinho já existente no navegador do visitante** — Se `items.length > 0` ao abrir `/montagem/[code]` (e não for recarregamento do mesmo `shareCode` ativo), o usuário deve escolher explicitamente entre `Substituir meu carrinho por esta montagem` e `Somar esta montagem ao meu carrinho`; ao somar, IDs de itens devem ser regenerados sem colisão e `totem_pending_payment` antigo deve ser limpo (testado em Task 3 e verificado em Task 5).
5. **Login dentro do Checkout redirecionando para `/cliente`** — `CustomerAuthModal` com `redirectOnSuccess={null}` não pode navegar para fora de `/checkout`, devendo atualizar `loggedCustomer`, preencher campos + endereços, disparar `totem:customer-auth-changed` e iniciar a cotação de frete (testado/verificado em Task 6).

---

### Task 1: Núcleo Isomórfico de Serialização, Reidratação e Recálculo Server-Side

**Files:**
- Create: `src/types/sharedCart.ts`
- Create: `src/modules/cart/sharedAssembly.ts`
- Test: `scripts/validate-shared-cart.ts`

**Interfaces:**
- Consumes: `calculateTotemPrice` (`@/modules/pricing/pricingEngine`), `calculateSelectiveCouponDiscount`, `SelectiveCoupon` (`@/modules/pricing/couponEngine`), `isItemKit`, `mergeServerCatalogKitItems` (`@/modules/catalog/kitDefaults`), `CartItem`, `TotemConfiguration` (`@/types/order`), `CabinetModel`, `ColorOption`, `MonitorOption`, `PrinterOption`, `BarcodeReaderOption` (`@/types/catalog`).
- Produces:
  - Types in `src/types/sharedCart.ts`: `SharedCartItemInput`, `SharedAssemblyMeta`, `HydratedSharedCartPayload`, `SharedCartCreateResponse`, `SharedCartGetResponse`.
  - Functions in `src/modules/cart/sharedAssembly.ts`:
    - `normalizeShareCode(raw: string): string`
    - `generateShareCodeCandidate(): string`
    - `serializeCartItemsForShare(items: CartItem[]): SharedCartItemInput[]`
    - `hydrateSharedCartFromCatalog(rawItems: SharedCartItemInput[], catalog: SharedCatalogInput, coupon?: SelectiveCoupon | null): HydratedSharedCartResult`
    - `buildSharedWhatsappSummaryText(params: SharedWhatsappSummaryInput): string`
    - `resolveCartConflictDecision(currentItems: CartItem[], incomingItems: CartItem[], decision: "replace" | "merge"): CartItem[]`

- [ ] **Step 1: Create `src/types/sharedCart.ts` with shared assembly contracts**

Define `SharedCartItemInput`, `SharedAssemblyMeta`, `SharedCatalogInput`, `HydratedSharedCartResult`, `SharedCartRecord`, `SharedCartCreateResponse`, and `SharedCartGetResponse` without any PII fields on the assembly record.

- [ ] **Step 2: Write the failing test `scripts/validate-shared-cart.ts`**

Create test assertions covering:
- `serializeCartItemsForShare`: strips `unitPriceCents`, `subtotalCents`, `calculatedPriceCents` and any extra keys, while preserving `kitItems` selection booleans, `cutoutMonitorId`, `customMonitor.customDimensions`, `includeAssemblyService`, `customizationNotes`, and `quantity`.
- `hydrateSharedCartFromCatalog`: rejects manipulated client prices and recalculates exact PIX and Card prices matching `calculateTotemPrice` for: (a) standard wall cabinet, (b) counter cabinet with customized Kit (sub-item unchecked + `cutoutMonitor`), (c) custom dimensions monitor (`custom-mon-*`), plus selective coupon discount (`calculateSelectiveCouponDiscount`).
- `resolveCartConflictDecision`: verifies `"replace"` returns fresh items with unique IDs and `"merge"` keeps all `currentItems` intact + appends `incomingItems` with newly generated unique IDs (zero duplicate IDs).
- `generateShareCodeCandidate` & `normalizeShareCode`: matches `^MNT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$` and normalizes lowercase/whitespace safely.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx scripts/validate-shared-cart.ts`
Expected: FAIL with module not found error for `../src/modules/cart/sharedAssembly`.

- [ ] **Step 4: Implement `src/modules/cart/sharedAssembly.ts`**

Implement the exact exported signatures above:
- `serializeCartItemsForShare` clamps `quantity` (`1..100`), clones `kitItems` `{ id, selected }`, captures `customMonitor` dimensions when `isCustom` (either direct monitor or `cutoutMonitor`), caps `customizationNotes` to 500 chars.
- `hydrateSharedCartFromCatalog` resolves catalog matches (`id` or `slug` fallback, custom monitor hydration), calls `mergeServerCatalogKitItems`, enforces `includeAssemblyService = Boolean(raw.includeAssemblyService && isItemKit(monitor))`, calculates `calculateTotemPrice`, builds validated `CartItem[]`, computes selective coupon totals via `calculateSelectiveCouponDiscount` and `calculateSafeCardChargeCents` on post-discount PIX total, and emits `unavailableWarnings` if any requested option was inactive/removed.
- `buildSharedWhatsappSummaryText` creates clean pt-BR WhatsApp text listing title (if any), each totem's cabinet, color, kit/monitor/printer, PIX total, Card 10x total, coupon code (if valid), and share URL.
- `resolveCartConflictDecision` regenerates unique IDs (`totem-shared-${Date.now()}-${idx}-${rand}`) for incoming items so `"merge"` never collides with existing IDs.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx scripts/validate-shared-cart.ts`
Expected: PASS (exit code 0).

- [ ] **Step 6: Commit Task 1**

```bash
git add src/types/sharedCart.ts src/modules/cart/sharedAssembly.ts scripts/validate-shared-cart.ts
git commit -m "feat(cart): add isomorphic shared assembly serialization and server price recalculation"
```

---

### Task 2: Persistência Appwrite (`shared_carts`), Store Resiliente & Rotas API

**Files:**
- Modify: `src/lib/appwrite/config.ts:10-25`
- Create: `scripts/setup-shared-carts-collection.ts`
- Create: `src/lib/cart/sharedCartStore.ts`
- Create: `src/app/api/carts/share/route.ts`
- Create: `src/app/api/carts/share/[code]/route.ts`
- Test: `scripts/validate-shared-cart.ts` (append store/persistence unit checks)

**Interfaces:**
- Consumes: `getServerDatabases`, `getAppwriteCatalog` (`@/lib/appwrite/server`), `APPWRITE_CONFIG` (`@/lib/appwrite/config`), `findUserByCoupon` (`@/lib/auth/whitelistStore`), `CABINET_MODELS`/`COLOR_OPTIONS`/`HOMOLOGATED_*` (`@/modules/catalog/catalogData`), functions from `src/modules/cart/sharedAssembly.ts`.
- Produces:
  - `APPWRITE_CONFIG.collections.sharedCarts = "shared_carts"`
  - `src/lib/cart/sharedCartStore.ts`: `createSharedCart(input: { title?: string; couponCode?: string | null; items: SharedCartItemInput[] }): Promise<{ record: SharedCartRecord; hydrated: HydratedSharedCartResult }>`, `getSharedCartByCode(rawCode: string): Promise<HydratedSharedCartByCodeResult | null>`
  - HTTP `POST /api/carts/share` and `GET /api/carts/share/[code]`.

- [ ] **Step 1: Add `sharedCarts: "shared_carts"` to `APPWRITE_CONFIG.collections` in `src/lib/appwrite/config.ts`**

Add `sharedCarts: "shared_carts"` alongside `carts` and `cartItems`.

- [ ] **Step 2: Create Appwrite collection provisioning script `scripts/setup-shared-carts-collection.ts`**

Idempotent script matching `scripts/upgrade-all-text-attributes.ts` / `scripts/setup_ads_leads_collection.js` style using `node-appwrite` / Appwrite REST to create `shared_carts` in `totem_db` with attributes (`share_code`, `title`, `coupon_code`, `items_count`, `pix_total_cents`, `card_total_cents`, `views_count`, `payload_json`, `created_at`) and key/unique index on `share_code`.

- [ ] **Step 3: Write failing store round-trip assertions in `scripts/validate-shared-cart.ts`**

Add a test case in `scripts/validate-shared-cart.ts` that calls `createSharedCart` and `getSharedCartByCode` with manipulated prices + unknown fields, asserting:
- Returned `record.shareCode` matches `MNT-...`, `payloadJson` contains zero personal fields (`customer`, `cpf`, `whatsapp`, `address`),
- `getSharedCartByCode(shareCode.toLowerCase())` returns recalculated server prices and increments `viewsCount`,
- `getSharedCartByCode("MNT-NOPE99")` returns `null`.

- [ ] **Step 4: Run test to verify it fails**

Run: `npx tsx scripts/validate-shared-cart.ts`
Expected: FAIL because `src/lib/cart/sharedCartStore.ts` does not exist yet.

- [ ] **Step 5: Implement `src/lib/cart/sharedCartStore.ts`**

Implement `ensureSharedCartsCollection()`, `loadLiveCatalogWithFallback()` (using `getAppwriteCatalog()` first and static catalog only if Appwrite unreachable), `resolveActiveSelectiveCoupon(code)` (using `findUserByCoupon`), `createSharedCart(...)`, `getSharedCartByCode(...)` with:
- Dual persistence: Appwrite `totem_db.shared_carts` (primary) + local `src/data/shared_carts.json` cache/fallback (never crashing when `APPWRITE_API_KEY` is empty in local test env).
- Uniqueness check on generated `share_code` before saving.
- Non-blocking `views_count` increment on read.

- [ ] **Step 6: Implement `src/app/api/carts/share/route.ts` and `src/app/api/carts/share/[code]/route.ts`**

- `POST /api/carts/share`: validates JSON body (`items` non-empty array max 20), delegates to `createSharedCart`, computes origin from request headers (`x-forwarded-host` / `host` / `siteConfig.url`), builds `shareUrl` + `whatsappSummaryText`, returns HTTP `201`. Rejects empty items with HTTP `400`.
- `GET /api/carts/share/[code]`: awaits `params`, normalizes `code`, delegates to `getSharedCartByCode`, returns `404` when not found, returns `200` with `{ ok: true, assembly }` and `Cache-Control: no-store`.

- [ ] **Step 7: Run tests and TypeScript check**

Run: `npx tsx scripts/validate-shared-cart.ts && npx tsc --noEmit`
Expected: PASS (exit code 0).

- [ ] **Step 8: Commit Task 2**

```bash
git add src/lib/appwrite/config.ts scripts/setup-shared-carts-collection.ts src/lib/cart/sharedCartStore.ts src/app/api/carts/share/route.ts src/app/api/carts/share/[code]/route.ts scripts/validate-shared-cart.ts
git commit -m "feat(api): add shared_carts persistence store and share API endpoints"
```

---

### Task 3: Evolução do `CartContext` & Modal Reutilizável `ShareAssemblyModal`

**Files:**
- Modify: `src/modules/cart/CartContext.tsx:1-360`
- Create: `src/components/cart/ShareAssemblyModal.tsx`
- Modify: `src/components/cart/index.ts`

**Interfaces:**
- Consumes: `SharedAssemblyMeta`, `CartItem`, `SelectiveCoupon`, `serializeCartItemsForShare`, `resolveCartConflictDecision`, `formatBRL`, `calculateTotemPrice`.
- Produces:
  - `CartContextType`: adds `activeSharedAssembly: SharedAssemblyMeta | null`, `replaceCartFromSharedAssembly(newItems: CartItem[], coupon?: SelectiveCoupon | null, meta?: SharedAssemblyMeta | null): void`, `mergeCartFromSharedAssembly(newItems: CartItem[], coupon?: SelectiveCoupon | null, meta?: SharedAssemblyMeta | null): void`, `clearActiveSharedAssembly(): void`.
  - `<ShareAssemblyModal isOpen onClose itemsToShare appliedCoupon mode defaultTitle />` exported from `src/components/cart/index.ts`.

- [ ] **Step 1: Extend `src/modules/cart/CartContext.tsx`**

- Add `SHARED_ASSEMBLY_STORAGE_KEY = "totem_active_shared_assembly_v1"` (`sessionStorage`).
- On mount, hydrate `activeSharedAssembly` from `sessionStorage` if present.
- Implement `replaceCartFromSharedAssembly`: sets `items` synchronously via `resolveCartConflictDecision([], newItems, "replace")`, clears `sessionStorage.removeItem("totem_pending_payment")` so old abandoned Pix QR never hijacks `/checkout`, sets `appliedCoupon` (`coupon ?? null`) and persists coupon + `activeSharedAssembly`.
- Implement `mergeCartFromSharedAssembly`: merges via `resolveCartConflictDecision(prev, newItems, "merge")`, clears `sessionStorage.removeItem("totem_pending_payment")`, applies `coupon` if `coupon && !appliedCoupon`, updates `activeSharedAssembly`.
- Update `clearCart`: also calls `clearActiveSharedAssembly()`.

- [ ] **Step 2: Create `src/components/cart/ShareAssemblyModal.tsx`**

Build Mobile-First modal (using `@/components/ui/Modal` or consistent portal modal styling) featuring:
- Visual preview of `itemsToShare` (model name, color swatch, quantity, kit/custom monitor indicator, PIX subtotal).
- Optional text input *"Nome ou referência desta montagem (opcional)"* with quick button *"Atualizar Link"* if already generated, plus auto-generation on open via `POST /api/carts/share`.
- Optional checkbox *"Incluir cupom de desconto (${appliedCoupon.code})"* when `appliedCoupon` exists.
- Loading, error/retry states.
- Generated result box showing short URL (`https://.../montagem/MNT-XXXXXX`), 1-click **"Copiar Link"** (`Copiado ✓`), **"Compartilhar no WhatsApp"** (`https://wa.me/?text=...`), and **"Mais opções"** (`navigator.share` when available on mobile).
- Tracks share interaction cleanly.

- [ ] **Step 3: Export `ShareAssemblyModal` from `src/components/cart/index.ts`**

Add export alongside `CartView`.

- [ ] **Step 4: Run `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0).

- [ ] **Step 5: Commit Task 3**

```bash
git add src/modules/cart/CartContext.tsx src/components/cart/ShareAssemblyModal.tsx src/components/cart/index.ts
git commit -m "feat(cart): add CartContext shared assembly actions and ShareAssemblyModal"
```

---

### Task 4: Botões de Compartilhar no Carrinho (`CartView`) e no Configurador (`ConfiguratorWizard`)

**Files:**
- Modify: `src/components/cart/CartView.tsx`
- Modify: `src/components/configurator/ConfiguratorWizard.tsx`

**Interfaces:**
- Consumes: `ShareAssemblyModal` (`@/components/cart`), `useCart()` (`items`, `appliedCoupon`, `activeSharedAssembly`).

- [ ] **Step 1: Integrate `ShareAssemblyModal` in `src/components/cart/CartView.tsx`**

- Add state `shareModalState: { open: boolean; items: CartItem[]; mode: "cart" | "single_item" } | null`.
- Add **"Compartilhar Montagem"** button in the Cart Header (next to `"Configurar Outro Totem"`) and in the right-hand Order Summary actions column (mobile-first full-width secondary CTA) to share all cart items (`mode: "cart"`).
- Add compact **"Compartilhar"** button on each item card's bottom action bar (right before `Duplicar` / `Editar` / `Excluir`) to share only that single `CartItem` (`mode: "single_item"`).
- Optional subtle indicator pill in Cart Header if `activeSharedAssembly` is loaded (allowing user to adjust items cleanly).

- [ ] **Step 2: Add "Compartilhar Montagem" action in `src/components/configurator/ConfiguratorWizard.tsx`**

- In the **"Gabinete Adicionado ao Carrinho!"** modal (`isCartSuccessModalOpen`, around line 1221):
  - Look up the just-saved item in `useCart().items` by `lastAddedItemId` (or construct a 1-item `CartItem` snapshot synced with `includeAssemblyService` if needed).
  - Add button **"Compartilhar Montagem"** (`Share2` icon) alongside *"Configurar Outro Gabinete"* and *"Ir para o Carrinho"*, opening `<ShareAssemblyModal />` for that single configured totem immediately after assembly!

- [ ] **Step 3: Run `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0).

- [ ] **Step 4: Commit Task 4**

```bash
git add src/components/cart/CartView.tsx src/components/configurator/ConfiguratorWizard.tsx
git commit -m "feat(ui): add share assembly buttons to CartView and ConfiguratorWizard"
```

---

### Task 5: Rota Pública `/montagem/[code]` com Metadata WhatsApp & Resolução de Conflito

**Files:**
- Create: `src/components/cart/SharedAssemblyLoader.tsx`
- Create: `src/app/montagem/[code]/page.tsx`

**Interfaces:**
- Consumes: `getSharedCartByCode` (`@/lib/cart/sharedCartStore`), `GET /api/carts/share/[code]`, `useCart()` (`items`, `isInitialized`, `activeSharedAssembly`, `replaceCartFromSharedAssembly`, `mergeCartFromSharedAssembly`), `formatBRL`.

- [ ] **Step 1: Create `src/components/cart/SharedAssemblyLoader.tsx`**

Client component receiving `code: string` (and optional SSR-preloaded initial assembly or error flag so opening is instant!):
1. Waits for `isInitialized` from `useCart()` and ensures fresh assembly data from SSR prop / `GET /api/carts/share/[code]`.
2. Handles 404 / error state with friendly Portuguese UI + CTA `"Montar meu Totem"` (`/monte-seu-totem`).
3. Checks conflict rule:
   - Compute `alreadyLoadedSameAssembly = activeSharedAssembly?.shareCode === assembly.shareCode && items.length > 0`.
   - If `items.length === 0 || alreadyLoadedSameAssembly`:
     - When `items.length === 0`, calls `replaceCartFromSharedAssembly(assembly.items, assembly.coupon, { shareCode: assembly.shareCode, title: assembly.title, loadedAt: new Date().toISOString(), unavailableWarnings: assembly.unavailableWarnings })`.
     - Navigates immediately via `router.replace(`/checkout?montagem=${encodeURIComponent(assembly.shareCode)}`)`.
   - If `items.length > 0` and NOT `alreadyLoadedSameAssembly`:
     - Renders Mobile-First conflict decision screen comparing **Seu Carrinho Atual** (`X` unidades • PIX) vs **Montagem do Link** (`title`, lista de itens, equipamentos, avisos e PIX/Cartão), with two clear action buttons:
       - **`Substituir meu carrinho por esta montagem`** -> `replaceCartFromSharedAssembly(...)` + `router.replace('/checkout?montagem=...')`
       - **`Somar esta montagem ao meu carrinho`** -> `mergeCartFromSharedAssembly(...)` + `router.replace('/checkout?montagem=...')`
     - Secondary link `"Manter apenas meu carrinho atual"` -> `/carrinho`.

- [ ] **Step 2: Create `src/app/montagem/[code]/page.tsx`**

- Dynamic Server Component (`export const dynamic = "force-dynamic"`):
  - Implements `generateMetadata({ params })`: reads `getSharedCartByCode(code)` on server to populate clean WhatsApp/OpenGraph `title` & `description` (with cabinet names, quantity, PIX total, zero PII!).
  - Renders `<Navbar />`, `<SharedAssemblyLoader code={code} initialResult={...} />`, and `<Footer />`.

- [ ] **Step 3: Run `npx tsc --noEmit`**

Run: `npx tsc --noEmit`
Expected: PASS (exit code 0).

- [ ] **Step 4: Commit Task 5**

```bash
git add src/components/cart/SharedAssemblyLoader.tsx src/app/montagem/[code]/page.tsx
git commit -m "feat(routes): add /montagem/[code] page with WhatsApp metadata and cart conflict prompt"
```

---

### Task 6: Seleção de Conta sem Redirecionar (`CustomerAuthModal`) & Checkout Guiado (`CheckoutView`)

**Files:**
- Modify: `src/components/auth/CustomerAuthModal.tsx`
- Modify: `src/components/layout/Navbar.tsx:18-32`
- Modify: `src/components/checkout/CheckoutView.tsx`

**Interfaces:**
- Consumes: `CustomerAuthModal` (`redirectOnSuccess?: string | null`), `useCart()` (`activeSharedAssembly`, `clearCart`), `customer` session API.
- Produces: Seamless in-checkout account login/switch that populates buyer data, saved addresses, and triggers CEP shipping quotes without leaving `/checkout`.

- [ ] **Step 1: Update `src/components/auth/CustomerAuthModal.tsx`**

- Add optional props `redirectOnSuccess?: string | null` (defaults to `"/cliente"`) and update `initialTab` sync when modal opens (`useEffect` setting `setActiveTab(initialTab)` on `isOpen`).
- When login succeeds (WhatsApp or Google):
  - Dispatch `window.dispatchEvent(new CustomEvent("totem:customer-auth-changed", { detail: data.customer }))`.
  - Call `onSuccess?.(data.customer)`.
  - Only run `window.location.href = redirectOnSuccess` if `redirectOnSuccess` is a non-empty string; when `redirectOnSuccess === null`, just call `onClose()`.

- [ ] **Step 2: Sync `src/components/layout/Navbar.tsx` with `totem:customer-auth-changed`**

Listen for `"totem:customer-auth-changed"` custom event in `Navbar.tsx` so logging in or switching accounts inside Checkout immediately updates the Navbar account chip too.

- [ ] **Step 3: Enhance `src/components/checkout/CheckoutView.tsx`**

- Extract reusable helper `applyCustomerProfileToForm(cust: any)` inside `CheckoutView` so both initial session load and in-checkout modal login/account-switch populate `loggedCustomer`, `personType`, `name`, `email`, `whatsapp`, `document`, default address, `isAutoFilled`, and trigger `lookupCep(cleanCep)` consistently.
- When `activeSharedAssembly` is set (or `?montagem=` in URL) on step `"form"`:
  - Render compact banner above the form: **"Montagem compartilhada pronta ✓"** (showing optional `title` and `shareCode`, any `unavailableWarnings` if applicable, and quick link `"Revisar ou alterar itens no carrinho"` -> `/carrinho`).
- In Section **`1. Dados do Comprador` (Conta de Login + Dados)**:
  - If `!loggedCustomer`: Render prominent Mobile-First **"Selecionar / Entrar na Sua Conta"** action card right at the top of Step 1 with **`Entrar com WhatsApp`** and **`Entrar com Conta Google`** buttons (opening `<CustomerAuthModal redirectOnSuccess={null} ... />` on the chosen tab), plus clear reassurance *"Ou preencha seus dados manualmente abaixo sem precisar criar senha"*.
  - If `loggedCustomer`: Add **"Trocar de Conta"** button in the recognized-account banner alongside `"Meus Endereços"` and `"Limpar dados"`, opening `<CustomerAuthModal redirectOnSuccess={null} ... />` to switch WhatsApp/Google account seamlessly in place.

- [ ] **Step 4: Run `npx tsc --noEmit` and `npx tsx scripts/validate-shared-cart.ts`**

Run: `npx tsx scripts/validate-shared-cart.ts && npx tsc --noEmit`
Expected: PASS (exit code 0).

- [ ] **Step 5: Commit Task 6**

```bash
git add src/components/auth/CustomerAuthModal.tsx src/components/layout/Navbar.tsx src/components/checkout/CheckoutView.tsx
git commit -m "feat(checkout): add in-place account selection/login and shared assembly banner"
```

---

### Task 7: Provisionamento Appwrite, Verificação Final, Versionamento `v3.5.8` & Deploy

**Files:**
- Modify: `package.json` (`3.5.7` -> `3.5.8`)
- Modify: `src/config/site.ts` (`3.5.7` -> `3.5.8`)

- [ ] **Step 1: Provision `shared_carts` collection in Appwrite (`totem_db`)**

Run: `npx tsx scripts/setup-shared-carts-collection.ts`
Expected: Collection `shared_carts` and all attributes/index created/verified in Appwrite without errors.

- [ ] **Step 2: Run full test & validation checks**

Run:
- `npx tsx scripts/validate-shared-cart.ts`
- `npx tsx scripts/validate-coupon-precision.ts`
- `npx tsx scripts/validate-receipts-precision.ts`
- `npx tsc --noEmit`
Expected: All exit code 0 with full pass logs.

- [ ] **Step 3: Bump software version to `3.5.8` (single-digit rule)**

Update `package.json` and `src/config/site.ts` from `"3.5.7"` to `"3.5.8"`.

- [ ] **Step 4: Commit, push to `develop`, and trigger Coolify deploy**

Run git commit & `git push origin develop`, trigger Coolify deploy (`vsqhnub4upwau369glr7chrs`), and verify live HTTP health + shared cart endpoint if appropriate.

---

## Plan Self-Review

- **Spec coverage**:
  - Persistência Appwrite `shared_carts` + auto-provisionamento + fallback local: Task 2 & Task 7.
  - Endpoints `POST /api/carts/share` e `GET /api/carts/share/[code]` com recálculo server-side e zero PII: Task 1 & Task 2.
  - `CartContext` (`replaceCartFromSharedAssembly`, `mergeCartFromSharedAssembly`, `activeSharedAssembly`) + `ShareAssemblyModal`: Task 3.
  - Compartilhar no Carrinho (completo e por item) + após montar no Configurador: Task 4.
  - Rota `/montagem/[code]` com preview WhatsApp + conflito *Substituir* vs *Somar* -> redirecionamento para `/checkout`: Task 5.
  - Checkout com seleção de conta sem sair da página + entrega + pagamento: Task 6.
- **Placeholder check**: Nenhuma lacuna "TBD", assinaturas exatas e arquivos mapeados em cada Task.
- **Type consistency**: `SharedCartItemInput`, `SharedAssemblyMeta`, `replaceCartFromSharedAssembly`, `mergeCartFromSharedAssembly`, `redirectOnSuccess`, `totem:customer-auth-changed` mantêm nomes e parâmetros consistentes entre todas as tasks.
- **Review Focus coverage**: Todos os 5 casos extremos do Review Focus têm verificação atribuída nas Tasks 1, 2, 3, 5 e 6.
