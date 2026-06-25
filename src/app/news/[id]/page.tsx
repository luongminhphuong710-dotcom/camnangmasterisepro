import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NewsCard } from "@/components/NewsCard";
import { normalize } from "@/lib/helpers";
import { getSiteData } from "@/lib/runtime-data";
import type { NewsItem } from "@/lib/site-types";

type ArticlePageProps = {
  params: Promise<{ id: string }>;
};

type NewsArticle = NewsItem;

type HeadingItem = {
  id: string;
  level: 2 | 3;
  title: string;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getSiteData();
  const article = data.newsItems.find((item) => item.id === id);
  return {
    title: article ? article.title : "Bài viết",
    description: article?.excerpt,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const data = await getSiteData();
  const article = data.newsItems.find((item) => item.id === id);

  if (!article) {
    return (
      <main className="detail-shell">
        <div className="rounded-lg border border-masterise-line bg-white p-8">Không tìm thấy bài viết.</div>
      </main>
    );
  }

  const sameProjectArticles = sortNewsByNewest(
    data.newsItems.filter((item) => item.id !== article.id && item.projectId === article.projectId),
  );
  const fallbackArticles = sortNewsByNewest(data.newsItems.filter((item) => item.id !== article.id));
  const related = (sameProjectArticles.length ? sameProjectArticles : fallbackArticles).slice(0, 3);
  const articleHtml = sanitizeArticleHtml(article.contentHtml || "");
  const tableOfContents = article.content
    .map((block, index) => getHeadingItem(block, index))
    .filter((item): item is HeadingItem => Boolean(item));

  return (
    <main className="grid gap-8">
      <section className="bg-white py-8 md:py-12">
        <div className="page-shell grid gap-10">
          <article className="mx-auto grid max-w-5xl gap-8">
            <div className="grid max-w-4xl gap-5 text-left">
              <nav aria-label="Breadcrumb bài viết" className="flex min-w-0 items-center gap-2 text-xs font-extrabold uppercase text-masterise-primary">
                <Link className="shrink-0 transition hover:text-masterise-dark" href="/news">
                  Tin tức
                </Link>
                <span aria-hidden className="shrink-0 text-masterise-muted">
                  /
                </span>
                <span className="min-w-0 truncate" aria-current="page" title={article.title}>
                  {article.title}
                </span>
              </nav>
              <h1 className="text-[42px] font-bold leading-[1.16] tracking-normal text-masterise-ink">{article.title}</h1>
              <p className="body-text">{article.excerpt}</p>
              <time className="text-sm font-semibold text-masterise-primary" dateTime={toIsoDate(article.date)}>
                {article.date}
              </time>
            </div>
            <figure className="relative aspect-video overflow-hidden rounded-lg bg-masterise-soft">
              <Image
                src={article.image}
                alt={article.title}
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover"
              />
            </figure>
          </article>

          <div className="mx-auto grid max-w-3xl gap-8">
            {tableOfContents.length ? (
              <nav className="rounded-lg border border-masterise-line bg-masterise-surface p-4" aria-label="Mục lục bài viết">
                <p className="mb-3 text-sm font-extrabold uppercase tracking-normal text-masterise-primary">Mục lục</p>
                <ol className="grid gap-2 text-sm font-semibold text-masterise-muted">
                  {tableOfContents.map((item) => (
                    <li className={item.level === 3 ? "pl-4" : ""} key={item.id}>
                      <a className="transition hover:text-masterise-primary" href={`#${item.id}`}>
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}

            <div className="grid gap-4">
              {articleHtml ? (
                <div
                  className="[&_a]:font-semibold [&_a]:text-masterise-primary [&_blockquote]:border-l-4 [&_blockquote]:border-masterise-primary [&_blockquote]:pl-4 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:leading-[1.25] [&_h2]:tracking-normal [&_h2]:text-masterise-ink [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-extrabold [&_h3]:leading-[1.25] [&_h3]:tracking-normal [&_h3]:text-masterise-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:text-base [&_p]:leading-7 [&_p]:text-masterise-muted"
                  dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
              ) : (
                article.content.map((block, index) => renderArticleBlock(block, index))
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-masterise-line pt-5">
              {article.hashtags.map((tag) => (
                <small className="tag" key={tag}>
                  {tag}
                </small>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="section-heading">
          <p className="eyebrow">Đọc tiếp</p>
          <h2 className="h2">Bài viết liên quan</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <NewsCard key={item.id} item={item} projects={data.projects} regionMeta={data.regionMeta} />
          ))}
        </div>
      </section>
    </main>
  );
}

function getHeadingItem(block: string, index: number): HeadingItem | null {
  if (block.startsWith("### ")) {
    const title = block.slice(4);
    return { id: articleAnchor(title, index), level: 3, title };
  }

  if (block.startsWith("## ")) {
    const title = block.slice(3);
    return { id: articleAnchor(title, index), level: 2, title };
  }

  return null;
}

function renderArticleBlock(block: string, index: number) {
  if (block.startsWith("### ")) {
    const title = block.slice(4);
    return (
      <h3
        className="mt-3 scroll-mt-24 text-xl font-extrabold leading-[1.25] tracking-normal text-masterise-ink"
        id={articleAnchor(title, index)}
        key={`${index}-${block}`}
      >
        {title}
      </h3>
    );
  }

  if (block.startsWith("## ")) {
    const title = block.slice(3);
    return (
      <h2
        className="mt-5 scroll-mt-24 text-2xl font-extrabold leading-[1.25] tracking-normal text-masterise-ink"
        id={articleAnchor(title, index)}
        key={`${index}-${block}`}
      >
        {title}
      </h2>
    );
  }

  return (
    <p className="body-text" key={`${index}-${block}`}>
      {block}
    </p>
  );
}

function articleAnchor(title: string, index: number) {
  const slug = normalize(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "section"}-${index}`;
}

function sortNewsByNewest(items: ReadonlyArray<NewsArticle>) {
  return [...items].sort((a, b) => parseNewsDate(b.date) - parseNewsDate(a.date));
}

function parseNewsDate(date: string) {
  const [day, month, year] = date.split("/").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function sanitizeArticleHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s(?:on\w+|style)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)=("|\')\s*javascript:[^"\']*\2/gi, "")
    .trim();
}

function toIsoDate(date: string) {
  const [day, month, year] = date.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
