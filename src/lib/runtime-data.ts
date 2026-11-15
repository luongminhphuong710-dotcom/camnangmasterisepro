import "server-only";

import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/client";
import { newsItems, projects, siteSettings, storeCategories, stores } from "@/lib/db/schema";
import newsQueue from "@/content/news-queue.json";
import { camnangData } from "@/lib/data";
import { getLocalDemoSiteData, isLocalDemoMode } from "@/lib/local-demo-store";
import type { NewsItem, Project, SiteData, SiteHomeSettings, Store, StoreCategory } from "@/lib/site-types";
import { repairTextTree } from "@/lib/text-encoding";

export async function getSiteData(): Promise<SiteData> {
  if (isLocalDemoMode()) {
    return getLocalDemoSiteData();
  }

  return getDatabaseSiteDataCached();
}

const getDatabaseSiteDataCached = unstable_cache(getDatabaseSiteData, ["site-data-v3"], {
  revalidate: 300,
  tags: ["site-data"],
});

let projectColumnsPromise: Promise<void> | null = null;

async function getDatabaseSiteData(): Promise<SiteData> {
  try {
    await ensureProjectColumnsOnce();
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

function ensureProjectColumnsOnce() {
  projectColumnsPromise ??= ensureProjectColumns();
  return projectColumnsPromise;
}

function toNewsItemShape(row: typeof newsItems.$inferSelect): NewsItem {
  return {
    id: row.id,
    title: row.title,
    projectId: row.projectId.trim(),
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
    id: row.id.trim(),
    name: row.name,
    region: row.region,
    city: row.city.trim(),
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
  await clearOldStorePhoneOnce();
  await importQueuedNews();
}

// Articles published by the content automation are appended to
// src/content/news-queue.json. Each one is copied into news_items once; a marker
// row in site_settings records the import, so an article later edited or deleted
// in the CMS is never overwritten or brought back.
const NEWS_IMPORT_PREFIX = "news-import:";

type QueuedNews = {
  id: string;
  title: string;
  projectId?: string;
  region?: string;
  date: string;
  category?: string;
  hashtags?: string[];
  image: string;
  // Photo credit for the cover image (shown nowhere yet; kept for the record).
  imageCredit?: string;
  // Set when the cover of an already published article is swapped: the stored
  // image is replaced only while it still equals this URL, so a cover changed
  // later in the CMS is never overwritten.
  replacesImage?: string;
  excerpt: string;
  contentHtml: string;
};

async function importQueuedNews() {
  const queue = (newsQueue as QueuedNews[]).filter((item) => item?.id && item.title && item.contentHtml);
  if (queue.length === 0) return;
  try {
    const result = await db.execute(sql`SELECT key FROM site_settings WHERE key LIKE ${`${NEWS_IMPORT_PREFIX}%`}`);
    const imported = new Set(result.rows.map((row) => String((row as { key: unknown }).key)));
    for (const item of queue) {
      const markerKey = `${NEWS_IMPORT_PREFIX}${item.id}`;
      if (imported.has(markerKey)) {
        if (item.replacesImage && item.replacesImage !== item.image) {
          await db.execute(sql`
            UPDATE news_items SET image = ${item.image}, updated_at = ${new Date().toISOString()}
            WHERE id = ${item.id} AND image = ${item.replacesImage}
          `);
        }
        continue;
      }
      const now = new Date().toISOString();
      await db
        .insert(newsItems)
        .values({
          id: item.id,
          title: item.title,
          projectId: item.projectId || "",
          region: item.region || "",
          date: item.date,
          category: item.category || "Tin tức",
          hashtags: item.hashtags || [],
          image: item.image,
          excerpt: item.excerpt,
          content: [],
          contentHtml: item.contentHtml,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      await db
        .insert(siteSettings)
        .values({ key: markerKey, value: { importedAt: now }, updatedAt: now })
        .onConflictDoNothing();
    }
  } catch (error) {
    console.error("importQueuedNews failed", error);
  }
}

// One-time cleanup: remove the old default contact number 0988 458 783 from every
// store. A marker row in site_settings records that it ran, so a number set later
// in the CMS is never touched.
const CLEAR_OLD_STORE_PHONE_KEY = "migration:clear-store-phone-0988458783";

async function clearOldStorePhoneOnce() {
  try {
    const done = await db.execute(sql`SELECT 1 FROM site_settings WHERE key = ${CLEAR_OLD_STORE_PHONE_KEY} LIMIT 1`);
    if (done.rows.length > 0) return;
    await db.execute(sql`
      UPDATE stores SET phone = ''
      WHERE regexp_replace(phone, '[^0-9]', '', 'g') IN ('0988458783', '988458783', '84988458783')
    `);
    const now = new Date().toISOString();
    await db
      .insert(siteSettings)
      .values({ key: CLEAR_OLD_STORE_PHONE_KEY, value: { ranAt: now }, updatedAt: now })
      .onConflictDoNothing();
  } catch (error) {
    console.error("clearOldStorePhoneOnce failed", error);
  }
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
    id: row.id.trim(),
    label: row.label,
    icon: row.icon ?? undefined,
  };
}

function toStoreShape(row: typeof stores.$inferSelect): Store {
  return {
    id: row.id,
    name: row.name,
    projectId: row.projectId.trim(),
    category: row.category.trim(),
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
    communityUrl: String(source.communityUrl || "").trim(),
    facebookUrl: String(source.facebookUrl || "").trim(),
    contactAddress: String(source.contactAddress || "").trim(),
    contactPhone: String(source.contactPhone || "").trim(),
  };
}
