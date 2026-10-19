# Especificação: Opção de Tema Claro no Painel Administrativo (v0.7.7)

## 1. Visão Geral e Contexto
O usuário solicitou explicitamente a adição da opção de **Tema Claro** no Painel Administrativo (`https://totem.xpointsolucoes.com.br/admin`). Atualmente, o painel opera exclusivamente em modo escuro profundo (`slate-950` / `slate-900`), sem controle de alternância para os administradores que preferem uma interface de alta luminosidade para uso diurno ou ambientes corporativos iluminados.

## 2. Requisitos Funcionais
1. **Alternador de Tema (Theme Switcher)**:
   - Posicionado no topo do Painel Admin (Header), junto aos controles rápidos ("Atualizar", "Ver Loja", "Sair").
   - Ícone e texto intuitivos: Sol (`Sun`) para Tema Claro e Lua (`Moon`) para Tema Escuro, com transição suave.
   - Também disponível na tela de login administrativa.
2. **Persistência de Preferência**:
   - Salvo no `localStorage` sob a chave `totem_admin_theme` (`light` | `dark`).
   - Carregamento instantâneo com fallback gracioso para o tema preferido.
3. **Escopo Visual do Tema Claro**:
   - Background principal: Slate 50 / Slate 100 (`#f8fafc`).
   - Cards e painéis: Branco puro (`#ffffff`) com bordas suaves (`#e2e8f0`) e sombras sutis (`shadow-sm`).
   - Tipografia: Títulos e rótulos em alto contraste (`#0f172a` / `#1e293b`), textos secundários em slate médio (`#64748b`).
   - Badges cromáticos: Fundos suaves (tint 50/100) com textos e bordas saturadas (ex: Emerald para Pago, Indigo para Produção, Amber para Aguardando).
   - Inputs, selects e textareas: Fundo branco, borda `slate-300`, texto escuro e foco anil com anel de acessibilidade.
   - Modais e gavetas: Fundo branco cristalino com desfoque de fundo e overlay escuro suave.
   - Tabelas: Cabeçalho com fundo suave (`#f1f5f9`), linhas alternadas ou bordas limpas e hover interativo.
4. **Preservação de Lógica e Dados**:
   - Nenhuma rota, lógica de pedidos, precificação, vouchers, Appwrite ou cálculos será modificada.
   - Apenas a camada de apresentação e o estado de tema do painel serão expandidos.

## 3. Arquitetura Técnica
- **Controle de Estado**: Estado `adminTheme` (`"dark" | "light"`) em `src/app/admin/page.tsx` sincronizado com o `localStorage`.
- **Classe de Aplicação**: Classe `.admin-light` injetada dinamicamente no container do painel e no elemento raiz.
- **Regras de Estilo SaaS**: Definição em `src/app/globals.css` com escopo estrito sob `.admin-light`, cobrindo todos os módulos do painel (`Orders`, `Catalog`, `Vouchers`, `Customers`, `Logs`, `Analytics`, `Settings`, `Team`).
