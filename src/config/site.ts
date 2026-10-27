const WHATSAPP_RAW = "5511991649959";
const WHATSAPP_DEFAULT_MESSAGE =
  "Olá! Vi os gabinetes para totem no site. Poderia me enviar o catálogo completo, por favor?";

export const siteConfig = {
  name: "Totem Pro — Gabinetes para Autoatendimento",
  version: "3.2.4",
  description:
    "Configurador sob medida de gabinetes de piso, parede e balcão para totens de autoatendimento. Precisão milimétrica para seus equipamentos homologados.",
  url: "https://totem.xpointsolucoes.com.br",
  ogImage: "/images/og-totem.jpg",
  links: {
    whatsapp: `https://wa.me/${WHATSAPP_RAW}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`,
    whatsappMessage: WHATSAPP_DEFAULT_MESSAGE,
    whatsappDisplay: "(11) 99164-9959",
    whatsappRaw: WHATSAPP_RAW,
  },
};
