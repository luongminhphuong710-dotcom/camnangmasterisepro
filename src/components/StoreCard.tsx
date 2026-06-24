import Link from "next/link";
import Image from "next/image";
import { Building2, Clock3, Eye, MapPin, Phone, Star } from "lucide-react";
import { fallbackImage as staticFallbackImage, storeCategories as staticStoreCategories } from "@/lib/data";
import type { Project, Store, StoreCategory } from "@/lib/site-types";
import { getCategoryFromList } from "@/lib/site-utils";

type StoreCardProps = {
  store: Store;
  project?: Project;
  distance?: number | null;
  fallbackImage?: string;
  storeCategories?: readonly StoreCategory[];
};

export function StoreCard({
  store,
  project,
  distance,
  fallbackImage = staticFallbackImage,
  storeCategories = staticStoreCategories,
}: StoreCardProps) {
  const category = getCategoryFromList(storeCategories, store.category);
  const distanceLabel = typeof distance === "number" ? `${distance.toFixed(1)} km` : null;
  const reviewStats = getStoreReviewStats(store);

  return (
    <article className="store-card group relative flex h-full flex-col">
      <Link className="absolute inset-0 z-10" href={`/stores/${store.id}`} aria-label={`Xem chi tiết ${store.name}`} />
      <figure>
        <Image
          src={store.image || project?.image || fallbackImage}
          alt={store.name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
        />
      </figure>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <span className="tag mb-2">{category.label}</span>
          <h3 className="store-card-title">{store.name}</h3>
          {project ? (
            <span className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-masterise-muted">
              <Building2 size={14} aria-hidden />
              {project.name}
            </span>
          ) : null}
        </div>
        <p className="store-card-note body-text text-sm">{store.note}</p>
        <div className="mt-auto grid gap-3">
          <div className="meta-grid">
            {distanceLabel ? (
              <span>
                <MapPin size={14} aria-hidden />
                {distanceLabel}
              </span>
            ) : null}
            <span>
              <Clock3 size={14} aria-hidden />
              {store.hours}
            </span>
            {reviewStats.count > 0 ? (
              <strong>
                <Star size={14} aria-hidden />
                {reviewStats.rating.toFixed(1)}/5 ({reviewStats.count})
              </strong>
            ) : null}
          </div>
          <div className="action-row relative z-20">
            <Link className="primary-button" href={`/stores/${store.id}`}>
              <Eye size={15} aria-hidden />
              Xem chi tiết
            </Link>
            <a className="secondary-button" href={`tel:${store.phone.replace(/\s/g, "")}`}>
              <Phone size={15} aria-hidden />
              Gọi điện
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function getStoreReviewStats(store: Store) {
  const reviews = "reviews" in store && Array.isArray(store.reviews) ? store.reviews : [];
  if (!reviews.length) return { rating: 0, count: 0 };
  const rating = reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
  return { rating, count: reviews.length };
}
