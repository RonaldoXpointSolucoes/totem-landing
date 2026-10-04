# Plano de Implementação — Sistema de Fretes, Entregas, Correios e Retirada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o subsistema completo de cálculo e seleção de frete (Correios SEDEX/PAC com contrato, Transportadora Rodoviária e Retirada na Fábrica) com atualização dos dados físicos dos gabinetes (peso/dimensões) e recálculo dinâmico dos totais no Checkout e Backend.

**Architecture:** Módulo central de logística em `src/modules/shipping/` com serviços dedicados para Correios e Transportadora Rodoviária, orquestrados por um `shippingEngine`. Endpoint server-side `POST /api/shipping/quote` e integração em tempo real na interface de Checkout com recálculo soberano e seguro no backend antes da emissão do Pix.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Lucide React, APIs REST Correios e Fetch nativo.

**Spec:** [`docs/superpowers/specs/2026-10-04-shipping-system-design.md`](file:///c:/Users/NOTE-(FORM)02JUL26/Documents/Projetos/Antigravity/Totem-Landing/docs/superpowers/specs/2026-10-04-shipping-system-design.md)

## Global Constraints

- **Regra de Versionamento**: Dígito único (`0-9`) por segmento (`0.2.9` -> `0.3.0`).
- **Soberania do Backend**: O cliente nunca dita o valor do frete; o servidor valida e recalcula todas as taxas.
- **Limite dos Correios**: Itens >30kg ou >100cm de dimensão única (como o Gabinete de Chão) ativam Transportadora Especial e Retirada na Fábrica.
- **Resiliência da API**: O sistema possui fallback tarifário oficial de faixas de CEP para não interromper compras caso a API dos Correios oscile.

## Review Focus

1. **CEP inválido ou incompleto**: Deve exibir mensagem amigável sem quebrar a tela.
2. **Carrinho com múltiplos itens**: O peso e volume devem ser somados corretamente para a cotação unificada da carga.
3. **Gabinete de Chão no carrinho**: Deve bloquear SEDEX/PAC e exibir motivo transparente ("Excede limites de peso dos Correios"), sugerindo Transportadora.
4. **Retirada na Fábrica**: Deve travar a taxa em R$ 0,00 e indicar o endereço físico para coleta.
5. **Divergência de frete**: O backend deve validar se o `shippingOptionId` confere com o valor cotado antes de gerar o Pix.

---

### Task 1: Definição de Tipos e Atualização dos Modelos de Catálogo (Pesos e Cubagens CNC)

**Files:**
- Create: `src/types/shipping.ts`
- Modify: `src/types/catalog.ts`
- Modify: `src/modules/catalog/catalogData.ts`
- Test: `scripts/test-catalog-dimensions.ts`

**Interfaces:**
- Produces: `ShippingOptionId`, `ShippingQuote`, `ShippingCalculationRequest`, `ShippingCalculationResponse`.
- Atualiza: `CabinetModel.weightKg` e `CabinetModel.package` com dimensões reais de expedição.

- [x] **Step 1: Criar arquivo de tipos `src/types/shipping.ts`**
  Definir as interfaces `ShippingOptionId`, `ShippingQuote`, `ShippingCalculationRequest` e `ShippingCalculationResponse`.

- [x] **Step 2: Atualizar `src/types/catalog.ts` e `src/modules/catalog/catalogData.ts`**
  Adicionar os dados de `weightKg` e `package` (`heightCm`, `widthCm`, `depthCm`, `grossWeightKg`) nos modelos `cabinet-floor`, `cabinet-wall` e `cabinet-countertop`.

- [x] **Step 3: Criar script de teste e validar tipos**
  Criar `scripts/test-catalog-dimensions.ts` e executar via `npx tsx scripts/test-catalog-dimensions.ts` para verificar integridade dimensional e pesos.

- [x] **Step 4: Commit**
  `git add src/types/shipping.ts src/types/catalog.ts src/modules/catalog/catalogData.ts scripts/test-catalog-dimensions.ts`
  `git commit -m "feat(catalog): add physical dimensions and gross weights for shipping"`

---

### Task 2: Implementação do Módulo de Cálculo Logístico (`src/modules/shipping/`)

**Files:**
- Create: `src/modules/shipping/correiosService.ts`
- Create: `src/modules/shipping/carrierService.ts`
- Create: `src/modules/shipping/shippingEngine.ts`
- Create: `src/modules/shipping/index.ts`
- Test: `scripts/test-shipping-engine.ts`

**Interfaces:**
- Consumes: `CABINET_MODELS`, `ShippingQuote`, `ShippingCalculationRequest`.
- Produces: `calculateShippingQuotes(request: ShippingCalculationRequest): Promise<ShippingCalculationResponse>`.

- [x] **Step 1: Implementar `correiosService.ts`**
  Criar a consulta à API Cws / REST dos Correios com credenciais de contrato e tabela de contingência oficial por faixa de CEP.

- [x] **Step 2: Implementar `carrierService.ts`**
  Criar o cálculo para Transportadora Rodoviária Especial (fator de cubagem industrial, seguro sobre valor declarado e prazos regionais).

- [x] **Step 3: Implementar `shippingEngine.ts`**
  Orquestrar a consolidação dos itens do carrinho, verificar limites físicos dos Correios e adicionar a opção de Retirada Grátis na Fábrica.

- [x] **Step 4: Criar script de teste e validar cotações**
  Criar `scripts/test-shipping-engine.ts` testando CEP de SP, RJ e BA para os diferentes gabinetes.
  Executar via `npx tsx scripts/test-shipping-engine.ts` e garantir PASS.

- [x] **Step 5: Commit**
  `git add src/modules/shipping/ scripts/test-shipping-engine.ts`
  `git commit -m "feat(shipping): implement correios, carrier and engine calculation services"`

---

### Task 3: Criação da Rota de API Server-Side (`/api/shipping/quote`)

**Files:**
- Create: `src/app/api/shipping/quote/route.ts`
- Modify: `.env.example`
- Test: `scripts/test-shipping-api.ts`

**Interfaces:**
- Endpoint: `POST /api/shipping/quote`
- Payload: `{ cep: string, items: Array<{ modelId: string, quantity: number }> }`
- Response: `ShippingCalculationResponse`

- [x] **Step 1: Implementar rota `POST /api/shipping/quote`**
  Sanitizar o CEP recebido, validar a lista de itens e acionar o `shippingEngine`.

- [x] **Step 2: Adicionar variáveis de frete no `.env.example`**
  Documentar `SHIPPING_ORIGIN_CEP`, `SHIPPING_PICKUP_ADDRESS` e credenciais de contrato dos Correios.

- [x] **Step 3: Testar chamada da API**
  Executar requisição de teste simulada e verificar código 200 com lista completa de opções de frete.

- [x] **Step 4: Commit**
  `git add src/app/api/shipping/quote/route.ts .env.example`
  `git commit -m "feat(api): create shipping quote endpoint and env configs"`

---

### Task 4: Integração no Frontend do Checkout (`CheckoutView.tsx`)

**Files:**
- Modify: `src/components/checkout/CheckoutView.tsx`

**Interfaces:**
- Consumes: `/api/shipping/quote`, `useCart`.
- UI: Card seletor de modalidade de frete com ícones, prazos e valores, integrado ao Resumo da Compra.

- [x] **Step 1: Adicionar estados de frete no `CheckoutView.tsx`**
  Incluir `shippingQuotes`, `selectedShippingOption`, `isLoadingShipping` e `shippingError`.

- [x] **Step 2: Disparar cotação ao identificar CEP válido**
  Ao completar 8 dígitos no campo de CEP ou no retorno do ViaCEP, disparar automaticamente a cotação de frete para o carrinho atual.

- [x] **Step 3: Renderizar o Seletor de Frete no Passo 2 (Endereço e Entrega)**
  Exibir os cartões modernos de seleção de frete (SEDEX, PAC, Transportadora e Retirada) com badge de prazo e preço.

- [x] **Step 4: Atualizar o Resumo da Compra em tempo real**
  Somar a taxa de entrega ao total final: `Subtotal + Frete = Total a Pagar (Pix)`.

- [x] **Step 5: Enviar dados de frete ao submeter o pedido**
  Incluir `shippingOptionId` e `shippingCents` no payload de `/api/checkout/order`.

- [x] **Step 6: Commit**
  `git add src/components/checkout/CheckoutView.tsx`
  `git commit -m "feat(checkout): integrate shipping selector and dynamic totals update"`

---

### Task 5: Recálculo Soberano no Backend e Emissão do Pix Atualizado

**Files:**
- Modify: `src/types/order.ts`
- Modify: `src/app/api/checkout/order/route.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `shippingOptionId`, `shippingCents`.
- Produces: Pedido persistido com frete discriminado e Pix gerado com o valor final consolidado.

- [x] **Step 1: Atualizar `src/types/order.ts`**
  Adicionar `shippingMethod` na interface `OrderDetails` e no payload do pedido.

- [x] **Step 2: Atualizar `src/app/api/checkout/order/route.ts`**
  Recalcular o valor do frete no servidor com base no `shippingOptionId` e somar ao `totalCents` antes de chamar `createPixCharge`.

- [x] **Step 3: Incrementar versão no `package.json`**
  Atualizar `"version": "0.3.0"` conforme as regras de versionamento de dígito único com rollover.

- [x] **Step 4: Executar build de produção (`npm run build`)**
  Garantir que a compilação passe com sucesso total (Exit Code 0).

- [x] **Step 5: Commit**
  `git add src/types/order.ts src/app/api/checkout/order/route.ts package.json`
  `git commit -m "feat(order): validate and apply server-side shipping on pix order creation"`
