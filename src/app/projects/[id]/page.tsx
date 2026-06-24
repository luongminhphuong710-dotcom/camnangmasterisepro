import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Info, Store } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { StoreCard } from "@/components/StoreCard";
import { getSiteData } from "@/lib/runtime-data";
import { getProjectFromData, regionLabelFromMeta, storesForProjectFromData } from "@/lib/site-utils";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getSiteData();
  const project = getProjectFromData(data, id);
  return {
    title: project ? project.name : "Thông tin dự án",
    description: project?.summary,
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const data = await getSiteData();
  const project = getProjectFromData(data, id);

  if (!project) {
    return (
      <main className="detail-shell">
        <div className="rounded-lg border border-masterise-line bg-white p-8">Không tìm thấy dự án.</div>
      </main>
    );
  }

  const projectStores = storesForProjectFromData(data, project.id);
  const relatedNews = data.newsItems.filter((item) => item.projectId === project.id || item.region === project.region).slice(0, 3);
  const regionLabel = regionLabelFromMeta(data.regionMeta, project.region);

  return (
    <main className="detail-shell">
      <section className="detail-hero">
        <figure>
          <Image src={project.image} alt={project.name} fill sizes="(min-width: 768px) 45vw, 100vw" />
        </figure>
        <div className="grid content-center gap-5">
          <p className="eyebrow">Thông tin dự án</p>
          <h1 className="h1">{project.name}</h1>
          <p className="body-text">
            {regionLabel} / {project.city} - {project.location}
          </p>
          <p className="body-text">{project.summary}</p>
          <div className="flex flex-wrap gap-2">
            <span className="tag">{project.segment}</span>
            <span className="tag">{project.status}</span>
            <span className="tag">{projectStores.length} gian hàng</span>
          </div>
          <div className="action-row max-w-xl">
            <Link className="primary-button" href={`/stores?project=${project.id}`}>
              <Store size={17} aria-hidden />
              Gian hàng dự án
            </Link>
            <a className="secondary-button" href={project.source} target="_blank" rel="noreferrer">
              <ExternalLink size={17} aria-hidden />
              Nguồn dự án
            </a>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="section-heading">
          <p className="eyebrow">Điểm chính</p>
          <h2 className="h2">Thông tin cư dân cần nắm</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {project.highlights.map((item) => (
            <div key={item} className="rounded-lg border border-masterise-line bg-white p-5">
              <Info className="mb-4 text-masterise-primary" size={22} aria-hidden />
              <h3 className="text-lg font-semibold">{item}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="section-heading">
          <p className="eyebrow">Tiện ích và gian hàng</p>
          <h2 className="h2">Gian hàng trong dự án</h2>
        </div>
        <div className="store-grid">
          {projectStores.slice(0, 4).map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              project={project}
              fallbackImage={data.fallbackImage}
              storeCategories={data.storeCategories}
            />
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="section-heading">
          <p className="eyebrow">{regionLabel}</p>
          <h2 className="h2">Tin liên quan</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {relatedNews.map((item) => (
            <NewsCard key={item.id} item={item} projects={data.projects} regionMeta={data.regionMeta} />
          ))}
        </div>
      </section>
    </main>
  );
}
