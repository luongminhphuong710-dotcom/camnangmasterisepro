"use client";

import { Map, MapPin, Search, Tags } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionHeading } from "@/components/SectionHeading";
import { ThemeSelect } from "@/components/ThemeSelect";
import { camnangData } from "@/lib/data";
import type { SiteData } from "@/lib/site-types";
import { normalize } from "@/lib/site-utils";

export default function ProjectsPage() {
  const [data, setData] = useState<SiteData>(() => camnangData);
  const { projects, regionMeta, stores } = data;
  const [region, setRegion] = useState("all");
  const [city, setCity] = useState("all");
  const [segment, setSegment] = useState("all");
  const [query, setQuery] = useState("");
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
      .filter((project) =>
        normalize([project.name, project.city, project.location, project.segment, project.status, project.summary].join(" ")).includes(text),
      )
      .slice(0, 7);
  }, [projects, query]);

  const items = useMemo(() => {
    return projects.filter((project) => {
      const matchesRegion = region === "all" || project.region === region;
      const matchesCity = city === "all" || project.city === city;
      const matchesSegment = segment === "all" || project.segment === segment;
      return matchesRegion && matchesCity && matchesSegment;
    });
  }, [city, projects, region, segment]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const response = await fetch("/api/site-data", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json().catch(() => ({}));
      if (!cancelled && payload.data) setData(payload.data);
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

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
            }}
          />
        </div>
        <div className="filter-field rounded-lg border border-masterise-line">
          <MapPin size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect label="Lọc theo tỉnh" value={city} options={cityOptions} onChange={setCity} />
        </div>
        <div className="filter-field rounded-lg border border-masterise-line">
          <Tags size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect label="Lọc theo phân khúc" value={segment} options={segmentOptions} onChange={setSegment} />
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
                  href={`/projects/${project.id}`}
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

      <div className="project-grid">
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} regionMeta={regionMeta} stores={stores} />
        ))}
      </div>
    </main>
  );
}
