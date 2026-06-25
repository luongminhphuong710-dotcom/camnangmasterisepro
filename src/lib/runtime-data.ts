import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/lib/db/client";
import { projects, storeCategories, stores } from "@/lib/db/schema";
import { camnangData } from "@/lib/data";
import { getLocalDemoSiteData, isLocalDemoMode } from "@/lib/local-demo-store";
import type { Project, SiteData, Store, StoreCategory } from "@/lib/site-types";

export async function getSiteData(): Promise<SiteData> {
  noStore();

  if (isLocalDemoMode()) {
    return getLocalDemoSiteData();
  }

  try {
    const [projectRows, categoryRows, storeRows] = await Promise.all([
      db.select().from(projects),
      db.select().from(storeCategories),
      db.select().from(stores),
    ]);

    return {
      fallbackImage: camnangData.fallbackImage,
      regionMeta: camnangData.regionMeta,
      newsItems: camnangData.newsItems,
      projects: projectRows.map(toProjectShape),
      storeCategories: categoryRows.map(toCategoryShape),
      stores: storeRows.map(toStoreShape),
    };
  } catch {
    return normalizeSiteData(camnangData);
  }
}

function toProjectShape(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    city: row.city,
    location: row.location,
    segment: row.segment,
    status: row.status,
    image: row.image,
    source: row.source,
    summary: row.summary,
    highlights: row.highlights ?? [],
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
}

function toCategoryShape(row: typeof storeCategories.$inferSelect): StoreCategory {
  return {
    id: row.id,
    label: row.label,
    icon: row.icon ?? undefined,
  };
}

function toStoreShape(row: typeof stores.$inferSelect): Store {
  return {
    id: row.id,
    name: row.name,
    projectId: row.projectId,
    category: row.category,
    image: row.image,
    images: row.images ?? undefined,
    floor: row.floor,
    hours: row.hours,
    phone: row.phone,
    rating: row.rating ?? undefined,
    reviewCount: row.reviewCount ?? undefined,
    note: row.note,
    address: row.address ?? undefined,
    mapEmbedUrl: row.mapEmbedUrl ?? undefined,
    detailContent: row.detailContent ?? undefined,
    vouchers: row.vouchers ?? undefined,
    reviews: row.reviews ?? undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
}

function normalizeSiteData(value: unknown): SiteData {
  const source = value as Partial<SiteData>;
  return {
    fallbackImage: source.fallbackImage || camnangData.fallbackImage,
    regionMeta: source.regionMeta || camnangData.regionMeta,
    projects: Array.isArray(source.projects) ? source.projects : [],
    storeCategories: Array.isArray(source.storeCategories) ? source.storeCategories : [],
    stores: Array.isArray(source.stores) ? source.stores : [],
    newsItems: Array.isArray(source.newsItems) ? source.newsItems : [],
  };
}
