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

  return (
    <Link className="news-card grid h-full content-start" href={`/news/${item.id}`}>
      <figure>
        <Image src={item.image} alt={item.title} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw" />
      </figure>
      <div className="grid content-start gap-3 p-5">
        <span className="eyebrow mb-0">{metaLabel ? `${item.category} / ${metaLabel}` : item.category}</span>
        <h3 className="h3">{item.title}</h3>
        <p className="body-text text-sm">{item.excerpt}</p>
        <div className="flex flex-wrap gap-2">
          {item.hashtags.slice(0, 3).map((tag) => (
            <small className="tag" key={tag}>
              {tag}
            </small>
          ))}
        </div>
      </div>
    </Link>
  );
}
