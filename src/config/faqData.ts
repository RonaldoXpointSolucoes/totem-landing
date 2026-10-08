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
    question: "O que é um Gabinete para Totem de Autoatendimento e para que serve?",
    answer:
      "O gabinete para totem é a estrutura física e estrutural usinada em Router CNC que protege e organiza todos os equipamentos de autoatendimento (monitor touchscreen, impressora térmica de cupom fiscal, leitor de código de barras/QR code, mini PC e nobreak). Ele transforma seus periféricos em uma estação interativa comercial profissional, segura e atraente para clientes no varejo, restaurantes, clínicas e eventos.",
  },
  {
    category: "Produto",
    question: "Qual a diferença entre os modelos de Piso, Parede e Balcão?",
    answer:
      "O Totem de Piso (Pedestal Pro) é auto-sustentável, ideal para entradas de lojas, self-checkout e controle de fluxo. O Totem de Parede (Slim) é instalado direto na parede, ideal para corredores e ambientes com pouco espaço de circulação. O Totem de Balcão (Expresso) é compacto e fica sobre mesas e balcões de atendimento ou pagamento rápido.",
  },
  {
    category: "Compatibilidade",
    question: "Posso utilizar meus próprios monitores, impressoras e leitores?",
    answer:
      "Sim! Você pode usar os equipamentos que já possui ou deseja homologar. Durante a configuração no site, selecione os modelos dos seus periféricos (monitores de 15.6\", 18.5\" ou 21.5\", impressoras Elgin, Epson, Bematech ou Daruma, e leitores Honeywell, Zebra, etc.) e usinamos os recortes exatos sem custo adicional.",
  },
  {
    category: "Compatibilidade",
    question: "Vocês cobram taxa extra para fazer os cortes dos meus equipamentos?",
    answer:
      "Não cobramos sobretaxa para corte de equipamentos homologados. O valor do gabinete inclui a usinagem personalizada na Router CNC, com furação padrão VESA 75/100, berço de impressora e nicho do leitor.",
  },
  {
    category: "Fabricação",
    question: "Qual o material utilizado na fabricação do gabinete de totem?",
    answer:
      "Utilizamos MaDeFibra BP de 15mm de alta densidade com revestimento melamínico de alta resistência a riscos e impacto. Nosso corte em Router CNC industrial proporciona bordas perfeitas sem arrepiamento, mantendo o acabamento de fábrica com máxima durabilidade comercial.",
  },
  {
    category: "Fabricação",
    question: "O gabinete possui chave de segurança e ventilação para o computador?",
    answer:
      "Sim. Todos os modelos contam com porta traseira de manutenção com fechadura e chave de segurança exclusiva, aletas de ventilação passiva para dissipação térmica de mini PCs, e canaletas internas para gerenciamento de cabeamento de energia e rede.",
  },
  {
    category: "Entrega",
    question: "Qual o prazo de fabricação e como é feito o envio para o Brasil?",
    answer:
      "O prazo médio de fabricação é de 5 a 10 dias úteis após a confirmação do pedido. Realizamos entregas em todo o território nacional através de transportadoras especializadas, com embalagem reforçada de alta proteção antichoque.",
  },
  {
    category: "Fabricação",
    question: "É possível personalizar a cor ou pedir um projeto especial?",
    answer:
      "Com certeza! Oferecemos opções padrão em Branco TX, Preto TX e combinação Black & White. Para cores institucionais especiais, adesivagem personalizada ou medidas sob encomenda, nossa equipe de engenharia desenvolve projetos exclusivos via canal direto no WhatsApp.",
  },
];
