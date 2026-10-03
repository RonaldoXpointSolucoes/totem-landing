---
name: fila-dev
description: Protocolo de consulta e execução de tarefas para o comando 'fila dev' no quadro Totem Landing Page, puxando exclusivamente cartões da coluna 'Em Desenvolvimento' na ordem de baixo para cima.
---

# Skill: fila dev (Totem Landing Page)

Esta skill é ativada quando o usuário digita `fila dev` ou pede para iniciar/pegar a próxima tarefa da fila de desenvolvimento do Totem Landing Page.

## Configurações do Quadro

- **Nome do Quadro**: Totem Landing Page
- **Board ID**: `8c88ef42-855a-4704-9032-70ec67f674d0`
- **Coluna Alvo**: `Em Desenvolvimento` (`stage_id: development`)
- **API Endpoint**: `https://owckk0k8w8soo40w40owc4ss.69.62.92.212.sslip.io/api/v1/crm`
- **Bearer Token**: `xpt_crm_live_5ba23c68238fdc9946ca1600e0f34b6288c3debb`

## Fluxo de Execução

1. **Consultar Cartões na Coluna**:
   Fazer requisição `GET` para:
   \`\`\`text
   https://owckk0k8w8soo40w40owc4ss.69.62.92.212.sslip.io/api/v1/crm/boards/8c88ef42-855a-4704-9032-70ec67f674d0/cards
   \`\`\`
   Filtrar estritamente por `c.status === "development"`.

2. **Aplicar Regra "De Baixo para Cima"**:
   - Entre os cards com `status === "development"`, selecionar o cartão posicionado na base (último da lista da coluna / mais antigo por ordem de chegada na fila de desenvolvimento).
   - Se a lista estiver vazia na coluna "Em Desenvolvimento", reportar claramente ao usuário:
     > *"Não há cartões na coluna 'Em Desenvolvimento' no momento. Os cards atuais estão na coluna 'Em Análise'. Por favor, mova o card desejado para 'Em Desenvolvimento' ou confirme se deseja que eu mova o Item 01 para iniciarmos."*

3. **Carregar Contexto do Cartão**:
   - Fazer `GET /api/v1/crm/cards/:cardId` para obter todas as informações, critérios de aceite e detalhes técnicos.
   - Apresentar ao usuário o item selecionado e confirmar o início do desenvolvimento.

4. **Regras de Desenvolvimento**:
   - Manter 100% de conformidade com os critérios de aceite do cartão.
   - Não inventar funcionalidades fora de fase.
   - Manter a regra de soberania do servidor nos preços.
