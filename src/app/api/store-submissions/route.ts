import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { uploadCmsImage } from "@/lib/cloudinary";
import { db } from "@/lib/db/client";
import { projects, siteSettings, storeCategories, stores } from "@/lib/db/schema";
import { normalize, slugify } from "@/lib/site-utils";

// Store registrations collected by the Google Form land in a Google Sheet. When
// a row is approved there ("OK"), the Apps Script bound to that Sheet calls this
// endpoint to publish the store. See docs/store-submissions.md.
//
// Every request must carry the shared secret in the `x-store-sync-secret`
// header (env STORE_SYNC_SECRET). A marker row `store-submission:<id>` in
// site_settings links each Sheet row to the store it created, so approving the
// same row again updates that store instead of creating a duplicate, and a
// store that was not created from the Sheet is never touched.

export const runtime = "nodejs";
export const maxDuration = 120;

const MARKER_PREFIX = "store-submission:";
const MAX_IMAGES = 8;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_REMOTE_IMAGE_BYTES = 15 * 1024 * 1024;

type StoreInput = {
  name?: unknown;
  project?: unknown;
  category?: unknown;
  floor?: unknown;
  hours?: unknown;
  phone?: unknown;
  note?: unknown;
  detail?: unknown;
  website?: unknown;
  mapUrl?: unknown;
  images?: unknown;
  voucher?: { code?: unknown; description?: unknown; expires?: unknown } | null;
};

type Marker = { storeId?: string; publishedAt?: string };
type StoreVoucherRow = { code: string; title?: string; description: string; expires: string; redeemCount?: number };

export async function GET(request: NextRequest) {
  try {
    requireSecret(request);
    const action = request.nextUrl.searchParams.get("action");
    if (action === "options") return json(await loadOptions());
    if (action === "list") return json(await listStores());
    throw statusError("Action không hợp lệ.", 404);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSecret(request);
    const action = request.nextUrl.searchParams.get("action");
    if (action === "upload-image") return await handleUpload(request);
    if (action === "publish") return await handlePublish(request);
    if (action === "unpublish") return await handleUnpublish(request);
    if (action === "options") return json(await loadOptions());
    if (action === "list") return json(await listStores());
    throw statusError("Action không hợp lệ.", 404);
  } catch (error) {
    return errorResponse(error);
  }
}

async function loadOptions() {
  const [projectRows, categoryRows] = await Promise.all([db.select().from(projects), db.select().from(storeCategories)]);
  return {
    projects: projectRows
      .map((row) => ({ id: row.id.trim(), name: row.name.trim(), region: row.region }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    categories: categoryRows
      .filter((row) => !["all", "unassigned"].includes(row.id.trim()))
      .map((row) => ({ id: row.id.trim(), label: row.label.trim() })),
  };
}

// Every store on the site, flattened for the review Sheet. `submissionId` is the
// Sheet row that manages the store (empty for stores only edited in the CMS).
async function listStores() {
  const [storeRows, projectRows, categoryRows, markerRows] = await Promise.all([
    db.select().from(stores),
    db.select().from(projects),
    db.select().from(storeCategories),
    db.execute(sql`SELECT key, value FROM site_settings WHERE key LIKE ${`${MARKER_PREFIX}%`}`),
  ]);
  const owners = new Map<string, string>();
  for (const row of markerRows.rows as Array<{ key: string; value: Marker | null }>) {
    if (row.value?.storeId) owners.set(row.value.storeId, row.key.slice(MARKER_PREFIX.length));
  }
  const projectName = new Map(projectRows.map((row) => [row.id.trim(), row.name.trim()]));
  const categoryLabel = new Map(categoryRows.map((row) => [row.id.trim(), row.label.trim()]));
  return {
    stores: storeRows
      .map((row) => {
        const reviews = Array.isArray(row.reviews) ? row.reviews.filter((review) => review?.name && review?.comment) : [];
        const voucher = Array.isArray(row.vouchers) ? row.vouchers[0] : undefined;
        const images = Array.isArray(row.images) && row.images.length ? row.images : row.image ? [row.image] : [];
        return {
          id: row.id,
          submissionId: owners.get(row.id) || "",
          name: row.name.trim(),
          projectId: row.projectId.trim(),
          projectName: projectName.get(row.projectId.trim()) || row.projectId.trim(),
          category: categoryLabel.get(row.category.trim()) || row.category.trim(),
          floor: row.floor.trim(),
          hours: row.hours.trim(),
          phone: row.phone.trim(),
          note: row.note.trim(),
          detail: htmlToText(row.detailContent || ""),
          images,
          mapEmbedUrl: (row.mapEmbedUrl || "").trim(),
          voucher: voucher ? { description: voucher.description || "", code: voucher.code || "", expires: voucher.expires || "" } : null,
          voucherCount: Array.isArray(row.vouchers) ? row.vouchers.length : 0,
          reviewCount: reviews.length,
          rating: reviews.length ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)) : null,
          createdAt: row.createdAt || "",
          updatedAt: row.updatedAt || row.createdAt || "",
          url: `https://www.camnangmasterise.vn/gian-hang/${encodeURIComponent(row.id)}`,
        };
      })
      .sort((a, b) => a.projectName.localeCompare(b.projectName, "vi") || a.name.localeCompare(b.name, "vi")),
  };
}

