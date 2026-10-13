# Plano de Implementação: Refinamento de Seleção de Acabamento & Lupa de Textura (v0.6.3)

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: Utilize superpowers:executing-plans para implementar este plano tarefa por tarefa. Cada passo utiliza sintaxe de checkbox (`- [ ]`).

**Meta:** Resolver os problemas de visualização de acabamento no Configurador Pro (`StepColor.tsx`), movendo o check de seleção para fora da amostra de cor, melhorando a identificação e contraste do acabamento Branco TX em fundos claros, adicionando efeito de lupa interativa com zoom de textura 2.5x em MDF MaDeFibra BP, atualizando a versão para 0.6.3 e realizando deploy em produção com validação ao vivo.

---

## Estrutura de Arquivos

- **Arquivos a Modificar:**
  - `src/components/configurator/StepColor.tsx`: Refatoração do componente com separação do check de seleção, chassi táctil da amostra de MDF, e lupa flutuante de textura com zoom de alta resolução.
  - `src/components/configurator/ConfiguratorWizard.tsx`: Refinamento visual da mini-amostra de acabamento no resumo lateral e sticky bar.
  - `src/components/configurator/StepReview.tsx`: Refinamento visual da amostra de acabamento no resumo da revisão.
  - `package.json` & `src/config/site.ts`: Atualização de versão de `0.6.2` para `0.6.3`.
  - `scripts/verify-production-live.ts`: Atualização do script de verificação para a versão `0.6.3`.

---

## Tarefas de Execução

### Tarefa 1: Refatoração do Componente `StepColor.tsx`
- [ ] Implementar a separação do indicador de seleção (Check):
  - Criar um indicador dedicado ao lado da amostra de cor com círculo azul, ícone `<Check />` e rótulo "Selecionado".
- [ ] Implementar o chassi tátil e contraste reforçado para as amostras de cor:
  - Borda chanfrada de precisão 1mm (fita de borda PVC).
  - Tratamento visual no Branco TX para destacá-lo com volume contra o fundo branco.
- [ ] Implementar o efeito de Lupa Interativa / Zoom de Textura:
  - Botão/ícone de lupa no canto da amostra de acabamento.
  - Balão/lente de aumento flutuante com zoom óptico 2.5x e ficha técnica da chapa MaDeFibra BP (Arauco/Duratex 15mm com proteção melamínica e corte Router CNC).
  - Suporte ergonômico tanto para hover no desktop quanto para toque no celular.
- [ ] Reforçar o estado visual do card selecionado (borda 2px, gradiente sutil, halo luminoso).

### Tarefa 2: Refinamento das Mini-Amostras no Wizard e Revisão
- [ ] Atualizar o mini-swatch de cor em `ConfiguratorWizard.tsx` (resumo lateral e barra inferior).
- [ ] Atualizar o mini-swatch de cor em `StepReview.tsx`.

### Tarefa 3: Versionamento e Verificação Local
- [ ] Incrementar a versão de `0.6.2` para `0.6.3` em `package.json` e `src/config/site.ts`.
- [ ] Atualizar `scripts/verify-production-live.ts` para verificar `0.6.3`.
- [ ] Executar `npm run build` para garantir zero erros de TypeScript e compilação.

### Tarefa 4: Commit, Deploy no Coolify e Verificação em Produção
- [ ] Fazer commit das alterações e push para `origin/develop`.
- [ ] Acionar o deploy no Coolify via MCP.
- [ ] Executar script de verificação ao vivo em produção (`https://totem.xpointsolucoes.com.br`).
- [ ] Capturar screenshot da tela ao vivo com o Chrome DevTools MCP comprovando o resultado.
