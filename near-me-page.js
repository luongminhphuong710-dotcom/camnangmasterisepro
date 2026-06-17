const { projects, stores, storeCategories, fallbackImage } = window.CAMNANG_DATA;

const projectCoordinates = {
  "masteri-grand-coast": { lat: 20.9689, lng: 105.9872 },
  "masteri-era-landmark": { lat: 20.9592, lng: 106.0042 },
  "masteri-waterfront": { lat: 20.9947, lng: 105.9425 },
  "masteri-west-heights": { lat: 21.0081, lng: 105.7445 },
  "lumiere-evergreen": { lat: 21.0084, lng: 105.7437 },
  "masteri-rivera-danang": { lat: 16.0471, lng: 108.2216 },
  "masteri-cosmo-central": { lat: 10.8015, lng: 106.7679 },
  "the-global-city": { lat: 10.8015, lng: 106.7679 },
  "lumiere-midtown": { lat: 10.8032, lng: 106.7701 },
  "grand-marina-saigon": { lat: 10.7801, lng: 106.7066 },
  "lumiere-riverside": { lat: 10.8021, lng: 106.7336 },
  "masteri-an-phu": { lat: 10.8028, lng: 106.7462 },
  "masteri-centre-point": { lat: 10.8427, lng: 106.8368 },
};

const state = {
  userLocation: null,
  nearestProject: null,
  nearestProjectDistance: null,
  radius: "10",
  category: "all",
  query: "",
  usedFallback: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  hydrateCategoryOptions();
  bindEvents();
  renderNearStores();
  requestLocation();
  syncIcons();
});

function cacheElements() {
  els.locateButton = document.querySelector("#locateButton");
  els.locationStatus = document.querySelector("#locationStatus");
  els.locationHint = document.querySelector("#locationHint");
  els.nearestProjectPanel = document.querySelector("#nearestProjectPanel");
  els.nearestProjectName = document.querySelector("#nearestProjectName");
  els.nearestProjectDistance = document.querySelector("#nearestProjectDistance");
  els.nearestProjectInfoLink = document.querySelector("#nearestProjectInfoLink");
  els.nearestProjectStoresLink = document.querySelector("#nearestProjectStoresLink");
  els.radiusSelect = document.querySelector("#nearRadiusSelect");
  els.categorySelect = document.querySelector("#nearCategorySelect");
  els.searchInput = document.querySelector("#nearSearchInput");
  els.resultNote = document.querySelector("#nearResultNote");
  els.grid = document.querySelector("#nearStoreGrid");
}

function hydrateCategoryOptions() {
  els.categorySelect.innerHTML = storeCategories
    .map((category) => `<option value="${category.id}">${category.label}</option>`)
    .join("");
}

function bindEvents() {
  els.locateButton?.addEventListener("click", requestLocation);
  els.radiusSelect?.addEventListener("change", () => {
    state.radius = els.radiusSelect.value;
    renderNearStores();
  });
  els.categorySelect?.addEventListener("change", () => {
    state.category = els.categorySelect.value;
    renderNearStores();
  });
  els.searchInput?.addEventListener("input", () => {
    state.query = els.searchInput.value;
    renderNearStores();
  });
}

