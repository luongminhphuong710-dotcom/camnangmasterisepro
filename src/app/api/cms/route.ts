import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const SESSION_TTL_SECONDS = 8 * 60 * 60;

type CmsConfig = {
  adminUser: string;
  adminPassword: string;
  sessionSecret: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubPath: string;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  if (request.nextUrl.searchParams.get("action") !== "login") {
    return json({ message: "Endpoint CMS không tồn tại." }, 404);
  }

  try {
    return await handleLogin(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("action") !== "data") {
    return json({ message: "Endpoint CMS không tồn tại." }, 404);
  }

  try {
    requireSession(request);
    const file = await fetchGithubFile();
    const source = decodeBase64(file.content);
    const data = parseDataSource(source);
    return json({ data, sha: file.sha });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  if (request.nextUrl.searchParams.get("action") !== "data") {
    return json({ message: "Endpoint CMS không tồn tại." }, 404);
  }

  try {
    requireSession(request);
    const body = await request.json().catch(() => ({}));
    const data = body.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw statusError("Dữ liệu CMS không hợp lệ.", 400);
    }

    const file = await fetchGithubFile();
    const config = getConfig();
    const content = formatDataModule(data);
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

async function handleLogin(request: NextRequest) {
  const config = getConfig();
  ensureConfigured(config, ["adminPassword", "sessionSecret", "githubToken"]);
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");

  if (!safeEqual(username, config.adminUser) || !safeEqual(password, config.adminPassword)) {
    throw statusError("Tên đăng nhập hoặc mật khẩu không đúng.", 401);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = createToken({ sub: username, exp: expiresAt }, config.sessionSecret);
  return json({ token, user: username, expiresAt });
}

function requireSession(request: NextRequest) {
  const config = getConfig();
  ensureConfigured(config, ["sessionSecret", "githubToken"]);
  const token = getBearerToken(request);
  if (!token || !verifyToken(token, config.sessionSecret)) {
    throw statusError("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.", 401);
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

function getConfig(): CmsConfig {
  return {
    adminUser: process.env.CMS_ADMIN_USER || "admin",
    adminPassword: process.env.CMS_ADMIN_PASSWORD || "",
    sessionSecret: process.env.CMS_SESSION_SECRET || "",
    githubToken: process.env.CMS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    githubOwner: process.env.CMS_GITHUB_OWNER || "luongminhphuong710-dotcom",
    githubRepo: process.env.CMS_GITHUB_REPO || "camnangmasterisepro",
    githubBranch: process.env.CMS_GITHUB_BRANCH || "main",
    githubPath: process.env.CMS_DATA_PATH || "src/lib/data.ts",
  };
}

function ensureConfigured(config: CmsConfig, keys: Array<keyof CmsConfig>) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length) {
    throw statusError(`Thiếu biến môi trường Vercel: ${missing.join(", ")}.`, 500);
  }
}

function createToken(payload: Record<string, unknown>, secret: string) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

function verifyToken(token: string, secret: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !safeEqual(signature, sign(encoded, secret))) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
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
