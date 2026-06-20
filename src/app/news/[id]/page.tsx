import type { Metadata } from "next";
import Image from "next/image";
import { NewsCard } from "@/components/NewsCard";
import { newsItems } from "@/lib/data";
import { regionLabel } from "@/lib/helpers";

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

  const related = newsItems
    .filter((item) => item.id !== article.id && (item.region === article.region || item.projectId === article.projectId))
    .slice(0, 3);

  return (
    <main className="detail-shell grid gap-8">
      <article className="detail-hero">
        <figure>
          <Image src={article.image} alt={article.title} fill sizes="(min-width: 768px) 45vw, 100vw" />
        </figure>
        <div className="grid content-center gap-5">
          <p className="eyebrow">
            {article.category} / {regionLabel(article.region)}
          </p>
          <h1 className="h1">{article.title}</h1>
          <p className="body-text">{article.excerpt}</p>
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
        <div className="grid gap-4">
          {article.content.map((paragraph) => (
            <p className="body-text" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </div>
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
