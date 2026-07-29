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

export default function HomePage({ initialData = camnangData }: { initialData?: SiteData }) {
  const router = useRouter();
  const [data] = useState<SiteData>(() => initialData);
  const { fallbackImage, newsItems, projects, storeCategories, stores } = data;
  const headBannerImage = data.homeSettings?.headBannerImage || camnangData.homeSettings.headBannerImage;
  const [query, setQuery] = useState("");
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const text = normalize(query);
    if (!text) return [];

    const projectSuggestions = projects
      .filter((project) => normalize(project.name).includes(text))
      .map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        meta: `${project.city} · Dự án`,
        href: `/du-an/${project.id}`,
        type: "project" as const,
      }));

    const storeSuggestions = stores
      .filter((store) => normalize(store.name).includes(text))
      .map((store) => {
        const project = getProjectFromData(data, store.projectId);
        const category = getCategoryFromList(storeCategories, store.category);
        return {
          id: `store-${store.id}`,
          label: store.name,
          meta: `${category.label}${project ? ` · ${project.name}` : ""}`,
          href: `/gian-hang/${store.id}`,
          type: "store" as const,
        };
      });

    return [...storeSuggestions, ...projectSuggestions].slice(0, 7);
  }, [data, query, storeCategories, stores, projects]);
  const filteredStores = useMemo(() => {
    return stores
      .filter((store) => Boolean(getProjectFromData(data, store.projectId)))
      .sort((a, b) => storeRating(b) - storeRating(a))
      .slice(0, 8);
  }, [data, stores]);

  useEffect(() => {
    function closeSuggestions(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSuggestionOpen(false);
      }
    }

    document.addEventListener("click", closeSuggestions);
    return () => document.removeEventListener("click", closeSuggestions);
  }, []);

  function chooseSuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.label);
    setIsSuggestionOpen(false);
    router.push(suggestion.href);
  }

  return (
    <main>
      <section className="hero-banner" aria-label="Cẩm nang Masterise">
        <Image
          src={headBannerImage}
          alt="Khu đô thị Vinhomes Ocean Park"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
        />
        <div className="hero-wash" aria-hidden />
        <div className="hero-content">
          <p className="hero-kicker">Cẩm nang cư dân Masterise</p>
          <h1>Nhịp sống an yên, mọi tiện ích trong tầm tay</h1>
          <p>Khám phá dự án, gian hàng và những thông tin thiết thực để tận hưởng trọn vẹn không gian sống của bạn.</p>

        


        <div className="hero-search">
          <div className="filter-card" role="search">
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
        </div>
        </div>

        </div>



      </section>

      <section>
        <div className="section home-section pt-9" id="hotServices">
          <SectionHeading
            eyebrow="Đề xuất theo dự án"
            title="Top gian hàng được đề xuất"
            description="Khám phá các gian hàng được cư dân Masterise yêu thích."
          />
          {filteredStores.length ? (
            <div className="store-grid home-store-grid">
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
          <div className="section-end-action">
            <Link className="secondary-button" href="/gian-hang">
              Xem thêm
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="section home-section" id="projects">
        <SectionHeading
          title="Khám phá nơi mình sống"
          description="Chọn dự án để xem thông tin, gian hàng và các tiện ích phù hợp với khu vực của bạn."
        />
        <ProjectPreviewGrid projects={projects} regionMeta={data.regionMeta} stores={stores} />
        <div className="section-end-action">
          <Link className="secondary-button" href="/du-an">
            Xem thêm
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="section home-section">
        <SectionHeading
          title="Thông tin cần biết"
          description="Cung cấp những thông tin mới và nhanh nhất tại các khu đô thị Masterise Homes"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 home-news-grid">
          {newsItems.slice(0, 8).map((item) => (
            <NewsCard key={item.id} item={item} projects={projects} regionMeta={data.regionMeta} />
          ))}
        </div>
        <div className="section-end-action">
          <Link className="secondary-button" href="/tin-tuc">
            Xem thêm
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
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

