import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Dúvidas sobre Totem de Autoatendimento: Preços, Peças e Montagem (FAQ)",
  description:
    "Respostas para as principais dúvidas sobre Totens de Autoatendimento: quanto custa, quais equipamentos usar (monitor touch, impressora térmica 80mm, PinPad), frete e montagem.",
  keywords: [
    "dúvidas totem de autoatendimento",
    "quanto custa um totem de autoatendimento",
    "quais peças vão em um totem de autoatendimento",
    "totem autoatendimento faq",
    "frete totem de autoatendimento",
  ],
  alternates: {
    canonical: `${siteConfig.url}/faq`,
  },
  openGraph: {
    title: "Perguntas Frequentes sobre Totem de Autoatendimento | Totem Pro",
    description:
      "Tire todas as suas dúvidas sobre preços, compatibilidade de monitores e impressoras térmicas, montagem e entrega em todo o Brasil.",
    url: `${siteConfig.url}/faq`,
    images: [`${siteConfig.url}/images/totems/countertop/countertop-white-1.webp`],
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
