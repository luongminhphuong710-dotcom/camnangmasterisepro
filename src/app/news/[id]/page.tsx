import type { Metadata } from "next";
import Link from "next/link";
import { Store, Info } from "lucide-react";
import { NewsCard } from "@/components/NewsCard";
import { newsItems } from "@/lib/data";
import { getProject, regionLabel } from "@/lib/helpers";

type ArticlePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return newsItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = newsItems.find((item) => item.id === id);
  return {
    title: article ? article.title : "Bài viết",
    description: article?.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = newsItems.find((item) => item.id === id);

  if (!article) {
    return (
      <main className="detail-shell">
        <div className="rounded-lg border border-masterise-line bg-white p-8">Không tìm thấy bài viết.</div>
      </main>
    );
  }

  const project = getProject(article.projectId);
  const related = newsItems
    .filter((item) => item.id !== article.id && (item.region === article.region || item.projectId === article.projectId))
    .slice(0, 3);

  return (
    <main className="detail-shell grid gap-8">
      <article className="detail-hero">
        <figure>
          <img src={article.image} alt={article.title} />
        </figure>
        <div className="grid content-center gap-5">
          <p className="eyebrow">
            {article.category} / {regionLabel(article.region)}
          </p>
          <h1 className="h1">{article.title}</h1>
          <p className="body-text">{article.excerpt}</p>
          {project ? (
            <div className="action-row max-w-xl">
              <Link className="primary-button" href={`/projects/${project.id}`}>
                <Info size={17} aria-hidden />
                Thông tin dự án
              </Link>
              <Link className="secondary-button" href={`/stores?project=${project.id}`}>
                <Store size={17} aria-hidden />
                Gian hàng dự án
              </Link>
            </div>
          ) : null}
        </div>
      </article>

      <section className="mx-auto max-w-3xl rounded-lg border border-masterise-line bg-white p-6 md:p-8">
        <div className="mb-5 flex flex-wrap gap-2">
          {article.hashtags.map((tag) => (
            <small className="tag" key={tag}>
              {tag}
            </small>
          ))}
        </div>
        <p className="body-text">
          {article.excerpt} Nội dung chi tiết có thể được cập nhật thêm trong CMS sau này, bao gồm thông báo, hướng dẫn,
          hình ảnh và các mốc thời gian liên quan tới cư dân.
        </p>
      </section>

      <section>
        <div className="section-heading">
          <p className="eyebrow">{regionLabel(article.region)}</p>
          <h2 className="h2">Bài viết cùng miền</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
