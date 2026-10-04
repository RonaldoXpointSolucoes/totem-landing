import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/images/*",
          "/models/*",
          "/icon.svg",
          "/site.webmanifest",
          "/*.txt",
        ],
        disallow: ["/admin", "/admin/*", "/api/*"],
      },
      {
        userAgent: "Googlebot",
        allow: [
          "/",
          "/images/*",
          "/models/*",
          "/icon.svg",
        ],
        disallow: ["/admin", "/admin/*", "/api/*"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/images/*", "/models/*", "/icon.svg"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/images/*", "/models/*"],
        disallow: ["/admin", "/admin/*", "/api/*"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
