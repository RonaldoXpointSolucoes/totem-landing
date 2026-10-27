# Diretrizes do Projeto — Totem Landing Page

## Protocolo de Execução: Comando `fila dev`

Sempre que o usuário digitar `fila dev` ou solicitar o próximo item de desenvolvimento:

1. **Quadro Exclusivo**:
   - Nome: **Totem Landing Page**
   - Board ID: `8c88ef42-855a-4704-9032-70ec67f674d0`
   - URL Base: `https://owckk0k8w8soo40w40owc4ss.69.62.92.212.sslip.io/api/v1/crm`
   - Bearer Token: `xpt_crm_live_5ba23c68238fdc9946ca1600e0f34b6288c3debb`

2. **Coluna Alvo Exclusiva**:
   - Apenas cards que estiverem na coluna **"Em Desenvolvimento"** (`stage_id: development` ou `status: development`).
   - Cards em outras colunas (como "Em Análise", "Backlog", "Em Testes & QA" ou "Concluído") **NÃO** devem ser puxados pelo `fila dev`.

3. **Ordem de Seleção Rigorosa**:
   - **SEMPRE NA ORDEM DE BAIXO PARA CIMA**:
     - O agente deve selecionar o card posicionado na base (parte inferior) da coluna "Em Desenvolvimento" (o item mais antigo/inferior da pilha visual da coluna).
     - Executar um card por vez com foco total, respeitando os critérios de aceite definidos no cartão.

4. **Preservação de Escopo e Regras**:
   - Não antecipar fases do projeto.
   - Todo preço deve ser recalculado pelo backend/BFF (o cliente/navegador nunca é autoridade sobre o preço).
   - O configurador mantém suas regras comerciais independentes do visualizador 3D.
   - O desenvolvimento é estritamente **Mobile-First**.

---

## Protocolo de Execução: Google Ads (`analise os resultados` / `totem-pro-ads-specialist`)

Sempre que o usuário solicitar **"analise os resultados"**, **"analise o andamento da campanha"**, **"análise agora"**, **"qual o andamento da campanha hoje"** ou similares para a campanha do Google Ads (`customer_id: 2248859628`, `campaign_id: 24395671655` — `[SEARCH] Totem Pro — Gabinete & Monte Seu Totem (-50%)`):

1. **Ativação da Skill**: Consulte e aplique rigorosamente a skill [`totem-pro-ads-specialist`](file:///c:/Users/NOTE-(FORM)02JUL26/Documents/Projetos/Antigravity/Totem-Landing/.agents/skills/totem-pro-ads-specialist/SKILL.md).
2. **Separação Obrigatória de Todas as 5 Conversões por Tipo e Seus Custos**:
   - Embora o objetivo principal seja **Venda (`Compra Aprovada`)**, todas as conversões são importantes e **NUNCA** devem ser apresentadas apenas como um número consolidado único.
   - Apresente sempre uma tabela dedicada separando as 5 ações do funil (`GTM-W4N3KKL7`) com suas quantidades, valores financeiros registrados, **custos individuais (CPA por tipo)** e origem (Cidade/UF, Dispositivo, Grupo e Palavra-chave):
     1. 🛒 `[Totem Pro] Adicionar ao Carrinho (Add to Cart)` (`7871297265`)
     2. 💬 `[Totem Pro] WhatsApp Consultor Engenharia` (`7871190956`)
     3. 💳 `[Totem Pro] Início de Checkout (Begin Checkout)` (`7871296935`)
     4. 📋 `[Totem Pro] Lead Cadastro Checkout` (`7871297928`)
     5. 🏆 `[Totem Pro] Compra Aprovada (Purchase)` (`7871295732`) — *Objetivo Principal*
3. **Dicas de Melhoria + Termômetro de Maturidade e Orçamento**:
   - Todo relatório deve finalizar com **dicas práticas de melhoria técnica** (CPC, termos negativos, grupos, anúncios A/B, regiões e dispositivos) e uma **recomendação objetiva de investimento** (**Aumentar**, **Manter** ou **Diminuir/Realocar** orçamento) baseada no estágio real de maturidade da campanha.
