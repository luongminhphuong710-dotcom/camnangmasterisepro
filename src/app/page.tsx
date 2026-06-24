"use client";

import { ArrowRight, Building2, Search, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { ProjectPreviewGrid } from "@/components/ProjectCard";
import { SectionHeading } from "@/components/SectionHeading";
import { StoreCard } from "@/components/StoreCard";
import { ThemeSelect } from "@/components/ThemeSelect";
import { camnangData } from "@/lib/data";
import type { SiteData, Store as StoreItem } from "@/lib/site-types";
import { getCategoryFromList, getProjectFromData, normalize } from "@/lib/site-utils";

type SearchSuggestion = {
  id: string;
  label: string;
  meta: string;
  href: string;
  type: "project" | "store";
};

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<SiteData>(() => camnangData);
  const { fallbackImage, newsItems, projects, storeCategories, stores } = data;
  const [projectId, setProjectId] = useState("all");
  const [query, setQuery] = useState("");
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const projectOptions = useMemo(
    () => [{ value: "all", label: "Chọn dự án bạn đang ở" }, ...projects.map((project) => ({ value: project.id, label: project.name }))],
    [projects],
  );

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

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const text = normalize(query);
    if (!text) return [];

    const projectSuggestions = projects
      .filter((project) => normalize([project.name, project.location, project.city].join(" ")).includes(text))
      .map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        meta: `${project.city} · Dự án`,
        href: `/projects/${project.id}`,
        type: "project" as const,
      }));

    const storeSuggestions = stores
      .filter((store) => {
        const project = getProjectFromData(data, store.projectId);
        const category = getCategoryFromList(storeCategories, store.category);
        return normalize([store.name, store.note, category.label, project?.name, project?.city].join(" ")).includes(text);
      })
      .map((store) => {
        const project = getProjectFromData(data, store.projectId);
        const category = getCategoryFromList(storeCategories, store.category);
        return {
          id: `store-${store.id}`,
          label: store.name,
          meta: `${category.label}${project ? ` · ${project.name}` : ""}`,
          href: `/stores/${store.id}`,
          type: "store" as const,
        };
      });

    return [...storeSuggestions, ...projectSuggestions].slice(0, 7);
  }, [data, query, storeCategories, stores, projects]);

  const filteredStores = useMemo(() => {
    return stores
      .filter((store) => {
        const project = getProjectFromData(data, store.projectId);
        if (!project) return false;
        const matchesProject = projectId === "all" || project.id === projectId;
        return matchesProject;
      })
      .sort((a, b) => storeRating(b) - storeRating(a))
      .slice(0, 8);
  }, [data, projectId, stores]);

  useEffect(() => {
    function closeSuggestions(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSuggestionOpen(false);
      }
    }

    document.addEventListener("click", closeSuggestions);
    return () => document.removeEventListener("click", closeSuggestions);
  }, []);

  function runSearch() {
    if (query && suggestions.length) {
      setIsSuggestionOpen(true);
      return;
    }

    document.querySelector("#hotServices")?.scrollIntoView({ behavior: "smooth" });
  }

  function chooseSuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.label);
    setIsSuggestionOpen(false);
    router.push(suggestion.href);
  }

  return (
    <main>
      <section className="hero-banner" aria-label="Cẩm nang Masterise">
        <Image
          src="https://gland.com.vn/wp-content/uploads/2022/07/vinhomes-ocean-park1-gia-lam-ha-noi-45.jpg"
          alt="Khu đô thị Vinhomes Ocean Park"
          fill
          priority
          sizes="100vw"
        />
      </section>

      <section aria-labelledby="quickFilterTitle">
        <div className="filter-card" role="search">
          <div className="filter-field">
            <Building2 size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect label="Dự án bạn đang ở" value={projectId} options={projectOptions} onChange={setProjectId} />
          </div>
          <div className="filter-field search-suggest-field" ref={searchRef}>
            <Search size={19} aria-hidden className="text-masterise-primary" />
            <input
              id="serviceSearchInput"
              className="filter-input"
              type="search"
              role="combobox"
              aria-label="Tìm tên gian hàng hoặc dự án"
              placeholder="Tìm tên gian hàng hoặc dự án..."
              value={query}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={isSuggestionOpen && suggestions.length > 0}
              aria-controls="homeSearchSuggestions"
              onChange={(event) => {
                setQuery(event.target.value);
                setIsSuggestionOpen(true);
              }}
              onFocus={() => setIsSuggestionOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runSearch();
                }
              }}
            />
            {isSuggestionOpen && suggestions.length > 0 ? (
              <div className="search-suggestion-menu" id="homeSearchSuggestions" role="listbox">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="search-suggestion-option"
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    <span className="search-suggestion-icon">
                      {suggestion.type === "store" ? <Store size={16} aria-hidden /> : <Building2 size={16} aria-hidden />}
                    </span>
                    <span>
                      <strong>{suggestion.label}</strong>
                      <small>{suggestion.meta}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button className="filter-button" type="button" onClick={runSearch}>
            <Search size={18} aria-hidden />
            Tìm kiếm
          </button>
        </div>

        <div className="section pt-9" id="hotServices">
          <SectionHeading
            eyebrow="Đề xuất theo dự án"
            title={projectId !== "all" ? "Top dịch vụ phù hợp" : "Top gian hàng được đề xuất"}
            description="Chọn dự án bạn đang ở để xem gian hàng phù hợp. Ô tìm kiếm phía trên dùng để mở nhanh dự án hoặc gian hàng cụ thể."
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
                <StoreCard
                  key={store.id}
                  store={store}
                  project={getProjectFromData(data, store.projectId)}
                  fallbackImage={fallbackImage}
                  storeCategories={storeCategories}
                />
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
        <ProjectPreviewGrid projects={projects} regionMeta={data.regionMeta} stores={stores} />
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
            <NewsCard key={item.id} item={item} projects={projects} regionMeta={data.regionMeta} />
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

function storeRating(store: StoreItem) {
  const reviews = Array.isArray(store.reviews) ? store.reviews : [];
  if (reviews.length) {
    return reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
  }
  return Number(store.rating || 0);
}
