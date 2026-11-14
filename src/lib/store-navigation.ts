// Keeps the visitor inside the project they are browsing when they move between
// the store list and a store detail page. Storage is best-effort: it can be
// unavailable (private mode, blocked cookies), so every access is guarded.

const LAST_LIST_URL_KEY = "camnang:stores:lastListUrl";
const LAST_PROJECT_KEY = "camnang:stores:lastProjectId";
const OPENED_FROM_LIST_KEY = "camnang:stores:openedFromList";

function read(storage: "local" | "session", key: string) {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(storage: "local" | "session", key: string, value: string | null) {
  try {
    const target = storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    // Storage unavailable: navigation still works with the URL alone.
  }
}

export function buildStoresListUrl({
  projectId,
  category,
  query,
  page,
}: {
  projectId?: string;
  category?: string;
  query?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  // "all" is written explicitly so a deliberate "all projects" choice is not
  // replaced by the remembered project when the visitor comes back.
  if (projectId) params.set("project", projectId);
  if (category && category !== "all") params.set("category", category);
  if (query?.trim()) params.set("q", query.trim());
  if (page && page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/gian-hang?${search}` : "/gian-hang";
}

export function rememberStoresList(url: string) {
  write("session", LAST_LIST_URL_KEY, url);
}

export function getRememberedStoresList() {
  return read("session", LAST_LIST_URL_KEY);
}

export function rememberProject(projectId: string) {
  write("local", LAST_PROJECT_KEY, projectId);
}

export function getRememberedProject() {
  return read("local", LAST_PROJECT_KEY);
}

export function markOpenedFromList(storeId: string) {
  write("session", OPENED_FROM_LIST_KEY, storeId);
}

export function wasOpenedFromList(storeId: string) {
  return read("session", OPENED_FROM_LIST_KEY) === storeId;
}

export function clearOpenedFromList() {
  write("session", OPENED_FROM_LIST_KEY, null);
}

export function storeIdFromHref(href: string | null) {
  const match = href?.match(/^\/gian-hang\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
