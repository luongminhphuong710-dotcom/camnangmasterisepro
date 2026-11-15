// Validates src/content/news-queue.json before the content automation pushes it.
// Usage: node scripts/check-news-queue.mjs
import { readFileSync } from "node:fs";

const file = new URL("../src/content/news-queue.json", import.meta.url);
const errors = [];
let queue;

try {
  queue = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.error(`news-queue.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (!Array.isArray(queue)) {
  console.error("news-queue.json must be a JSON array.");
  process.exit(1);
}

const REGIONS = new Set(["", "north", "central", "south"]);
const seen = new Set();
const imagesUsed = new Map();

// Image hosts allowed by next/image (next.config.ts remotePatterns).
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const allowedHosts = [...nextConfig.matchAll(/hostname:\s*"([^"]+)"/g)].map((match) => match[1]);
const hostAllowed = (host) =>
  allowedHosts.some((pattern) =>
    pattern.startsWith("**.") ? host === pattern.slice(3) || host.endsWith(pattern.slice(2)) : host === pattern,
  );

queue.forEach((item, index) => {
  const at = `#${index} (${item?.id ?? "no id"})`;
  if (!item || typeof item !== "object") return errors.push(`${at}: not an object`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || "")) errors.push(`${at}: id must be a lowercase ASCII slug`);
  if (seen.has(item.id)) errors.push(`${at}: duplicate id`);
  seen.add(item.id);
  for (const key of ["title", "date", "image", "excerpt", "contentHtml"]) {
    if (typeof item[key] !== "string" || !item[key].trim()) errors.push(`${at}: missing ${key}`);
  }
  if (item.date && !/^\d{2}\/\d{2}\/\d{4}$/.test(item.date)) errors.push(`${at}: date must be dd/mm/yyyy`);
  if (item.image && !/^https:\/\//.test(item.image)) errors.push(`${at}: image must be an https URL`);
  if (item.image && /^https:\/\//.test(item.image)) {
    const host = new URL(item.image).hostname;
    if (!hostAllowed(host)) errors.push(`${at}: image host ${host} is not in next.config.ts images.remotePatterns (add it in the same commit)`);
    if (imagesUsed.has(item.image)) errors.push(`${at}: image already used by ${imagesUsed.get(item.image)} (each article needs its own cover)`);
    else imagesUsed.set(item.image, item.id);
  }
  if (item.region !== undefined && !REGIONS.has(item.region)) errors.push(`${at}: region must be north, central, south or empty`);
  if (item.hashtags !== undefined && !Array.isArray(item.hashtags)) errors.push(`${at}: hashtags must be an array`);
  if (item.title && item.title.length > 120) errors.push(`${at}: title longer than 120 characters`);
  if (item.excerpt && (item.excerpt.length < 80 || item.excerpt.length > 200)) errors.push(`${at}: excerpt should be 80-200 characters (meta description)`);
  if (/<\s*(script|style|iframe)\b|\son\w+=|javascript:/i.test(item.contentHtml || "")) errors.push(`${at}: contentHtml contains disallowed markup`);
  if (/<h1\b/i.test(item.contentHtml || "")) errors.push(`${at}: contentHtml must not contain <h1> (the page title is the h1)`);
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`news-queue.json OK: ${queue.length} article(s).`);
