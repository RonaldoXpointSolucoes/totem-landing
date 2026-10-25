import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Como Montar um Totem de Autoatendimento Economizando Mais de 50%",
  description:
    "Passo a passo de como montar seu próprio Totem de Autoatendimento e economizar mais de 50%. Escolha o gabinete usinado em Router CNC ou leve o Gabinete + Kit Completo pronto para instalar.",
  keywords: [
    "como montar um totem de autoatendimento",
    "totem de autoatendimento barato",
    "montar totem autoatendimento",
    "kit totem de autoatendimento",
    "gabinete para totem sob medida",
  ],
  alternates: {
    canonical: `${siteConfig.url}/como-funciona`,
  },
  openGraph: {
    title: "Como Montar seu Totem de Autoatendimento Economizando +50% | Totem Pro",
    description:
      "Descubra como economizar mais de 50% montando seu próprio Totem de Autoatendimento com gabinete usinado na Router CNC.",
    url: `${siteConfig.url}/como-funciona`,
    images: [`${siteConfig.url}/images/totems/wall/wall-white-1.webp`],
  },
};

export default function ComoFuncionaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
