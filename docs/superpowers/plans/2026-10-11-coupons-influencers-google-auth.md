# Sistema de Cupons Seletivos, Portal do Vendedor/Influenciador e Login com Google — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sistema de cupons com desconto seletivo (apenas no chassi/gabinete), controle de acesso por Whitelist de contas Google, painel administrativo de vendedores e o novo portal do vendedor/influenciador (`/vendedor`) com acompanhamento de comissões em tempo real.

**Architecture:** O sistema adota uma arquitetura desacoplada onde o motor de cálculo (`couponEngine.ts`) é a fonte autoritativa de cálculo matemático tanto no frontend quanto no backend. A autenticação utiliza Google Identity com checagem estrita de Whitelist em sessão HTTP-Only, e o Appwrite/Storage gerencia os usuários autorizados e o histórico de vendas vinculadas aos cupons.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Appwrite / Local Storage Persistence, tsx test runner.

**Spec:** `docs/superpowers/specs/2026-10-11-coupons-influencers-google-auth.md`

## Global Constraints

- O desconto do cupom incide **apenas** sobre o preço-base do gabinete usinado; kits de montagem de hardware, telas, impressoras e fretes mantêm preço integral sem qualquer redução.
- O cálculo autoritativo final ocorre no backend (`/api/checkout/order`), não confiando em valores calculados exclusivamente no navegador.
- Toda interface é construída seguindo o padrão **Mobile-First**, com glassmorphism e design moderno.
- A numeração de versões no `package.json` obedece à regra de dígito único de 0 a 9 (máximo 9 por campo).
- Comunicação sempre em Português do Brasil (pt-BR).

## Review Focus

1. Tentativa de aplicar cupom em carrinho que contenha apenas kit de hardware ou periféricos sem gabinete: o desconto gerado deve ser exatamente R$ 0,00.
2. Tentativa de login com conta Google não listada na Whitelist: acesso imediatamente barrado com HTTP 403 e feedback claro.
3. Vendedor tentando acessar rota `/admin`: redirecionamento automático para seu portal exclusivo `/vendedor`.
4. URL com parâmetro `?cupom=CODIGO` ou `?ref=CODIGO`: captura imediata do cupom no primeiro acesso e persistência no carrinho do usuário.
5. Arredondamento de centavos em comissões e descontos: cálculos estritamente em centavos inteiros (`Math.round`), sem dízimas monetárias.

---

### Task 1: Motor de Cupons Seletivos & Testes Automatizados TDD

**Files:**
- Create: `src/modules/pricing/couponEngine.ts`
- Create: `scripts/validate-coupon-precision.ts`

- [ ] **Step 1:** Escrever o script de validação de testes TDD `scripts/validate-coupon-precision.ts` com cenários críticos:
  - Gabinete Parede (R$ 990,00) com cupom de 10% -> Desconto R$ 99,00; Total R$ 891,00.
  - Gabinete Balcão (R$ 950,00) + Kit de Montagem (R$ 833,66) com cupom 10% -> Desconto incide apenas em R$ 950,00 (-R$ 95,00); Kit mantém R$ 833,66 integral; Total R$ 1.688,66.
  - Cálculo de comissão do vendedor (8%) sobre gabinete -> R$ 76,00.
- [ ] **Step 2:** Executar o script para confirmar que falha inicialmente antes da implementação: `npx tsx scripts/validate-coupon-precision.ts`.
- [ ] **Step 3:** Implementar o motor de desconto em `src/modules/pricing/couponEngine.ts` com tipagens completas, isolamento de categorias e recálculo seguro.
- [ ] **Step 4:** Executar novamente o teste de precisão e validar 100% de aprovação matemática.

---

### Task 2: Autenticação Google & Gestão de Whitelist RBAC

**Files:**
- Create: `src/lib/auth/whitelistStore.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/app/api/auth/google/route.ts`
- Create: `src/app/api/auth/session/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/components/auth/GoogleLoginButton.tsx`

