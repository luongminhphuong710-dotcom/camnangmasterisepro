"use client";

import { ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { newsItems } from "@/lib/data";
import { getProject, normalize } from "@/lib/helpers";

const pageSize = 12;

type SortMode = "newest" | "oldest" | "popular";

const viewCountById: Record<string, number> = {
  "ky-nang-so-cuu-cu-dan-nhi": 2380,
  "happy-aqua-kids-summer": 1960,
  "gia-chinh-sach-masteri-grand-coast": 1740,
  "wellness-masteri-waterfront": 1520,
  "masteri-rivera-danang-nhip-song-moi": 1180,
  "quoc-khanh-ngoi-nha-masterise": 980,
};

export function NewsClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [page, setPage] = useState(1);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(newsItems.map((item) => item.category)));
    return [{ value: "all", label: "Tất cả" }, ...categories.map((item) => ({ value: item, label: item }))];
  }, []);
  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "newest", label: "Mới nhất" },
    { value: "oldest", label: "Cũ nhất" },
    { value: "popular", label: "Đọc nhiều" },
  ];
  const currentSortOption = sortOptions.find((item) => item.value === sortMode) ?? sortOptions[0];

  const filteredItems = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);

    return newsItems.filter((item) => {
      const project = getProject(item.projectId);
      const matchesCategory = category === "all" || item.category === category;
      const searchText = normalize(
        [
          item.title,
          item.excerpt,
          item.category,
          item.date,
          item.region,
          project?.name,
          project?.city,
          project?.location,
          ...item.hashtags,
        ].join(" "),
      );
      const matchesQuery = !tokens.length || tokens.every((token) => searchText.includes(token));

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortMode === "oldest") return parseNewsDate(a.date) - parseNewsDate(b.date);
      if (sortMode === "popular") return (viewCountById[b.id] ?? 0) - (viewCountById[a.id] ?? 0);

      return parseNewsDate(b.date) - parseNewsDate(a.date);
    });
  }, [filteredItems, sortMode]);

  const pageCount = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  function updateSortMode(value: SortMode) {
    setSortMode(value);
    setIsSortOpen(false);
    setPage(1);
  }

  return (
    <>
      <div className="mb-8 grid gap-4">
        <label className="filter-field max-w-full rounded-lg border border-masterise-line sm:w-1/2 xl:w-1/4" htmlFor="newsSearchInput">
          <Search size={19} aria-hidden className="text-masterise-primary" />
          <input
            id="newsSearchInput"
            className="filter-input"
            type="search"
            aria-label="Tìm bài viết"
            autoComplete="off"
            placeholder="Tìm bài viết..."
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="chip-row" aria-label="Lọc bài viết theo chủ đề">
            {categoryOptions.map((item) => (
              <button
                key={item.value}
                className={`chip ${category === item.value ? "active" : ""}`}
                type="button"
                aria-pressed={category === item.value}
                onClick={() => updateCategory(item.value)}
              >
                {item.label}
              </button>
            ))}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleItems.length ? (
          visibleItems.map((item) => <NewsCard key={item.id} item={item} />)
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
