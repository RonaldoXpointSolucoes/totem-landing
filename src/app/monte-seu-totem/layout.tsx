import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Monte seu Totem de Autoatendimento Online | Configurador e Preço na Hora",
  description:
    "Configure seu Totem de Autoatendimento passo a passo: escolha entre Gabinete de Piso, Parede ou Balcão, cores e periféricos (ou Kit Completo). Veja o preço na hora e economize +50%.",
  keywords: [
    "monte seu totem de autoatendimento",
    "configurador de totem de autoatendimento",
    "comprar totem de autoatendimento",
    "totem de autoatendimento preço online",
    "orçamento totem de autoatendimento",
  ],
  alternates: {
    canonical: `${siteConfig.url}/monte-seu-totem`,
  },
  openGraph: {
    title: "Configurador Online: Monte seu Totem de Autoatendimento | Totem Pro",
    description:
      "Escolha o modelo (Piso, Parede ou Balcão), a cor e os periféricos. Orçamento imediato na tela com envio para todo o Brasil.",
    url: `${siteConfig.url}/monte-seu-totem`,
    images: [`${siteConfig.url}/images/og-totem.jpg`],
  },
};

export default function MonteSeuTotemLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
