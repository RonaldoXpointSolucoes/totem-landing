# Plano de Implementação: Opção de Tema Claro no Painel Admin (v0.7.7)

## Etapa 1: Regras CSS do Tema Claro em `globals.css`
- Definir regras sob o seletor `.admin-light` em `src/app/globals.css`.
- Cobrir containers principais, cabeçalhos, barras de abas, cartões de KPIs, tabelas, modais, formulários (inputs/selects/textareas) e badges de status.
- Garantir contraste WCAG AA para todos os elementos de texto.

## Etapa 2: Componente `AdminThemeToggle` e Integração em `src/app/admin/page.tsx`
- Adicionar estado `theme: "dark" | "light"` com leitura e persistência em `localStorage.getItem("totem_admin_theme")`.
- Integrar o botão de alternância no cabeçalho do painel (ao lado de "Atualizar" e "Ver Loja") com ícones `Sun` e `Moon`.
- Incluir também o botão na tela de login administrativo para permitir acesso direto em modo claro.
- Aplicar a classe `.admin-light` na tag contêiner do painel quando o tema ativo for `light`.

## Etapa 3: Validação de Versionamento e Compilação Local
- Atualizar versão para `0.7.7` em `package.json` e `src/config/site.ts`.
- Executar `npm run build` para validar zero erros de compilação e tipagem.

## Etapa 4: Commit, Push e Deploy no Coolify
- Commitar alterações e push para `develop`.
- Acionar deploy via Coolify MCP tool `deploy`.
- Confirmar propagação ao vivo em `https://totem.xpointsolucoes.com.br/admin` via `scripts/verify-production-live.ts`.

## Etapa 5: Validação Visual via Chrome DevTools MCP
- Navegar para `/admin`.
- Alternar para o tema claro e capturar evidência visual do painel em modo claro.
- Abrir modais ou abas no tema claro para comprovar acabamento de alta qualidade.
- Gerar relatório com a Análise Prática de 10 Pontos de UI/UX.
