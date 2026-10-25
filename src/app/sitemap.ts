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
        `${baseUrl}/images/totems/floor/floor-white-1.webp`,
        `${baseUrl}/images/totems/floor/floor-black-31.webp`,
        `${baseUrl}/images/totems/wall/wall-white-1.webp`,
        `${baseUrl}/images/totems/wall/wall-black-18.webp`,
        `${baseUrl}/images/totems/countertop/countertop-white-1.webp`,
        `${baseUrl}/images/totems/countertop/countertop-black-13.webp`,
        `${baseUrl}/images/totems/led/led-white-1.webp`,
      ],
    },
    {
      url: `${baseUrl}/monte-seu-totem`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
      images: [
        `${baseUrl}/images/totems/floor/floor-white-1.webp`,
        `${baseUrl}/images/totems/wall/wall-white-1.webp`,
        `${baseUrl}/images/totems/countertop/countertop-white-1.webp`,
      ],
    },
    {
      url: `${baseUrl}/modelos`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [
        `${baseUrl}/images/totems/floor/floor-white-1.webp`,
        `${baseUrl}/images/totems/floor/floor-black-31.webp`,
        `${baseUrl}/images/totems/wall/wall-white-1.webp`,
        `${baseUrl}/images/totems/wall/wall-black-18.webp`,
        `${baseUrl}/images/totems/countertop/countertop-white-1.webp`,
        `${baseUrl}/images/totems/countertop/countertop-black-13.webp`,
      ],
    },
    {
      url: `${baseUrl}/como-funciona`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.88,
      images: [`${baseUrl}/images/totems/wall/wall-white-1.webp`],
    },
    {
      url: `${baseUrl}/diferenciais`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
      images: [`${baseUrl}/images/totems/floor/floor-black-31.webp`],
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];
}
