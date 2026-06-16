const crypto = require("crypto");

const SESSION_TTL_SECONDS = 8 * 60 * 60;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const action = req.query.action;

    if (action === "login" && req.method === "POST") {
      await handleLogin(req, res);
      return;
    }

    if (action === "data" && req.method === "GET") {
      requireSession(req);
      await handleGetData(res);
      return;
    }

    if (action === "data" && req.method === "PUT") {
      requireSession(req);
      await handleSaveData(req, res);
      return;
    }

    res.status(404).json({ message: "Endpoint CMS không tồn tại." });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "CMS API gặp lỗi." });
  }
};

async function handleLogin(req, res) {
  const config = getConfig();
  ensureConfigured(config, ["adminPassword", "sessionSecret", "githubToken"]);
  const body = getBody(req);
  const username = String(body.username || "");
  const password = String(body.password || "");

  if (!safeEqual(username, config.adminUser) || !safeEqual(password, config.adminPassword)) {
    const error = new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
    error.statusCode = 401;
    throw error;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = createToken({ sub: username, exp: expiresAt }, config.sessionSecret);
  res.status(200).json({ token, user: username, expiresAt });
}

async function handleGetData(res) {
  const file = await fetchGithubFile();
  const source = decodeBase64(file.content);
  const data = parseSiteData(source);
  res.status(200).json({ data, sha: file.sha });
}

async function handleSaveData(req, res) {
  const body = getBody(req);
  const data = body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Dữ liệu CMS không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const file = await fetchGithubFile();
  const content = `window.CAMNANG_DATA = ${JSON.stringify(data, null, 2)};\n`;
  const config = getConfig();
  const result = await githubRequest(githubFileUrl(), {
    method: "PUT",
    body: JSON.stringify({
      message: `Update site data from CMS - ${new Date().toISOString()}`,
      content: encodeBase64(content),
      sha: file.sha,
      branch: config.githubBranch,
    }),
  });

  res.status(200).json({
    sha: result.content && result.content.sha,
    commit: result.commit && result.commit.sha,
    message: "Đã lưu dữ liệu lên GitHub.",
  });
}

function requireSession(req) {
  const config = getConfig();
  ensureConfigured(config, ["sessionSecret", "githubToken"]);
  const token = getBearerToken(req);
  if (!token || !verifyToken(token, config.sessionSecret)) {
    const error = new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    error.statusCode = 401;
    throw error;
  }
}

async function fetchGithubFile() {
  const file = await githubRequest(`${githubFileUrl()}?ref=${encodeURIComponent(getConfig().githubBranch)}`);
  if (!file.content || !file.sha) {
    throw new Error("GitHub không trả về file dữ liệu hợp lệ.");
  }
  return file;
}

async function githubRequest(url, options = {}) {
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
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error((payload && payload.message) || `GitHub API lỗi ${response.status}`);
    error.statusCode = response.status === 404 ? 404 : 502;
    throw error;
  }
  return payload;
}

function githubFileUrl() {
  const config = getConfig();
  const path = config.githubPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://api.github.com/repos/${encodeURIComponent(config.githubOwner)}/${encodeURIComponent(
    config.githubRepo
  )}/contents/${path}`;
}

function getConfig() {
  return {
    adminUser: process.env.CMS_ADMIN_USER || "admin",
    adminPassword: process.env.CMS_ADMIN_PASSWORD || "",
    sessionSecret: process.env.CMS_SESSION_SECRET || "",
    githubToken: process.env.CMS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    githubOwner: process.env.CMS_GITHUB_OWNER || "luongminhphuong710-dotcom",
    githubRepo: process.env.CMS_GITHUB_REPO || "camnangmasterisepro",
    githubBranch: process.env.CMS_GITHUB_BRANCH || "main",
    githubPath: process.env.CMS_DATA_PATH || "site-data.js",
  };
}

function ensureConfigured(config, keys) {
  const missing = keys.filter((key) => !config[key]);
  if (!missing.length) return;
  const error = new Error(`Thiếu biến môi trường Vercel: ${missing.join(", ")}.`);
  error.statusCode = 500;
  throw error;
}

function createToken(payload, secret) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

function verifyToken(token, secret) {
  const [encoded, signature] = String(token).split(".");
  if (!encoded || !signature || !safeEqual(signature, sign(encoded, secret))) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    return Number(payload.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function parseSiteData(source) {
  try {
    const sandbox = {};
    return new Function("window", `${source}; return window.CAMNANG_DATA;`)(sandbox);
  } catch (error) {
    throw new Error(`Không đọc được site-data.js: ${error.message}`);
  }
}

function decodeBase64(value) {
  return Buffer.from(String(value || "").replace(/\s/g, ""), "base64").toString("utf8");
}

function encodeBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
