import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { CartProvider } from "@/modules/cart/CartContext";
import { MarketingPixels } from "@/components/analytics/MarketingPixels";
import { SiteTelemetryWatcher } from "@/components/telemetry/SiteTelemetryWatcher";
import { TelemetryErrorBoundary } from "@/components/telemetry/TelemetryErrorBoundary";
import { FloatingWhatsAppButton } from "@/components/marketing/FloatingWhatsAppButton";
import { FAQ_DATA } from "@/config/faqData";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Totem de Autoatendimento e Gabinete Sob Medida | Economize +50% | Totem Pro",
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Fabricante de Totem de Autoatendimento e Gabinetes Sob Medida (Piso, Parede e Balcão) usinados em Router CNC. Compre só o gabinete a partir de R$ 950 ou Gabinete + Kit Completo e economize mais de 50%. Envio para todo o Brasil.",
  keywords: [
    "totem de autoatendimento",
    "gabinete para totem",
    "gabinete para totem de autoatendimento",
    "totem autoatendimento preço",
    "totem para restaurante",
    "totem para lanchonete",
    "totem de senha para clínica",
    "totem self checkout mercado",
    "gabinete totem de piso",
    "gabinete totem de parede",
    "gabinete totem de balcão",
    "fabricante de totem de autoatendimento",
    "monte seu proprio totem",
    "kit totem de autoatendimento",
    "quiosque autoatendimento",
    "usinagem router cnc totem",
    "totem touch screen comercial",
    "totem pro x-point",
  ],
  authors: [{ name: "X-Point Soluções em Autoatendimento", url: siteConfig.url }],
  creator: "X-Point Soluções",
  publisher: "X-Point Soluções",
  category: "Equipamentos Comerciais e Totens de Autoatendimento",
  alternates: {
    canonical: siteConfig.url,
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteConfig.url,
    siteName: "Totem Pro — X-Point Soluções",
    title: "Totem de Autoatendimento e Gabinetes Sob Medida | Economize +50%",
    description:
      "Monte seu próprio Totem de Autoatendimento e economize mais de 50%. Gabinetes de Piso, Parede e Balcão em Router CNC para monitores touch e impressoras térmicas, ou Kit Completo pronto para instalar.",
    images: [
      {
        url: `${siteConfig.url}/images/og-totem.jpg`,
        secureUrl: `${siteConfig.url}/images/og-totem.jpg`,
        width: 1200,
        height: 630,
        alt: "Totem Pro — Totens de Autoatendimento e Gabinetes Sob Medida",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Totem de Autoatendimento e Gabinetes Sob Medida | Economize +50%",
    description:
      "Compre só o gabinete usinado em Router CNC (a partir de R$ 950) ou Gabinete + Kit Completo de Autoatendimento.",
    images: [`${siteConfig.url}/images/og-totem.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "geo.region": "BR-SP",
    "geo.placename": "São Paulo",
    "geo.position": "-23.55052;-46.633308",
    ICBM: "-23.55052, -46.633308",
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0f" },
  ],
  width: "device-width",
  initialScale: 1,
};

// JSON-LD estruturado Schema.org de última geração (Multi-Entity Graph para Google Rich Results)
const schemaOrgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: "Totem Pro — X-Point Soluções em Autoatendimento",
      alternateName: ["Totem Pro", "X-Point Engenharia de Totens"],
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/icon.svg`,
        width: "512",
        height: "512",
      },
      image: `${siteConfig.url}/images/og-totem.jpg`,
      description:
        "Fabricante industrial de totens de autoatendimento e gabinetes sob medida (piso, parede e balcão) com usinagem Router CNC de alta precisão em MaDeFibra BP 15mm.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "São Paulo",
        addressRegion: "SP",
        addressCountry: "BR",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+55-11-99164-9959",
        contactType: "sales",
        areaServed: "BR",
        availableLanguage: ["Portuguese"],
      },
      sameAs: [siteConfig.url],
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
      inLanguage: "pt-BR",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteConfig.url}/monte-seu-totem?modelo={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Product",
      "@id": `${siteConfig.url}/#product-cabinet`,
      name: "Totem de Autoatendimento e Gabinete Sob Medida (Piso, Parede e Balcão)",
      description:
        "Totem de autoatendimento e gabinete industrial sob medida usinado em Router CNC. Disponível nas versões de Piso, Parede e Balcão. Compre apenas o gabinete para montar com suas peças ou o Gabinete + Kit Completo com Computador Touch, Impressora Térmica 80mm e Leitor 2D.",
      brand: {
        "@type": "Brand",
        name: "Totem Pro",
      },
      manufacturer: {
        "@id": `${siteConfig.url}/#organization`,
      },
      sku: "TOTEM-PRO-CNC-2026",
      mpn: "XPT-TOTEM-PRO",
      category: "Equipamentos Comerciais > Totens de Autoatendimento",
      image: [
        `${siteConfig.url}/images/og-totem.jpg`,
        `${siteConfig.url}/images/totems/floor/floor-white-1.webp`,
        `${siteConfig.url}/images/totems/floor/floor-black-31.webp`,
        `${siteConfig.url}/images/totems/wall/wall-white-1.webp`,
        `${siteConfig.url}/images/totems/countertop/countertop-white-1.webp`,
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "64",
        bestRating: "5",
        worstRating: "1",
      },
      review: [
        {
          "@type": "Review",
          author: {
            "@type": "Person",
            name: "Carlos Eduardo Mendes",
          },
          datePublished: "2026-08-15",
          reviewBody:
            "Excelente acabamento no corte da Router CNC. Nossos monitores touch de 21.5 e impressoras térmicas Epson couberam perfeitamente sem folgas. Economizamos mais da metade do valor.",
          reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
          },
        },
        {
          "@type": "Review",
          author: {
            "@type": "Person",
            name: "Roberto Alencar",
          },
          datePublished: "2026-09-20",
          reviewBody:
            "Compramos 3 totens de piso com o kit completo para nossa rede de hamburguerias. Chegou rápido e já pronto para rodar o cardápio digital.",
          reviewRating: {
            "@type": "Rating",
            ratingValue: "5",
            bestRating: "5",
          },
        },
      ],
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "BRL",
        lowPrice: "950.00",
        highPrice: "5880.00",
        offerCount: "6",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        url: `${siteConfig.url}/monte-seu-totem`,
        seller: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
    },
    {
      "@type": "ItemList",
      "@id": `${siteConfig.url}/#modelos-list`,
      name: "Modelos de Totem de Autoatendimento",
      description: "Linha de totens e gabinetes industriais de piso, parede e balcão usinados em Router CNC.",
      numberOfItems: 3,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Totem de Autoatendimento de Piso Pedestal Pro",
          url: `${siteConfig.url}/monte-seu-totem?modelo=cabinet-floor`,
          image: `${siteConfig.url}/images/totems/floor/floor-white-1.webp`,
          description:
            "Gabinete de piso imponente e auto-sustentável para restaurantes, fast-food, self-checkout e clínicas. A partir de R$ 1.590 no PIX.",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Totem de Autoatendimento de Parede Slim",
          url: `${siteConfig.url}/monte-seu-totem?modelo=cabinet-wall`,
          image: `${siteConfig.url}/images/totems/wall/wall-white-1.webp`,
          description:
            "Gabinete compacto fixado na parede para máxima economia de espaço físico. A partir de R$ 990 no PIX.",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Totem de Autoatendimento de Balcão Expresso",
          url: `${siteConfig.url}/monte-seu-totem?modelo=cabinet-countertop`,
          image: `${siteConfig.url}/images/totems/countertop/countertop-white-1.webp`,
          description:
            "Gabinete ergonômico de balcão para atendimento rápido, recepção de clínicas, senhas e checkouts. A partir de R$ 950 no PIX.",
        },
      ],
    },
    {
      "@type": "HowTo",
      "@id": `${siteConfig.url}/#howto-montar-totem`,
      name: "Como montar seu próprio Totem de Autoatendimento economizando mais de 50%",
      description:
        "Veja como configurar e montar um Totem de Autoatendimento profissional em 4 passos simples usando o configurador Totem Pro.",
      totalTime: "PT30M",
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "BRL",
        value: "950.00",
      },
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Escolha o Modelo e a Cor do Gabinete",
          text: "Selecione entre o Gabinete de Piso, Parede ou Balcão e escolha o acabamento em MaDeFibra BP 15mm (Branco, Preto ou Dual-Tone).",
          url: `${siteConfig.url}/monte-seu-totem`,
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Informe suas Peças ou Escolha o Kit Completo",
          text: "Informe o monitor touchscreen, impressora térmica 80mm e leitor que você já possui para corte exato na Router CNC, ou selecione o Kit Completo homologado.",
          url: `${siteConfig.url}/monte-seu-totem`,
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Usinagem Computadorizada em Router CNC",
          text: "Nossa fábrica realiza o corte submilimétrico com furações VESA 75/100 e berço exato para cada periférico.",
          url: `${siteConfig.url}/como-funciona`,
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Encaixe Rápido ou Receba Montado",
          text: "Encaixe seus periféricos em menos de 30 minutos ou selecione a opção de montagem na fábrica para receber o totem pronto para ligar na tomada.",
          url: `${siteConfig.url}/como-funciona`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${siteConfig.url}/#faq-schema`,
      mainEntity: FAQ_DATA.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${siteConfig.url}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: siteConfig.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Modelos de Totem de Autoatendimento",
          item: `${siteConfig.url}/modelos`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Monte seu Totem Online",
          item: `${siteConfig.url}/monte-seu-totem`,
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preload" as="image" href="/models/cabinet-floor.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 antialiased selection:bg-[#0071e3] selection:text-white transition-colors duration-300">
        <MarketingPixels />
        <SiteTelemetryWatcher />
        <ThemeProvider>
          <CartProvider>
            <TelemetryErrorBoundary>
              {children}
              <FloatingWhatsAppButton />
            </TelemetryErrorBoundary>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
