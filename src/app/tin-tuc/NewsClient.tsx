"use client";

import { ArrowDownUp, Building2, ChevronDown, ChevronLeft, ChevronRight, FolderOpen, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { normalize } from "@/lib/helpers";
import type { SiteData } from "@/lib/site-types";
import { getProjectFromData } from "@/lib/site-utils";

const pageSize = 12;

type SortMode = "newest" | "oldest";

type NewsClientProps = {
  data: SiteData;
  initialProjectId?: string;
};

export function NewsClient({ data, initialProjectId = "all" }: NewsClientProps) {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("project") || initialProjectId;
  const [query, setQuery] = useState("");
  const initialProject = getProjectFromData(data, urlProjectId);
  const [projectId, setProjectId] = useState(initialProject?.id ?? "all");
  const [category, setCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const newsItems = data.newsItems;

  const projectNewsItems = useMemo(() => {
    if (projectId === "all") return newsItems;
    return newsItems.filter((item) => item.projectId === projectId);
  }, [newsItems, projectId]);

  const projectOptions = useMemo(
    () => [{ value: "all", label: "Tất cả dự án" }, ...data.projects.map((project) => ({ value: project.id, label: project.name }))],
    [data.projects],
  );
  const currentProjectOption = projectOptions.find((item) => item.value === projectId) ?? projectOptions[0];

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(projectNewsItems.map((item) => item.category)));
    return [{ value: "all", label: "Tất cả" }, ...categories.map((item) => ({ value: item, label: item }))];
  }, [projectNewsItems]);
  const currentCategoryOption = categoryOptions.find((item) => item.value === category) ?? categoryOptions[0];
  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "newest", label: "Mới nhất" },
    { value: "oldest", label: "Cũ nhất" },
  ];
  const currentSortOption = sortOptions.find((item) => item.value === sortMode) ?? sortOptions[0];

  const newsSuggestions = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];

    return projectNewsItems
      .filter((item) => {
        const project = getProjectFromData(data, item.projectId);
        const searchText = normalize(
          [item.title, item.excerpt, item.category, item.date, item.region, project?.name, project?.city, ...item.hashtags].join(" "),
        );

        return tokens.every((token) => searchText.includes(token));
      })
      .slice(0, 7);
  }, [data, projectNewsItems, query]);

  const filteredItems = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return projectNewsItems.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const project = getProjectFromData(data, item.projectId);
      const searchText = normalize([item.title, item.excerpt, item.category, item.date, item.region, project?.name, project?.city, ...item.hashtags].join(" "));
      const matchesQuery = !tokens.length || tokens.every((token) => searchText.includes(token));

      return matchesCategory && matchesQuery;
    });
  }, [category, data, projectNewsItems, query]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortMode === "oldest") return parseNewsDate(a.date) - parseNewsDate(b.date);

      return parseNewsDate(b.date) - parseNewsDate(a.date);
    });
  }, [filteredItems, sortMode]);

  const pageCount = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateQuery(value: string) {
    setQuery(value);
    setIsSuggestionOpen(true);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setIsCategoryOpen(false);
    setPage(1);
  }

  function updateProjectId(value: string) {
    setProjectId(value);
    setCategory("all");
    setIsProjectOpen(false);
    setIsCategoryOpen(false);
    setPage(1);
  }

  function updateSortMode(value: SortMode) {
    setSortMode(value);
    setIsSortOpen(false);
    setPage(1);
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
      <div className="mb-8 grid gap-4">
        <div
          className="filter-field search-suggest-field max-w-full rounded-lg border border-masterise-line sm:w-1/2 xl:w-1/4"
          ref={searchRef}
        >
          <Search size={19} aria-hidden className="text-masterise-primary" />
          <input
            id="newsSearchInput"
            className="filter-input"
            type="search"
            role="combobox"
            aria-label="Tìm bài viết"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={isSuggestionOpen && newsSuggestions.length > 0}
            aria-controls="newsSearchSuggestions"
            placeholder="Tìm bài viết..."
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => setIsSuggestionOpen(true)}
          />
          {isSuggestionOpen && newsSuggestions.length > 0 ? (
            <div className="search-suggestion-menu" id="newsSearchSuggestions" role="listbox">
              {newsSuggestions.map((item) => {
                const project = getProjectFromData(data, item.projectId);

                return (
                  <Link
                    key={item.id}
                    className="search-suggestion-option"
                    href={`/tin-tuc/${item.id}`}
                    role="option"
                    aria-selected="false"
                  >
                    <span className="search-suggestion-icon">
                      <Search size={16} aria-hidden />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.category}
                        {project ? ` · ${project.name}` : ""}
                      </small>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
            <div className="relative min-w-[240px]">
              <button
                className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-masterise-line bg-white px-4 text-sm font-semibold text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-dark focus:border-masterise-primary focus:outline-none"
                type="button"
                aria-label="Lọc bài viết theo dự án"
                aria-expanded={isProjectOpen}
                aria-haspopup="listbox"
                onClick={() => setIsProjectOpen((open) => !open)}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Building2 size={17} aria-hidden className="shrink-0 text-masterise-primary" />
                  <span className="truncate">{currentProjectOption.label}</span>
                </span>
                <ChevronDown size={17} aria-hidden className={isProjectOpen ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} />
              </button>

              {isProjectOpen ? (
                <div
                  className="absolute left-0 top-[calc(100%+8px)] z-30 grid max-h-72 min-w-full gap-1 overflow-y-auto rounded-lg border border-masterise-line bg-white p-1.5 shadow-masterise"
                  role="listbox"
                >
                  {projectOptions.map((item) => (
                    <button
                      key={item.value}
                      className={`rounded-md px-3 py-2.5 text-left text-sm font-semibold transition ${
                        item.value === projectId
                          ? "bg-masterise-primary text-white"
                          : "text-masterise-muted hover:bg-masterise-soft hover:text-masterise-dark"
                      }`}
                      type="button"
                      role="option"
                      aria-selected={item.value === projectId}
                      onClick={() => updateProjectId(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative min-w-[220px]">
              <button
                className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-masterise-line bg-white px-4 text-sm font-semibold text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-dark focus:border-masterise-primary focus:outline-none"
                type="button"
                aria-label="Lọc bài viết theo chuyên mục"
                aria-expanded={isCategoryOpen}
                aria-haspopup="listbox"
                onClick={() => setIsCategoryOpen((open) => !open)}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <FolderOpen size={17} aria-hidden className="shrink-0 text-masterise-primary" />
                  <span className="truncate">{currentCategoryOption.label}</span>
                </span>
                <ChevronDown size={17} aria-hidden className={isCategoryOpen ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} />
              </button>

              {isCategoryOpen ? (
                <div
                  className="absolute left-0 top-[calc(100%+8px)] z-30 grid max-h-72 min-w-full gap-1 overflow-y-auto rounded-lg border border-masterise-line bg-white p-1.5 shadow-masterise"
                  role="listbox"
                >
                  {categoryOptions.map((item) => (
                    <button
                      key={item.value}
                      className={`rounded-md px-3 py-2.5 text-left text-sm font-semibold transition ${
                        item.value === category
                          ? "bg-masterise-primary text-white"
                          : "text-masterise-muted hover:bg-masterise-soft hover:text-masterise-dark"
                      }`}
                      type="button"
                      role="option"
                      aria-selected={item.value === category}
                      onClick={() => updateCategory(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative">
            <button
              className="inline-flex min-h-11 min-w-40 items-center justify-between gap-3 rounded-lg border border-masterise-line bg-white px-4 text-sm font-semibold text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-dark focus:border-masterise-primary focus:outline-none"
              type="button"
              aria-label="Sắp xếp bài viết"
              aria-expanded={isSortOpen}
              aria-haspopup="listbox"
              onClick={() => setIsSortOpen((open) => !open)}
            >
              <span className="inline-flex items-center gap-2">
                <ArrowDownUp size={17} aria-hidden className="text-masterise-primary" />
                {currentSortOption.label}
              </span>
              <ChevronDown size={17} aria-hidden className={isSortOpen ? "rotate-180 transition" : "transition"} />
            </button>

            {isSortOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+8px)] z-30 grid min-w-40 gap-1 rounded-lg border border-masterise-line bg-white p-1.5 shadow-masterise"
                role="listbox"
              >
                {sortOptions.map((item) => (
                  <button
                    key={item.value}
                    className={`rounded-md px-3 py-2.5 text-left text-sm font-semibold transition ${
                      item.value === sortMode
                        ? "bg-masterise-primary text-white"
                        : "text-masterise-muted hover:bg-masterise-soft hover:text-masterise-dark"
                    }`}
                    type="button"
                    role="option"
                    aria-selected={item.value === sortMode}
                    onClick={() => updateSortMode(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-masterise-muted">
          Hiển thị {visibleItems.length} / {sortedItems.length} bài viết
        </p>
        {pageCount > 1 ? (
          <p className="text-sm text-masterise-muted">
            Trang {currentPage} / {pageCount}
          </p>
        ) : null}
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
        {visibleItems.length ? (
          visibleItems.map((item) => <NewsCard key={item.id} item={item} projects={data.projects} regionMeta={data.regionMeta} />)
        ) : (
          <div className="rounded-lg border border-masterise-line bg-white p-6 text-masterise-muted">
            Không tìm thấy bài viết phù hợp.
          </div>
        )}
      </div>

      {pageCount > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang tin tức">
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
              className={`grid h-11 w-11 place-items-center rounded-full border text-sm font-bold transition ${
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

function parseNewsDate(date: string) {
  const [day, month, year] = date.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}
