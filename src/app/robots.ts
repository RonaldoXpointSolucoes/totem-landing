import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const disallowedPrivatePaths = [
    "/admin",
    "/admin/*",
    "/api/*",
    "/carrinho",
    "/cart",
    "/checkout",
    "/checkout/*",
    "/cliente",
    "/minha-conta",
    "/vendedor",
    "/influenciador",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/modelos",
          "/monte-seu-totem",
          "/como-funciona",
          "/diferenciais",
          "/faq",
          "/images/*",
          "/models/*",
          "/icon.svg",
          "/site.webmanifest",
          "/llms.txt",
          "/*.txt",
        ],
        disallow: disallowedPrivatePaths,
      },
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/modelos",
          "/monte-seu-totem",
          "/como-funciona",
          "/diferenciais",
          "/faq",
          "/images/*",
          "/models/*",
          "/icon.svg",
        ],
        disallow: disallowedPrivatePaths,
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/images/*", "/models/*", "/icon.svg"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/modelos", "/monte-seu-totem", "/images/*", "/models/*"],
        disallow: disallowedPrivatePaths,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
