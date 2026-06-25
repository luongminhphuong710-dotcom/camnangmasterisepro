"use client";

import { ChevronLeft, ChevronRight, Map, MapPin, Search, Tags } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionHeading } from "@/components/SectionHeading";
import { ThemeSelect } from "@/components/ThemeSelect";
import { camnangData } from "@/lib/data";
import type { SiteData } from "@/lib/site-types";
import { normalize } from "@/lib/site-utils";

const pageSize = 9;

export function ProjectsClient({ initialData = camnangData }: { initialData?: SiteData }) {
  const [data] = useState<SiteData>(() => initialData);
  const { projects, regionMeta, stores } = data;
  const [region, setRegion] = useState("all");
  const [city, setCity] = useState("all");
  const [segment, setSegment] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const regionOptions = Object.entries(regionMeta).map(([value, meta]) => ({ value, label: meta.label || value }));
  const cityOptions = useMemo(() => {
    const cities = Array.from(new Set(projects.filter((project) => region === "all" || project.region === region).map((project) => project.city)));
    return [{ value: "all", label: "Tất cả tỉnh/thành" }, ...cities.map((item) => ({ value: item, label: item }))];
  }, [projects, region]);
  const segmentOptions = useMemo(() => {
    const segments = Array.from(new Set(projects.map((project) => project.segment)));
    return [{ value: "all", label: "Tất cả phân khúc" }, ...segments.map((item) => ({ value: item, label: item }))];
  }, [projects]);

  const projectSuggestions = useMemo(() => {
    const text = normalize(query);
    if (!text) return [];

    return projects
      .filter((project) => normalize([project.name, project.city, project.location, project.segment, project.summary].join(" ")).includes(text))
      .slice(0, 7);
  }, [projects, query]);

  const items = useMemo(() => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return projects.filter((project) => {
      const matchesRegion = region === "all" || project.region === region;
      const matchesCity = city === "all" || project.city === city;
      const matchesSegment = segment === "all" || project.segment === segment;
      const searchText = normalize([project.name, project.city, project.location, project.segment, project.summary].join(" "));
      const matchesQuery = !tokens.length || tokens.every((token) => searchText.includes(token));
      return matchesRegion && matchesCity && matchesSegment && matchesQuery;
    });
  }, [city, projects, query, region, segment]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resultStart = items.length ? (currentPage - 1) * pageSize + 1 : 0;
  const resultEnd = Math.min(currentPage * pageSize, items.length);

  function resetPage() {
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
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="Dự án"
        title="Khám phá nơi mình sống"
        description="Lọc theo miền, tỉnh thành và phân khúc để xem danh sách dự án Masterise phù hợp."
      />

      <div className="mb-8 grid gap-3 rounded-lg border border-masterise-line bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="filter-field rounded-lg border border-masterise-line">
          <Map size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect
            label="Lọc theo miền"
            value={region}
            options={regionOptions}
            onChange={(value) => {
              setRegion(value);
              setCity("all");
              resetPage();
            }}
          />
        </div>
        <div className="filter-field rounded-lg border border-masterise-line">
          <MapPin size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect
            label="Lọc theo tỉnh"
            value={city}
            options={cityOptions}
            onChange={(value) => {
              setCity(value);
              resetPage();
            }}
          />
        </div>
        <div className="filter-field rounded-lg border border-masterise-line">
          <Tags size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect
            label="Lọc theo phân khúc"
            value={segment}
            options={segmentOptions}
            onChange={(value) => {
              setSegment(value);
              resetPage();
            }}
          />
        </div>
        <div className="filter-field search-suggest-field rounded-lg border border-masterise-line" ref={searchRef}>
          <Search size={19} aria-hidden className="text-masterise-primary" />
          <input
            id="projectSearchInput"
            className="filter-input"
            type="search"
            role="combobox"
            aria-label="Tìm dự án"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={isSuggestionOpen && projectSuggestions.length > 0}
            aria-controls="projectSearchSuggestions"
            placeholder="Tìm dự án..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPage();
              setIsSuggestionOpen(true);
            }}
            onFocus={() => setIsSuggestionOpen(true)}
          />
          {isSuggestionOpen && projectSuggestions.length > 0 ? (
            <div className="search-suggestion-menu" id="projectSearchSuggestions" role="listbox">
              {projectSuggestions.map((project) => (
                <Link
                  key={project.id}
                  className="search-suggestion-option"
                  href={`/du-an/${project.id}`}
                  role="option"
                  aria-selected="false"
                >
                  <span className="search-suggestion-icon">
                    <MapPin size={16} aria-hidden />
                  </span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>
                      {project.city} · {project.segment}
                    </small>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-masterise-muted">
          Tổng số {items.length} dự án, hiển thị {resultStart}-{resultEnd}
        </p>
        {pageCount > 1 ? (
          <p className="text-sm text-masterise-muted">
            Trang {currentPage} / {pageCount}
          </p>
        ) : null}
      </div>

      <div className="project-grid">
        {visibleItems.map((project) => (
          <ProjectCard key={project.id} project={project} regionMeta={regionMeta} stores={stores} />
        ))}
      </div>

      {pageCount > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Phân trang dự án">
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
    </main>
  );
}
