import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const SESSION_TTL_SECONDS = 8 * 60 * 60;
const CMS_IMAGE_MAX_SIZE = 1600;
const CMS_IMAGE_WEBP_QUALITY = 78;

type Role = "super_admin" | "admin" | "employee";

type CmsConfig = {
  adminUser: string;
  adminPassword: string;
  usersJson: string;
  sessionSecret: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubPath: string;
  usersPath: string;
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
      const users = publicUsers(await loadUsers(getConfig()));
      return json({ users, currentUser: session.sub, currentRole: session.role });
    }

    if (process.env.NODE_ENV !== "production") {
      const source = await readFile(path.join(process.cwd(), getConfig().githubPath), "utf8");
      return json({ data: parseDataSource(source), sha: "local" });
    }

    const file = await fetchGithubFile();
    const source = decodeBase64(file.content);
    const data = parseDataSource(source);
    return json({ data, sha: file.sha });
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

    const config = getConfig();
    const content = formatDataModule(data);
    if (process.env.NODE_ENV !== "production") {
      await writeFile(path.join(process.cwd(), config.githubPath), content, "utf8");
      return json({
        sha: "local",
        commit: "local",
        message: "Đã lưu dữ liệu vào file local.",
      });
    }

    const file = await fetchGithubFile();
    const result = await githubRequest(githubFileUrl(), {
      method: "PUT",
      body: JSON.stringify({
        message: `Update site data from CMS - ${new Date().toISOString()}`,
        content: encodeBase64(content),
        sha: file.sha,
        branch: config.githubBranch,
      }),
    });

    return json({
      sha: result.content?.sha,
      commit: result.commit?.sha,
      message: "Đã lưu dữ liệu lên GitHub.",
    });
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

    const config = getConfig();
    const users = await loadUsers(config);
    const target = users.find((user) => user.username === username);
    if (!target) throw statusError("Không tìm thấy tài khoản.", 404);
    if (target.role === "super_admin") throw statusError("Không thể xóa super admin mặc định.", 400);

    const nextUsers = users.filter((user) => user.username !== username);
    await saveUsers(config, nextUsers);
    return json({ users: publicUsers(nextUsers), message: "Đã xóa tài khoản." });
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleLogin(request: NextRequest) {
  const config = getConfig();
  ensureConfigured(config, process.env.NODE_ENV === "production" ? ["sessionSecret", "githubToken"] : ["sessionSecret"]);
  const users = await loadUsers(config);
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

  const nextUsers = users.map((candidate) =>
    candidate.username === user.username ? { ...candidate, lastLoginAt: new Date().toISOString() } : candidate,
  );
  await saveUsers(config, nextUsers);

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

  const config = getConfig();
  const users = await loadUsers(config);

  if (mode === "create") {
    requireRole(session.role, ["super_admin", "admin"]);
    if (role === "super_admin") throw statusError("Super admin mặc định chỉ có một tài khoản.", 400);
    if (users.some((user) => user.username === username)) throw statusError("Tên đăng nhập đã tồn tại.", 400);
    const temporaryPassword = generateTemporaryPassword();
    const nextUsers = [...users, { username, role, passwordHash: hashPassword(temporaryPassword) }];
    await saveUsers(config, nextUsers);
    return json({ users: publicUsers(nextUsers), temporaryPassword, message: "Đã tạo tài khoản với mật khẩu tạm." });
  }

  const targetIndex = users.findIndex((user) => user.username === originalUsername);
  if (targetIndex < 0) throw statusError("Không tìm thấy tài khoản.", 404);

  const target = users[targetIndex];
  const nextUser: CmsUser = { ...target };
  if (canManageUsers && target.role !== "super_admin") {
    if (username !== originalUsername && users.some((user, index) => index !== targetIndex && user.username === username)) {
      throw statusError("Tên đăng nhập đã tồn tại.", 400);
    }
    nextUser.username = username;
    nextUser.role = role === "super_admin" ? target.role : role;
  }
  if (password) {
    nextUser.passwordHash = hashPassword(password);
  }
  if (!password && !canManageUsers) {
    throw statusError("Bạn cần nhập mật khẩu mới.", 400);
  }

  const nextUsers = users.map((user, index) => (index === targetIndex ? nextUser : user));
  await saveUsers(config, nextUsers);
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

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const buffer = await optimizeCmsImage(sourceBuffer);
  const filename = `${Date.now()}-${slugifyFileName(file.name)}.webp`;
  const publicPath = `/uploads/cms/${filename}`;

  if (process.env.NODE_ENV !== "production") {
    const uploadDirectory = path.join(process.cwd(), "public", "uploads", "cms");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, filename), buffer);
    return json({ url: publicPath });
  }

  const config = getConfig();
  await githubRequest(
    `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/contents/${encodeURIComponent(
      `public/uploads/cms/${filename}`,
    )}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: `Upload CMS image - ${filename}`,
        content: buffer.toString("base64"),
        branch: config.githubBranch,
      }),
    },
  );

  return json({ url: publicPath });
}

function requireSession(request: NextRequest) {
  const config = getConfig();
  ensureConfigured(config, process.env.NODE_ENV === "production" ? ["sessionSecret", "githubToken"] : ["sessionSecret"]);
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

async function fetchGithubFile() {
  const file = await githubRequest(`${githubFileUrl()}?ref=${encodeURIComponent(getConfig().githubBranch)}`);
  if (!file.content || !file.sha) {
    throw new Error("GitHub không trả về file dữ liệu hợp lệ.");
  }
  return file;
}

async function githubRequest(url: string, options: RequestInit = {}) {
  const config = getConfig();
  ensureConfigured(config, ["githubToken"]);

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.githubToken}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw statusError(payload.message || `GitHub API lỗi ${response.status}.`, response.status);
  }
  return payload;
}

function githubFileUrl() {
  const config = getConfig();
  return `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/contents/${encodeURIComponent(
    config.githubPath,
  )}`;
}

function githubUsersUrl() {
  const config = getConfig();
  return `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/contents/${encodeURIComponent(
    config.usersPath,
  )}`;
}

function getConfig(): CmsConfig {
  return {
    adminUser: process.env.CMS_ADMIN_USER || "admin",
    adminPassword: process.env.CMS_ADMIN_PASSWORD || "",
    usersJson: process.env.CMS_USERS_JSON || "",
    sessionSecret: process.env.CMS_SESSION_SECRET || "",
    githubToken: process.env.CMS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    githubOwner: process.env.CMS_GITHUB_OWNER || "luongminhphuong710-dotcom",
    githubRepo: process.env.CMS_GITHUB_REPO || "camnangmasterisepro",
    githubBranch: process.env.CMS_GITHUB_BRANCH || "main",
    githubPath: process.env.CMS_DATA_PATH || "src/lib/data.ts",
    usersPath: process.env.CMS_USERS_PATH || ".cms-users.json",
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

async function loadUsers(config: CmsConfig): Promise<CmsUser[]> {
  if (process.env.NODE_ENV !== "production") {
    const localPath = path.join(process.cwd(), config.usersPath);
    try {
      const parsed = JSON.parse(await readFile(localPath, "utf8"));
      return normalizeStoredUsers(parsed);
    } catch {
      const bootstrapUsers = ensureSingleSuperAdmin(getBootstrapUsers(config));
      await saveUsers(config, bootstrapUsers);
      return bootstrapUsers;
    }
  }

  try {
    const file = await githubRequest(`${githubUsersUrl()}?ref=${encodeURIComponent(config.githubBranch)}`);
    return normalizeStoredUsers(JSON.parse(decodeBase64(file.content)));
  } catch {
    return ensureSingleSuperAdmin(getBootstrapUsers(config));
  }
}

async function saveUsers(config: CmsConfig, users: CmsUser[]) {
  const nextUsers = ensureSingleSuperAdmin(users);
  const content = `${JSON.stringify({ users: nextUsers }, null, 2)}\n`;

  if (process.env.NODE_ENV !== "production") {
    await writeFile(path.join(process.cwd(), config.usersPath), content, "utf8");
    return;
  }

  let sha: string | undefined;
  try {
    const file = await githubRequest(`${githubUsersUrl()}?ref=${encodeURIComponent(config.githubBranch)}`);
    sha = file.sha;
  } catch {
    sha = undefined;
  }

  await githubRequest(githubUsersUrl(), {
    method: "PUT",
    body: JSON.stringify({
      message: `Update CMS users - ${new Date().toISOString()}`,
      content: encodeBase64(content),
      sha,
      branch: config.githubBranch,
    }),
  });
}

function normalizeStoredUsers(value: unknown): CmsUser[] {
  const source = value as { users?: unknown };
  const users = Array.isArray(source.users) ? source.users : Array.isArray(value) ? value : [];
  return ensureSingleSuperAdmin(
    users
      .map((item) => {
        const user = item as Partial<CmsUser>;
        const username = String(user.username || "");
        const passwordHash = String(user.passwordHash || "");
        const role = normalizeRole(user.role);
        const lastLoginAt = user.lastLoginAt ? String(user.lastLoginAt) : undefined;
        return username && passwordHash ? { username, passwordHash, role, ...(lastLoginAt ? { lastLoginAt } : {}) } : null;
      })
      .filter((item): item is CmsUser => Boolean(item)),
  );
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

function parseDataSource(source: string) {
  if (source.includes("window.CAMNANG_DATA")) {
    return parseSiteData(source);
  }

  const match = source.match(/export\s+const\s+camnangData\s*=\s*([\s\S]*?)\s+as\s+const\s*;/);
  if (!match?.[1]) {
    throw new Error("Không tìm thấy camnangData trong file dữ liệu.");
  }

  try {
    return new Function(`return (${match[1]});`)();
  } catch (error) {
    throw new Error(`Không đọc được src/lib/data.ts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseSiteData(source: string) {
  try {
    const sandbox = {};
    return new Function("window", `${source}; return window.CAMNANG_DATA;`)(sandbox);
  } catch (error) {
    throw new Error(`Không đọc được dữ liệu CMS: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatDataModule(data: unknown) {
  return `export const camnangData = ${JSON.stringify(data, null, 2)} as const;

export const fallbackImage = camnangData.fallbackImage;
export const regionMeta = camnangData.regionMeta;
export const projects = camnangData.projects;
export const storeCategories = camnangData.storeCategories;
export const stores = camnangData.stores;
export const newsItems = camnangData.newsItems;

export type Project = (typeof projects)[number];
export type Store = (typeof stores)[number];
export type NewsItem = (typeof newsItems)[number];
`;
}

function decodeBase64(value: string) {
  return Buffer.from(String(value || "").replace(/\s/g, ""), "base64").toString("utf8");
}

function encodeBase64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
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

async function optimizeCmsImage(buffer: Buffer) {
  try {
    return await sharp(buffer, { animated: false })
      .rotate()
      .resize({
        width: CMS_IMAGE_MAX_SIZE,
        height: CMS_IMAGE_MAX_SIZE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: CMS_IMAGE_WEBP_QUALITY,
        effort: 5,
      })
      .toBuffer();
  } catch {
    throw statusError("KhÃ´ng thá»ƒ náº¿n áº£nh. Vui lÃ²ng thá»­ file JPG, PNG hoáº·c WebP há»£p lá»‡.", 400);
  }
}

function slugifyFileName(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
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
