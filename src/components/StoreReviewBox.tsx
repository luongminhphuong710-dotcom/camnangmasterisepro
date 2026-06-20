"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, MessageSquareText, Minus, Pencil, Send, Star, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";

type ReviewImage = {
  id: string;
  name: string;
  url: string;
};

type Review = {
  name: string;
  rating: number;
  comment: string;
  images?: ReviewImage[];
  isAnonymous?: boolean;
  isLocal?: boolean;
};

type StoreReviewBoxProps = {
  initialReviews?: Review[];
  storeId: string;
};

const maxImages = 2;
const imageMaxSize = 1280;
const imageQuality = 0.76;
const reviewerAdjectives = ["Empathetic", "Gentle", "Bright", "Calm", "Kind", "Lucky", "Sunny", "Urban", "Cozy", "Happy"];
const reviewerNouns = ["Carrot", "Lotus", "River", "Cloud", "Lantern", "Harbor", "Maple", "Pearl", "Garden", "Comet"];

function createImageId() {
  return `review-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createRandomReviewerName() {
  const adjective = reviewerAdjectives[Math.floor(Math.random() * reviewerAdjectives.length)];
  const noun = reviewerNouns[Math.floor(Math.random() * reviewerNouns.length)];
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${adjective}${noun}${suffix}`;
}

function isGeneratedAnonymousName(name: string) {
  const adjectives = reviewerAdjectives.join("|");
  const nouns = reviewerNouns.join("|");
  return new RegExp(`^(${adjectives})(${nouns})\\d{4}$`).test(name);
}

