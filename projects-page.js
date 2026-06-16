const { projects, stores, regionMeta, fallbackImage } = window.CAMNANG_DATA;

const state = {
  region: "all",
  city: "all",
  segment: "all",
  query: "",
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  hydrateFilters();
  bindEvents();
  renderProjects();
  syncIcons();
});

function cacheElements() {
  els.headerSearchInput = document.querySelector("#projectHeaderSearchInput");
  els.regionFilter = document.querySelector("#projectRegionFilter");
  els.cityFilter = document.querySelector("#projectCityFilter");
  els.segmentFilter = document.querySelector("#projectSegmentFilter");
  els.searchInput = document.querySelector("#projectSearchInput");
  els.projectGrid = document.querySelector("#projectGrid");
}

function hydrateFilters() {
  renderRegionOptions();
  renderCityOptions();
  renderSegmentOptions();
}

function bindEvents() {
  els.regionFilter?.addEventListener("change", () => {
    state.region = els.regionFilter.value;
    state.city = "all";
    state.segment = "all";
    hydrateFilters();
    renderProjects();
  });

  els.cityFilter?.addEventListener("change", () => {
    state.city = els.cityFilter.value;
    state.segment = "all";
    hydrateFilters();
    renderProjects();
  });

  els.segmentFilter?.addEventListener("change", () => {
    state.segment = els.segmentFilter.value;
    renderProjects();
  });

  els.searchInput?.addEventListener("input", () => {
    state.query = els.searchInput.value;
    if (els.headerSearchInput) {
      els.headerSearchInput.value = els.searchInput.value;
    }
    renderProjects();
  });

  els.headerSearchInput?.addEventListener("input", () => {
    state.query = els.headerSearchInput.value;
    if (els.searchInput) {
      els.searchInput.value = els.headerSearchInput.value;
    }
    renderProjects();
  });
}

function renderRegionOptions() {
  els.regionFilter.innerHTML = Object.entries(regionMeta)
    .map(([id, meta]) => `<option value="${id}" ${id === state.region ? "selected" : ""}>${meta.label}</option>`)
    .join("");
}

function renderCityOptions() {
  const cities = [...new Set(projectsForFilters({ includeCity: false }).map((project) => project.city))].sort((a, b) =>
    a.localeCompare(b, "vi", { sensitivity: "base" })
  );

  if (state.city !== "all" && !cities.includes(state.city)) {
    state.city = "all";
  }

  els.cityFilter.innerHTML = [
    `<option value="all" ${state.city === "all" ? "selected" : ""}>Tất cả tỉnh/thành</option>`,
    ...cities.map((city) => `<option value="${escapeAttribute(city)}" ${city === state.city ? "selected" : ""}>${city}</option>`),
  ].join("");
}

function renderSegmentOptions() {
  const segments = [
    ...new Set(projectsForFilters({ includeSegment: false }).map((project) => project.segment)),
  ].sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" }));

  if (state.segment !== "all" && !segments.includes(state.segment)) {
    state.segment = "all";
  }

  els.segmentFilter.innerHTML = [
    `<option value="all" ${state.segment === "all" ? "selected" : ""}>Tất cả phân khúc</option>`,
    ...segments.map(
      (segment) =>
        `<option value="${escapeAttribute(segment)}" ${segment === state.segment ? "selected" : ""}>${segment}</option>`
    ),
  ].join("");
}

function renderProjects() {
  const items = filteredProjects();

  if (!items.length) {
    els.projectGrid.innerHTML = `
      <div class="no-results">
        Không tìm thấy dự án phù hợp. Hãy thử chọn miền, tỉnh/thành hoặc phân khúc khác.
      </div>
    `;
    return;
  }

  els.projectGrid.innerHTML = items.map(projectCard).join("");
  hydrateImages();
  syncIcons();
}

function projectCard(project) {
  const projectStores = stores.filter((store) => store.projectId === project.id);

  return `
    <article class="project-card">
      <figure>
        <img src="${project.image}" alt="${project.name}" loading="lazy" />
      </figure>
      <div class="project-body">
        <div class="project-heading">
          <span>${regionMeta[project.region].label} / ${project.city}</span>
          <h3>${project.name}</h3>
        </div>
        <p>${project.summary}</p>
        <div class="project-meta">
          <span>${project.segment}</span>
          <span>${project.status}</span>
          <span>${projectStores.length} gian hàng</span>
        </div>
        <div class="project-actions">
          <a class="primary-action" href="project.html?id=${project.id}">
            <i data-lucide="info" aria-hidden="true"></i>
            Thông tin
          </a>
          <a class="secondary-action" href="stores.html?project=${project.id}">
            <i data-lucide="store" aria-hidden="true"></i>
            Gian hàng
          </a>
        </div>
      </div>
    </article>
  `;
}

function filteredProjects() {
  const query = normalize(state.query);

  return projects.filter((project) => {
    const matchesRegion = state.region === "all" || project.region === state.region;
    const matchesCity = state.city === "all" || project.city === state.city;
    const matchesSegment = state.segment === "all" || project.segment === state.segment;
    const matchesQuery =
      !query ||
      normalize(
        [project.name, project.city, project.location, project.segment, project.status, project.summary].join(" ")
      ).includes(query);

    return matchesRegion && matchesCity && matchesSegment && matchesQuery;
  });
}

function projectsForFilters({ includeCity = true, includeSegment = true } = {}) {
  return projects.filter((project) => {
    const matchesRegion = state.region === "all" || project.region === state.region;
    const matchesCity = !includeCity || state.city === "all" || project.city === state.city;
    const matchesSegment = !includeSegment || state.segment === "all" || project.segment === state.segment;
    return matchesRegion && matchesCity && matchesSegment;
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

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
