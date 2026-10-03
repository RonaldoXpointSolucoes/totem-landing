import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Totem Pro | Gabinete para Totem de Autoatendimento, Chão, Parede e Balcão",
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Fabricação industrial e configurador sob medida de Gabinete para Totem de Autoatendimento. Modelos Gabinete Totem de Chão, Gabinete Totem de Parede e Gabinete Totem de Balcão com corte em Router CNC para seus periféricos.",
  keywords: [
    "Gabinete para Totem de Autoatendimento",
    "Gabinete Totem de Chão",
    "Gabinete Totem de Parede",
    "Gabinete Totem de Balcão",
    "Totem de autoatendimento sob medida",
    "Totem para restaurantes e varejo",
    "Usinagem Router CNC Totem",
    "Totem Pro X-Point Soluções",
    "Kiosk self-checkout gabinete",
    "Totem touch screen industrial",
  ],
  authors: [{ name: "X-Point Soluções", url: siteConfig.url }],
  creator: "X-Point Soluções",
  publisher: "X-Point Soluções",
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: "Totem Pro — X-Point Soluções",
    title: "Gabinete para Totem de Autoatendimento | Chão, Parede e Balcão",
    description:
      "Configure e adquira seu Gabinete de Totem de Autoatendimento sob medida. Usinagem CNC milimétrica para monitores, impressoras térmicas e leitores de código de barras.",
    images: [
      {
        url: `${siteConfig.url}/images/og-totem.jpg`,
        width: 1200,
        height: 630,
        alt: "Totem Pro — Gabinetes Industriais para Totens de Autoatendimento",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gabinete para Totem de Autoatendimento | Chão, Parede e Balcão",
    description:
      "Configurador industrial sob medida de Gabinetes para Totem de Autoatendimento com usinagem Router CNC milimétrica.",
    images: [`${siteConfig.url}/images/og-totem.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// JSON-LD estruturado Schema.org
const schemaOrgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: "X-Point Soluções em Autoatendimento",
      url: siteConfig.url,
      logo: `${siteConfig.url}/images/logo.png`,
      description:
        "Fabricação industrial sob medida de gabinetes para totens de autoatendimento com usinagem Router CNC de alta precisão.",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+55-11-99999-9999",
        contactType: "customer service",
        areaServed: "BR",
        availableLanguage: "Portuguese",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      publisher: {
        "@id": `${siteConfig.url}/#organization`,
      },
    },
    {
      "@type": "Product",
      "@id": `${siteConfig.url}/#product-cabinet`,
      name: "Gabinete para Totem de Autoatendimento",
      description:
        "Gabinete industrial sob medida para totens de autoatendimento. Modelos Gabinete Totem de Chão, Gabinete Totem de Parede e Gabinete Totem de Balcão com usinagem Router CNC milimétrica para monitores touchscreen, impressoras térmicas e leitores de código de barras.",
      brand: {
        "@type": "Brand",
        name: "Totem Pro / X-Point Soluções",
      },
      category: "Equipamentos Comerciais > Gabinetes e Totens de Autoatendimento",
      image: `${siteConfig.url}/images/og-totem.jpg`,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "BRL",
        lowPrice: "2890.00",
        highPrice: "4290.00",
        offerCount: "3",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#090a0f] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
