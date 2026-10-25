import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Modelos de Totem de Autoatendimento: Piso, Parede e Balcão",
  description:
    "Conheça os modelos de Gabinete para Totem de Autoatendimento de Piso, Parede e Balcão. Estrutura em MaDeFibra BP 15mm usinada em Router CNC sob medida. Preços a partir de R$ 950 no PIX.",
  keywords: [
    "modelos de totem de autoatendimento",
    "totem de autoatendimento de piso",
    "totem de autoatendimento de parede",
    "totem de autoatendimento de balcão",
    "gabinete para totem",
    "gabinete totem preço",
  ],
  alternates: {
    canonical: `${siteConfig.url}/modelos`,
  },
  openGraph: {
    title: "Modelos de Totem de Autoatendimento: Piso, Parede e Balcão | Totem Pro",
    description:
      "Gabinetes de piso, parede e balcão para totens de autoatendimento com usinagem CNC milimétrica para monitores touch e impressoras térmicas.",
    url: `${siteConfig.url}/modelos`,
    images: [`${siteConfig.url}/images/totems/floor/floor-white-1.webp`],
  },
};

export default function ModelosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
