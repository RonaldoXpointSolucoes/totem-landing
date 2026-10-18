# Especificação Técnica: Consistência de Clientes & Pedidos, Edição/Exclusão e Sistema de Logs do Ecossistema (v0.7.6)

## 1. Visão Geral e Objetivos

Esta especificação aborda três necessidades críticas de governança, consistência de dados e observabilidade para a plataforma Totem Pro:
1. **Consistência Bidirecional de Clientes & Pedidos**:
   - Garantir que todos os pedidos (Appwrite e locais) estejam sincronizados com a lista de clientes.
   - Apresentar o Último Pedido associado a cada cliente, exibindo nome consistente, número do pedido, data e status.
2. **CRUD Completo de Clientes (Edição e Exclusão)**:
   - Permitir ao administrador editar dados cadastrais do cliente (Nome, E-mail, WhatsApp, CPF/CNPJ, Tipo de Pessoa, Endereço, Observações).
   - Permitir a exclusão segura de clientes com modal de confirmação anti-perda acidental e preservação de histórico fiscal/pedidos.
3. **Sistema Moderno de Auditoria e Logs do Ecossistema (Telemetry & Audit Logs)**:
   - Substituição do estado in-memory volátil por um motor centralizado e persistente de auditoria (`ecosystemLogger`).
   - Rastreamento de eventos em 8 categorias do ecossistema: `orders`, `payments`, `customers`, `vouchers`, `shipping`, `catalog`, `auth`, `system`.
   - Interface com design SaaS Premium (Timeline interativa, filtros por categoria/severidade, visualizador de payload JSON e exportação).

---

## 2. Arquitetura de Dados & Consistência

### 2.1. Sincronização Unificada de Pedidos e Clientes
- Ao consultar `GET /api/admin/customers`, o backend:
  1. Carrega os pedidos consolidados do Appwrite (`totem_db.orders`) e do armazenamento local (`orders_local.json`).
  2. Executa a sincronização `syncCustomersFromOrders(orders)`.
  3. Se existir um pedido com cliente que ainda não estava indexado em `customer_accounts.json`, cria a ficha cadastral automaticamente com os dados do checkout.
  4. Recalcula `totalOrdersCount`, `totalSpentCents` e enriquece o cliente com os dados do pedido mais recente:
     - `lastOrderNumber`
     - `lastOrderDate`
     - `lastOrderStatus`
     - `lastOrderTotalCents`
  5. Assegura que o nome do cliente seja idêntico ao do pedido mais recente.

### 2.2. Edição e Exclusão de Clientes
- Endpoint `PUT /api/admin/customers`:
  - Atualiza o registro em `customerStore`.
  - Propaga a atualização do nome para os pedidos correspondentes.
  - Registra evento de auditoria no ecossistema (`customers`, `info`, `Cliente Atualizado`).
- Endpoint `DELETE /api/admin/customers?id=...`:
  - Valida a autenticação do administrador.
  - Remove o cliente do cadastro mantendo a integridade dos pedidos históricos.
  - Registra evento de auditoria (`customers`, `warn`, `Cliente Excluído`).

### 2.3. Motor de Logs do Ecossistema (`ecosystemLogger.ts`)
- Persistência em `src/data/ecosystem_logs.json` com capacidade de buffer de até 1.000 eventos.
- Schema do Evento:
  ```ts
  interface LogEvent {
    id: string;
    timestamp: string;
    category: "orders" | "payments" | "customers" | "vouchers" | "shipping" | "catalog" | "auth" | "system";
    level: "info" | "success" | "warn" | "error";
    action: string;
    target: string;
    details: string;
    actor: string;
    metadata?: Record<string, any>;
  }
  ```
- Endpoints em `src/app/api/admin/logs/route.ts` (`GET`, `POST`, `DELETE`).

---

## 3. UI/UX e Design System

- **Clientes & Compras (`CustomersManager.tsx`)**:
  - Nova coluna **"ÚLTIMO PEDIDO"** com tag do pedido, status badge colorido e data.
  - Coluna de Ações com:
    - 💬 WhatsApp (quando houver telefone)
    - ✏️ Editar (`Edit2`)
    - 🗑️ Excluir (`Trash2`)
  - Modal Glassmorphism de Edição de Cliente (`EditCustomerModal`).
  - Modal de Confirmação de Exclusão (`DeleteCustomerDialog`).
- **Auditoria & Logs (`SystemLogsManager.tsx`)**:
  - Dashboard integrado com KPIs (Total, Sucesso, Alertas, Erros).
  - Filtros por categoria e nível em badges modernas.
  - Timeline interativa com acordeão expansível para visualização de JSON.
