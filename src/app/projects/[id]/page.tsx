import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Info, Store } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { StoreCard } from "@/components/StoreCard";
import { newsItems, projects } from "@/lib/data";
import { getProject, regionLabel, storesForProject } from "@/lib/helpers";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = getProject(id);
  return {
    title: project ? project.name : "Thông tin dự án",
    description: project?.summary,
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) {
    return (
      <main className="detail-shell">
        <div className="rounded-lg border border-masterise-line bg-white p-8">Không tìm thấy dự án.</div>
      </main>
    );
  }

  const projectStores = storesForProject(project.id);
  const relatedNews = newsItems.filter((item) => item.projectId === project.id || item.region === project.region).slice(0, 3);

  return (
    <main className="detail-shell">
      <section className="detail-hero">
        <figure>
          <img src={project.image} alt={project.name} />
        </figure>
        <div className="grid content-center gap-5">
          <p className="eyebrow">Thông tin dự án</p>
          <h1 className="h1">{project.name}</h1>
          <p className="body-text">
            {regionLabel(project.region)} / {project.city} - {project.location}
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
            <StoreCard key={store.id} store={store} project={project} />
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="section-heading">
          <p className="eyebrow">{regionLabel(project.region)}</p>
          <h2 className="h2">Tin liên quan</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {relatedNews.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
