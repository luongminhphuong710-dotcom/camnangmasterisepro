import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Map, MapPin, Phone, Star, Tag } from "lucide-react";
import { StoreReviewBox } from "@/components/StoreReviewBox";
import { fallbackImage, stores } from "@/lib/data";
import { getCategory, getProject } from "@/lib/helpers";

type StorePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return stores.map((store) => ({ id: store.id }));
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { id } = await params;
  const store = stores.find((item) => item.id === id);
  return {
    title: store ? store.name : "Gian hàng",
    description: store?.note,
  };
}

export default async function StoreDetailPage({ params }: StorePageProps) {
  const { id } = await params;
  const store = stores.find((item) => item.id === id);

  if (!store) {
    return (
      <main className="detail-shell">
        <div className="rounded-lg border border-masterise-line bg-white p-8">Không tìm thấy gian hàng.</div>
      </main>
    );
  }

  const project = getProject(store.projectId);
  const category = getCategory(store.category);
  const gallery = [store.image || project?.image || fallbackImage, project?.image || fallbackImage, fallbackImage];

  return (
    <main className="detail-shell grid gap-8">
      <section className="detail-hero">
        <figure>
          <img src={gallery[0]} alt={store.name} />
        </figure>
        <div className="grid content-center gap-5">
          <p className="eyebrow">
            {category.label} / {project?.name ?? "Dự án"}
          </p>
          <h1 className="h1">{store.name}</h1>
          <p className="body-text">{store.note}</p>
          <div className="grid gap-3 text-masterise-muted sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <Tag size={17} aria-hidden />
              {category.label}
            </span>
            <span className="flex items-center gap-2">
              <Clock3 size={17} aria-hidden />
              {store.hours}
            </span>
            <span className="flex items-center gap-2">
              <Star size={17} aria-hidden />
              {store.rating.toFixed(1)}/5 đánh giá
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={17} aria-hidden />
              {store.floor}
            </span>
          </div>
          <div className="action-row max-w-xl">
            <a className="primary-button" href={`tel:${store.phone.replace(/\s/g, "")}`}>
              <Phone size={17} aria-hidden />
              Gọi điện
            </a>
            <Link className="secondary-button" href={`/stores?project=${store.projectId}`}>
              Gian hàng dự án
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {gallery.map((image, index) => (
          <figure className="aspect-video overflow-hidden rounded-lg border border-masterise-line bg-white" key={`${image}-${index}`}>
            <img className="h-full w-full object-cover" src={image} alt={`${store.name} ${index + 1}`} />
          </figure>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-masterise-line bg-white p-5">
          <p className="eyebrow">Thông tin giới thiệu</p>
          <h2 className="h2 mb-4">Về gian hàng</h2>
          <p className="body-text">
            {store.name} phục vụ cư dân tại {project?.name ?? "dự án"} với thông tin giờ hoạt động, liên hệ và vị trí được
            trình bày minh bạch để cư dân dễ lựa chọn.
          </p>
        </div>
        <aside className="rounded-lg border border-masterise-line bg-white p-5">
          <p className="eyebrow">Vị trí</p>
          <h2 className="h3 mb-3">{project?.location ?? store.floor}</h2>
          <p className="body-text text-sm">{project?.city ?? "Khu vực dự án"}</p>
          <a
            className="secondary-button mt-5"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name} ${project?.location ?? ""}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <Map size={17} aria-hidden />
            Mở bản đồ
          </a>
        </aside>
      </section>

      <StoreReviewBox />
    </main>
  );
}
