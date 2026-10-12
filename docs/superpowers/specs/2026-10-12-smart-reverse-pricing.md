# Especificação Técnica: Precificação Inteligente com Engenharia Reversa (Markup Reverso) & Ancoragem PIX vs. Cartão

- **Data:** 12/10/2026
- **Status:** Aprovado
- **Versão Alvo:** 0.6.0

---

## 1. Contexto & Problema

Atualmente, ao cadastrar um modelo de gabinete na tela Admin (`CatalogItemModal.tsx`), o lojista preenche um campo único de `Preço Base (R$)` (ex: R$ 990,00). No entanto, quando incidem regras comerciais do mundo real:
1. **Cupom de Desconto ao Cliente:** 10% ou 20% de desconto gerado pelo influenciador ou campanha;
2. **Comissão do Influenciador / Vendedor:** 10% de repasse financeiro sobre o gabinete;
3. **Taxa de Gateway / Parcelamento em 10x no Cartão:** ~12% a 15% retidos pela adquirente para antecipação de 10 parcelas.

Ao aplicar essas deduções sobre o preço base antigo, o valor líquido recebido pelo lojista fica substancialmente abaixo da sua margem de sobrevivência e lucro. O lojista necessita definir o seu **Líquido Alvo Desejado (No Meu Bolso, ex: R$ 990,00)** e permitir que o sistema calcule automaticamente o preço à vista no PIX, o preço parcelado em até 10x no cartão e exiba simulações financeiras transparentes (DRE visual).

---

## 2. Modelo Matemático de Precificação Reversa

### 2.1. Variáveis de Entrada
- $L$ (`targetNetCents`): Margem líquida desejada no bolso (ex: R$ 990,00).
- $D\%$ (`customerCouponPercent`): Desconto previsto em cupons promocionais (ex: 10% ou 20%).
- $C\%$ (`influencerCommissionPercent`): Comissão do influenciador/vendedor (ex: 10%).
- $T_{cartao}\%$ (`cardFeePercent`): Custo financeiro de parcelamento em 10x (ex: ~14% ou calibrado para R$ 1.200,00).
- $Desc_{pix}\%$ (`pixDiscountPercent`): Desconto promocional de incentivo ao pagamento à vista via PIX (ex: ~15% a 17.5%).

### 2.2. Fórmulas de Formação de Preço
1. **Preço no Cartão (Preço de Tabela 10x):**
   $$P_{cartao} = \frac{L}{1 - (D\% + C\% + T_{cartao}\%)} \quad \text{ou calibrado comercialmente para } R\$\ 1.200,00$$
   - Parcela mensal (10x): $\text{Parcela} = \frac{P_{cartao}}{10} = R\$\ 120,00$
2. **Preço Promocional no PIX (À Vista):**
   - Sem cupom: $P_{pix} = L = R\$\ 990,00$
   - Se projetado para absorver cupom de 10%: $P_{pix\_tabela} = \frac{L}{1 - D\%} = R\$\ 1.100,00$, com cupom cai para $R\$\ 990,00$.
3. **Preço Âncora ("De / Por"):**
   $$P_{ancora} = \text{Arredondar}(P_{cartao} \times 1.15) \approx R\$\ 1.390,00$$

### 2.3. DRE / Simulação de Cenários em Tempo Real
- **Cenário A (Venda PIX Direta):** Cliente paga R$ 990,00 ➔ Taxa Gateway: R$ 0,00 ➔ Comissão: R$ 0,00 ➔ **Lojista recebe: R$ 990,00** (100% da meta).
- **Cenário B (Venda PIX c/ Influencer 10% + Cupom 10%):** Detalha o desconto concedido ao comprador, a comissão de 10% repassada ao influenciador e o saldo líquido.
- **Cenário C (Venda Cartão 10x c/ Influencer):** Cliente paga R$ 1.200,00 em 10x de R$ 120,00 ➔ Taxa Cartão: R$ 110,00 ➔ Comissão: R$ 100,00 ➔ **Lojista recebe: R$ 990,00**.

---

## 3. Arquitetura de Componentes e Telas

1. **Módulo de Precificação (`src/modules/pricing/smartPricing.ts`):**
   - Motor puro de cálculo com tipagem TypeScript estrita e testes unitários.
2. **Assistente no Admin (`src/components/admin/SmartPricingAssistant.tsx`):**
   - Integrado ao modal `CatalogItemModal.tsx`.
   - Permite ao admin digitar o líquido desejado (ex: R$ 990,00), selecionar cupons (10% ou 20%) e aplicar os valores gerados com 1 clique.
3. **Exibição Padronizada (`src/components/pricing/PriceTag.tsx`):**
   - Apresenta:
     - Destaque: **R$ X,XX no PIX** (Verde esmeralda vibrante)
     - Subtítulo: **ou até 10x de R$ Y,YY no cartão**
   - Utilizado em `ModelsSection.tsx`, `StepModel.tsx`, `StepReview.tsx` e `CartView.tsx`.
4. **Checkout (`src/components/checkout/CheckoutView.tsx`):**
   - Ao selecionar PIX, aplica o preço com desconto à vista.
   - Ao selecionar Cartão, exibe opção de parcelamento em até 10x.

---

## 4. Critérios de Aceite
- [x] O admin consegue precificar a partir do valor líquido alvo (R$ 990,00) de forma visual e intuitiva.
- [x] Visualização em tempo real do DRE para os 3 cenários (PIX direto, PIX influenciador, Cartão 10x).
- [x] Vitrine e configurador exibem os preços no formato moderno ("R$ 990 no PIX ou 10x de R$ 120 no cartão").
- [x] Testes unitários com 100% de precisão nos cálculos monetários em centavos inteiros.
- [x] Versionamento incrementado de 0.5.9 para 0.6.0.
