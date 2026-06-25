import { Suspense } from "react";
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

export default async function NewsPage() {
  const data = await getSiteData();

  return (
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="Tin tức & Sự kiện"
        title="Cập nhật nhịp sống Masterise"
        description="Theo dõi nhanh các thông báo, sự kiện và tiến độ dự án tại các khu đô thị Masterise."
      />

      <Suspense fallback={<div className="rounded-lg bg-white p-6">Đang tải tin tức...</div>}>
        <NewsClient data={toNewsClientData(data)} />
      </Suspense>
    </main>
  );
}
