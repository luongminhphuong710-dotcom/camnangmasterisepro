import Link from "next/link";
import Image from "next/image";
import { projects as staticProjects, regionMeta as staticRegionMeta } from "@/lib/data";
import type { NewsItem, Project, RegionMeta } from "@/lib/site-types";
import { getProject, regionLabel } from "@/lib/helpers";
import { getProjectFromData, regionLabelFromMeta } from "@/lib/site-utils";

type NewsCardProps = {
  item: NewsItem;
  projects?: readonly Project[];
  regionMeta?: RegionMeta;
};

export function NewsCard({ item, projects = staticProjects, regionMeta = staticRegionMeta }: NewsCardProps) {
  const project = projects === staticProjects ? getProject(item.projectId) : getProjectFromData({ projects }, item.projectId);
  const fallbackRegionLabel = regionMeta === staticRegionMeta ? regionLabel(item.region) : regionLabelFromMeta(regionMeta, item.region);
  const metaLabel = project?.name || fallbackRegionLabel;
  const createdDate = formatCreatedDate(item.createdAt, item.date);

  return (
    <Link className="news-card flex h-full flex-col" href={`/tin-tuc/${item.id}`}>
      <figure>
        <Image src={item.image} alt={item.title} fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
      </figure>
      <div className="news-card-body">
        <span className="news-card-eyebrow eyebrow mb-0">{metaLabel ? `${item.category} / ${metaLabel}` : item.category}</span>
        <h3 className="news-card-title">{item.title}</h3>
        <p className="news-card-excerpt body-text text-sm">{item.excerpt}</p>
        <time className="news-card-date" dateTime={item.createdAt || item.date}>
          {createdDate}
        </time>
      </div>
    </Link>
  );
}

function formatCreatedDate(createdAt?: string, fallbackDate?: string) {
  if (!createdAt) return fallbackDate || "";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return fallbackDate || createdAt;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
