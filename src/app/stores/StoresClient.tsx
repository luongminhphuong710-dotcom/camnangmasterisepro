"use client";

import { Building2, Map, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { StoreCard } from "@/components/StoreCard";
import { ThemeSelect } from "@/components/ThemeSelect";
import { projects, regionMeta, storeCategories, stores } from "@/lib/data";
import { getCategory, getProject, normalize } from "@/lib/helpers";

type StoresClientProps = {
  initialProjectId?: string;
};

export function StoresClient({ initialProjectId = "all" }: StoresClientProps) {
  const initialProject = getProject(initialProjectId);
  const [region, setRegion] = useState(initialProject?.region ?? "all");
  const [city, setCity] = useState(initialProject?.city ?? "all");
  const [projectId, setProjectId] = useState(initialProject?.id ?? "all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const regionOptions = Object.entries(regionMeta).map(([value, meta]) => ({ value, label: meta.label }));
  const cityOptions = useMemo(() => {
    const cities = Array.from(new Set(projects.filter((project) => region === "all" || project.region === region).map((project) => project.city)));
    return [{ value: "all", label: "Tất cả tỉnh/thành" }, ...cities.map((item) => ({ value: item, label: item }))];
  }, [region]);
  const projectOptions = useMemo(() => {
    const items = projects.filter((project) => {
      const matchesRegion = region === "all" || project.region === region;
      const matchesCity = city === "all" || project.city === city;
      return matchesRegion && matchesCity;
    });
    return [{ value: "all", label: "Tất cả dự án" }, ...items.map((project) => ({ value: project.id, label: project.name }))];
  }, [city, region]);
  const categoryOptions = storeCategories.map((item) => ({ value: item.id, label: item.label }));

  const items = useMemo(() => {
    const text = normalize(query);
    return stores
      .filter((store) => {
        const project = getProject(store.projectId);
        if (!project) return false;
        const storeCategory = getCategory(store.category);
        const matchesRegion = region === "all" || project.region === region;
        const matchesCity = city === "all" || project.city === city;
        const matchesProject = projectId === "all" || project.id === projectId;
        const matchesCategory = category === "all" || store.category === category;
        const matchesQuery =
          !text ||
          normalize([store.name, store.note, store.floor, store.hours, storeCategory.label, project.name, project.city].join(" ")).includes(
            text,
          );
        return matchesRegion && matchesCity && matchesProject && matchesCategory && matchesQuery;
      })
      .sort((a, b) => b.rating - a.rating);
  }, [category, city, projectId, query, region]);

  return (
    <>
      <div className="mb-8 grid gap-3 rounded-lg border border-masterise-line bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="filter-field rounded-lg border border-masterise-line">
          <Map size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect
            label="Lọc theo miền"
            value={region}
            options={regionOptions}
            onChange={(value) => {
              setRegion(value);
              setCity("all");
              setProjectId("all");
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
              setProjectId("all");
            }}
          />
        </div>
        <div className="filter-field rounded-lg border border-masterise-line">
          <Building2 size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect
            label="Lọc theo dự án"
            value={projectId}
            options={projectOptions}
            onChange={(value) => {
              const project = getProject(value);
              setProjectId(value);
              if (project) {
                setRegion(project.region);
                setCity(project.city);
              }
            }}
          />
        </div>
        <div className="filter-field rounded-lg border border-masterise-line">
          <SlidersHorizontal size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect label="Lọc theo danh mục" value={category} options={categoryOptions} onChange={setCategory} />
        </div>
        <label className="filter-field rounded-lg border border-masterise-line" htmlFor="storeSearchInput">
          <Search size={19} aria-hidden className="text-masterise-primary" />
          <input
            id="storeSearchInput"
            className="filter-input"
            type="search"
            placeholder="Tìm gian hàng..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="chip-row mb-8">
        {storeCategories.map((item) => (
          <button
            key={item.id}
            className={`chip ${category === item.id ? "active" : ""}`}
            type="button"
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="store-grid">
        {items.map((store) => (
          <StoreCard key={store.id} store={store} project={getProject(store.projectId)} />
        ))}
      </div>
    </>
  );
}
