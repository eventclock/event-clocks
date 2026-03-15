import type { MetadataRoute } from "next";

const BASE = "https://www.event-clocks.com";
const lastMod = new Date("2026-03-14");

export default function sitemap(): MetadataRoute.Sitemap {
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
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/meeting-overlap`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/business-days`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/time-since`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/countdown-notes`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/countdown-tasks`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },

    {
      url: `${BASE}/cruise`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE}/wedding-plan`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE}/tax-document-checklist`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.7,
    },

    {
      url: `${BASE}/about`,
      lastModified: lastMod,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${BASE}/contact`,
      lastModified: lastMod,
      changeFrequency: "yearly",
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
  ];
}