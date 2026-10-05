import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { ThemeProvider } from "@/lib/theme/ThemeContext";
import { CartProvider } from "@/modules/cart/CartContext";
import { MarketingPixels } from "@/components/analytics/MarketingPixels";
import { FloatingWhatsAppButton } from "@/components/marketing/FloatingWhatsAppButton";
import { FAQ_DATA } from "@/config/faqData";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Totem Pro | Gabinete para Totem de Autoatendimento, Chão, Parede e Balcão",
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Fabricante industrial de Gabinete para Totem de Autoatendimento. Modelos Gabinete Totem de Chão, Totem de Parede e Totem de Balcão com usinagem Router CNC sob medida para seus monitores e impressoras. Compre direto da fábrica.",
  keywords: [
    "totem",
    "gabinete para totem",
    "gabinete para totem de autoatendimento",
    "totem de autoatendimento",
    "gabinete totem de chão",
    "gabinete totem de parede",
    "gabinete totem de balcão",
    "fabricante de totem",
    "totem sob medida",
    "quiosque autoatendimento",
    "kiosk self checkout gabinete",
    "usinagem router cnc totem",
    "gabinete mdf bp totem",
    "totem touch screen industrial",
    "totem para restaurantes",
    "totem para varejo",
    "totem interativo comercial",
    "totem pro x-point",
  ],
  authors: [{ name: "X-Point Soluções em Autoatendimento", url: siteConfig.url }],
  creator: "X-Point Soluções",
  publisher: "X-Point Soluções",
  category: "Equipamentos Comerciais e Totens",
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
    title: "Gabinete para Totem de Autoatendimento | Chão, Parede e Balcão",
    description:
      "Configure e adquira seu Gabinete de Totem de Autoatendimento sob medida. Usinagem Router CNC milimétrica para monitores touchscreen, impressoras térmicas e leitores de código de barras.",
    images: [
      {
        url: `${siteConfig.url}/images/og-totem.jpg`,
        secureUrl: `${siteConfig.url}/images/og-totem.jpg`,
        width: 1200,
        height: 630,
        alt: "Totem Pro — Gabinetes Industriais para Totens de Autoatendimento",
        type: "image/jpeg",
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
    "ICBM": "-23.55052, -46.633308",
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
      name: "X-Point Soluções em Autoatendimento",
      alternateName: "Totem Pro",
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/icon.svg`,
        width: "512",
        height: "512",
      },
      image: `${siteConfig.url}/images/og-totem.jpg`,
      description:
        "Fabricação industrial sob medida de gabinetes para totens de autoatendimento com usinagem Router CNC de alta precisão em MaDeFibra BP 15mm.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "São Paulo",
        addressRegion: "SP",
        addressCountry: "BR",
      },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+55-11-99164-9959",
        contactType: "customer service",
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
        target: `${siteConfig.url}/#modelos?q={search_term_string}`,
        "query-input": "required name=search_term_string",
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
      manufacturer: {
        "@id": `${siteConfig.url}/#organization`,
      },
      sku: "TOTEM-PRO-CABINET-2026",
      mpn: "XPT-TOTEM-PRO",
      category: "Equipamentos Comerciais > Gabinetes e Totens de Autoatendimento",
      image: `${siteConfig.url}/images/og-totem.jpg`,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "48",
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
            "Excelente acabamento no corte da Router CNC. Nossos monitores de 21.5 e impressoras térmicas couberam perfeitamente sem folgas.",
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
        lowPrice: "990.00",
        highPrice: "3490.00",
        offerCount: "3",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
    },
    {
      "@type": "ItemList",
      "@id": `${siteConfig.url}/#modelos-list`,
      name: "Modelos de Gabinete para Totem de Autoatendimento",
      description: "Linha de gabinetes industriais de chão, parede e balcão usinados em Router CNC.",
      numberOfItems: 3,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Gabinete Totem de Chão Pedestal Pro",
          url: `${siteConfig.url}/#modelos`,
          image: `${siteConfig.url}/models/cabinet-floor.svg`,
          description: "Gabinete de chão auto-sustentável para grandes fluxos, self-checkout e controle de acesso.",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Gabinete Totem de Balcão Expresso",
          url: `${siteConfig.url}/#modelos`,
          image: `${siteConfig.url}/models/cabinet-countertop.svg`,
          description: "Gabinete compacto para balcão, caixas e checkout expresso.",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Gabinete Totem de Parede Slim",
          url: `${siteConfig.url}/#modelos`,
          image: `${siteConfig.url}/models/cabinet-wall.svg`,
          description: "Gabinete ultrafino fixado na parede para economia de espaço de circulação.",
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
          name: "Gabinete para Totem de Autoatendimento",
          item: `${siteConfig.url}/#modelos`,
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
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://analytics.tiktok.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgJsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#090a0f] text-[#1d1d1f] dark:text-slate-100 antialiased selection:bg-[#0071e3] selection:text-white transition-colors duration-300">
        <MarketingPixels />
        <ThemeProvider>
          <CartProvider>
            {children}
            <FloatingWhatsAppButton />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
