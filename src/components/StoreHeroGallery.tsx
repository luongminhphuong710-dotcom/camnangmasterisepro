"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type StoreHeroGalleryProps = {
  images: string[];
  storeName: string;
};

export function StoreHeroGallery({ images, storeName }: StoreHeroGalleryProps) {
  const gallery = images.length ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex];
  const hasMultipleImages = gallery.length >= 2;

  function goToPrevious() {
    setActiveIndex((index) => (index === 0 ? gallery.length - 1 : index - 1));
  }

  function goToNext() {
    setActiveIndex((index) => (index === gallery.length - 1 ? 0 : index + 1));
  }

  if (!activeImage) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <div className="group relative aspect-[4/2.5] w-full overflow-hidden rounded-lg border border-masterise-line bg-masterise-soft md:h-[550px] md:aspect-auto">
        <Image
          src={activeImage}
          alt={`${storeName} ảnh ${activeIndex + 1}`}
          fill
          priority
          fetchPriority="high"
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />

        {hasMultipleImages ? (
          <>
            <button
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-masterise-primary shadow-masterise transition hover:bg-masterise-primary hover:text-white focus:bg-masterise-primary focus:text-white focus:outline-none"
              type="button"
              aria-label="Xem ảnh trước"
              onClick={goToPrevious}
            >
              <ChevronLeft size={22} aria-hidden />
            </button>
            <button
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-masterise-primary shadow-masterise transition hover:bg-masterise-primary hover:text-white focus:bg-masterise-primary focus:text-white focus:outline-none"
              type="button"
              aria-label="Xem ảnh tiếp theo"
              onClick={goToNext}
            >
              <ChevronRight size={22} aria-hidden />
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/35 px-3 py-2">
              {gallery.map((image, index) => (
                <button
                  key={`${image}-dot`}
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    index === activeIndex ? "bg-white" : "bg-white/45 hover:bg-white/80"
                  }`}
                  type="button"
                  aria-label={`Xem ảnh ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {hasMultipleImages ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {gallery.map((image, index) => (
            <button
              key={`${image}-thumb`}
              className={`relative aspect-[4/3] overflow-hidden rounded-md border bg-masterise-soft transition ${
                index === activeIndex
                  ? "border-masterise-primary ring-2 ring-masterise-primary/25"
                  : "border-masterise-line hover:border-masterise-primary"
              }`}
              type="button"
              aria-label={`Xem nhanh ảnh ${index + 1} của ${storeName}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
            >
              <Image
                src={image}
                alt={`${storeName} ảnh nhỏ ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
