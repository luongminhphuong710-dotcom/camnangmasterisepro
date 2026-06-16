const { projects, stores, newsItems, regionMeta, storeCategories, fallbackImage } = window.CAMNANG_DATA;

const state = {
  region: "all",
  projectId: "all",
  searchType: "all",
  query: "",
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  hydrateControls();
  bindEvents();
  render();
  syncIcons();
});

function cacheElements() {
  els.headerSearchInput = document.querySelector("#headerSearchInput");
  els.serviceSearchInput = document.querySelector("#serviceSearchInput");
  els.regionSelect = document.querySelector("#regionSelect");
  els.projectSelect = document.querySelector("#projectSelect");
  els.searchTypeSelect = document.querySelector("#searchTypeSelect");
  els.serviceSearchButton = document.querySelector("#serviceSearchButton");
  els.hotServiceGrid = document.querySelector("#hotServiceGrid");
  els.hotServicesTitle = document.querySelector("#hotServicesTitle");
  els.hotServicesNote = document.querySelector("#hotServicesNote");
  els.newsGrid = document.querySelector("#newsGrid");
}

function hydrateControls() {
  renderRegionOptions();
  renderProjectOptions();
}

function bindEvents() {
  els.regionSelect?.addEventListener("change", () => {
    state.region = els.regionSelect.value;
    state.projectId = "all";
    renderProjectOptions();
    render();
  });

  els.projectSelect?.addEventListener("change", () => {
    state.projectId = els.projectSelect.value;
    const project = getProject(state.projectId);
    if (project) {
      state.region = project.region;
      renderRegionOptions();
      renderProjectOptions();
    }
    render();
  });

  els.searchTypeSelect?.addEventListener("change", () => {
    state.searchType = els.searchTypeSelect.value;
    render();
  });

  els.serviceSearchInput?.addEventListener("input", () => {
    state.query = els.serviceSearchInput.value;
    if (els.headerSearchInput) {
      els.headerSearchInput.value = els.serviceSearchInput.value;
    }
    render();
  });

  els.headerSearchInput?.addEventListener("input", () => {
    state.query = els.headerSearchInput.value;
    if (els.serviceSearchInput) {
      els.serviceSearchInput.value = els.headerSearchInput.value;
    }
    render();
  });

  els.serviceSearchButton?.addEventListener("click", () => {
    document.querySelector(".hot-services-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function render() {
  renderRecommendations();
  renderNews();
  hydrateImages();
  syncIcons();
}

function renderRegionOptions() {
  els.regionSelect.innerHTML = Object.entries(regionMeta)
    .map(([id, meta]) => `<option value="${id}" ${id === state.region ? "selected" : ""}>${meta.label}</option>`)
    .join("");
}

function renderProjectOptions() {
  const projectOptions = projectsForRegion(state.region);
  els.projectSelect.innerHTML = [
    `<option value="all">Tất cả dự án</option>`,
    ...projectOptions.map((project) => `<option value="${project.id}">${project.name}</option>`),
  ].join("");
  if (!projectOptions.some((project) => project.id === state.projectId)) {
    state.projectId = "all";
  }
  els.projectSelect.value = state.projectId;
}

function renderRecommendations() {
  const context = selectedContextLabel();
  const query = normalize(state.query);
  const isInfoMode = state.searchType === "info";
  const items = isInfoMode ? filteredNews().slice(0, 6) : filteredStores().slice(0, 6);

  els.hotServicesTitle.textContent = recommendationTitle();
  els.hotServicesNote.textContent = recommendationNote(context, query);

  if (!items.length) {
    els.hotServiceGrid.innerHTML = `
      <div class="no-results">
        Chưa có nội dung phù hợp với bộ lọc này. Hãy thử đổi khu vực, dự án hoặc từ khóa.
      </div>
    `;
    return;
  }

  els.hotServiceGrid.innerHTML = items.map(isInfoMode ? newsRecommendationCard : storeRecommendationCard).join("");
}

function renderNews() {
  const items = filteredNews().slice(0, 6);

  if (!items.length) {
    els.newsGrid.innerHTML = `
      <div class="no-results">Chưa có tin tức phù hợp với khu vực hiện tại.</div>
    `;
    return;
  }

  els.newsGrid.innerHTML = items
    .map((news) => {
      const project = getProject(news.projectId);
      return `
        <a class="news-item" href="article.html?id=${news.id}">
          <img src="${news.image}" alt="${news.title}" loading="lazy" />
          <div>
            <span>${news.category} / ${project ? project.name : regionMeta[news.region].label}</span>
            <h3>${news.title}</h3>
          </div>
        </a>
      `;
    })
    .join("");
}

function filteredStores() {
  const query = normalize(state.query);
  return stores
    .filter((store) => {
      const project = getProject(store.projectId);
      const category = getCategory(store.category);
      const matchesRegion = state.region === "all" || project.region === state.region;
      const matchesProject = state.projectId === "all" || store.projectId === state.projectId;
      const matchesType = state.searchType !== "services" || store.category === "service";
      const matchesQuery =
        !query ||
        normalize([store.name, store.note, store.floor, category.label, project.name, project.city].join(" ")).includes(
          query
        );
      return matchesRegion && matchesProject && matchesType && matchesQuery;
    })
    .sort((a, b) => b.rating - a.rating);
}

function filteredNews() {
  const query = normalize(state.query);
  const shouldFilterByQuery = state.searchType === "all" || state.searchType === "info";
  return newsItems.filter((news) => {
    const project = getProject(news.projectId);
    const matchesRegion = state.region === "all" || news.region === state.region || project?.region === state.region;
    const matchesProject = state.projectId === "all" || news.projectId === state.projectId;
    const matchesQuery =
      !shouldFilterByQuery ||
      !query ||
      normalize(
        [news.title, news.category, news.date, news.excerpt, news.hashtags.join(" "), project?.name, project?.city].join(
          " "
        )
      ).includes(query);
    return matchesRegion && matchesProject && matchesQuery;
  });
}

function storeRecommendationCard(store) {
  const project = getProject(store.projectId);
  const category = getCategory(store.category);
  return `
    <article class="hot-service-card">
      <div class="hot-service-top">
        <span class="hot-service-icon">
          <i data-lucide="${category.icon}" aria-hidden="true"></i>
        </span>
        <div>
          <span>${category.label} / ${project.city}</span>
          <h3>${store.name}</h3>
        </div>
      </div>
      <p>${store.note}</p>
      <div class="hot-service-meta">
        <span><i data-lucide="building-2" aria-hidden="true"></i>${project.name}</span>
        <span><i data-lucide="map-pin" aria-hidden="true"></i>${store.floor}</span>
        <span><i data-lucide="clock-3" aria-hidden="true"></i>${store.hours}</span>
        <strong><i data-lucide="star" aria-hidden="true"></i>${store.rating.toFixed(1)}</strong>
      </div>
      <div class="project-actions wide">
        <a class="primary-action" href="store.html?id=${store.id}">
          <i data-lucide="external-link" aria-hidden="true"></i>
          Xem chi tiết
        </a>
        <a class="secondary-action" href="stores.html?project=${project.id}">
          <i data-lucide="store" aria-hidden="true"></i>
          Gian hàng dự án
        </a>
      </div>
    </article>
  `;
}

function newsRecommendationCard(news) {
  const project = getProject(news.projectId);
  return `
    <article class="hot-service-card">
      <div class="hot-service-top">
        <span class="hot-service-icon">
          <i data-lucide="newspaper" aria-hidden="true"></i>
        </span>
        <div>
          <span>${news.category} / ${project ? project.city : regionMeta[news.region].label}</span>
          <h3>${news.title}</h3>
        </div>
      </div>
      <p>${news.excerpt}</p>
      <div class="hot-service-meta">
        <span><i data-lucide="calendar-days" aria-hidden="true"></i>${news.date}</span>
        <span><i data-lucide="building-2" aria-hidden="true"></i>${project ? project.name : regionMeta[news.region].name}</span>
      </div>
      <div class="project-actions wide">
        <a class="primary-action" href="article.html?id=${news.id}">
          <i data-lucide="external-link" aria-hidden="true"></i>
          Xem bài viết
        </a>
      </div>
    </article>
  `;
}

function projectsForRegion(region) {
  return projects.filter((project) => region === "all" || project.region === region);
}

function recommendationTitle() {
  if (state.searchType === "info") return "Thông tin phù hợp";
  if (state.searchType === "services") return "Top dịch vụ đang hot";
  if (state.searchType === "stores") return "Top gian hàng phù hợp";
  return hasActiveSearch() ? "Top gian hàng phù hợp" : "Top gian hàng được đề xuất";
}

function recommendationNote(context, query) {
  if (!hasActiveSearch()) {
    return "Chưa chọn khu vực hoặc từ khóa, hệ thống đang đề xuất các top gian hàng nổi bật.";
  }

  const queryText = query ? ` theo từ khóa "${state.query.trim()}"` : "";
  if (state.searchType === "info") {
    return `Đang lọc thông tin tại ${context}${queryText}.`;
  }

  return `Đang gợi ý gian hàng và dịch vụ tại ${context}${queryText}.`;
}

function hasActiveSearch() {
  return state.region !== "all" || state.projectId !== "all" || state.searchType !== "all" || Boolean(normalize(state.query));
}

function selectedContextLabel() {
  const project = state.projectId !== "all" ? getProject(state.projectId) : null;
  if (project) return project.name;
  if (state.region !== "all") return regionMeta[state.region].label;
  return "tất cả khu vực";
}

function getProject(projectId) {
  return projects.find((project) => project.id === projectId);
}

function getCategory(categoryId) {
  return storeCategories.find((category) => category.id === categoryId) ?? storeCategories[0];
}

function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
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

function syncIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
