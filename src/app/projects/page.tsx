"use client";

import { Map, MapPin, Search, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionHeading } from "@/components/SectionHeading";
import { ThemeSelect } from "@/components/ThemeSelect";
import { projects, regionMeta } from "@/lib/data";
import { normalize } from "@/lib/helpers";

export default function ProjectsPage() {
  const [region, setRegion] = useState("all");
  const [city, setCity] = useState("all");
  const [segment, setSegment] = useState("all");
  const [query, setQuery] = useState("");

  const regionOptions = Object.entries(regionMeta).map(([value, meta]) => ({ value, label: meta.label }));
  const cityOptions = useMemo(() => {
    const cities = Array.from(new Set(projects.filter((project) => region === "all" || project.region === region).map((project) => project.city)));
    return [{ value: "all", label: "Tất cả tỉnh/thành" }, ...cities.map((item) => ({ value: item, label: item }))];
  }, [region]);
  const segmentOptions = useMemo(() => {
    const segments = Array.from(new Set(projects.map((project) => project.segment)));
    return [{ value: "all", label: "Tất cả phân khúc" }, ...segments.map((item) => ({ value: item, label: item }))];
  }, []);

  const items = useMemo(() => {
    const text = normalize(query);
    return projects.filter((project) => {
      const matchesRegion = region === "all" || project.region === region;
      const matchesCity = city === "all" || project.city === city;
      const matchesSegment = segment === "all" || project.segment === segment;
      const matchesQuery =
        !text ||
        normalize([project.name, project.city, project.location, project.segment, project.status, project.summary].join(" ")).includes(
          text,
        );
      return matchesRegion && matchesCity && matchesSegment && matchesQuery;
    });
  }, [city, query, region, segment]);

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
        <label className="filter-field rounded-lg border border-masterise-line" htmlFor="projectSearchInput">
          <Search size={19} aria-hidden className="text-masterise-primary" />
          <input
            id="projectSearchInput"
            className="filter-input"
            type="search"
            placeholder="Tìm dự án..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="project-grid">
        {items.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </main>
  );
}
