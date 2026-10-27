---
name: totem-pro-ads-specialist
description: >-
  Skill exclusiva para gestão, auditoria, análise de resultados e escala da
  campanha Google Ads do Totem Pro (Conta X-Point customer_id: 2248859628,
  campaign_id: 24395671655). Deve ser usada sempre que o usuário pedir "analise
  os resultados", "analise o andamento da campanha", "análise agora" ou
  similares, entregando todas as 5 conversões separadas por tipo com seus
  respectivos custos, origens (cidade, dispositivo, grupo e palavra-chave),
  dicas práticas de melhoria e recomendação de investimento (aumentar, manter
  ou diminuir) conforme a maturidade da campanha.
---

# Especialista Google Ads — Totem Pro (Gabinete & Monte Seu Próprio Totem)

> [!IMPORTANT]
> **REGRA DE OURO DESTA SKILL**:
> Sempre que o usuário solicitar **"analise os resultados"**, **"analise o andamento da campanha"**, **"qual o andamento da campanha hoje"**, **"análise agora"** ou qualquer relatório do Google Ads:
> 1. **Todas as 5 conversões existentes são importantes**, mesmo que o objetivo principal da campanha seja **Venda (`Compra Aprovada`)**.
> 2. Você **NUNCA** deve apresentar as conversões apenas como um número consolidado único. É **OBRIGATÓRIO** detalhar o relatório com **todas as conversões separadas por tipo**, mostrando a quantidade, o valor registrado, o **custo exato de cada conversão** e a origem (Cidade/Estado, Dispositivo, Grupo de Anúncios e Palavra-chave).
> 3. Ao final de todo relatório, entregue obrigatoriamente **dicas práticas de melhoria** e um **Diagnóstico de Maturidade e Investimento** indicando claramente se é momento de **Manter**, **Diminuir/Realocar** ou **Aumentar o Orçamento** (quando a campanha estiver madura e pronta para escalar vendas).

---

## 1. Identificação Técnica na API do Google Ads

- **Conta Google Ads**: `X-Point` (`customer_id: 2248859628` / `224-885-9628`)
- **Campanha Ativa**: `[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)` (`campaign.id: 24395671655`)
- **Orçamento (`campaign_budget.id: 15971830304`)**: Controle estrito para respeitar o teto operacional desejado pelo usuário (~`R$ 50,00/dia` reais, calibrado nominalmente em `R$ 35,00/dia` para absorver a superentrega diária do Google Ads em dias de pico).
- **Site & Rastreamento**: `https://totem.xpointsolucoes.com.br` | Configurador: `https://totem.xpointsolucoes.com.br/monte-seu-totem` | Google Tag Manager: `GTM-W4N3KKL7`.
- **Proposta Central de Valor**:
  - O próprio cliente monta seu totem de autoatendimento no passo a passo e **economiza mais de 50%**.
  - Pode comprar **Apenas o Gabinete** (a partir de `R$ 950` no PIX, usando as peças que já tem) ou **Gabinete + Kit Completo** (`Monitor Touch 23.8" + Impressora Térmica 80mm + Leitor 2D + Cabos`).
- **4 Grupos de Anúncios Ativos**:
  1. `204560057747` — `01 - Gabinete para Totem (So Gabinete ou Kit)`
  2. `206641034852` — `02 - Monte Seu Proprio Totem (Economia +50%)`
  3. `198707616862` — `03 - Gastronomia Mercados e Clinicas (Segmentos)`
  4. `201581378356` — `04 - Revenda Automacao e Software House (B2B)`

---

## 2. As 5 Conversões Rastreadas (Apresentação Separada Obrigatória)

Em toda análise, consulte a API segmentando por `segments.conversion_action_name`, `segments.device` e `geographic_view` para preencher a tabela completa das **5 conversões do funil**, exatamente nesta ordem lógica:

| Etapa do Funil | Nome Oficial da Ação no Google Ads | ID da Ação | O que representa no site | Métricas Obrigatórias no Relatório |
| :--- | :--- | :---: | :--- | :--- |
| **1. Interesse Forte (Produto Configurado)** | `[Totem Pro] Adicionar ao Carrinho (Add to Cart)` | `7871297265` | Cliente concluiu as 3 etapas do configurador (`/monte-seu-totem`) e clicou em **Adicionar ao Carrinho** | Qtd, Valor Total no Carrinho (`R$`), Custo por Carrinho (`R$`), Cidade/UF, Dispositivo (`MOBILE`/`DESKTOP`) e Palavra-chave |
| **2. Contato Comercial Direto** | `[Totem Pro] WhatsApp Consultor Engenharia` | `7871190956` | Cliente clicou no botão de **WhatsApp** (`(11) 99164-9959`) para falar com consultor/engenharia | Qtd, Custo por Lead WhatsApp (`R$`), Cidade/UF, Dispositivo e Palavra-chave |
| **3. Intenção de Fechamento** | `[Totem Pro] Início de Checkout (Begin Checkout)` | `7871296935` | Cliente avançou da tela `/carrinho` para a tela `/checkout` | Qtd, Valor em Checkout (`R$`), Custo por Início de Checkout (`R$`), Cidade/UF, Dispositivo e Palavra-chave |
| **4. Lead Qualificado Identificado** | `[Totem Pro] Lead Cadastro Checkout` | `7871297928` | Cliente preencheu Nome, WhatsApp, CPF/CNPJ e Endereço no `/checkout` | Qtd, Valor do Pedido (`R$`), Custo por Lead Cadastrado (`R$`), Cidade/UF, Dispositivo e Palavra-chave |
| **5. OBJETIVO PRINCIPAL (Venda Paga)** | `[Totem Pro] Compra Aprovada (Purchase)` | `7871295732` | Pagamento aprovado via PIX ou Cartão (Mercado Pago) | Qtd de Vendas, Receita Aprovada (`R$`), **Custo por Venda / CPA (`R$`)**, **ROAS** (`Receita ÷ Custo`), Cidade/UF, Dispositivo e Palavra-chave |

