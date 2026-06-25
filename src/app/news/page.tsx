import { SectionHeading } from "@/components/SectionHeading";
import { getSiteData } from "@/lib/runtime-data";
import { NewsClient } from "./NewsClient";

export const dynamic = "force-dynamic";

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

      <NewsClient data={data} />
    </main>
  );
}
