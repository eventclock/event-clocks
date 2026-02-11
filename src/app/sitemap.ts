import type { MetadataRoute } from "next";

const BASE = "https://www.event-clocks.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${BASE}/`, lastModified: now },
    { url: `${BASE}/timezone`, lastModified: now },
    { url: `${BASE}/about`, lastModified: now },
    { url: `${BASE}/privacy`, lastModified: now },
    { url: `${BASE}/terms`, lastModified: now },
    { url: `${BASE}/contact`, lastModified: now },
  ];
}
