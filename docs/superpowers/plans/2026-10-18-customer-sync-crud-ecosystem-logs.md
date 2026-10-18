# Plano de Implementação: Sincronização de Clientes & Pedidos, CRUD de Clientes e Logs do Ecossistema (v0.7.6)

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: Utilize superpowers:executing-plans para implementar este plano tarefa por tarefa. Cada passo utiliza sintaxe de checkbox (`- [ ]`).

**Meta:** Garantir consistência absoluta entre pedidos e a lista de clientes exibindo o último pedido, liberar edição e exclusão de clientes com modais de confirmação, e implementar um sistema moderno e persistente de auditoria/logs de todo o ecossistema com painel visual avançado, atualizando a versão para 0.7.6 e realizando deploy ao vivo.

---

## Estrutura de Arquivos

- **Novos Arquivos:**
  - `src/lib/logging/ecosystemLogger.ts`: Motor centralizado de logs com persistência em JSON, categorização, níveis de severidade e seed inicial.
  - `src/app/api/admin/logs/route.ts`: API REST para listagem paginada, filtros, criação e limpeza de logs do ecossistema.
  - `src/components/admin/SystemLogsManager.tsx`: Componente visual moderno de auditoria com KPIs, filtros, busca em tempo real, timeline e visualizador de JSON.
- **Arquivos a Modificar:**
  - `src/lib/customers/customerStore.ts`: Funções de atualização (`updateCustomer`), exclusão (`deleteCustomer`) e auto-sincronização de clientes a partir de pedidos (`syncCustomersFromOrders`).
  - `src/app/api/admin/customers/route.ts`: Suporte a pedidos do Appwrite, auto-sincronização no `GET`, handlers de `PUT` (edição) e `DELETE` (exclusão).
  - `src/components/admin/CustomersManager.tsx`: Nova coluna "ÚLTIMO PEDIDO", botões de Edição e Exclusão, modais `EditCustomerModal` e `DeleteCustomerDialog`.
  - `src/app/admin/page.tsx`: Integração do `SystemLogsManager` na aba de Auditoria & Logs, e logging de ações administrativas.
  - `src/app/api/checkout/order/route.ts`: Registro de logs automáticos de criação de pedido e pagamento.
  - `src/app/api/webhooks/mercadopago/route.ts`: Registro de logs de pagamento confirmado.
  - `package.json` & `src/config/site.ts`: Atualização de versão para `0.7.6`.
  - `scripts/verify-production-live.ts`: Atualização da versão esperada para `0.7.6`.

---

## Tarefas de Execução

### Tarefa 1: Motor de Logs do Ecossistema (`ecosystemLogger.ts` & API)
- [ ] Criar `src/lib/logging/ecosystemLogger.ts` com tipagem, persistência em `src/data/ecosystem_logs.json`, funções de log e seed inteligente.
- [ ] Criar `src/app/api/admin/logs/route.ts` com endpoints `GET`, `POST` e `DELETE`.
- [ ] Integrar chamadas de log nos fluxos essenciais (checkout, webhooks, pedidos).

### Tarefa 2: Consistência Bidirecional de Clientes & Pedidos (`customerStore.ts` & API)
- [ ] Adicionar `updateCustomer`, `deleteCustomer` e `syncCustomersFromOrders` em `src/lib/customers/customerStore.ts`.
- [ ] Atualizar `src/app/api/admin/customers/route.ts` com:
  - Busca de pedidos consolidados (Appwrite + local)
  - Execução de `syncCustomersFromOrders`
  - Métodos `PUT` (edição de cliente) e `DELETE` (exclusão)
  - Registro de auditoria nas ações

### Tarefa 3: Refatoração da UI de Clientes (`CustomersManager.tsx`)
- [ ] Adicionar coluna "ÚLTIMO PEDIDO" com número do pedido, badge de status e data relativa/absoluta.
- [ ] Adicionar botões de ação: WhatsApp, Editar (`Edit2`) e Excluir (`Trash2`).
- [ ] Criar `EditCustomerModal` para edição de nome, email, whatsapp, documento e endereço.
- [ ] Criar modal de confirmação de exclusão com alerta de pedidos vinculados.

### Tarefa 4: Componente Moderno de Auditoria & Logs (`SystemLogsManager.tsx` & `page.tsx`)
- [ ] Criar `src/components/admin/SystemLogsManager.tsx` com KPIs, filtros por categoria/nível, timeline e visualizador de JSON.
- [ ] Conectar o novo componente à aba "Auditoria & Logs" em `src/app/admin/page.tsx`.

### Tarefa 5: Versionamento, Compilação e Deploy em Produção
- [ ] Atualizar versão para `0.7.6` em `package.json`, `src/config/site.ts` e `scripts/verify-production-live.ts`.
- [ ] Executar `npm run build` local para garantir 0 erros.
- [ ] Commitar, enviar para `develop` e acionar deploy no Coolify.
- [ ] Validar com script e capturas de tela do Chrome DevTools MCP.
