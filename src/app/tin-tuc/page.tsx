import { SectionHeading } from "@/components/SectionHeading";
import { toNewsClientData } from "@/lib/client-data";
import { getSiteData } from "@/lib/runtime-data";
import { seoMetadata } from "@/lib/seo";
import { NewsClient } from "./NewsClient";

export const metadata = seoMetadata({
  title: "Tin tức Masterise",
  description: "Cập nhật tin tức, thông báo, sự kiện và thông tin tiện ích dành cho cư dân tại các dự án Masterise.",
  path: "/tin-tuc",
});

type NewsPageProps = {
  searchParams: Promise<{ project?: string }>;
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const params = await searchParams;
  const data = await getSiteData();

  return (
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="Tin tức & Sự kiện"
        title="Cập nhật nhịp sống Masterise"
        description="Theo dõi nhanh các thông báo, sự kiện và tiến độ dự án tại các khu đô thị Masterise."
      />

      <NewsClient data={toNewsClientData(data)} initialProjectId={params.project} />
    </main>
  );
}
