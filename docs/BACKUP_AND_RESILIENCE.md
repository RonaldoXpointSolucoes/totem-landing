# Diretrizes de Backup, Resiliência e Continuidade de Negócios (DRP)
## Totem Pro — X-Point Soluções

Este documento formaliza as políticas de backup automatizado, verificação de integridade e procedimento de recuperação para a plataforma **Totem Landing Page** e o banco de dados **Appwrite Self-Hosted (`totem_db`)**.

---

### 1. Escopo das Coleções Protegidas

O procedimento de backup cobre 100% das entidades estruturais e transacionais da plataforma:

1. **`cabinet_models`**: Gabinetes homologados (Chão, Parede e Balcão) e metadados CNC.
2. **`colors`**: Paleta de cores, acabamentos e ajustes de preço.
3. **`monitors`**: Monitores industriais homologados (15.6" a 21.5").
4. **`printers`**: Impressoras térmicas homologadas (58mm e 80mm).
5. **`barcode_readers`**: Leitores 1D/2D e QR Code.
6. **`compatibility_rules`**: Regras de compatibilidade física entre periféricos.
7. **`orders`**: Pedidos corporativos com dados do cliente e status de produção.
8. **`order_items`**: Snapshots imutáveis de venda de cada gabinete faturado.
9. **`payments`**: Registros de transações Pix, provedores e timestamps de liquidação.
10. **`customization_requests`**: Solicitações especiais avaliadas pelo engenheiro de corte.
11. **`production_audit_logs`**: Trilha de auditoria das transições de status industrial.

---

### 2. Execução Automatizada e Sintaxe

O script oficial localiza-se em `scripts/backup_appwrite_totem.js`.

#### Execução Padrão:
```bash
node scripts/backup_appwrite_totem.js
```

#### Execução com Política de Retenção Personalizada (ex: manter últimos 14 backups):
```bash
node scripts/backup_appwrite_totem.js --retention 14
```

#### Modo Dry-Run (Auditoria sem gravação em disco):
```bash
node scripts/backup_appwrite_totem.js --dry-run
```

---

### 3. Estrutura dos Arquivos de Backup

Cada execução gera um diretório com timestamp UTC dentro de `backups/`:
```text
backups/
└── totem_db_20261003_185000/
    ├── manifest.json
    ├── cabinet_models.json
    ├── colors.json
    ├── monitors.json
    ├── printers.json
    ├── barcode_readers.json
    ├── compatibility_rules.json
    ├── orders.json
    ├── order_items.json
    └── payments.json
```

#### Arquivo de Integridade (`manifest.json`):
Cada backup inclui metadados com:
- Data e hora de extração (`createdAt`)
- Total consolidado de documentos e bytes
- Hash criptográfico SHA-256 de cada coleção para garantir ausência de corrupção de dados

---

### 4. Automação via Crontab / Agendador do Servidor

Para agendar o backup diário às 03:00 da madrugada no servidor Coolify / Linux:
```bash
0 3 * * * cd /caminho/do/projeto && node scripts/backup_appwrite_totem.js --retention 30 >> /var/log/totem_backup.log 2>&1
```

---

### 5. Procedimento de Restauração em Caso de Desastre (Disaster Recovery)

1. Localize a pasta do backup desejado em `backups/totem_db_YYYYMMDD_HHMMSS/`.
2. Valide os hashes SHA-256 listados em `manifest.json`.
3. Utilize o script de importação `scripts/restore_appwrite_totem.js` ou efetue carga via API REST do Appwrite Databases utilizando a mesma chave de serviço.
