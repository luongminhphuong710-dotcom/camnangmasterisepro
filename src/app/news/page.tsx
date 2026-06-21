import { SectionHeading } from "@/components/SectionHeading";
import { NewsClient } from "./NewsClient";

export default function NewsPage() {
  return (
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="Tin tức & Sự kiện"
        title="Cập nhật nhịp sống Masterise"
        description="Theo dõi nhanh các thông báo, sự kiện và tiến độ dự án tại các khu đô thị Masterise."
      />

      <NewsClient />
    </main>
  );
}
