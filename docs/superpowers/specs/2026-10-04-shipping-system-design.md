# Especificação de Design do Sistema de Fretes, Entregas e Retirada

- **Projeto**: Totem Pro — Totem Industrial de Autoatendimento
- **Data**: 2026-10-04
- **Autor**: Antigravity & Equipe de Engenharia X-Point Soluções
- **Status**: Aprovado para Planejamento de Implementação

---

## 1. Visão Geral e Objetivos

O objetivo deste subsistema é permitir que o cliente final, no fluxo de checkout da Totem Pro (`/checkout`), calcule e visualize de forma transparente e em tempo real as taxas e opções de frete disponíveis para o seu CEP de destino, escolhendo entre:

1. **Correios SEDEX (Contrato)**: Entrega expressa para modelos elegíveis (<30kg).
2. **Correios PAC (Contrato)**: Entrega econômica convencional para modelos elegíveis (<30kg).
3. **Transportadora Rodoviária Especial**: Transporte especializado para cargas volumétricas pesadas (especialmente o Gabinete de Chão de 165cm / 38-40kg) ou compras com múltiplos totens.
4. **Retirada na Fábrica (X-Point Engenharia)**: Isento de frete (R$ 0,00), disponível para coleta física após a fabricação e usinagem CNC.

O sistema atualiza dinamicamente o Resumo da Compra no frontend e recalcula com autoridade server-side no backend (`/api/checkout/order`), gerando a cobrança Pix com o valor total consolidado (`Subtotal + Taxa de Entrega`).

---

## 2. Modelagem Física dos Produtos (Pesos e Cubagens CNC)

Cada modelo de linha fabricado em MaDeFibra BP 15mm possui características mecânicas e volumétricas bem definidas que balizam as opções de transporte:

### 2.1. Tabela de Especificações dos Gabinetes
1. **Gabinete de Parede (`cabinet-wall`)**:
   - Dimensões montado: 850 mm (A) × 440 mm (L) × 220 mm (P)
   - Peso Líquido: 14,5 kg
   - Embalagem Reforçada: 90 cm (A) × 48 cm (L) × 25 cm (P)
   - Peso Bruto: 16,0 kg
   - Modalidades permitidas: SEDEX, PAC, Transportadora Rodoviária, Retirada na Fábrica.

2. **Gabinete de Balcão (`cabinet-countertop`)**:
   - Dimensões montado: 620 mm (A) × 400 mm (L) × 290 mm (P)
   - Peso Líquido: 11,8 kg
   - Embalagem Reforçada: 68 cm (A) × 45 cm (L) × 32 cm (P)
   - Peso Bruto: 13,2 kg
   - Modalidades permitidas: SEDEX, PAC, Transportadora Rodoviária, Retirada na Fábrica.

3. **Gabinete de Chão (`cabinet-floor`)**:
   - Dimensões montado: 1650 mm (A) × 480 mm (L) × 380 mm (P)
   - Peso Líquido: 36,5 kg
   - Embalagem Reforçada (Caixa protetora/Palete): 170 cm (A) × 52 cm (L) × 42 cm (P)
   - Peso Bruto: 40,0 kg
   - Restrição: Excede o limite convencional de 30 kg e soma de dimensões dos Correios.
   - Modalidades permitidas: Transportadora Rodoviária Especial e Retirada na Fábrica.

---

## 3. Arquitetura de Módulos e Componentes

### 3.1. Tipos e Contratos (`src/types/shipping.ts`)
```typescript
export type ShippingOptionId =
  | "correios_sedex"
  | "correios_pac"
  | "transportadora_express"
  | "retirada_fabrica";

export interface ShippingQuote {
  id: ShippingOptionId;
  name: string;
  carrier: string;
  priceCents: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  description: string;
  isAvailable: boolean;
  unavailableReason?: string;
}

export interface ShippingCalculationRequest {
  destinationCep: string;
  items: Array<{
    modelId: string;
    quantity: number;
  }>;
}

export interface ShippingCalculationResponse {
  ok: boolean;
  destination: {
    cep: string;
    city?: string;
    state?: string;
  };
  originCep: string;
  totalGrossWeightKg: number;
  quotes: ShippingQuote[];
  error?: string;
}
```

