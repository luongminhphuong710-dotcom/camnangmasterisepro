"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, ChevronDown, ChevronLeft, ChevronRight, Search, Store as StoreIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent } from "react";
import { StoreCard } from "@/components/StoreCard";
import type { SiteData, Store } from "@/lib/site-types";
import { getCategoryFromList, getProjectFromData, normalize } from "@/lib/site-utils";
import {
  buildStoresListUrl,
  clearOpenedFromList,
  getRememberedProject,
  markOpenedFromList,
  rememberProject,
  rememberStoresList,
  storeIdFromHref,
} from "@/lib/store-navigation";

const pageSize = 12;
const hiddenClientCategoryIds = new Set(["unassigned"]);

type StoresClientProps = {
  data: SiteData;
  initialCategory?: string;
  initialProjectId?: string;
};

export function StoresClient({ data, initialCategory = "all", initialProjectId = "all" }: StoresClientProps) {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get("category") || initialCategory;
  const urlProjectId = searchParams.get("project") || initialProjectId;
  const urlQuery = searchParams.get("q") || "";
  const urlPage = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const { fallbackImage, projects, storeCategories, stores } = data;
  const visibleStoreCategories = useMemo(
    () => storeCategories.filter((category) => !isHiddenClientCategory(category.id, category.label)),
    [storeCategories],
  );
  const visibleStores = useMemo(
    () => stores.filter((store) => !isHiddenClientCategory(store.category, getCategoryFromList(storeCategories, store.category).label)),
    [storeCategories, stores],
  );
  const initialProject = getProjectFromData(data, urlProjectId);
  const hasInitialCategory = visibleStoreCategories.some((item) => item.id === urlCategory);
  // No project in the URL: start from the project the visitor picked last time
  // (residents browse their own project). An explicit ?project= always wins.
  const rememberedProjectId = useSyncExternalStore(subscribeToNothing, getRememberedProject, getNoRememberedProject);
  const [selectedProjectId, setProjectId] = useState<string | null>(
    searchParams.has("project") ? (initialProject?.id ?? "all") : null,
  );
  const projectId =
    selectedProjectId ??
    (rememberedProjectId && projects.some((project) => project.id === rememberedProjectId) ? rememberedProjectId : "all");
  const [category, setCategory] = useState(hasInitialCategory ? urlCategory : "all");
  const [query, setQuery] = useState(urlQuery);
  const [projectQuery, setProjectQuery] = useState("");
  const [page, setPage] = useState(urlPage);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const projectOptions = useMemo(
    () => [{ value: "all", label: "Tất cả dự án" }, ...projects.map((project) => ({ value: project.id, label: project.name }))],
    [projects],
  );
  const currentProjectOption = projectOptions.find((option) => option.value === projectId) ?? projectOptions[0];
  const filteredProjectOptions = useMemo(() => {
    const token = normalize(projectQuery);
    if (!token) return projectOptions;

    return projectOptions.filter((option) => normalize(option.label).includes(token));
  }, [projectOptions, projectQuery]);

  const storeSuggestions = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];

    return visibleStores
      .filter((store) => {
        const project = getProjectFromData(data, store.projectId);
        const storeCategory = getCategoryFromList(storeCategories, store.category);
        const searchText = normalize(
          [store.name, store.note, store.floor, store.hours, storeCategory.label, project?.name, project?.city].join(" "),
        );
        return tokens.every((token) => searchText.includes(token));
      })
      .slice(0, 7);
  }, [data, query, storeCategories, visibleStores]);

  const items = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return visibleStores
      .filter((store) => {
        const project = getProjectFromData(data, store.projectId);
        if (!project) return false;
        const matchesProject = projectId === "all" || project.id === projectId;
        const matchesCategory = category === "all" || store.category === category;
        const storeCategory = getCategoryFromList(storeCategories, store.category);
        const searchText = normalize(
          [store.name, store.note, store.floor, store.hours, storeCategory.label, project.name, project.location, project.city].join(" "),
        );
        const matchesQuery = !tokens.length || tokens.every((token) => searchText.includes(token));
        return matchesProject && matchesCategory && matchesQuery;
      })
      .sort((a, b) => storeRating(b) - storeRating(a));
  }, [category, data, projectId, query, storeCategories, visibleStores]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateProject(value: string) {
    setProjectId(value);
    setPage(1);
    rememberProject(value);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  // Back on the list: any "opened from the list" flag left from an earlier
  // visit is stale now.
  useEffect(() => {
    clearOpenedFromList();
  }, []);

  // Mirror the filters in the URL so the browser Back button, shared links and
  // the store detail page all return to exactly this list.
  useEffect(() => {
    const url = buildStoresListUrl({ projectId, category, query, page: currentPage });
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(window.history.state, "", url);
    }
    rememberStoresList(url);
  }, [category, currentPage, projectId, query]);

  function rememberOpenedStore(event: ReactMouseEvent<HTMLElement>) {
    const link = (event.target as HTMLElement).closest("a");
    const storeId = storeIdFromHref(link?.getAttribute("href") ?? null);
    if (storeId) markOpenedFromList(storeId);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setIsSuggestionOpen(true);
  }

  function closeProjectDialog() {
    setIsProjectOpen(false);
    setProjectQuery("");
  }

  useEffect(() => {
    function closeSuggestions(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSuggestionOpen(false);
      }
    }

    document.addEventListener("click", closeSuggestions);
    return () => document.removeEventListener("click", closeSuggestions);
  }, []);

  return (
    <>
      <div className="catalog-filter-bar mb-8 grid gap-3 rounded-lg border border-masterise-line bg-white p-4 md:grid-cols-2" onClickCapture={rememberOpenedStore}>
        <div className="filter-field rounded-lg border border-masterise-line">
          <Building2 size={19} aria-hidden className="text-masterise-primary" />
          <div className="store-project-select">
            <button
              className="store-project-select-button"
              type="button"
              aria-label="Lọc theo dự án"
              aria-expanded={isProjectOpen}
              aria-haspopup="dialog"
              onClick={(event) => {
                event.stopPropagation();
                setIsProjectOpen((open) => !open);
              }}
            >
              <span>{currentProjectOption.label}</span>
              <ChevronDown size={18} aria-hidden className={isProjectOpen ? "rotate-180 transition" : "transition"} />
            </button>
          </div>
        </div>
        <div className="filter-field search-suggest-field rounded-lg border border-masterise-line" ref={searchRef}>
          <Search size={19} aria-hidden className="text-masterise-primary" />
          <input
            id="storeSearchInput"
            className="filter-input"
            type="search"
            role="combobox"
            aria-label="Tìm gian hàng hoặc dịch vụ"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={isSuggestionOpen && storeSuggestions.length > 0}
            aria-controls="storeSearchSuggestions"
            placeholder="Tìm gian hàng..."
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => setIsSuggestionOpen(true)}
          />
          {isSuggestionOpen && storeSuggestions.length > 0 ? (
            <div className="search-suggestion-menu" id="storeSearchSuggestions" role="listbox">
              {storeSuggestions.map((store) => {
                const project = getProjectFromData(data, store.projectId);
                const categoryLabel = getCategoryFromList(storeCategories, store.category).label;

                return (
                  <Link
                    key={store.id}
                    className="search-suggestion-option"
                    href={`/gian-hang/${store.id}`}
                    role="option"
                    aria-selected="false"
                  >
                    <span className="search-suggestion-icon">
                      <StoreIcon size={16} aria-hidden />
                    </span>
                    <span>
                      <strong>{store.name}</strong>
                      <small>
                        {categoryLabel}
                        {project ? ` · ${project.name}` : ""}
                      </small>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {isProjectOpen ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Chọn dự án"
          onClick={closeProjectDialog}
        >
          <div
            className="grid max-h-[82vh] w-full max-w-2xl gap-4 overflow-hidden rounded-lg bg-white p-4 shadow-masterise"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-masterise-line pb-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-masterise-ink">
                <Building2 size={21} aria-hidden className="text-masterise-primary" />
                Chọn dự án
              </div>
              <button
                className="grid h-10 w-10 place-items-center rounded-full bg-masterise-surface text-masterise-primary transition hover:bg-masterise-primary hover:text-white focus:bg-masterise-primary focus:text-white focus:outline-none"
                type="button"
                aria-label="Đóng chọn dự án"
                onClick={closeProjectDialog}
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <label className="filter-field min-h-12 rounded-lg border border-masterise-line" htmlFor="projectSearchInput">
              <Search size={18} aria-hidden className="text-masterise-primary" />
              <input
                id="projectSearchInput"
                className="filter-input"
                type="search"
                aria-label="Tìm tên dự án"
                autoComplete="off"
                autoFocus
                placeholder="Tìm tên dự án..."
                value={projectQuery}
                onChange={(event) => setProjectQuery(event.target.value)}
              />
            </label>

            <div className="grid max-h-[64vh] gap-2 overflow-auto pr-1" role="listbox">
              {filteredProjectOptions.length ? (
                filteredProjectOptions.map((option) => (
                <button
                  key={option.value}
                  className={`flex min-h-12 items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-semibold transition ${
                    option.value === projectId
                      ? "bg-masterise-primary text-white"
                      : "text-masterise-ink hover:bg-masterise-soft hover:text-masterise-dark"
                  }`}
                  type="button"
                  role="option"
                  aria-selected={option.value === projectId}
                  onClick={() => {
                    updateProject(option.value);
                    closeProjectDialog();
                  }}
                >
                  <Building2 size={17} aria-hidden className="shrink-0" />
                  <span>{option.label}</span>
                </button>
                ))
              ) : (
                <p className="rounded-lg bg-masterise-surface p-4 text-sm font-semibold text-masterise-muted">
                  Không tìm thấy dự án phù hợp.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="chip-row mb-8">
        {visibleStoreCategories.map((item) => (
          <button
            key={item.id}
            className={`chip ${category === item.id ? "active" : ""}`}
            type="button"
            aria-pressed={category === item.id}
            onClick={() => updateCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-masterise-muted">
          Hiển thị {visibleItems.length} / {items.length} kết quả
        </p>
        {pageCount > 1 ? (
          <p className="text-sm text-masterise-muted">
            Trang {currentPage} / {pageCount}
          </p>
        ) : null}
      </div>

      <div className="store-grid" onClickCapture={rememberOpenedStore}>
        {visibleItems.length ? (
          visibleItems.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              project={getProjectFromData(data, store.projectId)}
              fallbackImage={fallbackImage}
              storeCategories={storeCategories}
            />
          ))
        ) : (
          <div className="rounded-lg border border-masterise-line bg-white p-6 text-masterise-muted">
            Không tìm thấy gian hàng hoặc dịch vụ phù hợp.
          </div>
        )}
      </div>

      {pageCount > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang gian hàng">
          <button
            className="secondary-button h-11 w-11 rounded-full px-0"
            type="button"
            aria-label="Trang trước"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
            <button
              key={item}
              className={`grid h-11 w-11 place-items-center rounded-full border text-sm font-semibold transition ${
                item === currentPage
                  ? "border-masterise-primary bg-masterise-primary text-white"
                  : "border-masterise-primary bg-white text-masterise-primary hover:bg-masterise-soft"
              }`}
              type="button"
              aria-current={item === currentPage ? "page" : undefined}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ))}
          <button
            className="secondary-button h-11 w-11 rounded-full px-0"
            type="button"
            aria-label="Trang sau"
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </nav>
      ) : null}
    </>
  );
}

function subscribeToNothing() {
  return () => undefined;
}

function getNoRememberedProject() {
  return null;
}

function storeRating(store: Store) {
  const reviews = "reviews" in store && Array.isArray(store.reviews) ? store.reviews : [];
  if (!reviews.length) return Number(store.rating || 0);
  return reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
}

function isHiddenClientCategory(id: string, label = "") {
  return hiddenClientCategoryIds.has(id) || normalize(label) === "chua xac dinh";
}
