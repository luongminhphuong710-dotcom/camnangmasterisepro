"use client";

import Image from "next/image";
import { Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

type StoreGalleryLightboxProps = {
  images: string[];
  storeName: string;
};

export function StoreGalleryLightbox({ images, storeName }: StoreGalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  function open(index: number) {
    setActiveIndex(index);
    setZoom(1);
  }

  function close() {
    setActiveIndex(null);
    setZoom(1);
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {images.map((image, index) => (
          <button
            className="group relative aspect-video overflow-hidden rounded-lg border border-masterise-line bg-masterise-soft text-left"
            key={`${image}-${index}`}
            type="button"
            aria-label={`Xem ảnh ${index + 1} của ${storeName}`}
            onClick={() => open(index)}
          >
            <Image src={image} alt={`${storeName} ${index + 1}`} fill sizes="(min-width: 768px) 33vw, 100vw" />
            <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold">
                <Maximize2 size={16} aria-hidden />
                Xem ảnh
              </span>
            </span>
          </button>
        ))}
      </div>

      {activeImage ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/88 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Lightbox ${storeName}`}
          onClick={close}
        >
          <div className="absolute right-4 top-4 flex gap-2" onClick={(event) => event.stopPropagation()}>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-masterise-primary transition hover:bg-masterise-soft"
              type="button"
              aria-label="Thu nhỏ ảnh"
              onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))}
            >
              <ZoomOut size={20} aria-hidden />
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-masterise-primary transition hover:bg-masterise-soft"
              type="button"
              aria-label="Phóng to ảnh"
              onClick={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}
            >
              <ZoomIn size={20} aria-hidden />
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-white text-masterise-primary transition hover:bg-masterise-soft"
              type="button"
              aria-label="Đóng lightbox"
              onClick={close}
            >
              <X size={20} aria-hidden />
            </button>
          </div>

          <div
            className="relative max-h-[82vh] w-full max-w-6xl overflow-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative mx-auto aspect-video min-w-[min(92vw,900px)] overflow-hidden rounded-lg bg-black"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            >
              <Image src={activeImage} alt={`${storeName} ảnh phóng to`} fill sizes="100vw" className="object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
