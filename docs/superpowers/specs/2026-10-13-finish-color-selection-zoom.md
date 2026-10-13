# Especificação Técnica: Refinamento de Seleção de Acabamento & Lupa de Textura (v0.6.3)

## 1. Contexto e Diagnóstico

Na Etapa 2 do Configurador de Totens (`/monte-seu-totem?modelo=cabinet-wall&etapa=2`), os clientes escolhem o acabamento em MaDeFibra BP (Branco TX, Preto TX ou Dual-Tone).

### Problemas Atuais Identificados:
1. **Check sobreposto à amostra de cor**: O ícone `<Check />` ficava renderizado dentro da pequena amostra quadrada de 40x40px. Em cores escuras havia contraste, mas no Branco TX o check cinza claro ficava ilegível e tapava a cor.
2. **Invisibilidade do Branco TX**: Como o fundo da página e dos cards é predominantemente branco (`#ffffff` / `#f8fafc`), a amostra branca sem relevo misturava-se totalmente ao card, dando a impressão de um elemento vazio ou sem cor.
3. **Ausência de textura e materialidade**: As chapas MaDeFibra BP têm textura melamínica texturizada (TX) com microporos e fita de borda de PVC de 1mm usinada em Router CNC. O cliente não conseguia avaliar a textura real do acabamento.

---

## 2. Requisitos de Engenharia e Design

### 2.1. Desassociação do Check de Seleção
- O ícone de check **não deve mais ficar dentro da amostra de cor**.
- Criar um **indicador de seleção dedicado posicionado ao lado da amostra de cor**:
  - Quando selecionado: Círculo azul `#0071e3` com ícone de `Check` em branco + rótulo sutil `SELECIONADO`.
  - Quando não selecionado: Círculo sutil com borda neutra `border-2 border-slate-300 dark:border-slate-600`.

### 2.2. Destaque Visual do Acabamento Branco TX e do Card Selecionado
- A amostra física de cor recebe representação de painel MDF usinado em CNC:
  - Borda chanfrada de 1mm simulando fita de borda de PVC (`ring-1 ring-black/15 dark:ring-white/20`).
  - Sombra interna sutil (`shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`) e sombra externa (`shadow-md`).
  - Para o **Branco TX**: microporos melamínicos com sutil gradiente de iluminação rasante (`#ffffff` com borda sombreada de 1px), garantindo contraste imediato e presença física contra qualquer fundo branco.
- O card selecionado recebe:
  - Borda dupla/espessa `border-2 border-[#0071e3]`.
  - Gradiente glassmorphism de fundo (`from-blue-50/70 via-white to-blue-50/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20`).
  - Brilho de profundidade (`shadow-[0_12px_32px_-8px_rgba(0,113,227,0.22)]`).
  - Anel de foco externo na amostra de cor (`ring-2 ring-offset-2 ring-[#0071e3]`).

### 2.3. Lupa de Textura Interativa (Magnifying Loupe / Texture Zoom)
- Cada amostra de acabamento ganha um botão/ícone de lupa (`ZoomIn` do Lucide).
- Ao passar o mouse (desktop) ou tocar (mobile), abre-se uma **Lente Flutuante de Zoom Óptico**:
  - Ampliação em alta fidelidade da textura do padrão melamínico.
  - Informações técnicas:
    - Selo: **"MaDeFibra BP Arauco/Duratex 15mm"**;
    - Descrição da superfície e propriedades anti-risco;
    - Fita de borda PVC 1mm usinada em Router CNC industrial.

---

## 3. Preservação de Regras de Negócio e Tipos
- A assinatura de `StepColor` é preservada estritamente:
  ```ts
  interface StepColorProps {
    colors: ColorOption[];
    selectedColor: ColorOption;
    onSelectColor: (color: ColorOption) => void;
  }
  ```
- Nenhum preço, slug, id ou lógica de carrinho/3D é modificado.
- Versão do software evolui de `0.6.2` para `0.6.3` sob a regra de dígito único.
