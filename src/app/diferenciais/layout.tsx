import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Fabricante de Gabinete para Totem em Router CNC e MaDeFibra BP 15mm",
  description:
    "Diferenciais de engenharia da Totem Pro: usinagem computadorizada em Router CNC, furação VESA exata, suporte para impressoras Epson, Elgin e Bematech e acabamento antimicrobiano.",
  keywords: [
    "fabricante de totem de autoatendimento",
    "fábrica de gabinete para totem",
    "usinagem router cnc totem",
    "gabinete totem mdf bp 15mm",
    "totem autoatendimento industrial",
  ],
  alternates: {
    canonical: `${siteConfig.url}/diferenciais`,
  },
  openGraph: {
    title: "Diferenciais de Engenharia e Usinagem Router CNC | Totem Pro",
    description:
      "Precisão submilimétrica em gabinetes para totens de autoatendimento. Homologado para monitores VESA, impressoras térmicas 80mm e leitores 2D.",
    url: `${siteConfig.url}/diferenciais`,
    images: [`${siteConfig.url}/images/totems/floor/floor-black-31.webp`],
  },
};

export default function DiferenciaisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
