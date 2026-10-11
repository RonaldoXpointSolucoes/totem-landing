# Especificação Técnica: Sistema de Cupons Seletivos, Portal de Vendedores/Influenciadores e Login com Google

> **Data:** 11/10/2026  
> **Status:** Aprovado para Planejamento  
> **Módulos Afetados:** `pricingEngine`, `CartContext`, `CartView`, `CheckoutView`, `api/checkout/order`, `app/admin`, `app/vendedor`, `lib/auth`

---

## 1. Visão Geral e Objetivos

O objetivo deste subsistema é permitir que vendedores e influenciadores parceiros divulguem a **TotemPro** através de cupons de desconto exclusivos e links parametrizados (`?cupom=CODIGO`), recebendo comissões transparentes sobre as vendas concretizadas.

### Regras Comerciais Críticas
1. **Desconto Seletivo Estrito**: O cupom concede abatimento **única e exclusivamente** sobre o chassi/gabinete base usinado em Router CNC (fabricação própria). Componentes de terceiros (Kit de Montagem de Hardware, monitores, impressoras térmicas, pinpads, leitores de código de barras) e frete de transportadora **permanecem em valor integral (R$ 0,00 de desconto)**.
2. **Soberania do Backend**: O recálculo do desconto e da comissão é executado autoritativamente no servidor (`/api/checkout/order`). Nenhuma informação de preço vinda do cliente é considerada autoritativa.
3. **Autenticação Unificada com Google**: Tanto o painel administrativo (`/admin`) quanto o portal de vendedores (`/vendedor`) contam com login oficial via Google.
4. **Whitelist de Acesso (RBAC)**: Apenas e-mails Google pré-cadastrados na Whitelist têm permissão para se autenticar. Usuários com papel `admin` acessam `/admin`; usuários com papel `seller` acessam `/vendedor`.

---

## 2. Modelos de Dados e Estruturas

### 2.1. Whitelist de Acesso & Vendedores (`WhitelistAccount`)
```typescript
export interface WhitelistAccount {
  id: string;
  email: string; // normalizado em lowercase
  name: string;
  role: "admin" | "seller";
  couponCode?: string; // ex: "CARLOS10"
  discountPercent?: number; // ex: 10 (10% no gabinete)
  commissionPercent?: number; // ex: 8 (8% no gabinete)
  pixKey?: string;
  status: "active" | "inactive";
  createdAt: string;
}
```

### 2.2. Cupom de Desconto (`CouponRule`)
```typescript
export interface CouponRule {
  code: string;
  sellerId: string;
  sellerEmail: string;
  sellerName: string;
  discountPercent: number; // Porcentagem de desconto no gabinete
  commissionPercent: number; // Porcentagem de comissão do vendedor sobre o gabinete
  active: boolean;
  eligibleCategory: "cabinet_only";
}
```

### 2.3. Cálculo de Desconto e Pedido
```typescript
export interface SelectiveDiscountResult {
  couponCode: string;
  eligibleCabinetsSubtotalCents: number;
  ineligibleSubtotalCents: number;
  discountPercent: number;
  discountCents: number;
  finalTotalCents: number;
  sellerCommissionCents: number;
  sellerEmail?: string;
}
```

---

## 3. Fluxo de Autenticação e Segurança (RBAC)

1. **Tentativa de Login**:
   - Usuário clica em **"Continuar com Google"** no `/admin` ou no `/vendedor`.
   - O payload do Google (JWT ou verificação de e-mail) é enviado para `/api/auth/google`.
2. **Checagem na Whitelist**:
   - O endpoint verifica se o e-mail consta na lista de contas autorizadas ativas.
   - **Caso não autorizado**: Retorna erro HTTP 403 com aviso: *"Acesso não autorizado para {email}. Solicite liberação ao administrador."*
   - **Caso autorizado**:
     - Cria cookie HTTP-Only seguro `totem_auth_session` assinado.
     - Retorna objeto do usuário com o `role` (`admin` ou `seller`).
3. **Roteamento Inteligente**:
   - Se um `seller` tentar acessar `/admin`, o sistema o redireciona automaticamente para `/vendedor`.
   - Se um `admin` acessar `/admin`, ele visualiza todos os dados, incluindo a aba **"Equipe & Vendedores"**.

---

## 4. Motor de Desconto Seletivo (`couponEngine.ts`)

O motor de cálculo recebe os itens do carrinho e o cupom ativo:
```
Total Gabinetes = Σ (basePriceCents * quantity)
Total Inelegível = Σ ((colorAdjustment + equipmentAdjustment + customizationAdjustment) * quantity)
Desconto (cents) = Math.round(Total Gabinetes * (discountPercent / 100))
Comissão Vendedor (cents) = Math.round(Total Gabinetes * (commissionPercent / 100))
Subtotal Final = (Total Gabinetes - Desconto) + Total Inelegível
```
*Garantia Matemática:* Componentes de kit (mini PC, monitor, impressora) nunca entram na base multiplicadora do desconto nem geram perda de margem sobre eletrônicos comprados.

---

## 5. Portal do Vendedor / Influenciador (`/vendedor`)

### Seções da Interface (Mobile-First):
1. **Header do Vendedor**: Avatar, Nome, E-mail, Chave PIX cadastrada e Badge *"Vendedor Autorizado"*.
2. **Card de Divulgação**:
   - Código do Cupom em destaque (ex: `VENDEDOR10`).
   - Link de vendas pronto com botão **"Copiar Link de Divulgação"** (`https://.../monte-seu-totem?cupom=VENDEDOR10`).
   - % de desconto que seus clientes recebem e sua taxa de comissão.
3. **Painel de Métricas (KPIs)**:
   - Gabinetes Vendidos.
   - Faturamento Elegível Gerado.
   - Desconto Total Concedido aos Clientes.
   - Comissão Acumulada.
   - Comissão Liberada (pedidos com PIX pago).
   - Comissão em Aberto (pedidos aguardando PIX).
4. **Extrato de Vendas**:
   - Tabela com filtros e pesquisa.
   - Número do pedido, data/hora, modelo do gabinete, valor do gabinete, comissão do vendedor e status operacional.

---

## 6. Painel do Administrador (`/admin`)

Nova aba integrada na barra de navegação: **"Equipe & Vendedores"**:
- **Lista de Usuários Autorizados**:
  - E-mail Google, Nome, Papel (`Admin` ou `Vendedor`), Cupom, % Desconto, % Comissão, Total de Vendas geradas e Status.
- **Modal "Novo Acesso Google / Vendedor"**:
  - E-mail do Google.
  - Nome completo.
  - Cargo (`Admin` ou `Vendedor`).
  - Código do cupom desejado.
  - % Desconto no Gabinete (padrão 10%).
  - % Comissão do Vendedor (padrão 8%).
  - Chave PIX para pagamento de comissões.
- **Ações Rápidas**: Ativar/Desativar acesso e excluir usuário com 1 clique.
