import { Suspense } from "react";
import { SectionHeading } from "@/components/SectionHeading";
import { StoresClient } from "@/app/stores/StoresClient";

type StoresPageProps = {
  searchParams: Promise<{ category?: string; project?: string }>;
};

export const metadata = {
  title: "Gian hàng",
  description: "Tìm kiếm gian hàng Masterise theo dự án và loại dịch vụ.",
};

export default async function StoresPage({ searchParams }: StoresPageProps) {
  const params = await searchParams;

  return (
    <main className="detail-shell">
      <SectionHeading
        centered
        eyebrow="Gian hàng"
        title="Gian hàng và dịch vụ"
        description="Chọn dự án hoặc loại dịch vụ để xem đúng danh sách bạn cần."
      />
      <Suspense fallback={<div className="rounded-lg bg-white p-6">Đang tải gian hàng...</div>}>
        <StoresClient initialCategory={params.category} initialProjectId={params.project} />
      </Suspense>
    </main>
  );
}
