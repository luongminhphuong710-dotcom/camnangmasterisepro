const { projects, stores, storeCategories, fallbackImage } = window.CAMNANG_DATA;

const categoryGalleries = {
  food: [
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80",
  ],
  shopping: [
    "https://images.unsplash.com/photo-1515706886582-54c73c5eaf41?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1200&q=80",
  ],
  health: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
  ],
  service: [
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  ],
  home: [
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
  ],
};

let store = null;
let project = null;

document.addEventListener("DOMContentLoaded", () => {
  store = resolveStore();
  project = getProject(store.projectId);
  bindBackLinks();
  renderStoreDetail();
  syncIcons();
});

function resolveStore() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return stores.find((item) => item.id === id) ?? stores[0];
}

function bindBackLinks() {
  const storesHref = `stores.html?project=${store.projectId}`;
  document.querySelector("#backToStoresLink").href = storesHref;
  document.querySelector("#breadcrumbStores").href = storesHref;
  document.querySelector("#breadcrumbStore").textContent = store.name;
}

function renderStoreDetail() {
  const root = document.querySelector("#storeDetail");
  const category = getCategory(store.category);
  const reviews = getReviews();
  const rating = combinedRating(reviews);
  const gallery = buildGallery();

  document.title = `${store.name} | Cẩm Nang Masterise`;

  root.innerHTML = `
    <section class="store-profile-hero">
      <div>
        <p class="eyebrow">${category?.label ?? "Gian hàng"} / ${project?.name ?? "Dự án"}</p>
        <h1>${store.name}</h1>
        <p>${store.note} Đây là trang thông tin riêng của gian hàng, giúp cư dân tra cứu nhanh dịch vụ, liên hệ, vị trí và đánh giá thực tế.</p>
        <div class="store-rating-line">
          <strong>${rating.toFixed(1)}</strong>
          <span>${stars(rating)} ${reviews.length ? `${reviews.length} đánh giá cư dân` : "Đánh giá mẫu"}</span>
        </div>
        <div class="project-actions wide">
          <a class="primary-action" href="tel:${store.phone.replace(/\s/g, "")}">
            <i data-lucide="phone" aria-hidden="true"></i>
            Gọi gian hàng
          </a>
          <a class="secondary-action" href="#storeReviewForm">
            <i data-lucide="star" aria-hidden="true"></i>
            Viết đánh giá
          </a>
        </div>
      </div>
      <div class="store-gallery">
        <img class="gallery-main" src="${gallery[0]}" alt="${store.name}" />
        <div>
          ${gallery
            .slice(1, 4)
            .map((image, index) => `<img src="${image}" alt="${store.name} ${index + 2}" />`)
            .join("")}
        </div>
      </div>
    </section>

    <section class="store-profile-grid">
      <div class="store-profile-panel">
        <p class="eyebrow">Thông tin giới thiệu</p>
        <h2>Giới thiệu gian hàng</h2>
        <p>${introText(category?.label ?? "dịch vụ")}</p>
        <p>${store.note}</p>
      </div>

      <aside class="store-profile-panel">
        <p class="eyebrow">Thông tin cơ bản</p>
        <h2>Chi tiết dịch vụ</h2>
        <div class="store-info-list">
          <div><i data-lucide="${category?.icon ?? "store"}" aria-hidden="true"></i><strong>Loại dịch vụ</strong><span>${category?.label ?? "Dịch vụ"}</span></div>
          <div><i data-lucide="clock-3" aria-hidden="true"></i><strong>Giờ hoạt động</strong><span>${store.hours}</span></div>
          <div><i data-lucide="star" aria-hidden="true"></i><strong>Đánh giá</strong><span>${rating.toFixed(1)}/5</span></div>
          <div><i data-lucide="phone" aria-hidden="true"></i><strong>Liên hệ</strong><span>${store.phone}</span></div>
          <div><i data-lucide="map-pin" aria-hidden="true"></i><strong>Vị trí</strong><span>${store.floor}, ${project?.location ?? ""}</span></div>
        </div>
      </aside>

      <div class="store-profile-panel map-panel">
        <p class="eyebrow">Định vị</p>
        <h2>Vị trí gian hàng</h2>
        <iframe
          title="Bản đồ ${store.name}"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=${encodeURIComponent(mapQuery())}&output=embed"
        ></iframe>
      </div>

      <div class="store-profile-panel review-panel">
        <p class="eyebrow">Bình luận & đánh giá</p>
        <h2>Đánh giá từ cư dân</h2>
        <form class="review-form" id="storeReviewForm">
          <label>
            <span>Tên của bạn</span>
            <input name="name" type="text" placeholder="Ví dụ: Minh Anh" required />
          </label>
          <label>
            <span>Số sao</span>
            <select name="rating" required>
              <option value="5">5 sao - Rất hài lòng</option>
              <option value="4">4 sao - Hài lòng</option>
              <option value="3">3 sao - Tạm ổn</option>
              <option value="2">2 sao - Cần cải thiện</option>
              <option value="1">1 sao - Chưa hài lòng</option>
            </select>
          </label>
          <label class="full">
            <span>Bình luận</span>
            <textarea name="comment" rows="4" placeholder="Chia sẻ trải nghiệm của bạn..." required></textarea>
          </label>
          <button class="primary-action" type="submit">
            <i data-lucide="send" aria-hidden="true"></i>
            Gửi đánh giá
          </button>
        </form>
        <div class="review-list" id="reviewList">${reviewList(reviews)}</div>
      </div>
    </section>
  `;

  root.querySelector("#storeReviewForm")?.addEventListener("submit", handleReviewSubmit);
  hydrateImages();
}

function handleReviewSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const review = {
    name: String(data.get("name") || "Cư dân").trim(),
    rating: Number(data.get("rating") || 5),
    comment: String(data.get("comment") || "").trim(),
    date: new Date().toLocaleDateString("vi-VN"),
  };
  if (!review.comment) return;
  const reviews = [review, ...getReviews()];
  localStorage.setItem(reviewKey(), JSON.stringify(reviews));
  form.reset();
  renderStoreDetail();
}

function reviewList(reviews) {
  if (!reviews.length) {
    return `
      <article class="review-item">
        <strong>Cẩm Nang Masterise</strong>
        <span>${stars(store.rating)} ${store.rating}/5</span>
        <p>Gian hàng đang chờ đánh giá thực tế từ cư dân. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn.</p>
      </article>
    `;
  }
  return reviews
    .map(
      (review) => `
        <article class="review-item">
          <strong>${escapeHtml(review.name)}</strong>
          <span>${stars(review.rating)} ${review.rating}/5 - ${review.date}</span>
          <p>${escapeHtml(review.comment)}</p>
        </article>
      `
    )
    .join("");
}

function buildGallery() {
  const categoryImages = categoryGalleries[store.category] ?? categoryGalleries.service;
  return [store.image || project?.image || fallbackImage, ...categoryImages];
}

function introText(categoryLabel) {
  return `${store.name} là gian hàng thuộc nhóm ${categoryLabel.toLowerCase()}, phục vụ cư dân tại ${
    project?.name ?? "dự án"
  }. Trang này tập hợp thông tin giới thiệu, giờ hoạt động, liên hệ, vị trí và phản hồi để cư dân dễ ra quyết định trước khi sử dụng dịch vụ.`;
}

function mapQuery() {
  return [store.name, store.floor, project?.name, project?.location, project?.city]
    .filter(Boolean)
    .join(", ");
}

function combinedRating(reviews) {
  if (!reviews.length) return Number(store.rating);
  const total = reviews.reduce((sum, review) => sum + Number(review.rating), Number(store.rating));
  return total / (reviews.length + 1);
}

function stars(value) {
  const rounded = Math.round(Number(value));
  return "★★★★★"
    .split("")
    .map((star, index) => `<span class="${index < rounded ? "is-filled" : ""}">${star}</span>`)
    .join("");
}

function getReviews() {
  try {
    return JSON.parse(localStorage.getItem(reviewKey()) || "[]");
  } catch {
    return [];
  }
}

function reviewKey() {
  return `storeReviews:${store.id}`;
}

function getProject(projectId) {
  return projects.find((item) => item.id === projectId);
}

function getCategory(categoryId) {
  return storeCategories.find((item) => item.id === categoryId);
}

function hydrateImages() {
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        if (image.src !== fallbackImage) {
          image.src = fallbackImage;
        }
      },
      { once: true }
    );
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function syncIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
