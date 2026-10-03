# Plano de Desenvolvimento — Configurador e E-commerce de Gabinetes para Totem

> **Quadro Kanban**: Totem Landing Page  
> **Coluna Alvo**: Em Análise (`analysis`)  
> **Total de Cards Cadastrados**: 15  
> **Status da Sincronização**: 100% Concluído e Validado via API REST  

---

## 📌 Visão Geral da Fila de Desenvolvimento

Os 15 cartões foram quebrados na ordem exata de implementação técnica, contemplando desde a fundação (MVP 0) até a expansão completa (MVP 1 ao MVP 5) com Appwrite, Gateway Pix Real e Visualizador 3D:

| Ordem | Título do Cartão | Prioridade | Tags Principais | Fase |
|---|---|---|---|---|
| **01** | `Item 01 - Fundação & Setup Arquitetural Next.js 15, TypeScript e Tailwind Design System` | Alta | `mvp0`, `etapa-a`, `setup`, `design-system` | MVP 0 |
| **02** | `Item 02 - Landing Page Comercial de Alta Conversão (Hero, Modelos, Como Funciona, Diferenciais)` | Alta | `mvp0`, `etapa-b`, `marketing`, `ui-ux` | MVP 0 |
| **03** | `Item 03 - Motor Central de Preços & Estrutura de Tipos dos Produtos` | Alta | `mvp0`, `etapa-c`, `pricing`, `core` | MVP 0 |
| **04** | `Item 04 [1/2] - Configurador Mobile-First: Etapa 1 (Modelos) e Etapa 2 (Cores) com Preço Reativo` | Alta | `mvp0`, `etapa-c`, `configurador`, `etapa-1-2` | MVP 0 |
| **05** | `Item 05 [2/2] - Configurador Mobile-First: Etapas 3, 4 e 5 (Monitor, Impressora, Leitor) e Ficha de Revisão` | Alta | `mvp0`, `etapa-c`, `configurador`, `etapa-3-5` | MVP 0 |
| **06** | `Item 06 - Carrinho de Compras Multicomponentes com Duplicação, Edição e Persistência Local` | Alta | `mvp0`, `etapa-d`, `carrinho`, `duplicacao` | MVP 0 |
| **07** | `Item 07 - Checkout Enxuto & Simulação de Pagamento Pix com Ficha Técnica de Fabricação (MVP 0)` | Alta | `mvp0`, `etapa-e`, `checkout`, `pix-mock` | MVP 0 |
| **08** | `Item 08 - Dockerização Otimizada & Pipeline de Deploy em Staging no Coolify` | Alta | `etapa-f`, `devops`, `coolify`, `staging` | Staging |
| **09** | `Item 09 - Modelagem de Dados no Appwrite (Collections, Relacionamentos, Permissões e Seeds)` | Média | `mvp1`, `etapa-g`, `appwrite`, `database` | MVP 1 |
| **10** | `Item 10 - Integração Frontend/BFF com Appwrite SDK & Snapshots Imutáveis de Pedidos (MVP 1)` | Média | `mvp1`, `etapa-g`, `appwrite`, `snapshots` | MVP 1 |
| **11** | `Item 11 - Painel Administrativo /admin para Gestão de Catálogo, Preços e Pedidos (MVP 2)` | Média | `mvp2`, `etapa-h`, `admin`, `gestao` | MVP 2 |
| **12** | `Item 12 - Fluxo de Personalização Especial (Equipamentos Fora de Padrão & Orçamento Manual) (MVP 4)` | Média | `mvp4`, `etapa-i`, `customizacao`, `b2b` | MVP 4 |
| **13** | `Item 13 - Integração de Gateway Pix Real, Webhook Seguro e Transição de Status (MVP 3)` | Média | `mvp3`, `etapa-h`, `pix`, `gateway` | MVP 3 |
| **14** | `Item 14 - Observabilidade, SEO Técnico, Analytics de Funil e Rotinas de Backup` | Normal | `etapa-i`, `seo`, `analytics`, `backup` | Produção |
| **15** | `Item 15 - Integração Desacoplada do Visualizador 3D via postMessage e Hotspots Interativos (MVP 5)` | Normal | `mvp5`, `etapa-j`, `3d`, `threejs` | MVP 5 |

---

## 🔒 Princípios e Regras Inegociáveis do Sistema
1. **Regra de Soberania de Preços**: O navegador nunca é autoridade sobre o preço. O cálculo é validado e recalculado de forma autoritativa no servidor antes de gerar cobrança.
2. **Equipamentos Homologados não alteram o preço padrão**: Monitores, impressoras térmicas e leitores servem para dimensionar os cortes/furações de fabricação (+ R$ 0,00 no gabinete padrão).
3. **Personalização Especial Segura**: Para os ~20% fora de catálogo, o cliente nunca digita preço; a solicitação é analisada e precificada pela engenharia no `/admin`.
4. **Isolamento do 3D**: O visualizador 3D é estritamente uma camada de apresentação — nunca calcula preços, não emite pedidos e não controla carrinho.
5. **Mobile First Real**: Telas prioritariamente projetadas para smartphones (360x800 a 412x915), com barra fixa inferior persistente de preço e ação.
