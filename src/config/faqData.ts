/**
 * Dados Estruturados de Perguntas Frequentes (FAQ)
 * Utilizado tanto na renderização visual do FaqSection quanto no JSON-LD Schema.org do Google
 */

export interface FaqItem {
  question: string;
  answer: string;
  category: "Produto" | "Compatibilidade" | "Fabricação" | "Entrega";
}

export const FAQ_DATA: FaqItem[] = [
  {
    category: "Produto",
    question: "Quanto custa um Totem de Autoatendimento completo ou apenas o gabinete?",
    answer:
      "Na Totem Pro você tem total liberdade: pode adquirir apenas o Gabinete para Totem usinado sob medida na Router CNC a partir de R$ 950 à vista no PIX (modelo Balcão), R$ 990 (Parede) ou R$ 1.590 (Piso), ou adquirir o Gabinete + Kit Completo de Hardware (Computador All-in-One Touch 23.8\", Impressora Térmica 80mm e Leitor 2D) a partir de R$ 4.900 à vista ou parcelado em até 10x.",
  },
  {
    category: "Produto",
    question: "Como posso montar meu próprio Totem de Autoatendimento e economizar mais de 50%?",
    answer:
      "Seguindo o nosso configurador online, você escolhe o gabinete usinado sob medida na Router CNC para encaixar as peças que já possui, ou escolhe o Gabinete + Kit Completo de Montagem. Como o gabinete já chega pronto com furação VESA e encaixes exatos, você mesmo instala em menos de 30 minutos e economiza mais de 50% em relação aos totens fechados do mercado tradicional.",
  },
  {
    category: "Produto",
    question: "Se eu escolher o Kit Completo, vocês também podem enviar o totem já montado?",
    answer:
      "Sim! Ao selecionar o Gabinete + Kit Completo na etapa final do configurador, você pode optar por receber as peças para montar facilmente ou contratar o Serviço de Montagem Industrial da nossa fábrica: nós montamos, cabemos e testamos todo o totem para que você só precise tirar da embalagem e ligar na tomada.",
  },
  {
    category: "Produto",
    question: "O que é um Gabinete para Totem de Autoatendimento e para que serve?",
    answer:
      "O gabinete para totem é a estrutura física e industrial usinada em Router CNC que protege e organiza todos os equipamentos de autoatendimento (monitor touchscreen, impressora térmica de cupom fiscal, leitor de código de barras/QR code, mini PC e PinPad TEF/PIX). Ele transforma seus periféricos em uma estação de autoatendimento profissional para restaurantes, clínicas, mercados e varejo.",
  },
  {
    category: "Produto",
    question: "Qual a diferença entre os modelos de Piso, Parede e Balcão?",
    answer:
      "O Totem de Piso (Pedestal Pro) é auto-sustentável com 1,65m de altura, ideal para entradas de restaurantes, fast-food e self-checkout. O Totem de Parede (Slim) é fixado verticalmente na parede, ideal para corredores e espaços compactos. O Totem de Balcão (Expresso) fica sobre mesas ou balcões de recepção, clínicas e atendimento rápido.",
  },
  {
    category: "Compatibilidade",
    question: "Posso utilizar meus próprios monitores, impressoras e leitores?",
    answer:
      "Sim! Você pode usar os equipamentos que já possui ou deseja homologar. Durante a configuração no site, selecione os modelos dos seus periféricos (monitores touch de 15.6\", 18.5\", 21.5\" ou 23.8\", impressoras térmicas 80mm Elgin i9, Epson TM-T20X, Bematech MP-4200 TH ou Daruma, e leitores 2D Honeywell, Elgin Flash, etc.) e usinamos os recortes exatos sem custo adicional.",
  },
  {
    category: "Compatibilidade",
    question: "Vocês cobram taxa extra para fazer os cortes dos meus equipamentos?",
    answer:
      "Não cobramos sobretaxa para corte de equipamentos homologados. O valor do gabinete já inclui a usinagem personalizada na Router CNC, com furação padrão VESA 75x75 e 100x100, berço da impressora térmica e janela do leitor óptico.",
  },
  {
    category: "Fabricação",
    question: "Qual o material utilizado na fabricação do gabinete de totem?",
    answer:
      "Utilizamos MaDeFibra BP de 15mm de alta densidade com revestimento melamínico industrial de alta resistência a riscos, umidade e impacto. Nosso corte em Router CNC computadorizada proporciona bordas perfeitas e encaixe submilimétrico.",
  },
  {
    category: "Fabricação",
    question: "O gabinete possui chave de segurança e ventilação para o computador?",
    answer:
      "Sim. Todos os modelos contam com porta de acesso técnico com fechadura e chave de segurança exclusiva, ventilação estratégica para dissipação térmica de computadores e fontes, e passagem interna organizada para cabeamento elétrico e de rede.",
  },
  {
    category: "Entrega",
    question: "Qual o prazo de fabricação e como é calculado o frete para minha cidade?",
    answer:
      "O prazo médio de fabricação e usinagem CNC é de 5 a 10 dias úteis. No próprio carrinho e checkout você calcula o frete em tempo real pelos Correios (PAC e SEDEX) e transportadoras homologadas para qualquer CEP do Brasil.",
  },
  {
    category: "Fabricação",
    question: "É possível personalizar a cor ou pedir um lote para revenda / software house?",
    answer:
      "Com certeza! Oferecemos opções imediatas em Branco TX, Preto TX e Black & White Dual-Tone, além de condições especiais para integradores de automação comercial, franquias e software houses de PDV e cardápio digital.",
  },
];
