import { Suspense } from "react";
import { SectionHeading } from "@/components/SectionHeading";
import { StoresClient } from "@/app/gian-hang/StoresClient";
import { toStoresClientData } from "@/lib/client-data";
import { getSiteData } from "@/lib/runtime-data";
import { seoMetadata } from "@/lib/seo";

export const metadata = seoMetadata({
  title: "Gian hàng Masterise",
  description: "Tìm kiếm gian hàng, dịch vụ và tiện ích cư dân Masterise theo dự án, danh mục và nhu cầu sử dụng.",
  path: "/gian-hang",
});

export default async function StoresPage() {
  const data = await getSiteData();

  return (
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="Gian hàng"
        title="Gian hàng và dịch vụ"
        description="Chọn dự án hoặc loại dịch vụ để xem đúng danh sách bạn cần."
      />
      <Suspense fallback={<div className="rounded-lg bg-white p-6">Đang tải gian hàng...</div>}>
        <StoresClient data={toStoresClientData(data)} />
      </Suspense>
    </main>
  );
}
