"use client";

import { Building2, LayoutList, Map, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { ProjectPreviewGrid } from "@/components/ProjectCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StoreCard } from "@/components/StoreCard";
import { ThemeSelect } from "@/components/ThemeSelect";
import { fallbackImage, newsItems, projects, regionMeta, stores } from "@/lib/data";
import { getCategory, getProject, normalize } from "@/lib/helpers";

const searchTypes = [
  { value: "all", label: "Tất cả nội dung" },
  { value: "info", label: "Thông tin" },
  { value: "stores", label: "Gian hàng" },
  { value: "services", label: "Dịch vụ" },
];

export default function HomePage() {
  const [region, setRegion] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [searchType, setSearchType] = useState("all");
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
        const matchesType = searchType !== "services" || store.category === "service";
        const matchesQuery =
          !text ||
          normalize([store.name, store.note, store.floor, category.label, project.name, project.city].join(" ")).includes(
            text,
          );
        return matchesRegion && matchesProject && matchesType && matchesQuery;
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);
  }, [projectId, query, region, searchType]);

  const filteredNews = useMemo(() => {
    const text = normalize(query);
    return newsItems
      .filter((news) => {
        const project = getProject(news.projectId);
        const matchesRegion = region === "all" || news.region === region || project?.region === region;
        const matchesProject = projectId === "all" || news.projectId === projectId;
        const matchesQuery =
          !text ||
          normalize([news.title, news.category, news.excerpt, news.hashtags.join(" "), project?.name].join(" ")).includes(
            text,
          );
        return matchesRegion && matchesProject && matchesQuery;
      })
      .slice(0, 6);
  }, [projectId, query, region]);

  const recommendationItems = searchType === "info" ? filteredNews : filteredStores;

  return (
    <main>
      <section className="hero-banner" aria-label="Cẩm nang Masterise">
        <img
          src="https://masterisehomes.com/_next/image?q=70&url=https%3A%2F%2Frevamp-ldp.masterisehomes.com%2Fuploads%2FMasteri_Grand_Coast_a2c320e2ba.jpg&w=1920"
          alt="Phối cảnh dự án Masterise Homes"
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
          <div className="filter-field">
            <LayoutList size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect label="Chọn loại nội dung" value={searchType} options={searchTypes} onChange={setSearchType} />
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
          />
          {recommendationItems.length ? (
            searchType === "info" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredNews.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="store-grid">
                {filteredStores.map((store) => (
                  <StoreCard key={store.id} store={store} project={getProject(store.projectId)} />
                ))}
              </div>
            )
          ) : (
            <div className="rounded-lg border border-masterise-line bg-white p-6 text-masterise-muted">
              Chưa có nội dung phù hợp với bộ lọc này.
            </div>
          )}
        </div>
      </section>

      <section className="section" id="projects">
        <SectionHeading
          centered
          title="Khám phá nơi mình sống"
          description="Chọn dự án để xem thông tin, gian hàng và các tiện ích phù hợp với khu vực của bạn."
        />
        <ProjectPreviewGrid />
      </section>

      <section className="section">
        <SectionHeading
          centered
          title="Thông tin cần biết"
          description="Cung cấp những thông tin mới và nhanh nhất tại các khu đô thị Masterise Homes"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {newsItems.slice(0, 6).map((item) => (
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

      <img src={fallbackImage} alt="" className="hidden" />
    </main>
  );
}
