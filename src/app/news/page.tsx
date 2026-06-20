import { NewsCard } from "@/components/NewsCard";
import { SectionHeading } from "@/components/SectionHeading";
import { newsItems } from "@/lib/data";

export default function NewsPage() {
  return (
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="TIN TỨC & SỰ KIỆN"
        title="Cập nhật nhịp sống Masterise"
        description="Theo dõi nhanh các thông báo, sự kiện và tiến độ dự án tại các khu đô thị Masterise."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {newsItems.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}
