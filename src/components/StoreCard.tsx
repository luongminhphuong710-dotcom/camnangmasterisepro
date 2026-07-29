"use client";

import Link from "next/link";
import Image from "next/image";
import { Building2, Clock3, Eye, MapPin, Phone, Star, X } from "lucide-react";
import { useState } from "react";
import { fallbackImage as staticFallbackImage, storeCategories as staticStoreCategories } from "@/lib/data";
import type { Project, Store, StoreCategory } from "@/lib/site-types";
import { getCategoryFromList, shortText } from "@/lib/site-utils";

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
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const category = getCategoryFromList(storeCategories, store.category);
  const distanceLabel = typeof distance === "number" ? `${distance.toFixed(1)} km` : null;
  const reviewStats = getStoreReviewStats(store);
  const phoneHref = `tel:${store.phone.replace(/\s/g, "")}`;

  return (
    <article className="store-card group relative flex h-full flex-col">
      <Link className="absolute inset-0 z-10" href={`/gian-hang/${store.id}`} prefetch={true} aria-label={`Xem chi tiết ${store.name}`} />
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
        <p className="store-card-note body-text text-sm">{shortText(store.note, 120)}</p>
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
            <Link className="primary-button" href={`/gian-hang/${store.id}`} prefetch={true}>
              <Eye size={15} aria-hidden />
              Xem chi tiết
            </Link>
            <button
              className="secondary-button"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsPhoneModalOpen(true);
              }}
            >
              <Phone size={15} aria-hidden />
              Gọi điện
            </button>
          </div>
        </div>
      </div>

      {isPhoneModalOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`store-phone-title-${store.id}`}
          onClick={() => setIsPhoneModalOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-masterise-line bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex justify-end">
              <button
                className="grid h-9 w-9 place-items-center rounded-full text-masterise-muted transition hover:bg-masterise-soft hover:text-masterise-ink"
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                aria-label="Đóng popup"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-masterise-soft text-masterise-primary">
              <Phone size={22} aria-hidden />
            </span>
            <p className="mt-4 text-sm text-masterise-muted">Số điện thoại gian hàng</p>
            <h2 id={`store-phone-title-${store.id}`} className="mt-1 text-xl font-semibold text-masterise-ink">
              {store.name}
            </h2>
            <a className="mt-4 block text-2xl font-semibold text-masterise-primary" href={phoneHref}>
              {store.phone}
            </a>
            <a className="primary-button mt-6 w-full" href={phoneHref}>
              <Phone size={17} aria-hidden />
              Gọi ngay
            </a>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function getStoreReviewStats(store: Store) {
  const reviews = "reviews" in store && Array.isArray(store.reviews) ? store.reviews : [];
  if (!reviews.length) return { rating: Number(store.rating || 0), count: Number(store.reviewCount || 0) };
  const rating = reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
  return { rating, count: reviews.length };
}