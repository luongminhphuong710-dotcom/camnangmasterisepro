import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Info, MapPin, Sparkles } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { StoreCard } from "@/components/StoreCard";
import { getSiteData } from "@/lib/runtime-data";
import { jsonLd, seoMetadata, siteName, siteUrl } from "@/lib/seo";
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
  return seoMetadata({
    title: project ? project.name : "Thông tin dự án",
    description: project?.summary || "Thông tin dự án Masterise, tiện ích, vị trí và gian hàng cư dân.",
    path: `/du-an/${id}`,
    image: project?.image,
  });
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
  const relatedNews = data.newsItems.filter((item) => item.projectId === project.id || item.region === project.region).slice(0, 8);
  const regionLabel = regionLabelFromMeta(data.regionMeta, project.region);
  const fallbackProjectAddress = [project.location, project.city].filter(Boolean).join(", ");
  const projectAddress = project.address || fallbackProjectAddress;
  const projectMapQuery = [project.name, projectAddress].filter(Boolean).join(", ");
  const projectMapSrc = project.mapEmbedUrl || `https://www.google.com/maps?q=${encodeURIComponent(projectMapQuery)}&output=embed`;
  const overviewItems = projectOverviewItems(project, regionLabel);
  const projectJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: project.name,
    description: project.summary,
    image: project.image,
    url: `${siteUrl}/du-an/${project.id}`,
    address: projectAddress,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: regionLabel,
    },
    isPartOf: {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
    },
  };

  return (
    <main className="detail-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(projectJsonLd) }} />
      <section className="detail-hero">
        <figure>
          <Image src={project.image} alt={project.name} fill priority fetchPriority="high" sizes="(min-width: 768px) 45vw, 100vw" />
        </figure>
        <div className="grid content-center gap-5">
          <p className="eyebrow">Thông tin dự án</p>
          <h1 className="h1">{project.name}</h1>
          <div className="flex flex-wrap gap-2">
            {project.segment ? <span className="tag">{project.segment}</span> : null}
            <span className="tag">{projectStores.length} gian hàng</span>
          </div>
          <p className="body-text">{project.summary}</p>
        </div>
      </section>

      <section className="py-10">
        <div className="section-heading">
          <h2 className="text-2xl font-extrabold leading-[1.22] tracking-normal">Thông tin chi tiết</h2>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <div className="flex flex-col gap-4 self-start">
            <article className="rounded-lg border border-masterise-line bg-white p-4 md:p-5">
              <div className="mb-3 flex items-center gap-2 text-masterise-primary">
                <Info size={19} aria-hidden />
                <h3 className="text-lg font-extrabold text-masterise-ink">Tổng quan về dự án</h3>
              </div>
              <dl className="divide-y divide-masterise-line text-sm">
                {overviewItems.map((item) => (
                  <div key={item.label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <dt className="font-extrabold text-masterise-ink">{item.label}</dt>
                    <dd className="font-semibold leading-6 text-masterise-muted">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </article>

            {project.highlights.length ? (
              <article className="rounded-lg border border-masterise-line bg-white p-4 md:p-5">
                <div className="mb-3 flex items-center gap-2 text-masterise-primary">
                  <Sparkles size={19} aria-hidden />
                  <h3 className="text-lg font-extrabold text-masterise-ink">Dịch vụ tiện ích nổi bật</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.highlights.map((item) => (
                    <span key={item} className="tag">
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ) : null}
          </div>

          <article className="self-start overflow-hidden rounded-lg border border-masterise-line bg-white">
            <div className="border-b border-masterise-line p-5">
              <div className="flex items-center gap-2 text-masterise-primary">
                <MapPin size={19} aria-hidden />
                <h3 className="text-lg font-extrabold text-masterise-ink">Vị trí</h3>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-masterise-muted">
                <div>
                  <p className="mb-1 font-bold text-masterise-ink">Địa chỉ</p>
                  <p>{projectAddress}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 font-bold text-masterise-ink">Khu vực</p>
                    <p>{regionLabel}</p>
                  </div>
                  <div>
                    <p className="mb-1 font-bold text-masterise-ink">Tỉnh / thành phố</p>
                    <p>{project.city}</p>
                  </div>
                </div>
              </div>
            </div>
            <iframe
              className="h-[360px] w-full border-0"
              src={projectMapSrc}
              title={`Bản đồ ${project.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </article>
        </div>
      </section>

      {projectStores.length ? (
        <section className="py-10">
          <div className="section-heading with-action">
            <div>
              <h2 className="text-2xl font-extrabold leading-[1.22] tracking-normal">Gian hàng trong dự án</h2>
              <p className="mt-2 text-sm font-semibold text-masterise-muted">Tổng số {projectStores.length} gian hàng</p>
            </div>
            <Link className="secondary-button" href={`/gian-hang?project=${encodeURIComponent(project.id)}`}>
              Xem thêm
              <ArrowRight size={17} aria-hidden />
            </Link>
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
      ) : null}

      {relatedNews.length ? (
        <section className="py-10">
          <div className="section-heading with-action">
            <h2 className="text-2xl font-extrabold leading-[1.22] tracking-normal">Tin liên quan</h2>
            <Link className="secondary-button" href={`/tin-tuc?project=${encodeURIComponent(project.id)}`}>
              Xem thêm
              <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedNews.map((item) => (
              <NewsCard key={item.id} item={item} projects={data.projects} regionMeta={data.regionMeta} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function projectOverviewItems(project: { name: string; location: string; segment: string; overviewItems?: readonly { label: string; value: string }[] }, regionLabel: string) {
  const cmsRows = Array.isArray(project.overviewItems)
    ? project.overviewItems.filter((item) => item.label.trim() && item.value.trim())
    : [];
  if (cmsRows.length) return cmsRows;

  return [
    { label: "Tên dự án:", value: project.name },
    { label: "Vị trí:", value: project.location },
    { label: "Nhà phát triển:", value: "Masterise Homes" },
    { label: "Phân khúc:", value: project.segment },
    { label: "Khu vực:", value: regionLabel },
  ].filter((item) => item.value);
}
