import type { MetadataRoute } from "next";
import { getAllCitySlugs } from "@/lib/data";
import { getAllNewsletters } from "@/lib/newsletter-data";

const DEFAULT_BASE = "https://burgerprice.com";

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/cities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/newsletter`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  let cityRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getAllCitySlugs();
    cityRoutes = slugs.map((slug) => ({
      url: `${base}/cities/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Keep static routes if DB is briefly unavailable at build/request time.
  }

  let newsletterRoutes: MetadataRoute.Sitemap = [];
  try {
    const editions = await getAllNewsletters();
    newsletterRoutes = editions.map((edition) => ({
      url: `${base}/newsletter/${edition.week_of}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch {
    // Newsletter archive is optional for discovery.
  }

  return [...staticRoutes, ...cityRoutes, ...newsletterRoutes];
}