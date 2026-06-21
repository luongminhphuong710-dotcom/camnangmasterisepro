"use client";

import Link from "next/link";
import { Search, SlidersHorizontal, Store as StoreIcon, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StoreCard } from "@/components/StoreCard";
import { ThemeSelect } from "@/components/ThemeSelect";
import { storeCategories, stores } from "@/lib/data";
import { distanceInKm, getCategory, getProject, normalize, projectCoordinates } from "@/lib/helpers";

const radiusOptions = [
  { value: "3", label: "Trong 3 km" },
  { value: "5", label: "Trong 5 km" },
  { value: "10", label: "Trong 10 km" },
  { value: "20", label: "Trong 20 km" },
];

export default function NearMePage() {
  const [location] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState("10");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const categoryOptions = storeCategories.map((item) => ({ value: item.id, label: item.label }));

  const storeSuggestions = useMemo(() => {
    const text = normalize(query);
    if (!text) return [];

    return stores
      .filter((store) => {
        const project = getProject(store.projectId);
        const categoryLabel = getCategory(store.category).label;
        return normalize([store.name, store.note, store.floor, categoryLabel, project?.name, project?.city].join(" ")).includes(text);
      })
      .slice(0, 7);
  }, [query]);

  const items = useMemo(() => {
    return stores
      .map((store) => {
        const project = getProject(store.projectId);
        const coords = projectCoordinates[store.projectId];
        const distance = location && coords ? distanceInKm(location, coords) : null;
        return { store, project, distance };
      })
      .filter(({ store, project, distance }) => {
        if (!project) return false;
        const matchesRadius = !location || distance === null || distance <= Number(radius);
        const matchesCategory = category === "all" || store.category === category;
        return matchesRadius && matchesCategory;
      })
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [category, location, radius]);

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
      <section>
        <div className="section-heading">
          <p className="eyebrow">Danh sách đề xuất</p>
          <h2 className="h2">Dịch vụ gần bạn</h2>
        </div>
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="filter-field rounded-lg border border-masterise-line">
            <Target size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect label="Chọn phạm vi" value={radius} options={radiusOptions} onChange={setRadius} />
          </div>
          <div className="filter-field rounded-lg border border-masterise-line">
            <SlidersHorizontal size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect label="Chọn loại dịch vụ" value={category} options={categoryOptions} onChange={setCategory} />
          </div>
          <div className="filter-field search-suggest-field rounded-lg border border-masterise-line" ref={searchRef}>
            <Search size={19} aria-hidden className="text-masterise-primary" />
            <input
              id="nearSearchInput"
              className="filter-input"
              type="search"
              role="combobox"
              aria-label="Tìm dịch vụ gần bạn"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={isSuggestionOpen && storeSuggestions.length > 0}
              aria-controls="nearSearchSuggestions"
              placeholder="Tìm dịch vụ gần bạn..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsSuggestionOpen(true);
              }}
              onFocus={() => setIsSuggestionOpen(true)}
            />
            {isSuggestionOpen && storeSuggestions.length > 0 ? (
              <div className="search-suggestion-menu" id="nearSearchSuggestions" role="listbox">
                {storeSuggestions.map((store) => {
                  const project = getProject(store.projectId);
                  const categoryLabel = getCategory(store.category).label;

                  return (
                    <Link
                      key={store.id}
                      className="search-suggestion-option"
                      href={`/stores/${store.id}`}
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
        <div className="store-grid">
          {items.map(({ store, project, distance }) => (
            <StoreCard key={store.id} store={store} project={project} distance={distance} />
          ))}
        </div>
      </section>
    </main>
  );
}
