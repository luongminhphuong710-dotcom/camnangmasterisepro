import crypto from "node:crypto";
import { eq, getTableColumns, notInArray, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { uploadCmsImage } from "@/lib/cloudinary";
import { db } from "@/lib/db/client";
import { cmsUsers, newsItems, projects, storeCategories, stores } from "@/lib/db/schema";
import {
  isLocalDemoMode,
  loadLocalDemoUsers,
  saveLocalDemoSiteData,
  saveLocalDemoUpload,
  saveLocalDemoUsers,
} from "@/lib/local-demo-store";
import { getSiteData } from "@/lib/runtime-data";

export const runtime = "nodejs";

const SESSION_TTL_SECONDS = 8 * 60 * 60;

type Role = "super_admin" | "admin" | "employee";

type CmsConfig = {
  adminUser: string;
  adminPassword: string;
  usersJson: string;
  sessionSecret: string;
  databaseUrl: string;
};

type CmsUser = {
  username: string;
  passwordHash: string;
  role: Role;
  lastLoginAt?: string;
};

type PublicCmsUser = {
  username: string;
  role: Role;
  lastLoginAt?: string;
};

type SessionPayload = {
  sub: string;
  role: Role;
  exp: number;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  if (action !== "login" && action !== "upload-image") {
    return json({ message: "Endpoint CMS không tồn tại." }, 404);
  }

  try {
    if (action === "upload-image") {
      return await handleImageUpload(request);
    }
    return await handleLogin(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  if (action !== "data" && action !== "permissions") {
    return json({ message: "Endpoint CMS không tồn tại." }, 404);
  }

  try {
    const session = requireSession(request);
    if (action === "permissions") {
      const users = publicUsers(await loadUsers());
      return json({ users, currentUser: session.sub, currentRole: session.role });
    }

    const data = await getSiteData();
    return json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  if (action !== "data" && action !== "user") {
    return json({ message: "Endpoint CMS không tồn tại." }, 404);
  }

  try {
    const session = requireSession(request);
    if (action === "user") {
      return await handleUserMutation(request, session);
    }

    requireRole(session.role, ["super_admin", "admin"]);

    const body = await request.json().catch(() => ({}));
    const data = body.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw statusError("Dữ liệu CMS không hợp lệ.", 400);
    }

    await saveSiteData(data);
    return json({ message: "Đã lưu dữ liệu." });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (request.nextUrl.searchParams.get("action") !== "user") {
    return json({ message: "Endpoint CMS không tồn tại." }, 404);
  }

  try {
    const session = requireSession(request);
    requireRole(session.role, ["super_admin", "admin"]);
    const username = String(request.nextUrl.searchParams.get("username") || "");
    if (!username) throw statusError("Thiếu tài khoản cần xóa.", 400);

    const users = await loadUsers();
    const target = users.find((user) => user.username === username);
    if (!target) throw statusError("Không tìm thấy tài khoản.", 404);
    if (target.role === "super_admin") throw statusError("Không thể xóa super admin mặc định.", 400);

    await deleteUser(username);
    const nextUsers = await loadUsers();
    return json({ users: publicUsers(nextUsers), message: "Đã xóa tài khoản." });
  } catch (error) {
    return errorResponse(error);
  }
}

async function saveSiteData(data: { stores?: unknown; projects?: unknown; storeCategories?: unknown; newsItems?: unknown }) {
  const incomingStores = Array.isArray(data.stores) ? data.stores : [];
  const incomingProjects = Array.isArray(data.projects) ? data.projects : [];
  const incomingCategories = Array.isArray(data.storeCategories) ? data.storeCategories : [];
  const incomingNewsItems = Array.isArray(data.newsItems) ? data.newsItems : [];

  if (isLocalDemoMode()) {
    await saveLocalDemoSiteData({
      stores: incomingStores,
      projects: incomingProjects,
      storeCategories: incomingCategories,
      newsItems: incomingNewsItems,
    });
    return;
  }

  await ensureNewsItemsTable();

  if (incomingStores.length) {
    await db
      .insert(stores)
      .values(incomingStores)
      .onConflictDoUpdate({ target: stores.id, set: buildConflictUpdateSet(stores) });
    await db.delete(stores).where(notInArray(stores.id, incomingStores.map((store: { id: string }) => store.id)));
  } else {
    await db.delete(stores);
  }

  if (incomingProjects.length) {
    await db
      .insert(projects)
      .values(incomingProjects)
      .onConflictDoUpdate({ target: projects.id, set: buildConflictUpdateSet(projects) });
    await db.delete(projects).where(notInArray(projects.id, incomingProjects.map((project: { id: string }) => project.id)));
  } else {
    await db.delete(projects);
  }

  if (incomingCategories.length) {
    await db
      .insert(storeCategories)
      .values(incomingCategories)
      .onConflictDoUpdate({ target: storeCategories.id, set: buildConflictUpdateSet(storeCategories) });
    await db
      .delete(storeCategories)
      .where(notInArray(storeCategories.id, incomingCategories.map((category: { id: string }) => category.id)));
  } else {
    await db.delete(storeCategories);
  }

  if (incomingNewsItems.length) {
    await db
      .insert(newsItems)
      .values(incomingNewsItems)
      .onConflictDoUpdate({ target: newsItems.id, set: buildConflictUpdateSet(newsItems) });
    await db.delete(newsItems).where(notInArray(newsItems.id, incomingNewsItems.map((item: { id: string }) => item.id)));
  } else {
    await db.delete(newsItems);
  }
}

async function ensureNewsItemsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS news_items (
      id text PRIMARY KEY,
      title text NOT NULL,
      project_id text NOT NULL,
      region text NOT NULL,
      date text NOT NULL,
      category text NOT NULL,
      hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
      image text NOT NULL,
      excerpt text NOT NULL,
      content jsonb NOT NULL DEFAULT '[]'::jsonb,
      content_html text,
      created_at timestamp with time zone,
      updated_at timestamp with time zone
    )
  `);
}

function buildConflictUpdateSet(table: Parameters<typeof getTableColumns>[0]) {
  const columns = getTableColumns(table);
  const set: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(columns)) {
    if (key === "id") continue;
    set[key] = sql.raw(`excluded.${column.name}`);
  }
  return set;
}

async function handleLogin(request: NextRequest) {
  const config = getConfig();
  ensureConfigured(config, ["sessionSecret"]);
  const users = await loadUsers();
  if (!users.length) {
    throw statusError("Thiếu cấu hình tài khoản CMS.", 500);
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");
  const user = users.find((candidate) => safeEqual(username, candidate.username) && verifyPassword(password, candidate.passwordHash));

  if (!user) {
    throw statusError("Tên đăng nhập hoặc mật khẩu không đúng.", 401);
  }

  await updateUser(user.username, { lastLoginAt: new Date().toISOString() });

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = createToken({ sub: user.username, role: user.role, exp: expiresAt }, config.sessionSecret);
  return json({ token, user: user.username, role: user.role, expiresAt });
}

async function handleUserMutation(request: NextRequest, session: SessionPayload) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "create" ? "create" : "update";
  const originalUsername = String(body.originalUsername || body.username || "").trim();
  const username = String(body.username || "").trim();
  const role = normalizeRole(body.role);
  const password = String(body.password || "");
  const isSelfUpdate = mode === "update" && originalUsername === session.sub;
  const canManageUsers = session.role === "super_admin" || session.role === "admin";

  if (!canManageUsers && !isSelfUpdate) {
    throw statusError("Bạn chỉ có thể tự đổi mật khẩu cho tài khoản của mình.", 403);
  }
  if (!username) throw statusError("Tên đăng nhập không được để trống.", 400);
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    throw statusError("Tên đăng nhập chỉ dùng chữ, số, dấu chấm, gạch ngang hoặc gạch dưới, từ 3-32 ký tự.", 400);
  }

  const users = await loadUsers();

  if (mode === "create") {
    requireRole(session.role, ["super_admin", "admin"]);
    if (role === "super_admin") throw statusError("Super admin mặc định chỉ có một tài khoản.", 400);
    if (users.some((user) => user.username === username)) throw statusError("Tên đăng nhập đã tồn tại.", 400);
    const temporaryPassword = generateTemporaryPassword();
    await createUser({ username, role, passwordHash: hashPassword(temporaryPassword) });
    const nextUsers = await loadUsers();
    return json({ users: publicUsers(nextUsers), temporaryPassword, message: "Đã tạo tài khoản với mật khẩu tạm." });
  }

  const target = users.find((user) => user.username === originalUsername);
  if (!target) throw statusError("Không tìm thấy tài khoản.", 404);

  const updates: { username?: string; role?: Role; passwordHash?: string } = {};
  if (canManageUsers && target.role !== "super_admin") {
    if (username !== originalUsername && users.some((user) => user.username !== originalUsername && user.username === username)) {
      throw statusError("Tên đăng nhập đã tồn tại.", 400);
    }
    updates.username = username;
    updates.role = role === "super_admin" ? target.role : role;
  }
  if (password) {
    updates.passwordHash = hashPassword(password);
  }
  if (!password && !canManageUsers) {
    throw statusError("Bạn cần nhập mật khẩu mới.", 400);
  }

  if (Object.keys(updates).length) {
    await updateUser(originalUsername, updates);
  }
  const nextUsers = await loadUsers();
  return json({ users: publicUsers(nextUsers), message: "Đã cập nhật tài khoản." });
}

async function handleImageUpload(request: NextRequest) {
  const session = requireSession(request);
  requireRole(session.role, ["super_admin", "admin"]);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw statusError("Bạn cần chọn file ảnh để upload.", 400);
  }

  if (!file.type.startsWith("image/")) {
    throw statusError("File upload phải là ảnh.", 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    throw statusError("Ảnh upload tối đa 5MB.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filenameHint = `${Date.now()}-${slugifyFileName(file.name)}`;

  if (isLocalDemoMode()) {
    const url = await saveLocalDemoUpload(buffer, filenameHint, file.name);
    return json({ url });
  }

  try {
    const url = await uploadCmsImage(buffer, filenameHint);
    return json({ url });
  } catch {
    throw statusError("Không thể tải ảnh lên. Vui lòng thử file JPG, PNG hoặc WebP hợp lệ.", 400);
  }
}

function requireSession(request: NextRequest) {
  const config = getConfig();
  ensureConfigured(config, ["sessionSecret"]);
  const token = getBearerToken(request);
  const session = token ? verifyToken(token, config.sessionSecret) : null;
  if (!session) {
    throw statusError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", 401);
  }
  return session;
}

function requireRole(role: Role, allowedRoles: Role[]) {
  if (!allowedRoles.includes(role)) {
    throw statusError("Tài khoản hiện tại không có quyền thực hiện thao tác này.", 403);
  }
}

function getConfig(): CmsConfig {
  return {
    adminUser: process.env.CMS_ADMIN_USER || "admin",
    adminPassword: process.env.CMS_ADMIN_PASSWORD || "",
    usersJson: process.env.CMS_USERS_JSON || "",
    sessionSecret: process.env.CMS_SESSION_SECRET || "",
    databaseUrl: process.env.DATABASE_URL || "",
  };
}

function getBootstrapUsers(config: CmsConfig): CmsUser[] {
  if (config.usersJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(config.usersJson);
    } catch {
      throw statusError("CMS_USERS_JSON không phải JSON hợp lệ.", 500);
    }

    if (!Array.isArray(parsed)) {
      throw statusError("CMS_USERS_JSON phải là một mảng tài khoản.", 500);
    }

    return parsed
      .map((item) => {
        const source = item as Partial<CmsUser> & { password?: string };
        const username = String(source.username || "");
        const password = String(source.password || "");
        const role = normalizeRole(source.role);
        return username && password ? { username, passwordHash: hashPassword(password), role } : null;
      })
      .filter((item): item is CmsUser => Boolean(item));
  }

  if (!config.adminPassword) return [];
  return [{ username: config.adminUser, passwordHash: hashPassword(config.adminPassword), role: "super_admin" }];
}

async function loadUsers(): Promise<CmsUser[]> {
  if (isLocalDemoMode()) {
    const config = getConfig();
    return loadLocalDemoUsers(() => ensureSingleSuperAdmin(getBootstrapUsers(config))) as Promise<CmsUser[]>;
  }

  const rows = await db.select().from(cmsUsers);
  if (rows.length) return rows.map(toCmsUserShape);

  const config = getConfig();
  const bootstrapUsers = ensureSingleSuperAdmin(getBootstrapUsers(config));
  if (bootstrapUsers.length) {
    await db.insert(cmsUsers).values(bootstrapUsers).onConflictDoNothing();
  }
  return bootstrapUsers;
}

async function createUser(user: CmsUser) {
  if (isLocalDemoMode()) {
    const users = await loadUsers();
    await saveLocalDemoUsers([...users, user]);
    return;
  }

  await db.insert(cmsUsers).values(user);
}

async function updateUser(username: string, updates: Partial<CmsUser>) {
  if (isLocalDemoMode()) {
    const users = await loadUsers();
    await saveLocalDemoUsers(users.map((user) => (user.username === username ? { ...user, ...updates } : user)));
    return;
  }

  await db.update(cmsUsers).set(updates).where(eq(cmsUsers.username, username));
}

async function deleteUser(username: string) {
  if (isLocalDemoMode()) {
    const users = await loadUsers();
    await saveLocalDemoUsers(users.filter((user) => user.username !== username));
    return;
  }

  await db.delete(cmsUsers).where(eq(cmsUsers.username, username));
}

function toCmsUserShape(row: typeof cmsUsers.$inferSelect): CmsUser {
  return {
    username: row.username,
    passwordHash: row.passwordHash,
    role: normalizeRole(row.role),
    lastLoginAt: row.lastLoginAt ?? undefined,
  };
}

function ensureSingleSuperAdmin(users: CmsUser[]): CmsUser[] {
  const superAdmins = users.filter((user) => user.role === "super_admin");
  if (superAdmins.length <= 1) return users;
  let foundSuperAdmin = false;
  return users.map((user) => {
    if (user.role !== "super_admin") return user;
    if (!foundSuperAdmin) {
      foundSuperAdmin = true;
      return user;
    }
    return { ...user, role: "admin" };
  });
}

function publicUsers(users: CmsUser[]): PublicCmsUser[] {
  return users.map(({ username, role, lastLoginAt }) => ({ username, role, lastLoginAt }));
}

function ensureConfigured(config: CmsConfig, keys: Array<keyof CmsConfig>) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length) {
    throw statusError(`Thiếu biến môi trường Vercel: ${missing.join(", ")}.`, 500);
  }
}

function createToken(payload: SessionPayload, secret: string) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

function verifyToken(token: string, secret: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeEqual(signature, sign(encoded, secret))) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: normalizeRole(payload.role),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [scheme, salt, expectedHash] = passwordHash.split(":");
  if (scheme !== "scrypt" || !salt || !expectedHash) return false;
  const actualHash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return safeEqual(actualHash, expectedHash);
}

function generateTemporaryPassword() {
  return `Tmp-${crypto.randomBytes(6).toString("base64url")}`;
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function normalizeRole(role: unknown): Role {
  return role === "super_admin" || role === "admin" || role === "employee" ? role : "employee";
}

function slugifyFileName(value: string) {
  return (
    value
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image"
  );
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function statusError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function errorResponse(error: unknown) {
  const status = error instanceof Error && "statusCode" in error ? Number(error.statusCode) : 500;
  const message = error instanceof Error ? error.message : "CMS API gặp lỗi.";
  return json({ message }, Number.isFinite(status) ? status : 500);
}