// A store created in the CMS can be taken over by a Sheet row that names it
// (column "ID trên web"), as long as no other row manages it already.
async function adoptStore(storeIdHint: unknown, markerKey: string) {
  const storeId = cleanText(storeIdHint, 160);
  if (!storeId) return undefined;
  const store = (await db.select().from(stores).where(eq(stores.id, storeId)))[0];
  if (!store) return undefined;
  const owners = await db.execute(
    sql`SELECT key FROM site_settings WHERE key LIKE ${`${MARKER_PREFIX}%`} AND value->>'storeId' = ${storeId}`,
  );
  const otherOwner = (owners.rows as Array<{ key: string }>).find((row) => row.key !== markerKey);
  if (otherOwner) {
    throw statusError(`Gian hàng "${storeId}" đang được quản lý bởi dòng ${otherOwner.key.slice(MARKER_PREFIX.length)}.`, 409);
  }
  return store;
}

async function handleUpload(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw statusError("Thiếu file ảnh.", 400);
  if (file.size > MAX_UPLOAD_BYTES) throw statusError("Ảnh lớn hơn 4MB.", 413);
  const hint = String(formData.get("name") || file.name || "anh-gian-hang");
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadImageBuffer(buffer, hint);
  return json({ url });
}

async function handlePublish(request: NextRequest) {
  const body = (await request.json()) as { submissionId?: unknown; storeId?: unknown; store?: StoreInput };
  const submissionId = cleanText(body.submissionId, 80);
  if (!submissionId) throw statusError("Thiếu mã đăng ký.", 400);
  const input = body.store || {};

  const name = cleanText(input.name, 160);
  if (!name) throw statusError("Thiếu tên gian hàng.", 400);

  const [projectRows, categoryRows] = await Promise.all([db.select().from(projects), db.select().from(storeCategories)]);
  const project = findByIdOrName(projectRows, input.project, (row) => row.name);
  if (!project) {
    throw statusError(`Không tìm thấy dự án "${cleanText(input.project, 120)}" trên web. Sửa cột Dự án cho đúng tên dự án.`, 400);
  }
  const selectableCategories = categoryRows.filter((row) => !["all", "unassigned"].includes(row.id.trim()));
  const category = findByIdOrName(selectableCategories, input.category, (row) => row.label);
  if (!category) {
    const labels = selectableCategories.map((row) => row.label.trim()).join(", ");
    throw statusError(`Loại hình "${cleanText(input.category, 80)}" chưa có trên web. Chọn một trong: ${labels}.`, 400);
  }

  const markerKey = `${MARKER_PREFIX}${submissionId}`;
  const markerRows = await db.select().from(siteSettings).where(eq(siteSettings.key, markerKey));
  const marker = (markerRows[0]?.value || {}) as Marker;
  const existing = marker.storeId
    ? (await db.select().from(stores).where(eq(stores.id, marker.storeId)))[0]
    : await adoptStore(body.storeId, markerKey);
  const storeId = existing?.id || (marker.storeId ? await freeId(marker.storeId) : await uniqueStoreId(name, project.id.trim()));

  const imageUrls = await resolveImages(input.images, storeId);
  const projectId = project.id.trim();
  const now = new Date().toISOString();
  const values = {
    name,
    projectId,
    category: category.id.trim(),
    image: imageUrls[0] || existing?.image || project.image || "",
    images: imageUrls.length ? imageUrls : existing?.images || [],
    floor: cleanText(input.floor, 240),
    hours: cleanText(input.hours, 80) || "08:00 - 20:00",
    phone: cleanText(input.phone, 40),
    note: cleanText(input.note, 400),
    mapEmbedUrl: (await toMapEmbed(cleanText(input.mapUrl, 2000))) || existing?.mapEmbedUrl || "",
    detailContent: resolveDetail(existing?.detailContent || "", name, project.name.trim(), cleanText(input.detail, 20000), cleanText(input.website, 500)),
    vouchers: resolveVouchers(existing?.vouchers || [], input.voucher),
    updatedAt: now,
  };

  if (existing) {
    await db.update(stores).set(values).where(eq(stores.id, storeId));
  } else {
    await db.insert(stores).values({
      id: storeId,
      ...values,
      address: "",
      rating: 5,
      reviewCount: 0,
      reviews: [],
      createdAt: now,
    });
  }

  await db
    .insert(siteSettings)
    .values({ key: markerKey, value: { storeId, publishedAt: now }, updatedAt: now })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: { storeId, publishedAt: now }, updatedAt: now } });

  revalidateStorePaths([storeId], [projectId, existing?.projectId?.trim()]);
  return json({
    storeId,
    created: !existing,
    url: `https://www.camnangmasterise.vn/gian-hang/${encodeURIComponent(storeId)}`,
    images: imageUrls.length,
  });
}

