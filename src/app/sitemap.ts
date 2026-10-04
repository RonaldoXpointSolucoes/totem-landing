import { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
      images: [
        `${baseUrl}/images/og-totem.jpg`,
        `${baseUrl}/models/cabinet-floor.svg`,
        `${baseUrl}/models/cabinet-wall.svg`,
        `${baseUrl}/models/cabinet-countertop.svg`,
      ],
    },
    {
      url: `${baseUrl}/#modelos`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
      images: [
        `${baseUrl}/models/cabinet-floor.svg`,
        `${baseUrl}/models/cabinet-wall.svg`,
        `${baseUrl}/models/cabinet-countertop.svg`,
      ],
    },
    {
      url: `${baseUrl}/#como-funciona`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/#diferenciais`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/#faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
