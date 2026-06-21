"use client";

import { ArrowRight, Building2, Map, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { ProjectPreviewGrid } from "@/components/ProjectCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StoreCard } from "@/components/StoreCard";
import { ThemeSelect } from "@/components/ThemeSelect";
import { newsItems, projects, regionMeta, stores } from "@/lib/data";
import { getCategory, getProject, normalize } from "@/lib/helpers";

export default function HomePage() {
  const [region, setRegion] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [query, setQuery] = useState("");

  const regionOptions = Object.entries(regionMeta).map(([value, meta]) => ({ value, label: meta.label }));
  const projectOptions = useMemo(() => {
    const items = projects.filter((project) => region === "all" || project.region === region);
    return [{ value: "all", label: "Tất cả dự án" }, ...items.map((project) => ({ value: project.id, label: project.name }))];
  }, [region]);

  const filteredStores = useMemo(() => {
    const text = normalize(query);
    return stores
      .filter((store) => {
        const project = getProject(store.projectId);
        const category = getCategory(store.category);
        if (!project) return false;
        const matchesRegion = region === "all" || project.region === region;
        const matchesProject = projectId === "all" || project.id === projectId;
        const matchesQuery =
          !text ||
          normalize([store.name, store.note, store.floor, category.label, project.name, project.city].join(" ")).includes(
            text,
          );
        return matchesRegion && matchesProject && matchesQuery;
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);
  }, [projectId, query, region]);

  return (
    <main>
      <section className="hero-banner" aria-label="Cẩm nang Masterise">
        <Image
          src="https://masterisehomes.com/_next/image?q=70&url=https%3A%2F%2Frevamp-ldp.masterisehomes.com%2Fuploads%2FMasteri_Grand_Coast_a2c320e2ba.jpg&w=1920"
          alt="Phối cảnh dự án Masterise Homes"
          fill
          priority
          sizes="100vw"
        />
      </section>

      <section aria-labelledby="quickFilterTitle">
        <div className="filter-card" role="search">
          <div className="filter-field">
            <Map size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect
              label="Chọn khu vực"
              value={region}
              options={regionOptions}
              onChange={(value) => {
                setRegion(value);
                setProjectId("all");
              }}
            />
          </div>
          <div className="filter-field">
            <Building2 size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect label="Chọn dự án" value={projectId} options={projectOptions} onChange={setProjectId} />
          </div>
          <label className="filter-field" htmlFor="serviceSearchInput">
            <Search size={19} aria-hidden className="text-masterise-primary" />
            <input
              id="serviceSearchInput"
              className="filter-input"
              type="search"
              placeholder="Tìm thông tin, gian hàng, dịch vụ..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            className="filter-button"
            type="button"
            onClick={() => document.querySelector("#hotServices")?.scrollIntoView({ behavior: "smooth" })}
          >
            <Search size={18} aria-hidden />
            Tìm kiếm
          </button>
        </div>

        <div className="section pt-9" id="hotServices">
          <SectionHeading
            eyebrow="Đề xuất theo khu vực"
            title={query || region !== "all" || projectId !== "all" ? "Top dịch vụ phù hợp" : "Top gian hàng được đề xuất"}
            description="Chọn khu vực và dự án để xem gợi ý phù hợp nhất."
            action={
              <Link className="secondary-button" href="/stores">
                Xem thêm
                <ArrowRight size={16} aria-hidden />
              </Link>
            }
          />
          {filteredStores.length ? (
            <div className="store-grid">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} project={getProject(store.projectId)} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-masterise-line bg-white p-6 text-masterise-muted">
              Chưa có nội dung phù hợp với bộ lọc này.
            </div>
          )}
        </div>
      </section>

      <section className="section" id="projects">
        <SectionHeading
          title="Khám phá nơi mình sống"
          description="Chọn dự án để xem thông tin, gian hàng và các tiện ích phù hợp với khu vực của bạn."
          action={
            <Link className="secondary-button" href="/projects">
              Xem thêm
              <ArrowRight size={16} aria-hidden />
            </Link>
          }
        />
        <ProjectPreviewGrid />
      </section>

      <section className="section">
        <SectionHeading
          title="Thông tin cần biết"
          description="Cung cấp những thông tin mới và nhanh nhất tại các khu đô thị Masterise Homes"
          action={
            <Link className="secondary-button" href="/news">
              Xem thêm
              <ArrowRight size={16} aria-hidden />
            </Link>
          }
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {newsItems.slice(0, 8).map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="section grid gap-8 border-t border-masterise-line md:grid-cols-[0.95fr_1.05fr]" id="about">
        <div>
          <p className="eyebrow">CẨM NANG CƯ DÂN</p>
          <h2 className="h2">Cổng thông tin & Dịch vụ toàn diện</h2>
        </div>
        <p className="body-text">
          Nơi tổng hợp mọi tiện ích, cửa hàng và các bản cập nhật mới nhất từ dự án của bạn. Tìm kiếm nhanh chóng,
          trải nghiệm xuyên suốt và hoàn toàn minh bạch.
        </p>
      </section>
    </main>
  );
}
