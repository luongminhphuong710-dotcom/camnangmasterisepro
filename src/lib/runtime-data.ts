import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { camnangData } from "@/lib/data";
import type { SiteData } from "@/lib/site-types";

type CmsConfig = {
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubPath: string;
};

export async function getSiteData(): Promise<SiteData> {
  noStore();

  try {
    if (process.env.NODE_ENV === "production" && getConfig().githubToken) {
      return normalizeSiteData(await readGithubSiteData());
    }
    return normalizeSiteData(parseDataSource(await readLocalDataSource()));
  } catch {
    return normalizeSiteData(camnangData);
  }
}

async function readLocalDataSource() {
  return readFile(localDataPath(), "utf8");
}

async function readGithubSiteData() {
  const config = getConfig();
  const response = await fetch(githubFileUrl(), {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub data API failed: ${response.status}`);
  const file = await response.json();
  return parseDataSource(decodeBase64(file.content));
}

function getConfig(): CmsConfig {
  return {
    githubToken: process.env.CMS_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
    githubOwner: process.env.CMS_GITHUB_OWNER || "luongminhphuong710-dotcom",
    githubRepo: process.env.CMS_GITHUB_REPO || "camnangmasterisepro",
    githubBranch: process.env.CMS_GITHUB_BRANCH || "main",
    githubPath: process.env.CMS_DATA_PATH || "src/lib/data.ts",
  };
}

function githubFileUrl() {
  const config = getConfig();
  return `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/contents/${encodeURIComponent(
    config.githubPath,
  )}?ref=${encodeURIComponent(config.githubBranch)}`;
}

function localDataPath() {
  const configuredPath = process.env.CMS_DATA_PATH;
  return configuredPath
    ? path.join(/* turbopackIgnore: true */ process.cwd(), configuredPath)
    : path.join(process.cwd(), "src", "lib", "data.ts");
}

function parseDataSource(source: string) {
  const match = source.match(/export\s+const\s+camnangData\s*=\s*([\s\S]*?)\s+as\s+const\s*;/);
  if (!match?.[1]) throw new Error("Cannot find camnangData.");
  return new Function(`return (${match[1]});`)();
}

function decodeBase64(value: string) {
  return Buffer.from(String(value || "").replace(/\s/g, ""), "base64").toString("utf8");
}

function normalizeSiteData(value: unknown): SiteData {
  const source = value as Partial<SiteData>;
  return {
    fallbackImage: source.fallbackImage || camnangData.fallbackImage,
    regionMeta: source.regionMeta || camnangData.regionMeta,
    projects: Array.isArray(source.projects) ? source.projects : [],
    storeCategories: Array.isArray(source.storeCategories) ? source.storeCategories : [],
    stores: Array.isArray(source.stores) ? source.stores : [],
    newsItems: Array.isArray(source.newsItems) ? source.newsItems : [],
  };
}
