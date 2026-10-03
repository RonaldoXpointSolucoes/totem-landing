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
