# Regra do Workspace: Comando `fila dev`

Esta regra define o comportamento obrigatório para o comando `fila dev` no projeto **Totem Landing Page**.

## Comportamento Mandatório

Ao receber o comando `fila dev` (ou variações como "próximo da fila", "pegar card dev"):

1. **Escopo do Quadro**:
   - Atuar **exclusivamente** no quadro **Totem Landing Page** (`Board ID: 8c88ef42-855a-4704-9032-70ec67f674d0`).
   - Jamais puxar tarefas de outros quadros ou de projetos alheios.

2. **Filtro de Coluna**:
   - Puxar cartões **exclusivamente** da coluna **"Em Desenvolvimento"** (`stage_id: development` / `status: "development"`).
   - Se a coluna estiver vazia, avisar o usuário que não há cartões movidos para "Em Desenvolvimento" e listar os cartões disponíveis em "Em Análise".

3. **Ordem de Execução ("De baixo para cima")**:
   - O processamento deve ocorrer **SEMPRE de baixo para cima** da coluna.
   - Em termos de dados: pegar o cartão que está na base da coluna visual (o item com menor posição ou mais antigo na coluna, respeitando a numeração ordinal crescente ex: `Item 01`, `Item 02`...).

4. **Execução Técnica**:
   - Ler integralmente o conteúdo e os critérios de aceite do cartão selecionado.
   - Apresentar o plano de ação imediato para o card ao usuário.
   - Conduzir o desenvolvimento seguindo os padrões do projeto (Next.js, Tailwind, Mobile-First, Appwrite).