- [ ] **Step 1:** Criar `src/lib/auth/whitelistStore.ts` contendo a lista autorizada de contas (armazenada de forma resiliente, com seed inicial de administradores e suporte a novos cadastros de vendedores).
- [ ] **Step 2:** Criar utilitários de sessão segura (`src/lib/auth/session.ts`) com geração e verificação de cookies assinados com role (`admin` ou `seller`).
- [ ] **Step 3:** Criar rotas de API `/api/auth/google`, `/api/auth/session` e `/api/auth/logout` para autenticação com Google, conferência de Whitelist e controle de sessão.
- [ ] **Step 4:** Implementar o componente `GoogleLoginButton.tsx` com design glassmorphism, suporte a Google Sign-In oficial e modo de desenvolvimento facilitado para `localhost:3000`.

---

### Task 3: Gerenciamento de Equipe & Vendedores no Painel Admin

**Files:**
- Create: `src/components/admin/TeamManager.tsx`
- Create: `src/app/api/admin/users/route.ts`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1:** Criar a rota de API `/api/admin/users/route.ts` para CRUD de usuários da Whitelist (adicionar conta Google, definir cargo `admin`/`seller`, configurar cupom, % desconto e % comissão).
- [ ] **Step 2:** Criar o componente `TeamManager.tsx` exibindo a tabela completa de membros, métricas de vendas por vendedor, modal de cadastro e ações rápidas (ativar/desativar).
- [ ] **Step 3:** Integrar a nova aba **"Equipe & Vendedores"** no `/admin/page.tsx`, adicionando o botão de login com Google no gate de acesso e proteção por papel de usuário.

---

### Task 4: Integração de Cupons no Carrinho, Checkout e URL Query

**Files:**
- Modify: `src/types/order.ts`
- Modify: `src/modules/cart/CartContext.tsx`
- Modify: `src/components/cart/CartView.tsx`
- Modify: `src/components/checkout/CheckoutView.tsx`
- Modify: `src/components/configurator/StepReview.tsx`
- Modify: `src/app/api/checkout/order/route.ts`
- Create: `src/app/api/coupons/validate/route.ts`

- [ ] **Step 1:** Estender `CartContext` e `order.ts` para incluir o estado do cupom ativo (`appliedCoupon`), desconto calculado e captura automática de `?cupom=` ou `?ref=` via query string.
- [ ] **Step 2:** Criar a rota `/api/coupons/validate/route.ts` para consulta rápida de validade de cupons.
- [ ] **Step 3:** Inserir o campo de aplicação de cupom no `CartView.tsx`, com destaque visual do abatimento aplicado exclusivamente no gabinete.
- [ ] **Step 4:** Atualizar o `StepReview.tsx` e o `CheckoutView.tsx` para apresentar o resumo financeiro detalhado com o cupom aplicado.
- [ ] **Step 5:** Blindar a rota `/api/checkout/order/route.ts` com o recálculo soberano do desconto e comissão do vendedor, salvando os dados no banco de pedidos.

---

### Task 5: Portal do Vendedor / Influenciador (`/vendedor`)

**Files:**
- Create: `src/app/vendedor/page.tsx`
- Create: `src/components/seller/SellerDashboard.tsx`
- Create: `src/components/seller/SellerOrdersTable.tsx`
- Create: `src/app/api/seller/orders/route.ts`

- [ ] **Step 1:** Criar a rota `/api/seller/orders/route.ts` que retorna apenas os pedidos vinculados ao cupom do vendedor autenticado.
- [ ] **Step 2:** Criar os componentes `SellerDashboard.tsx` e `SellerOrdersTable.tsx` com KPIs (gabinetes vendidos, comissões a receber via PIX, comissões confirmadas) e link compartilhável com botão de 1 clique para copiar.
- [ ] **Step 3:** Implementar a página `/app/vendedor/page.tsx` com gate de login Google e bloqueio para contas não autorizadas.

---

### Task 6: Verificação de Ponta a Ponta & Build de Produção

**Files:**
- Modify: `package.json` (caso necessário incremento de versão)

- [ ] **Step 1:** Executar os testes automatizados com `npx tsx scripts/validate-coupon-precision.ts`.
- [ ] **Step 2:** Testar o fluxo completo de ponta a ponta no navegador (login com Google, inclusão de vendedor, uso de cupom no configurador/carrinho e exibição das vendas no painel do vendedor).
- [ ] **Step 3:** Executar `npm run build` para garantir ausência de erros de compilação TypeScript e lint.
