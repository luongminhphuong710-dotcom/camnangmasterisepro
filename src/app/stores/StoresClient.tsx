"use client";

import { Building2, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { StoreCard } from "@/components/StoreCard";
import { projects, storeCategories, stores } from "@/lib/data";
import { getCategory, getProject, normalize } from "@/lib/helpers";

const pageSize = 12;

type StoresClientProps = {
  initialCategory?: string;
  initialProjectId?: string;
};

export function StoresClient({ initialCategory = "all", initialProjectId = "all" }: StoresClientProps) {
  const initialProject = getProject(initialProjectId);
  const hasInitialCategory = storeCategories.some((item) => item.id === initialCategory);
  const [projectId, setProjectId] = useState(initialProject?.id ?? "all");
  const [category, setCategory] = useState(hasInitialCategory ? initialCategory : "all");
  const [query, setQuery] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const projectOptions = useMemo(
    () => [{ value: "all", label: "Tất cả dự án" }, ...projects.map((project) => ({ value: project.id, label: project.name }))],
    [],
  );
  const currentProjectOption = projectOptions.find((option) => option.value === projectId) ?? projectOptions[0];
  const filteredProjectOptions = useMemo(() => {
    const token = normalize(projectQuery);
    if (!token) return projectOptions;

    return projectOptions.filter((option) => normalize(option.label).includes(token));
  }, [projectOptions, projectQuery]);

  const items = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return stores
      .filter((store) => {
        const project = getProject(store.projectId);
        if (!project) return false;
        const storeCategory = getCategory(store.category);
        const matchesProject = projectId === "all" || project.id === projectId;
        const matchesCategory = category === "all" || store.category === category;
        const searchText = normalize(
          [
            "gian hàng",
            "dịch vụ",
            store.name,
            store.note,
            store.floor,
            store.hours,
            store.category,
            storeCategory.label,
            project.name,
            project.city,
            project.location,
            project.segment,
          ].join(" "),
        );
        const matchesQuery = !tokens.length || tokens.every((token) => searchText.includes(token));
        return matchesProject && matchesCategory && matchesQuery;
      })
      .sort((a, b) => b.rating - a.rating);
  }, [category, projectId, query]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateProject(value: string) {
    setProjectId(value);
    setPage(1);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setProjectId("all");
    setQuery("");
    setPage(1);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setCategory("all");
    setPage(1);
  }

  function closeProjectDialog() {
    setIsProjectOpen(false);
    setProjectQuery("");
  }

  return (
    <>
      <div className="mb-8 grid gap-3 rounded-lg border border-masterise-line bg-white p-4 md:grid-cols-2">
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
        <label className="filter-field rounded-lg border border-masterise-line" htmlFor="storeSearchInput">
          <Search size={19} aria-hidden className="text-masterise-primary" />
          <input
            id="storeSearchInput"
            className="filter-input"
            type="search"
            aria-label="Tìm gian hàng hoặc dịch vụ"
            autoComplete="off"
            placeholder="Tìm gian hàng..."
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
          />
        </label>
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
              <div className="flex items-center gap-2 text-lg font-extrabold text-masterise-ink">
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
                  className={`flex min-h-12 items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-bold transition ${
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
        {storeCategories.map((item) => (
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

      <div className="store-grid">
        {visibleItems.length ? (
          visibleItems.map((store) => <StoreCard key={store.id} store={store} project={getProject(store.projectId)} />)
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
