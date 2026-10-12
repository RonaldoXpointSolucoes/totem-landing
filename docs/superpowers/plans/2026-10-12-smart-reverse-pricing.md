# Plano de Implementação: Precificação Inteligente & Engenharia Reversa (Markup Reverso)

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: Utilize superpowers:executing-plans para implementar este plano tarefa por tarefa. Cada passo utiliza sintaxe de checkbox (`- [ ]`).

**Meta:** Implementar no sistema Totem Pro a capacidade de formação reversa de preço (a partir do valor líquido que o lojista deseja no bolso, ex: R$ 990,00), com assistente visual e DRE em tempo real no Admin (`CatalogItemModal.tsx`), ancoragem comercial nas vitrines e configurador ("R$ 990 no PIX ou 10x de R$ 120 no cartão") e suporte a cupons de 10%/20% e comissão de 10% para influenciadores, atualizando para a versão 0.6.0.

---

## Estrutura de Arquivos

- **Novos Arquivos:**
  - `src/modules/pricing/smartPricing.ts`: Motor puro de precificação reversa, cálculo de parcelas, margens líquidas e DRE de cenários.
  - `src/components/admin/SmartPricingAssistant.tsx`: Componente visual interativo do assistente de precificação para o modal de cadastro/edição do admin.
  - `src/components/pricing/PriceTag.tsx`: Componente reutilizável para exibição de preços com âncora e destaque PIX vs. 10x Cartão.
  - `scripts/validate-smart-pricing.ts`: Script de testes automatizados com validação matemática em centavos.
- **Arquivos a Modificar:**
  - `src/types/catalog.ts`: Expansão dos tipos para suportar `pixPriceCents`, `targetNetCents`, `anchorPriceCents` e `maxInstallments`.
  - `src/modules/catalog/catalogData.ts`: Atualização dos modelos padrão (Parede R$ 990 PIX / R$ 1.200 Cartão 10x; Balcão R$ 950 PIX / R$ 1.150 Cartão; Piso R$ 1.590 PIX / R$ 1.890 Cartão).
  - `src/components/admin/CatalogItemModal.tsx`: Integração do `SmartPricingAssistant` na aba de dados comerciais.
  - `src/components/marketing/ModelsSection.tsx`: Exibição com `PriceTag` (PIX vs. 10x Cartão).
  - `src/components/configurator/StepModel.tsx`: Exibição com `PriceTag` nos cards de seleção.
  - `src/components/configurator/StepReview.tsx`: Detalhamento claro do valor no PIX à vista e parcelado no cartão.
  - `package.json` & `src/config/site.ts`: Atualização de versão de `0.5.9` para `0.6.0`.

---

## Tarefas de Execução

### Tarefa 1: Motor Matemático de Precificação Reversa (`smartPricing.ts`)
- [ ] Criar `src/modules/pricing/smartPricing.ts` com funções:
  - `calculateReversePricing(params)`: Calcula preço cartão 10x, preço PIX, âncora de tabela e DRE de simulação dos 3 cenários comerciais.
  - `formatInstallment(totalCents, installments)`: Formatação em parcelas ("10x de R$ 120,00").
- [ ] Criar `scripts/validate-smart-pricing.ts` e validar cenários com R$ 990,00 líquido, cupom 10%/20%, comissão 10% e 10x cartão = R$ 1.200,00.
- [ ] Executar script de validação e assegurar 100% de sucesso nos cálculos.

### Tarefa 2: Tipos & Dados Padrão do Catálogo
- [ ] Atualizar `src/types/catalog.ts` para incluir propriedades opcionais de precificação no `CabinetModel`.
- [ ] Atualizar `src/modules/catalog/catalogData.ts` calibrando os preços dos gabinetes (Parede: R$ 990 PIX / R$ 1.200 Cartão 10x; Balcão: R$ 950 PIX / R$ 1.150 Cartão 10x; Piso: R$ 1.590 PIX / R$ 1.890 Cartão 10x).

### Tarefa 3: Componente `SmartPricingAssistant.tsx` & Integração no Admin
- [ ] Criar `src/components/admin/SmartPricingAssistant.tsx` com design Dark Glassmorphism de alta fidelidade:
  - Input para valor líquido alvo (R$ 990,00).
  - Seletores de Cupom (0%, 10%, 20%), Comissão (0%, 5%, 10%) e Parcelamento (10x).
  - DRE visual com os 3 cenários comparativos lado a lado.
  - Botão "✨ Aplicar Preços ao Produto" que injeta os valores calculados no formulário.
- [ ] Integrar o assistente no `src/components/admin/CatalogItemModal.tsx`.
- [ ] Salvar os metadados calculados em `dimensions_json` e `base_price_cents`.

### Tarefa 4: Componente `PriceTag.tsx` e Atualização da Vitrine e Configurador
- [ ] Criar `src/components/pricing/PriceTag.tsx`.
- [ ] Atualizar `src/components/marketing/ModelsSection.tsx` para usar `PriceTag`.
- [ ] Atualizar `src/components/configurator/StepModel.tsx` e `StepReview.tsx`.

### Tarefa 5: Versionamento, Compilação e Deploy em Produção
- [ ] Atualizar versão de `0.5.9` para `0.6.0` em `package.json` e `src/config/site.ts`.
- [ ] Executar `npm run build` local para garantir 0 erros de compilação.
- [ ] Commitar, enviar para `develop` e acionar deploy no Coolify.
- [ ] Validar em produção ao vivo.