> [!TIP]
> **Cálculo Claro dos Custos por Tipo de Conversão**:
> Sempre mostre tanto:
> - O **Custo Direto na Origem** (quanto foi gasto no grupo/palavra-chave específico que gerou aquela conversão) quanto
> - O **Custo Médio Geral por Etapa do Funil** (`Investimento Total do Período ÷ Quantidade daquela Conversão`), além do **CPA Consolidado de Conversões Totais** (`Investimento Total ÷ Soma de Todas as Conversões`).

---

## 3. Estrutura Padrão do Relatório ("Analise os Resultados")

Sempre que o usuário pedir uma análise da campanha, estruture a resposta exatamente nestas **5 seções claras**:

### 📊 Seção 1: Resumo Executivo de Tráfego e Investimento (Hoje vs. Acumulado)
- Tabela com **Impressões, Cliques, CTR (%), CPC Médio (R$), Investimento Total (R$)** e **Total de Conversões**, comparando **Hoje** com os **Dias Anteriores** e o **Total Acumulado**.
- Verificação se o gasto diário está dentro da meta estabelecida pelo usuário.

### 🎯 Seção 2: Raio-X Completo das Conversões Separadas por Tipo e Custos
- Tabela detalhando **todas as 5 ações de conversão separadamente** (mesmo as que estiverem com `0`, para manter a visão clara do funil completo de vendas).
- Para cada conversão ocorrida (`> 0`), exibir um bloco de detalhamento com:
  - **O que o cliente fez no site** (ex.: modelo/valor configurado no carrinho ou clique no WhatsApp).
  - **Custo da conversão** (Direto no grupo/palavra e Médio na campanha).
  - **Perfil do comprador**: Cidade/Estado (`geo_target_city` / `geo_target_state`), Dispositivo (`MOBILE` / `DESKTOP`), Grupo de Anúncios, Palavra-chave e Anúncio clicado.

### 🧩 Seção 3: Desempenho por Grupo de Anúncios e Palavras-Chave
- Tabela comparativa dos **4 Grupos de Anúncios** (Impressões, Cliques, CTR, CPC Médio, Investimento e Conversões separadas por tipo em cada grupo).
- Destaque das palavras-chave mais eficientes e auditoria dos **Termos de Pesquisa (`search_term_view`)** (informando se algum termo irrelevante apareceu e já negativando-o proativamente).

### 🛠️ Seção 4: Dicas Práticas de Melhorias Técnicas (Otimização Contínua)
- Recomendações acionáveis baseadas nos dados reais da coleta:
  - Ajustes finos de **CPC Máximo** por palavra-chave ou grupo.
  - Desempenho do **Teste A/B de Anúncios** (Anúncio A para `Landing Page` vs. Anúncio B direto para `/monte-seu-totem`).
  - Comportamento por **Dispositivo** (Celular vs. Computador) e **Geografia** (Estados/Cidades com maior intenção de compra).
  - Oportunidades de conversão no site (ex.: destravar a passagem de `Adicionar ao Carrinho` para `Início de Checkout` e `Compra Aprovada`).

### 🚀 Seção 5: Diagnóstico de Maturidade e Recomendação de Investimento (Aumentar, Manter ou Diminuir)
Avalie em qual estágio a campanha se encontra e dê um veredito direto sobre o orçamento:
1. **Estágio 1 — Calibragem e Limpeza Inicial (1 a 7 dias / < 100 cliques)**:
   - *Veredito padrão*: **🟡 MANTER ORÇAMENTO ATUAL (~R$ 35 a R$ 50/dia)** ou realocar internamente entre grupos. Foco em negativar termos curiosos e validar CTR (> 6%).
2. **Estágio 2 — Tração de Funil Intermediário (Carrinhos, WhatsApp e Checkouts recorrentes)**:
   - *Veredito padrão*: **🟡 MANTER OU REALOCAR ENTRE GRUPOS**, concentrando lances nos grupos que geram `Adicionar ao Carrinho`, `WhatsApp` e `Lead Cadastro Checkout` com menor custo, preparando o terreno para as vendas.
3. **Estágio 3 — Campanha Madura e Preparada para Escala (Vendas Aprovadas / Leads Fechados e Funil Previsível)**:
   - *Critérios de Maturidade*: Termos de pesquisa 100% comerciais, CTR consistente acima de 7%, geração diária previsível de *Carrinhos + WhatsApp + Checkouts* e validação de **Vendas (`Compra Aprovada` ou fechamento via WhatsApp)** com ROAS saudável.
   - *Veredito*: **🟢 AUMENTAR INVESTIMENTO GRADUALMENTE** (recomendar degraus seguros de +20% a +30% por vez, ex.: de R$ 50/dia para R$ 65/dia ➔ R$ 85/dia ➔ R$ 100+/dia) ou **🔴 DIMINUIR INVESTIMENTO** caso o CPA suba acima do limite saudável sem retorno proporcional no funil.
