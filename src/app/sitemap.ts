import type { MetadataRoute } from "next";

const BASE = "https://www.event-clocks.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastMod = new Date();

  return [
    {
      url: `${BASE}/`,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/timezone`,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/meeting-overlap`,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.9,
    },
     {
      url: `${BASE}/business-days`,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/cruise`,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/wedding-plan`,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/about`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: lastMod,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: lastMod,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/contact`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