### 3.2. Módulo de Serviços (`src/modules/shipping/`)

1. **`correiosService.ts`**:
   - Integração com a API REST dos Correios Cws (`https://api.correios.com.br/token/v1/autentica/cartaopostagem` e cotação de serviços de contrato).
   - Leitura de variáveis `.env`: `CORREIOS_USUARIO`, `CORREIOS_SENHA_API`, `CORREIOS_CARTAO_POSTAGEM`, `CORREIOS_COD_SERVICO_SEDEX`, `CORREIOS_COD_SERVICO_PAC`.
   - Fallback tarifário oficial por faixas de CEP brasileiras (Capitais, Interior, Sudeste, Sul, Centro-Oeste, Nordeste e Norte), evitando que o checkout fique indisponível caso os servidores dos Correios apresentem lentidão.

2. **`carrierService.ts`**:
   - Cálculo de frete rodoviário especializado para cargas industriais:
     - Cálculo de cubagem rodoviária (Fator 300 kg/m³).
     - Determinação de prazo e valor por faixa de distância regional e peso total do pedido.
     - Taxa de seguro sobre o valor declarado da carga.

3. **`shippingEngine.ts`**:
   - Consolidação de múltiplos itens do carrinho (somando peso bruto e calculando dimensões equivalentes de despacho).
   - Filtragem de regras: se o carrinho contiver o `cabinet-floor` ou se o peso total for >30kg, a cotação dos Correios é desativada com aviso amigável ("Excede o limite de 30kg dos Correios; disponível via Transportadora ou Retirada").
   - Retorno unificado com ordenação por menor preço e destaque para melhor custo-benefício.

### 3.3. Endpoint de API (`/api/shipping/quote`)
- Método: `POST`
- Valida o CEP de 8 dígitos numéricos.
- Chama o `shippingEngine.calculateQuotes(...)`.
- Retorna as cotações formatadas com valores em centavos e prazos em dias úteis.

### 3.4. Refatoração do Checkout (`src/components/checkout/CheckoutView.tsx`)
- Ao digitar um CEP válido no bloco **2. Endereço de Entrega**, o checkout aciona a cotação em segundo plano sem travar a digitação.
- Exibe o seletor em cartões com design moderno (Glassmorphism, feedback tátil, badge de prazo e ícones da transportadora / Correios).
- Pré-seleciona a opção de menor custo (ou a mais rápida se o usuário preferir).
- Atualiza o resumo financeiro dinamicamente:
  - `Subtotal: R$ X,XX`
  - `Frete ([Nome da Modalidade]): R$ Y,YY`
  - `Total a Pagar (Pix): R$ (X + Y),XX`
- Submissão da ordem inclui o ID e o valor do frete escolhido para validação server-side em `/api/checkout/order`.

---

## 4. Segurança e Soberania do Servidor

1. O cliente nunca dita o valor do frete; a rota `/api/checkout/order` recalcula o frete no backend antes de persistir o pedido e antes de solicitar a cobrança Pix.
2. Em caso de divergência de centavos entre o frontend e o backend, o backend prevalece.
3. Se o cliente escolher "Retirada na Fábrica", o frete é travado em R$ 0,00 e o status de entrega do pedido é configurado como `awaiting_pickup`.

---

## 5. Variáveis de Ambiente Necessárias (`.env` e `.env.example`)
```env
# Logística & Expedição
SHIPPING_ORIGIN_CEP=01001-000
SHIPPING_PICKUP_ADDRESS=Av. Industrial, Galpão 04 - X-Point Engenharia, São Paulo - SP

# Contrato Correios (Opcional - Ativa Cotação de Contrato com API Oficial)
CORREIOS_USUARIO=
CORREIOS_SENHA_API=
CORREIOS_CARTAO_POSTAGEM=
CORREIOS_COD_SERVICO_SEDEX=03220
CORREIOS_COD_SERVICO_PAC=03298
```
