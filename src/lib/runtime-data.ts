import "server-only";

import { sql } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";
import { db } from "@/lib/db/client";
import { newsItems, projects, siteSettings, storeCategories, stores } from "@/lib/db/schema";
import { camnangData } from "@/lib/data";
import { getLocalDemoSiteData, isLocalDemoMode } from "@/lib/local-demo-store";
import type { NewsItem, Project, SiteData, SiteHomeSettings, Store, StoreCategory } from "@/lib/site-types";
import { repairTextTree } from "@/lib/text-encoding";

export async function getSiteData(): Promise<SiteData> {
  noStore();

  if (isLocalDemoMode()) {
    return getLocalDemoSiteData();
  }

  try {
    await ensureProjectColumns();
    const [projectRows, categoryRows, storeRows] = await Promise.all([
      db.select().from(projects),
      db.select().from(storeCategories),
      db.select().from(stores),
    ]);
    let homeSettings = normalizeHomeSettings(camnangData.homeSettings);
    const settingRows = await db
      .select()
      .from(siteSettings)
      .catch(() => []);
    const homeSettingRow = settingRows.find((row) => row.key === "home");
    if (homeSettingRow) homeSettings = normalizeHomeSettings(homeSettingRow.value);
    let hasNewsTable = true;
    const newsRows = await db
      .select()
      .from(newsItems)
      .catch(() => {
        hasNewsTable = false;
        return [];
      });

    return repairTextTree({
      fallbackImage: camnangData.fallbackImage,
      homeSettings,
      regionMeta: camnangData.regionMeta,
      newsItems: hasNewsTable ? newsRows.map(toNewsItemShape) : camnangData.newsItems,
      projects: projectRows.map(toProjectShape),
      storeCategories: categoryRows.map(toCategoryShape),
      stores: storeRows.map(toStoreShape),
    });
  } catch {
    return repairTextTree(normalizeSiteData(camnangData));
  }
}

function toNewsItemShape(row: typeof newsItems.$inferSelect): NewsItem {
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId,
    region: row.region,
    date: row.date,
    category: row.category,
    hashtags: row.hashtags ?? [],
    image: row.image,
    excerpt: row.excerpt,
    content: row.content ?? [],
    contentHtml: row.contentHtml ?? undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
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
    address: row.address ?? undefined,
    mapEmbedUrl: row.mapEmbedUrl ?? undefined,
    overviewItems: normalizeProjectOverviewItems(row.overviewItems),
    highlights: row.highlights ?? [],
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
  };
}

async function ensureProjectColumns() {
  await db.execute(sql`
    ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS address text,
      ADD COLUMN IF NOT EXISTS map_embed_url text,
      ADD COLUMN IF NOT EXISTS overview_items jsonb NOT NULL DEFAULT '[]'::jsonb
  `);
}

function normalizeProjectOverviewItems(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const source = item as { label?: unknown; value?: unknown };
          const label = String(source.label ?? "").trim();
          const text = String(source.value ?? "").trim();
          return label && text ? { label, value: text } : null;
        })
        .filter((item): item is { label: string; value: string } => Boolean(item))
    : [];
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
  const source = repairTextTree(value as Partial<SiteData>);
  return {
    fallbackImage: source.fallbackImage || camnangData.fallbackImage,
    homeSettings: normalizeHomeSettings(source.homeSettings || camnangData.homeSettings),
    regionMeta: source.regionMeta || camnangData.regionMeta,
    projects: Array.isArray(source.projects) ? source.projects : [],
    storeCategories: Array.isArray(source.storeCategories) ? source.storeCategories : [],
    stores: Array.isArray(source.stores) ? source.stores : [],
    newsItems: Array.isArray(source.newsItems) ? source.newsItems : [],
  };
}

function normalizeHomeSettings(value: unknown): SiteHomeSettings {
  const source = (value && typeof value === "object" ? value : {}) as Partial<SiteHomeSettings>;
  return {
    logo: String(source.logo || "").trim(),
    headerLogo: String(source.headerLogo || source.logo || "").trim(),
    footerLogo: String(source.footerLogo || source.logo || "").trim(),
    metaTitle: String(source.metaTitle || "").trim(),
    metaDescription: String(source.metaDescription || "").trim(),
    headBannerImage: String(source.headBannerImage || "").trim(),
  };
}
