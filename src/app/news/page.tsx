"use client";

import { Map } from "lucide-react";
import { useMemo, useState } from "react";
import { NewsCard } from "@/components/NewsCard";
import { SectionHeading } from "@/components/SectionHeading";
import { ThemeSelect } from "@/components/ThemeSelect";
import { newsItems, regionMeta } from "@/lib/data";
import { getProject } from "@/lib/helpers";

export default function NewsPage() {
  const [region, setRegion] = useState("all");
  const regionOptions = Object.entries(regionMeta).map(([value, meta]) => ({ value, label: meta.label }));
  const items = useMemo(
    () =>
      newsItems.filter((item) => {
        const project = getProject(item.projectId);
        return region === "all" || item.region === region || project?.region === region;
      }),
    [region],
  );

  return (
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="TIN TỨC & SỰ KIỆN"
        title="Cập nhật nhịp sống Masterise"
        description="Theo dõi nhanh các thông báo, sự kiện và tiến độ dự án. Sử dụng bộ lọc Bắc - Trung - Nam để hiển thị ngay luồng tin tức tại khu vực của bạn."
      />

      <div className="mx-auto mb-8 max-w-md rounded-lg border border-masterise-line bg-white p-4">
        <div className="filter-field rounded-lg border border-masterise-line">
          <Map size={19} aria-hidden className="text-masterise-primary" />
          <ThemeSelect label="Lọc tin theo miền" value={region} options={regionOptions} onChange={setRegion} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}
