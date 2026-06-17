import Link from "next/link";
import { type NewsItem } from "@/lib/data";
import { getProject, regionLabel } from "@/lib/helpers";

type NewsCardProps = {
  item: NewsItem;
};

export function NewsCard({ item }: NewsCardProps) {
  const project = getProject(item.projectId);

  return (
    <Link className="news-card grid" href={`/news/${item.id}`}>
      <figure>
        <img src={item.image} alt={item.title} loading="lazy" />
      </figure>
      <div className="grid gap-3 p-5">
        <span className="eyebrow mb-0">
          {item.category} / {project ? project.name : regionLabel(item.region)}
        </span>
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
