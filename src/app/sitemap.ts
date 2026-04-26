import type { MetadataRoute } from "next";

const BASE = "https://www.event-clocks.com";
const lastMod = new Date("2026-04-26");

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
      url: `${BASE}/date-difference`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/week-number`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/holiday-long-weekend-planner`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/unix-time`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/smpte-timecode`,
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
      url: `${BASE}/today`,
      lastModified: lastMod,
      changeFrequency: "daily",
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