function resizeImageToWebp(file: File): Promise<ReviewImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Không thể đọc ảnh."));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("Không thể xử lý ảnh."));
      image.onload = () => {
        const scale = Math.min(1, imageMaxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Không thể nén ảnh."));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);

        resolve({
          id: createImageId(),
          name: file.name.replace(/\.[^.]+$/, ".webp"),
          url: canvas.toDataURL("image/webp", imageQuality),
        });
      };
      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function readStoredReview(storageKey: string) {
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as Review;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function StoreReviewBox({ initialReviews = [], storeId }: StoreReviewBoxProps) {
  const storageKey = `store-review:${storeId}`;
  const [savedReview, setSavedReview] = useState<Review | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [personalReviewerName, setPersonalReviewerName] = useState("");
  const [anonymousReviewerName, setAnonymousReviewerName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ReviewImage | null>(null);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [showModerationNotice, setShowModerationNotice] = useState(false);

  const reviews = useMemo(() => (savedReview ? [savedReview, ...initialReviews] : initialReviews), [initialReviews, savedReview]);
  const averageRating = reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : 0;
  const canSubmit = !savedReview || isEditing;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSavedReview(readStoredReview(storageKey));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [storageKey]);

  function resetForm() {
    setReviewerName("");
    setPersonalReviewerName("");
    setAnonymousReviewerName("");
    setIsAnonymous(false);
    setRating(5);
    setComment("");
    setImages([]);
    setIsEditing(false);
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fallbackAnonymousName = anonymousReviewerName || createRandomReviewerName();
    const review: Review = {
      name: isAnonymous ? reviewerName || fallbackAnonymousName : reviewerName.trim(),
      rating,
      comment,
      images,
      isAnonymous,
      isLocal: true,
    };

    setSavedReview(review);
    window.localStorage.setItem(storageKey, JSON.stringify(review));

    if (images.length) {
      setShowModerationNotice(true);
    }

    resetForm();
  }

  function updateReviewerName(value: string) {
    setReviewerName(value);
    if (!isAnonymous) {
      setPersonalReviewerName(value);
    }
  }

  function toggleAnonymousReview(checked: boolean) {
    if (checked) {
      const generatedName = createRandomReviewerName();

      setPersonalReviewerName(reviewerName);
      setAnonymousReviewerName(generatedName);
      setReviewerName(generatedName);
      setIsAnonymous(true);
      return;
    }

    setReviewerName(personalReviewerName);
    setIsAnonymous(false);
  }

  async function updateImageSlot(slotIndex: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setIsCompressing(true);
    try {
      const nextImage = await resizeImageToWebp(file);
      setImages((items) => {
        const next = [...items];
        next[slotIndex] = nextImage;
        return next.slice(0, maxImages);
      });
    } finally {
      setIsCompressing(false);
    }
  }

  function removeImage(slotIndex: number) {
    setImages((items) => items.filter((_, index) => index !== slotIndex));
  }

  function startEdit() {
    if (!savedReview) return;

    const anonymousReview = Boolean(savedReview.isAnonymous) || isGeneratedAnonymousName(savedReview.name);
    setRating(savedReview.rating);
    setReviewerName(savedReview.name);
    setPersonalReviewerName(anonymousReview ? "" : savedReview.name);
    setAnonymousReviewerName(anonymousReview ? savedReview.name : "");
    setIsAnonymous(anonymousReview);
    setComment(savedReview.comment);
    setImages(savedReview.images ?? []);
    setIsEditing(true);
  }

  function deleteReview() {
    setSavedReview(null);
    window.localStorage.removeItem(storageKey);
    resetForm();
  }

  function openLightbox(image: ReviewImage) {
    setLightboxImage(image);
    setLightboxScale(1);
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-5 rounded-lg border border-masterise-line bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-normal text-masterise-primary">
          <MessageSquareText size={22} aria-hidden className="shrink-0" />
          Chia sẻ trải nghiệm của bạn
        </p>

        {canSubmit ? (
          <form className="grid gap-3" onSubmit={submitReview}>
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-masterise-muted">Đánh sao dựa theo sự hài lòng của bạn về dịch vụ</p>
              <div className="flex items-center gap-2" role="radiogroup" aria-label="Chọn số sao đánh giá">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className="grid h-11 w-11 place-items-center rounded-full text-masterise-primary transition hover:bg-masterise-soft focus:bg-masterise-soft focus:outline-none"
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} sao`}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      size={28}
                      aria-hidden
                      className={star <= rating ? "fill-masterise-primary text-masterise-primary" : "text-masterise-primary"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <input
                className="min-h-12 rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                type="text"
                name="reviewerName"
                placeholder="Họ và tên"
                value={reviewerName}
                required={!isAnonymous}
                disabled={isAnonymous}
                onChange={(event) => updateReviewerName(event.target.value)}
              />
              <label className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-masterise-line bg-white px-4 text-sm font-semibold text-masterise-muted">
                <input
                  className="h-4 w-4 accent-masterise-primary"
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(event) => toggleAnonymousReview(event.target.checked)}
                />
                Đánh giá ẩn danh
              </label>
            </div>

            <textarea
              className="min-h-28 rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary"
              name="comment"
              placeholder="Chia sẻ trải nghiệm của bạn"
              value={comment}
              required
              onChange={(event) => setComment(event.target.value)}
            />

            <div className="flex flex-wrap gap-3">
              {[0, 1].map((slotIndex) => {
                const image = images[slotIndex];

                return (
                  <label
                    key={slotIndex}
                    className="relative grid h-20 w-28 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-masterise-line bg-masterise-surface text-center text-xs font-semibold text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-primary"
                  >
                    {image ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                        <button
                          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-masterise-primary shadow-masterise"
                          type="button"
                          aria-label="Xóa ảnh"
                          onClick={(event) => {
                            event.preventDefault();
                            removeImage(slotIndex);
                          }}
                        >
                          <X size={16} aria-hidden />
                        </button>
                      </>
                    ) : (
                      <span className="grid justify-items-center gap-2">
                        <ImagePlus size={20} aria-hidden />
                        Thêm ảnh {slotIndex + 1}
                      </span>
                    )}
                    <input className="sr-only" type="file" accept="image/*" onChange={(event) => void updateImageSlot(slotIndex, event)} />
                  </label>
                );
              })}
            </div>

            <button className="primary-button justify-self-start" type="submit" disabled={isCompressing}>
              {isEditing ? "Cập nhật đánh giá" : "Gửi đánh giá"}
              <Send size={17} aria-hidden />
            </button>
          </form>
        ) : (
          <div className="rounded-lg border border-masterise-line bg-masterise-surface p-4">
            <p className="body-text text-sm">Bạn đã gửi đánh giá cho gian hàng này. Bạn có thể chỉnh sửa hoặc xóa đánh giá của mình.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="secondary-button" type="button" onClick={startEdit}>
                <Pencil size={16} aria-hidden />
                Chỉnh sửa
              </button>
              <button className="secondary-button" type="button" onClick={deleteReview}>
                <Trash2 size={16} aria-hidden />
                Xóa
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 rounded-lg border border-masterise-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-normal text-masterise-primary">
            <Star size={22} aria-hidden className="shrink-0" />
            Đánh giá gần đây
          </p>
          <div className="flex items-center gap-3 rounded-lg bg-masterise-surface px-4 py-3 text-masterise-primary">
            <span className="text-3xl font-extrabold leading-none">{averageRating.toFixed(1)}</span>
            <span className="grid gap-1">
              <span className="flex items-center gap-1" aria-label={`${averageRating.toFixed(1)} trên 5 sao`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    aria-hidden
                    className={star <= Math.round(averageRating) ? "fill-masterise-primary text-masterise-primary" : "text-masterise-primary"}
                  />
                ))}
              </span>
              <span className="text-xs font-semibold text-masterise-muted">{reviews.length} đánh giá</span>
            </span>
          </div>
        </div>
        <div className="grid gap-3">
          {reviews.length ? (
            reviews.map((review, index) => (
              <article className="rounded-lg bg-masterise-surface p-4" key={`${review.name}-${index}`}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <strong>{review.name}</strong>
                    {review.isAnonymous || isGeneratedAnonymousName(review.name) ? (
                      <span className="rounded-full bg-[#e4e0da] px-2.5 py-1 text-xs font-bold text-masterise-muted">Ẩn danh</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-1 text-base font-bold text-masterise-primary">
                    <Star size={18} aria-hidden className="fill-masterise-primary text-masterise-primary" />
                    {review.rating}/5
                  </span>
                </div>
                <p className="body-text text-sm">{review.comment}</p>

                {review.images?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.images.map((image) => (
                      <button
                        key={image.id}
                        className="relative h-20 w-28 overflow-hidden rounded-md border border-masterise-line bg-white"
                        type="button"
                        aria-label={`Phóng to ${image.name}`}
                        onClick={() => openLightbox(image)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="body-text text-sm">Gian hàng đang chờ đánh giá thực tế từ cư dân.</p>
          )}
        </div>
      </div>

      {showModerationNotice ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true">
          <div className="max-w-md rounded-lg bg-white p-5 shadow-masterise">
            <p className="text-lg font-extrabold text-masterise-ink">Ảnh đang chờ duyệt</p>
            <p className="body-text mt-2 text-sm">
              Để đảm bảo hình ảnh an toàn tới người xem, đội ngũ của chúng tôi sẽ duyệt đánh giá trong 24h.
            </p>
            <button className="primary-button mt-4" type="button" onClick={() => setShowModerationNotice(false)}>
              Đã hiểu
            </button>
          </div>
        </div>
      ) : null}

      {lightboxImage ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-masterise-primary"
            type="button"
            aria-label="Đóng ảnh"
            onClick={() => setLightboxImage(null)}
          >
            <X size={20} aria-hidden />
          </button>
          <div className="grid max-h-[86vh] max-w-[92vw] gap-3" onClick={(event) => event.stopPropagation()}>
            <div className="overflow-auto rounded-lg bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-h-[76vh] max-w-[86vw] object-contain transition"
                style={{ transform: `scale(${lightboxScale})` }}
              />
            </div>
            <div className="mx-auto flex items-center gap-2 rounded-full bg-white p-2">
              <button
                className="grid h-9 w-9 place-items-center rounded-full text-masterise-primary hover:bg-masterise-soft"
                type="button"
                aria-label="Thu nhỏ ảnh"
                onClick={() => setLightboxScale((scale) => Math.max(1, scale - 0.25))}
              >
                <Minus size={18} aria-hidden />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-full text-masterise-primary hover:bg-masterise-soft"
                type="button"
                aria-label="Phóng to ảnh"
                onClick={() => setLightboxScale((scale) => Math.min(3, scale + 0.25))}
              >
                <ZoomIn size={18} aria-hidden />
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-full text-masterise-primary hover:bg-masterise-soft"
                type="button"
                aria-label="Trở về kích thước mặc định"
                onClick={() => setLightboxScale(1)}
              >
                <ZoomOut size={18} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
