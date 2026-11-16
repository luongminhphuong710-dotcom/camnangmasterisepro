import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NewsCard } from "@/components/NewsCard";
import { normalize } from "@/lib/helpers";
import { getSiteData } from "@/lib/runtime-data";
import { absoluteUrl, jsonLd, seoMetadata, siteName, siteUrl } from "@/lib/seo";
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

export const revalidate = 300;

export async function generateStaticParams() {
  const data = await getSiteData();
  return data.newsItems.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getSiteData();
  const article = data.newsItems.find((item) => item.id === id);
  return seoMetadata({
    title: article ? article.title : "Bài viết",
    description: article?.excerpt || "Tin tức và thông tin cư dân Masterise.",
    path: `/tin-tuc/${id}`,
    image: article?.image,
    type: "article",
  });
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
  const rawArticleHtml = sanitizeArticleHtml(article.contentHtml || "");
  const articleHtml = rawArticleHtml ? addArticleHeadingAnchors(rawArticleHtml) : "";
  const tableOfContents = articleHtml
    ? getHeadingItemsFromHtml(articleHtml)
    : article.content
        .map((block, index) => getHeadingItem(block, index))
        .filter((item): item is HeadingItem => Boolean(item));
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.image.startsWith("/") ? absoluteUrl(article.image) : article.image,
    datePublished: article.createdAt || toIsoDate(article.date),
    dateModified: article.updatedAt || article.createdAt || toIsoDate(article.date),
    mainEntityOfPage: `${siteUrl}/tin-tuc/${article.id}`,
    author: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
  };

  return (
    <main className="article-detail-page grid gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleJsonLd) }} />
      <section className="py-8 md:py-12">
        <div className="page-shell">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-x-12 lg:gap-y-8">
            <article className="grid gap-8 lg:col-start-1">
              <div className="grid max-w-4xl gap-5 text-left">
              <nav aria-label="Breadcrumb bài viết" className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase text-masterise-primary">
                <Link className="shrink-0 transition hover:text-masterise-dark" href="/tin-tuc">
                  Tin tức
                </Link>
                <span aria-hidden className="shrink-0 text-masterise-muted">
                  /
                </span>
                <span className="min-w-0 truncate" aria-current="page" title={article.title}>
                  {article.title}
                </span>
              </nav>
              <h1 className="text-[32px] font-semibold leading-[1.16] tracking-normal text-masterise-ink">{article.title}</h1>
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
                priority
                fetchPriority="high"
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover"
              />
            </figure>
            </article>
            {tableOfContents.length ? (
              <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24" aria-label="Điều hướng bài viết">
                <nav className="rounded-lg border border-masterise-line bg-masterise-surface p-4" aria-label="Mục lục bài viết">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-normal text-masterise-primary">Mục lục</p>
                  <ol className="grid gap-2 text-sm font-semibold leading-6 text-masterise-muted">
                    {tableOfContents.map((item) => (
                      <li className={item.level === 3 ? "pl-4" : ""} key={item.id}>
                        <a className="transition hover:text-masterise-primary" href={`#${item.id}`}>
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>
            ) : null}

            <div className="grid gap-8 lg:col-start-1 lg:row-start-2">
              <div className="grid gap-4">
                {articleHtml ? (
                  <div
                    className="article-content [&_a]:font-semibold [&_a]:text-masterise-primary [&_blockquote]:border-l-4 [&_blockquote]:border-masterise-primary [&_blockquote]:pl-4 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-[1.25] [&_h2]:tracking-normal [&_h2]:text-masterise-ink [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:leading-[1.25] [&_h3]:tracking-normal [&_h3]:text-masterise-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:text-base [&_p]:leading-7 [&_p]:text-masterise-muted"
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
        className="mt-3 scroll-mt-24 text-xl font-semibold leading-[1.25] tracking-normal text-masterise-ink"
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
        className="mt-5 scroll-mt-24 text-2xl font-semibold leading-[1.25] tracking-normal text-masterise-ink"
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

function getHeadingItemsFromHtml(value: string): HeadingItem[] {
  const items: HeadingItem[] = [];
  const headingPattern = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

  for (const match of value.matchAll(headingPattern)) {
    const title = headingText(match[2]);
    if (!title) continue;
    items.push({
      id: articleAnchor(title, items.length),
      level: Number(match[1]) as 2 | 3,
      title,
    });
  }

  return items;
}

function addArticleHeadingAnchors(value: string) {
  let headingIndex = 0;
  return value.replace(/<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attributes, innerHtml) => {
    const title = headingText(innerHtml);
    if (!title) return full;

    const id = articleAnchor(title, headingIndex);
    headingIndex += 1;
    const attributesWithoutId = attributes.replace(/\s+id=("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    return `<h${level}${attributesWithoutId} id="${id}">${innerHtml}</h${level}>`;
  });
}

function headingText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
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
