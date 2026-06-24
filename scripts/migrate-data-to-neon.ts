import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { camnangData } from "../src/lib/data";
import { cmsUsers, projects, storeCategories, stores } from "../src/lib/db/schema";

const UNASSIGNED_CATEGORY_ID = "unassigned";
const UNASSIGNED_CATEGORY_LABEL = "Chưa xác định";

function clone<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadEnvLocal() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(process.cwd(), filename);
    if (!existsSync(filePath)) continue;
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const [, key, rawValue = ""] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  loadEnvLocal();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Thiếu DATABASE_URL. Hãy đặt biến này trong .env.local trước khi chạy script.");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const categoriesToInsert = clone<(typeof storeCategories.$inferInsert)[]>(camnangData.storeCategories);
  if (!categoriesToInsert.some((category) => category.id === UNASSIGNED_CATEGORY_ID)) {
    categoriesToInsert.push({ id: UNASSIGNED_CATEGORY_ID, label: UNASSIGNED_CATEGORY_LABEL });
  }

  if (categoriesToInsert.length) {
    await db.insert(storeCategories).values(categoriesToInsert).onConflictDoNothing();
  }
  console.log(`storeCategories: inserted ${categoriesToInsert.length} rows (existing rows skipped).`);

  const projectsToInsert = clone<(typeof projects.$inferInsert)[]>(camnangData.projects);
  if (projectsToInsert.length) {
    await db.insert(projects).values(projectsToInsert).onConflictDoNothing();
  }
  console.log(`projects: inserted ${projectsToInsert.length} rows (existing rows skipped).`);

  const storesToInsert = clone<(typeof stores.$inferInsert)[]>(camnangData.stores);
  if (storesToInsert.length) {
    await db.insert(stores).values(storesToInsert).onConflictDoNothing();
  }
  console.log(`stores: inserted ${storesToInsert.length} rows (existing rows skipped).`);

  const usersFile = path.join(process.cwd(), ".cms-users.json");
  let userCount = 0;
  try {
    const parsed = JSON.parse(readFileSync(usersFile, "utf8")) as {
      users?: Array<{ username: string; passwordHash: string; role: string; lastLoginAt?: string }>;
    };
    const users = Array.isArray(parsed.users) ? parsed.users : [];
    if (users.length) {
      await db.insert(cmsUsers).values(users).onConflictDoNothing();
    }
    userCount = users.length;
  } catch {
    console.warn(`Không đọc được ${usersFile} — bỏ qua import tài khoản CMS.`);
  }
  console.log(`cmsUsers: inserted ${userCount} rows (existing rows skipped).`);

  console.log("Hoàn tất migrate dữ liệu vào Neon.");
}

void main();
