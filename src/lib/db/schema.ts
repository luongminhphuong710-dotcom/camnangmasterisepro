import { integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

export const storeCategories = pgTable("store_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  icon: text("icon"),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  city: text("city").notNull(),
  location: text("location").notNull(),
  segment: text("segment").notNull(),
  status: text("status").notNull(),
  image: text("image").notNull(),
  source: text("source").notNull(),
  summary: text("summary").notNull(),
  address: text("address"),
  mapEmbedUrl: text("map_embed_url"),
  overviewItems: jsonb("overview_items").$type<Array<{ label: string; value: string }>>().notNull().default([]),
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

type StoreVoucher = { code: string; title?: string; description: string; expires: string; redeemCount?: number };
type StoreReviewImage = { id: string; name: string; url: string };
type StoreReview = { name: string; rating: number; comment: string; isAnonymous?: boolean; images?: StoreReviewImage[] };

export const stores = pgTable("stores", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  projectId: text("project_id").notNull(),
  category: text("category").notNull(),
  image: text("image").notNull(),
  images: jsonb("images").$type<string[]>(),
  floor: text("floor").notNull(),
  hours: text("hours").notNull(),
  phone: text("phone").notNull(),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  note: text("note").notNull(),
  address: text("address"),
  mapEmbedUrl: text("map_embed_url"),
  detailContent: text("detail_content"),
  vouchers: jsonb("vouchers").$type<StoreVoucher[]>(),
  reviews: jsonb("reviews").$type<StoreReview[]>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

export const cmsUsers = pgTable("cms_users", {
  username: text("username").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "string" }),
});

export const newsItems = pgTable("news_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  projectId: text("project_id").notNull(),
  region: text("region").notNull(),
  date: text("date").notNull(),
  category: text("category").notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().notNull().default([]),
  image: text("image").notNull(),
  excerpt: text("excerpt").notNull(),
  content: jsonb("content").$type<string[]>().notNull().default([]),
  contentHtml: text("content_html"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});