function requestLocation() {
  if (!navigator.geolocation) {
    setLocationStatus("Trình duyệt chưa hỗ trợ định vị", "Bạn vẫn có thể xem danh sách dịch vụ nổi bật.");
    renderNearestProject();
    return;
  }

  setLocationStatus("Đang lấy vị trí...", "Vui lòng chấp nhận yêu cầu định vị của trình duyệt.");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      updateNearestProject();
      setLocationStatus(
        "Đã nhận vị trí",
        state.nearestProject
          ? `Dự án gần nhất là ${state.nearestProject.name}. Dịch vụ bên dưới đang được ưu tiên theo phạm vi.`
          : "Danh sách bên dưới đã được sắp xếp theo khoảng cách gần nhất."
      );
      renderNearestProject();
      renderNearStores();
    },
    () => {
      setLocationStatus("Chưa thể lấy vị trí", "Bạn có thể bật quyền định vị hoặc xem danh sách nổi bật mặc định.");
      renderNearestProject();
      renderNearStores();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function renderNearStores() {
  const items = filteredStores();
  els.resultNote.textContent = nearResultMessage(items.length);

  if (!items.length) {
    els.grid.innerHTML = `
      <div class="no-results">
        Chưa có dịch vụ phù hợp trong phạm vi này. Hãy mở rộng khoảng cách hoặc đổi loại dịch vụ.
      </div>
    `;
    syncIcons();
    return;
  }

  els.grid.innerHTML = items.map(storeCard).join("");
  hydrateImages();
  syncIcons();
}

function filteredStores() {
  const query = normalize(state.query);
  const radius = state.radius === "all" ? Infinity : Number(state.radius);
  state.usedFallback = false;

  const candidates = stores
    .map((store) => {
      const project = getProject(store.projectId);
      const coords = projectCoordinates[store.projectId];
      const distance = state.userLocation && coords ? distanceInKm(state.userLocation, coords) : null;
      return { store, project, distance };
    })
    .filter(({ store, project }) => {
      const category = getCategory(store.category);
      const matchesCategory = state.category === "all" || store.category === state.category;
      const matchesQuery =
        !query ||
        normalize([store.name, store.note, store.floor, category.label, project.name, project.city].join(" ")).includes(
          query
        );
      return matchesCategory && matchesQuery;
    })
    .sort((a, b) => {
      if (state.userLocation) {
        const aIsNearest = a.project.id === state.nearestProject?.id ? 0 : 1;
        const bIsNearest = b.project.id === state.nearestProject?.id ? 0 : 1;
        if (aIsNearest !== bIsNearest) return aIsNearest - bIsNearest;
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      }
      return b.store.rating - a.store.rating;
    });

  if (!state.userLocation || radius === Infinity) {
    return candidates.slice(0, 9);
  }

  const inRange = candidates.filter(({ distance }) => distance !== null && distance <= radius);
  if (inRange.length) {
    return inRange.slice(0, 9);
  }

  state.usedFallback = Boolean(candidates.length);
  return candidates.slice(0, 9);
}

function storeCard({ store, project, distance }) {
  const category = getCategory(store.category);
  const distanceLabel = distance === null ? "Chưa có khoảng cách" : `${distance.toFixed(1)} km`;
  const nearestBadge = project.id === state.nearestProject?.id ? `<span class="store-tag">Dự án gần nhất</span>` : "";
  return `
    <article class="store-card">
      <figure class="store-card-media">
        <img src="${storeImage(store, project)}" alt="${store.name}" loading="lazy" />
      </figure>
      <div class="store-top">
        <span class="store-icon">
          <i data-lucide="${category.icon}" aria-hidden="true"></i>
        </span>
        <div>
          <span class="store-tag">${category.label}</span>
          ${nearestBadge}
          <h3>${store.name}</h3>
        </div>
      </div>
      <p>${store.note}</p>
      <div class="meta-list">
        <span><i data-lucide="navigation" aria-hidden="true"></i>${distanceLabel}</span>
        <span><i data-lucide="building-2" aria-hidden="true"></i>${project.name}</span>
        <span><i data-lucide="map-pin" aria-hidden="true"></i>${store.floor} / ${project.city}</span>
        <span><i data-lucide="clock-3" aria-hidden="true"></i>${store.hours}</span>
        <span><i data-lucide="star" aria-hidden="true"></i>${store.rating}/5 đánh giá</span>
      </div>
      <div class="project-actions wide store-card-actions">
        <a class="primary-action" href="store.html?id=${store.id}">
          <i data-lucide="external-link" aria-hidden="true"></i>
          Xem chi tiết
        </a>
        <a class="secondary-action" href="tel:${store.phone.replace(/\s/g, "")}">
          <i data-lucide="phone" aria-hidden="true"></i>
          Gọi điện
        </a>
      </div>
    </article>
  `;
}

function nearResultMessage(total) {
  if (!state.userLocation) {
    return "Danh sách đang hiển thị theo đánh giá nổi bật. Bật định vị để sắp xếp theo khoảng cách.";
  }

  if (!state.nearestProject) {
    return "Đã nhận vị trí, nhưng chưa có tọa độ dự án phù hợp để gợi ý.";
  }

  if (state.usedFallback) {
    return `Chưa có dịch vụ trong ${radiusLabel()} quanh bạn, đang hiển thị các điểm gần nhất từ ${state.nearestProject.name}.`;
  }

  return `Dự án gần nhất là ${state.nearestProject.name}. Đang hiển thị ${total} dịch vụ trong ${radiusLabel()} quanh vị trí của bạn.`;
}

function updateNearestProject() {
  if (!state.userLocation) {
    state.nearestProject = null;
    state.nearestProjectDistance = null;
    return;
  }

  const nearest = projects
    .map((project) => {
      const coords = projectCoordinates[project.id];
      return {
        project,
        distance: coords ? distanceInKm(state.userLocation, coords) : Infinity,
      };
    })
    .sort((a, b) => a.distance - b.distance)[0];

  state.nearestProject = nearest?.distance === Infinity ? null : nearest.project;
  state.nearestProjectDistance = nearest?.distance === Infinity ? null : nearest.distance;
}

function renderNearestProject() {
  if (!els.nearestProjectPanel) return;

  if (!state.nearestProject) {
    els.nearestProjectPanel.hidden = true;
    return;
  }

  els.nearestProjectPanel.hidden = false;
  els.nearestProjectName.textContent = state.nearestProject.name;
  els.nearestProjectDistance.textContent = `${state.nearestProject.city} - cách khoảng ${state.nearestProjectDistance.toFixed(
    1
  )} km`;
  els.nearestProjectInfoLink.href = `project.html?id=${state.nearestProject.id}`;
  els.nearestProjectStoresLink.href = `stores.html?project=${state.nearestProject.id}`;
}

function radiusLabel() {
  return state.radius === "all" ? "tất cả khoảng cách" : `${state.radius} km`;
}

function distanceInKm(from, to) {
  const earthRadius = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function setLocationStatus(status, hint) {
  els.locationStatus.textContent = status;
  els.locationHint.textContent = hint;
}

function getProject(projectId) {
  return projects.find((project) => project.id === projectId);
}

function getCategory(categoryId) {
  return storeCategories.find((category) => category.id === categoryId) ?? storeCategories[0];
}

function storeImage(store, project) {
  return store.image || project?.image || fallbackImage;
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

function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function syncIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