async function handleUnpublish(request: NextRequest) {
  const body = (await request.json()) as { submissionId?: unknown; storeId?: unknown };
  const submissionId = cleanText(body.submissionId, 80);
  if (!submissionId) throw statusError("Thiếu mã đăng ký.", 400);
  const markerKey = `${MARKER_PREFIX}${submissionId}`;
  const marker = ((await db.select().from(siteSettings).where(eq(siteSettings.key, markerKey)))[0]?.value || {}) as Marker;
  const existing = marker.storeId
    ? (await db.select().from(stores).where(eq(stores.id, marker.storeId)))[0]
    : await adoptStore(body.storeId, markerKey);
  const storeId = marker.storeId || existing?.id;
  if (!storeId) return json({ removed: false, message: "Gian hàng này không có trên web." });
  if (existing) await db.delete(stores).where(eq(stores.id, storeId));
  await db.delete(siteSettings).where(eq(siteSettings.key, markerKey));
  revalidateStorePaths([storeId], [existing?.projectId?.trim()]);
  return json({ removed: Boolean(existing), storeId });
}

function revalidateStorePaths(storeIds: string[], projectIds: Array<string | undefined>) {
  revalidateTag("site-data", { expire: 0 });
  ["/", "/gian-hang", "/near-me", "/du-an"].forEach((path) => revalidatePath(path));
  storeIds.forEach((id) => revalidatePath(`/gian-hang/${encodeURIComponent(id)}`));
  new Set(projectIds.filter(Boolean) as string[]).forEach((id) => revalidatePath(`/du-an/${encodeURIComponent(id)}`));
}

function findByIdOrName<T extends { id: string }>(rows: T[], value: unknown, label: (row: T) => string) {
  const wanted = normalize(cleanText(value, 200));
  if (!wanted) return undefined;
  return (
    rows.find((row) => normalize(row.id) === wanted) ||
    rows.find((row) => normalize(label(row)) === wanted) ||
    rows.find((row) => slugify(label(row)) === slugify(wanted))
  );
}

