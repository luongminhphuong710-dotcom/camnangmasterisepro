"use client";

import { FormEvent, useState } from "react";
import { Star } from "lucide-react";

type Review = {
  name: string;
  rating: number;
  comment: string;
};

export function StoreReviewBox() {
  const [reviews, setReviews] = useState<Review[]>([]);

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const review = {
      name: String(form.get("name") || "Cư dân"),
      rating: Number(form.get("rating") || 5),
      comment: String(form.get("comment") || ""),
    };
    setReviews((items) => [review, ...items]);
    event.currentTarget.reset();
  }

  return (
    <section className="grid gap-5 rounded-lg border border-masterise-line bg-white p-5">
      <div>
        <p className="eyebrow">Đánh giá cư dân</p>
        <h2 className="h2">Bình luận và đánh giá</h2>
      </div>
      <form className="grid gap-3" onSubmit={submitReview}>
        <input className="rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary" name="name" placeholder="Tên của bạn" />
        <select className="rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary" name="rating" defaultValue="5">
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
        <textarea
          className="min-h-28 rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary"
          name="comment"
          placeholder="Chia sẻ trải nghiệm của bạn"
          required
        />
        <button className="primary-button justify-self-start" type="submit">
          Gửi đánh giá
        </button>
      </form>
      <div className="grid gap-3">
        {reviews.length ? (
          reviews.map((review, index) => (
            <article className="rounded-lg bg-masterise-surface p-4" key={`${review.name}-${index}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <strong>{review.name}</strong>
                <span className="flex items-center gap-1 text-sm text-masterise-primary">
                  <Star size={15} aria-hidden />
                  {review.rating}/5
                </span>
              </div>
              <p className="body-text text-sm">{review.comment}</p>
            </article>
          ))
        ) : (
          <p className="body-text text-sm">Gian hàng đang chờ đánh giá thực tế từ cư dân.</p>
        )}
      </div>
    </section>
  );
}
