import type { MetadataRoute } from "next";
import { getSiteData } from "@/lib/runtime-data";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSiteData();
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/du-an"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/gian-hang"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/tin-tuc"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/near-me"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const projectRoutes = data.projects.map((project) => ({
    url: absoluteUrl(`/du-an/${project.id}`),
    lastModified: project.updatedAt || project.createdAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const storeRoutes = data.stores.map((store) => ({
    url: absoluteUrl(`/gian-hang/${store.id}`),
    lastModified: store.updatedAt || store.createdAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const newsRoutes = data.newsItems.map((item) => ({
    url: absoluteUrl(`/tin-tuc/${item.id}`),
    lastModified: item.updatedAt || item.createdAt || now,
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  return [...staticRoutes, ...projectRoutes, ...storeRoutes, ...newsRoutes];
}

