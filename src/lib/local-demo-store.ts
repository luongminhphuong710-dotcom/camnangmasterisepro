import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { camnangData } from "@/lib/data";
import type { SiteData } from "@/lib/site-types";

const LOCAL_DEMO_DIR = path.join(process.cwd(), ".local-demo");
const LOCAL_DEMO_DATA_FILE = path.join(LOCAL_DEMO_DIR, "site-data.json");
const LOCAL_DEMO_USERS_FILE = path.join(LOCAL_DEMO_DIR, "cms-users.json");
const LEGACY_USERS_FILE = path.join(process.cwd(), ".cms-users.json");
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "local-demo-uploads");

export type LocalDemoUser = {
  username: string;
  passwordHash: string;
  role: string;
  lastLoginAt?: string;
};

export function isLocalDemoMode() {
  if (process.env.CMS_LOCAL_DEMO === "true") return true;
  return !process.env.DATABASE_URL && process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1";
}

export async function getLocalDemoSiteData(): Promise<SiteData> {
  ensureLocalDemoDir();
  if (!existsSync(LOCAL_DEMO_DATA_FILE)) {
    writeJson(LOCAL_DEMO_DATA_FILE, camnangData);
  }

  try {
    return normalizeSiteData(JSON.parse(readFileSync(LOCAL_DEMO_DATA_FILE, "utf8")));
  } catch {
    writeJson(LOCAL_DEMO_DATA_FILE, camnangData);
    return normalizeSiteData(camnangData);
  }
}

export async function saveLocalDemoSiteData(data: Partial<SiteData>) {
  ensureLocalDemoDir();
  const current = await getLocalDemoSiteData();
  writeJson(LOCAL_DEMO_DATA_FILE, normalizeSiteData({ ...current, ...data }));
}

export async function loadLocalDemoUsers(getBootstrapUsers: () => LocalDemoUser[]): Promise<LocalDemoUser[]> {
  ensureLocalDemoDir();

  if (existsSync(LOCAL_DEMO_USERS_FILE)) {
    const parsed = readUsersFile(LOCAL_DEMO_USERS_FILE);
    if (parsed.length) return parsed;
  }

  const legacyUsers = readUsersFile(LEGACY_USERS_FILE);
  const users = legacyUsers.length ? legacyUsers : getBootstrapUsers();
  writeJson(LOCAL_DEMO_USERS_FILE, { users });
  return users;
}

export async function saveLocalDemoUsers(users: LocalDemoUser[]) {
  ensureLocalDemoDir();
  writeJson(LOCAL_DEMO_USERS_FILE, { users });
}

export async function saveLocalDemoUpload(buffer: Buffer, filenameHint: string, originalName: string) {
  mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  const extension = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".jpg";
  const filename = `${filenameHint}${extension}`;
  writeFileSync(path.join(LOCAL_UPLOAD_DIR, filename), buffer);
  return `/local-demo-uploads/${filename}`;
}

function ensureLocalDemoDir() {
  mkdirSync(LOCAL_DEMO_DIR, { recursive: true });
}

function readUsersFile(filePath: string): LocalDemoUser[] {
  if (!existsSync(filePath)) return [];

  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as { users?: LocalDemoUser[] };
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch {
    return [];
  }
}

function normalizeSiteData(value: Partial<SiteData>): SiteData {
  return {
    fallbackImage: value.fallbackImage || camnangData.fallbackImage,
    regionMeta: value.regionMeta || camnangData.regionMeta,
    projects: Array.isArray(value.projects) ? value.projects : [],
    storeCategories: Array.isArray(value.storeCategories) ? value.storeCategories : [],
    stores: Array.isArray(value.stores) ? value.stores : [],
    newsItems: Array.isArray(value.newsItems) ? value.newsItems : [],
  };
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
