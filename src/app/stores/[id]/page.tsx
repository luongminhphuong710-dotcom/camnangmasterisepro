import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Building2,
  Clock3,
  Info,
  Map,
  MapPin,
  Navigation,
  Phone,
  Star,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";
import { StoreCard } from "@/components/StoreCard";
import { StoreReviewBox } from "@/components/StoreReviewBox";
import { StoreHeroGallery } from "@/components/StoreHeroGallery";
import { StoreVoucherTickets } from "@/components/StoreVoucherTickets";
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
  const relatedStores = stores
    .filter((item) => {
      if (item.id === store.id) return false;
      const itemProject = getProject(item.projectId);
      return itemProject?.region === project?.region;
    })
    .sort((a, b) => {
      const aSameCategory = a.category === store.category ? 0 : 1;
      const bSameCategory = b.category === store.category ? 0 : 1;
      return aSameCategory - bSameCategory || b.rating - a.rating;
    })
    .slice(0, 8);
  const gallery = Array.from(new Set([store.image, project?.image, fallbackImage].flatMap((image) => (image ? [String(image)] : []))));
  const address = [store.floor, project?.name, project?.location, project?.city].filter(Boolean).join(", ");
  const mapQuery = `${store.name} ${project?.location ?? store.floor} ${project?.city ?? ""}`;
  const cleanPhone = store.phone.replace(/\s/g, "");
  const navItems = [
    { href: "#overview", label: "Thông tin chi tiết", icon: Info },
    { href: "#offers", label: "Ưu đãi", icon: TicketPercent },
    { href: "#map", label: "Liên hệ", icon: Phone },
    { href: "#reviews", label: "Đánh giá", icon: Star },
  ];
  const demoReviews = [
    {
      name: "EmpatheticCarrot1687",
      rating: 5,
      isAnonymous: true,
      comment: "Thông tin vị trí rõ ràng, dễ liên hệ và phù hợp để cư dân tra cứu nhanh trước khi đến.",
      images: [
        { id: "demo-review-minh-anh-1", name: "review-demo-1.webp", url: gallery[0] },
        { id: "demo-review-minh-anh-2", name: "review-demo-2.webp", url: gallery[1] ?? gallery[0] },
      ],
    },
    {
      name: "BrightLotus4308",
      rating: 4,
      isAnonymous: true,
      comment: "Dịch vụ thuận tiện trong khu dự án, giờ hoạt động và số điện thoại hiển thị rất dễ nhìn.",
      images: [{ id: "demo-review-gia-huy-1", name: "review-demo-3.webp", url: gallery[2] ?? gallery[0] }],
    },
    {
      name: "UrbanPearl9251",
      rating: 5,
      isAnonymous: true,
      comment: "Mình thích phần hình ảnh và bản đồ, xem trước khá nhanh để biết nên đi lối nào.",
    },
  ];
  const displayRating = demoReviews.length
    ? demoReviews.reduce((total, review) => total + review.rating, 0) / demoReviews.length
    : store.rating;

  return (
    <main className="detail-shell">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <div className="grid gap-6">
          <section className="order-2 rounded-lg border border-masterise-line bg-white p-5 shadow-masterise lg:hidden">
            <span className="tag mb-2">
              {category.label}
            </span>
            <h1 className="text-2xl font-extrabold leading-[1.22] tracking-normal text-masterise-ink">{store.name}</h1>
            <p className="body-text mt-3 text-sm">{store.note}</p>

            <div className="mt-5 grid gap-3 text-sm text-masterise-muted">
              <span className="flex items-center gap-2">
                <MapPin size={17} aria-hidden className="text-masterise-primary" />
                {store.floor} - {project?.name ?? "Khu vực dự án"}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={17} aria-hidden className="text-masterise-primary" />
                {store.hours}
              </span>
              <span className="flex items-center gap-2">
                <Star size={17} aria-hidden className="text-masterise-primary" />
                {displayRating.toFixed(1)}/5 đánh giá cư dân
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <a className="primary-button" href={`tel:${cleanPhone}`}>
                <Phone size={17} aria-hidden />
                Gọi điện
              </a>
              <a
                className="secondary-button"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Map size={17} aria-hidden />
                Chỉ đường
              </a>
            </div>
          </section>

          <div className="order-1 lg:order-none">
            <nav aria-label="Breadcrumb gian hàng" className="mb-3 flex min-w-0 items-center gap-2 text-xs font-extrabold uppercase text-masterise-primary">
              <Link className="shrink-0 transition hover:text-masterise-dark" href="/stores">
                Gian hàng
              </Link>
              <span aria-hidden className="shrink-0 text-masterise-muted">
                /
              </span>
              <Link className="min-w-0 truncate transition hover:text-masterise-dark" href={`/stores?category=${store.category}`}>
                {category.label}
              </Link>
              <span aria-hidden className="shrink-0 text-masterise-muted">
                /
              </span>
              <span className="min-w-0 truncate text-masterise-muted" aria-current="page">
                {store.name}
              </span>
            </nav>
            <StoreHeroGallery images={gallery} storeName={store.name} />
          </div>

          <nav
            className="sticky top-0 z-[60] order-4 -mx-[14px] flex min-h-[60px] w-[calc(100%+28px)] items-center self-start overflow-x-auto overflow-y-hidden border border-masterise-line bg-white p-2 shadow-masterise [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:top-[72px] md:mx-0 md:w-auto md:rounded-lg md:gap-2 lg:order-none gap-1"
            aria-label="Điều hướng nội dung gian hàng"
          >
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
              <a
                key={item.href}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold text-masterise-muted transition hover:bg-masterise-soft hover:text-masterise-dark sm:text-sm md:gap-2 md:px-4"
                href={item.href}
              >
                <Icon size={15} aria-hidden className="shrink-0" />
                {item.label}
              </a>
              );
            })}
          </nav>

          <div className="order-5 lg:order-none">
            <ContentBlock id="overview" eyebrow="Thông tin chi tiết" title={`Giới thiệu ${store.name}`}>
              <p className="body-text">
                {store.name} là điểm dịch vụ thuộc nhóm {category.label.toLowerCase()} tại {project?.name ?? "khu dự án"}.
                Thông tin được trình bày theo dạng cẩm nang để cư dân nhanh chóng nắm được vị trí, thời gian hoạt động,
                cách liên hệ và những lưu ý cần biết trước khi sử dụng dịch vụ.
              </p>
            </ContentBlock>
          </div>

          <div className="order-6 lg:order-none">
            <ContentBlock id="offers" eyebrow="Ưu đãi" title="Thông tin ưu đãi">
              <StoreVoucherTickets storeName={store.name} />
            </ContentBlock>
          </div>

          <div className="order-7 lg:order-none">
            <ContentBlock id="map" eyebrow="Liên hệ" title="Chỉ đường đến gian hàng">
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <p className="flex items-start gap-3 rounded-lg bg-masterise-surface p-4 text-sm font-semibold text-masterise-muted">
                  <Phone className="mt-0.5 shrink-0 text-masterise-primary" size={18} aria-hidden />
                  <span>
                    <span className="mb-1.5 block text-xs font-bold uppercase text-masterise-primary">Số điện thoại</span>
                    {store.phone}
                  </span>
                </p>
                <p className="flex items-start gap-3 rounded-lg bg-masterise-surface p-4 text-sm font-semibold text-masterise-muted">
                  <MapPin className="mt-0.5 shrink-0 text-masterise-primary" size={18} aria-hidden />
                  <span className="leading-[1.45]">
                    <span className="mb-1.5 block text-xs font-bold uppercase text-masterise-primary">Địa chỉ</span>
                    {address}
                  </span>
                </p>
              </div>
              <div className="overflow-hidden rounded-lg border border-masterise-line bg-masterise-surface">
                <iframe
                  className="h-[320px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                  title={`Bản đồ ${store.name}`}
                />
              </div>
              <a
                className="secondary-button mt-4 w-fit"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={17} aria-hidden />
                Mở Google Maps
              </a>
            </ContentBlock>
          </div>

          <div id="reviews" className="order-8 scroll-mt-[168px] lg:order-none">
            <StoreReviewBox initialReviews={demoReviews} storeId={store.id} />
          </div>
        </div>

        <aside className="hidden h-fit gap-5 lg:sticky lg:top-[96px] lg:grid">
          <section className="rounded-lg border border-masterise-line bg-white p-5 shadow-masterise">
            <span className="tag mb-2">
              {category.label}
            </span>
            <h1 className="text-2xl font-extrabold leading-[1.22] tracking-normal text-masterise-ink">{store.name}</h1>
            <p className="body-text mt-3 text-sm">{store.note}</p>

            <div className="mt-5 grid gap-3 text-sm text-masterise-muted">
              <span className="flex items-center gap-2">
                <MapPin size={17} aria-hidden className="text-masterise-primary" />
                {store.floor} - {project?.name ?? "Khu vực dự án"}
              </span>
              <span className="flex items-center gap-2">
                <Clock3 size={17} aria-hidden className="text-masterise-primary" />
                {store.hours}
              </span>
              <span className="flex items-center gap-2">
                <Star size={17} aria-hidden className="text-masterise-primary" />
                {displayRating.toFixed(1)}/5 đánh giá cư dân
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <a className="primary-button" href={`tel:${cleanPhone}`}>
                <Phone size={17} aria-hidden />
                Gọi điện
              </a>
              <a
                className="secondary-button"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Map size={17} aria-hidden />
                Chỉ đường
              </a>
            </div>
          </section>
        </aside>
      </section>

      {relatedStores.length ? (
        <section className="mt-12 border-t border-masterise-line pt-8">
          <div className="mb-6 flex items-center gap-2 text-xl font-extrabold uppercase tracking-normal text-masterise-primary">
            <Building2 size={22} aria-hidden className="shrink-0" />
            Gian hàng cùng khu vực
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {relatedStores.map((relatedStore) => (
              <StoreCard key={relatedStore.id} store={relatedStore} project={getProject(relatedStore.projectId)} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ContentBlock({
  id,
  eyebrow,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const Icon = sectionIconById[id] ?? Info;

  return (
    <section id={id} className="scroll-mt-[168px] rounded-lg border border-masterise-line bg-white p-5 md:p-6">
      <p className="mb-4 flex items-center gap-2 text-lg font-extrabold uppercase tracking-normal text-masterise-primary md:text-xl">
        <Icon size={22} aria-hidden className="shrink-0" />
        {eyebrow}
      </p>
      {children}
    </section>
  );
}

const sectionIconById: Record<string, LucideIcon> = {
  overview: Info,
  offers: TicketPercent,
  map: Phone,
};