async function uniqueStoreId(name: string, projectId: string) {
  const base = slugify(name).slice(0, 70) || "gian-hang";
  const candidates = [base, `${base}-${slugify(projectId)}`.slice(0, 100)];
  for (const candidate of candidates) {
    if (!(await idTaken(candidate))) return candidate;
  }
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}-${index}`;
    if (!(await idTaken(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
}

async function freeId(preferred: string) {
  return (await idTaken(preferred)) ? `${preferred}-${Date.now()}` : preferred;
}

async function idTaken(id: string) {
  const rows = await db.select({ id: stores.id }).from(stores).where(eq(stores.id, id));
  return rows.length > 0;
}

async function resolveImages(value: unknown, storeId: string) {
  const urls = (Array.isArray(value) ? value : String(value || "").split(/[\s,]+/))
    .map((item) => String(item || "").trim())
    .filter((item) => /^https?:\/\//i.test(item))
    .slice(0, MAX_IMAGES);
  const result: string[] = [];
  for (const [index, url] of urls.entries()) {
    if (/^https:\/\/res\.cloudinary\.com\//i.test(url)) {
      result.push(url);
      continue;
    }
    const buffer = await fetchRemoteImage(url);
    result.push(await uploadImageBuffer(buffer, `${storeId}-${index + 1}`));
  }
  return Array.from(new Set(result));
}

async function fetchRemoteImage(url: string) {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw statusError(`Không tải được ảnh ${url} (HTTP ${response.status}).`, 400);
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw statusError(`Link ${url} không phải là ảnh.`, 400);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_REMOTE_IMAGE_BYTES) throw statusError(`Ảnh ${url} lớn hơn 15MB.`, 400);
  return buffer;
}

async function uploadImageBuffer(buffer: Buffer, hint: string) {
  const filenameHint = `${Date.now()}-${slugify(hint.replace(/\.[a-z0-9]+$/i, "")).slice(0, 60) || "anh-gian-hang"}`;
  try {
    return await uploadCmsImage(buffer, filenameHint);
  } catch {
    throw statusError("Cloudinary không nhận ảnh. Dùng file JPG, PNG hoặc WebP.", 400);
  }
}

function buildVoucher(value: StoreInput["voucher"]) {
  if (!value) return null;
  const description = cleanText(value.description, 300);
  if (!description) return null;
  const code = cleanText(value.code, 40).toUpperCase().replace(/\s+/g, "") || "CAMNANGMASTERISE";
  return { code, title: "", description, expires: cleanText(value.expires, 80) || "Số lượng có hạn", redeemCount: 0 };
}

// Keep the stored voucher list when the Sheet still shows the same first voucher
// (extra vouchers and redeem counts set in the CMS survive); otherwise the
// Sheet's voucher replaces the first one.
function resolveVouchers(existing: StoreVoucherRow[], value: StoreInput["voucher"]) {
  const voucher = buildVoucher(value);
  if (!voucher) return existing;
  const first = existing[0];
  const givenCode = cleanText(value?.code, 40);
  if (
    first &&
    cleanText(first.description, 300) === voucher.description &&
    (!givenCode || cleanText(first.code, 40).toUpperCase() === voucher.code) &&
    (!cleanText(value?.expires, 80) || cleanText(first.expires, 80) === voucher.expires)
  ) {
    return existing;
  }
  return [voucher, ...existing.slice(1)];
}

// The Sheet carries the detail as plain text. If it still matches the stored
// rich text, keep the stored HTML (formatting, links) instead of rebuilding it.
function resolveDetail(existingHtml: string, name: string, projectName: string, detail: string, website: string) {
  if (existingHtml && sameText(htmlToText(existingHtml), detail)) {
    const link = safeUrl(website);
    const bareLink = link.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (link && !existingHtml.includes(bareLink)) {
      return `${existingHtml}<p>Fanpage/Website: <a href="${escapeHtml(link)}" target="_blank" rel="noopener nofollow">${escapeHtml(link)}</a></p>`;
    }
    return existingHtml;
  }
  return buildDetailHtml(name, projectName, detail, website);
}

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function sameText(a: string, b: string) {
  const flat = (value: string) => value.replace(/\s+/g, " ").trim();
  return flat(a) === flat(b);
}

function buildDetailHtml(name: string, projectName: string, detail: string, website: string) {
  const paragraphs = detail
    .split(/\n\s*\n|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`);
  const link = safeUrl(website);
  if (link) {
    paragraphs.push(`<p>Fanpage/Website: <a href="${escapeHtml(link)}" target="_blank" rel="noopener nofollow">${escapeHtml(link)}</a></p>`);
  }
  if (!/cẩm nang masterise/i.test(detail)) {
    paragraphs.push(
      `<p>${escapeHtml(name)} là một trong những tiện ích tại dự án ${escapeHtml(projectName)}. Hãy theo dõi Cẩm nang Masterise để biết thêm nhiều thông tin hữu ích khác!</p>`,
    );
  }
  return paragraphs.join("");
}

// Accepts an embed iframe, an embed URL, a google.com/maps link or a
// maps.app.goo.gl short link, and returns something the store page can embed.
async function toMapEmbed(value: string) {
  if (!value) return "";
  if (/<iframe/i.test(value) && /google\.com\/maps\/embed/i.test(value)) return value;
  let url = safeUrl(value);
  if (!url) return "";
  if (/\/maps\/embed|output=embed/i.test(url)) return url;

  for (let hop = 0; hop < 4 && /goo\.gl|g\.co\//i.test(new URL(url).hostname + new URL(url).pathname); hop += 1) {
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10000) });
      const location = response.headers.get("location");
      if (!location) break;
      url = new URL(location, url).toString();
    } catch {
      break;
    }
  }

  const coords = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (coords) return `https://www.google.com/maps?q=${coords[1]},${coords[2]}&z=17&output=embed`;
  const place = url.match(/\/maps\/place\/([^/@?]+)/)?.[1];
  if (place) return `https://www.google.com/maps?q=${place}&output=embed`;
  const query = (() => {
    try {
      return new URL(url).searchParams.get("q") || new URL(url).searchParams.get("query");
    } catch {
      return null;
    }
  })();
  return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : "";
}

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function requireSecret(request: NextRequest) {
  const expected = process.env.STORE_SYNC_SECRET || "";
  if (!expected) throw statusError("Web chưa cấu hình STORE_SYNC_SECRET.", 503);
  const given = request.headers.get("x-store-sync-secret") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw statusError("Sai mã bảo mật.", 401);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

function statusError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

function errorResponse(error: unknown) {
  const status = error instanceof Error && "statusCode" in error ? Number(error.statusCode) : 500;
  const message = error instanceof Error ? error.message : "Lỗi không xác định.";
  if (status >= 500) console.error("store-submissions", error);
  return json({ message }, Number.isFinite(status) ? status : 500);
}
