const { projects, stores, storeCategories, regionMeta, fallbackImage } = window.CAMNANG_DATA;

const state = {
  region: "all",
  city: "all",
  projectId: "all",
  category: "all",
  query: "",
};

document.addEventListener("DOMContentLoaded", () => {
  hydrateInitialState();
  renderDirectory();
  syncIcons();
});

function hydrateInitialState() {
  const params = new URLSearchParams(window.location.search);
  const project = projects.find((item) => item.id === params.get("project"));
  if (!project) return;
  state.projectId = project.id;
  state.city = project.city;
  state.region = project.region;
}

function renderDirectory() {
  const root = document.querySelector("#storeDirectory");
  const breadcrumb = document.querySelector("#breadcrumbProject");
  const projectInfoLink = document.querySelector("#projectInfoLink");
  const selectedProject = getSelectedProject();
  const items = filteredStores();

  document.title = selectedProject
    ? `Gian hàng ${selectedProject.name} | Cẩm Nang Masterise`
    : "Gian hàng | Cẩm Nang Masterise";
  breadcrumb.textContent = selectedProject ? `Gian hàng ${selectedProject.name}` : "Gian hàng";

  if (projectInfoLink) {
    projectInfoLink.href = selectedProject ? `project.html?id=${selectedProject.id}` : "projects.html";
  }

  root.innerHTML = `
    ${selectedProject ? projectHero(selectedProject) : directoryHero()}

    <section class="store-directory">
      <div class="section-heading compact">
        <p class="eyebrow">Tìm kiếm gian hàng</p>
        <h2>Gian hàng và dịch vụ</h2>
        <p>Chọn miền, tỉnh, dự án hoặc loại dịch vụ để xem đúng danh sách bạn cần.</p>
      </div>

      <div class="directory-filter-grid store-filter-grid">
        <label class="quick-filter-field" for="regionFilter">
          <i data-lucide="map" aria-hidden="true"></i>
          <select id="regionFilter" aria-label="Lọc theo miền">
            ${regionOptions()}
          </select>
        </label>
        <label class="quick-filter-field" for="cityFilter">
          <i data-lucide="map-pin" aria-hidden="true"></i>
          <select id="cityFilter" aria-label="Lọc theo tỉnh hoặc thành phố">
            ${cityOptions()}
          </select>
        </label>
        <label class="quick-filter-field" for="projectFilter">
          <i data-lucide="building-2" aria-hidden="true"></i>
          <select id="projectFilter" aria-label="Lọc theo dự án">
            ${projectOptions()}
          </select>
        </label>
        <label class="quick-filter-field" for="categoryFilter">
          <i data-lucide="sliders-horizontal" aria-hidden="true"></i>
          <select id="categoryFilter" aria-label="Lọc theo loại hình gian hàng">
            ${categoryOptions()}
          </select>
        </label>
        <label class="quick-filter-field" for="storeSearchInput">
          <i data-lucide="search" aria-hidden="true"></i>
          <input
            id="storeSearchInput"
            type="search"
            value="${escapeAttribute(state.query)}"
            placeholder="Tìm gian hàng, danh mục, tầng, giờ mở cửa..."
            autocomplete="off"
          />
        </label>
      </div>

      <div class="chip-row" id="categoryTabs" aria-label="Lọc loại hình hàng và dịch vụ">
        ${storeCategories.map(categoryButton).join("")}
      </div>

      <p class="filter-summary">${storeSummary(items.length)}</p>

      <div class="store-grid">
        ${
          items.length
            ? items.map(storeCard).join("")
            : `<div class="no-results">Không tìm thấy gian hàng phù hợp với bộ lọc hiện tại.</div>`
        }
      </div>
    </section>
  `;

  bindDirectoryEvents(root);
  hydrateImages();
  syncIcons();
}

function directoryHero() {
  return `
    <section class="store-hero">
      <figure>
        <img src="${fallbackImage}" alt="Gian hàng Masterise" />
      </figure>
      <div>
        <p class="eyebrow">Gian hàng</p>
        <h1>Gian hàng Masterise</h1>
        <p>Tìm nhanh cửa hàng, tiện ích và dịch vụ theo vùng, tỉnh thành hoặc dự án bạn đang quan tâm.</p>
        <div class="project-actions wide">
          <a class="primary-action" href="near-me.html">
            <i data-lucide="navigation" aria-hidden="true"></i>
            Gần bạn
          </a>
          <a class="secondary-action" href="projects.html">
            <i data-lucide="building-2" aria-hidden="true"></i>
            Khám phá dự án
          </a>
        </div>
      </div>
    </section>
  `;
}

function projectHero(project) {
  return `
    <section class="store-hero">
      <figure>
        <img src="${project.image}" alt="${project.name}" />
      </figure>
      <div>
        <p class="eyebrow">Gian hàng dự án</p>
        <h1>${project.name}</h1>
        <p>${regionMeta[project.region].label} / ${project.city} - ${project.location}</p>
        <div class="project-actions wide">
          <a class="primary-action" href="project.html?id=${project.id}">
            <i data-lucide="info" aria-hidden="true"></i>
            Thông tin dự án
          </a>
          <a class="secondary-action" href="stores.html">
            <i data-lucide="store" aria-hidden="true"></i>
            Tất cả gian hàng
          </a>
        </div>
      </div>
    </section>
  `;
}

function bindDirectoryEvents(root) {
  root.querySelector("#regionFilter")?.addEventListener("change", (event) => {
    state.region = event.target.value;
    state.city = "all";
    state.projectId = "all";
    renderDirectory();
  });

  root.querySelector("#cityFilter")?.addEventListener("change", (event) => {
    state.city = event.target.value;
    state.projectId = "all";
    renderDirectory();
  });

  root.querySelector("#projectFilter")?.addEventListener("change", (event) => {
    state.projectId = event.target.value;
    const project = getSelectedProject();
    if (project) {
      state.city = project.city;
      state.region = project.region;
    }
    renderDirectory();
  });

  root.querySelector("#categoryFilter")?.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderDirectory();
  });

  root.querySelector("#categoryTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderDirectory();
  });

  const searchInput = root.querySelector("#storeSearchInput");
  searchInput?.addEventListener("input", () => {
    state.query = searchInput.value;
    renderDirectory();
    const nextInput = document.querySelector("#storeSearchInput");
    nextInput?.focus();
    nextInput?.setSelectionRange(nextInput.value.length, nextInput.value.length);
  });
}

function filteredStores() {
  const query = normalize(state.query);
  return stores
    .filter((store) => {
      const project = getProject(store.projectId);
      const category = getCategory(store.category);
      const matchesRegion = state.region === "all" || project.region === state.region;
      const matchesCity = state.city === "all" || project.city === state.city;
      const matchesProject = state.projectId === "all" || store.projectId === state.projectId;
      const matchesCategory = state.category === "all" || store.category === state.category;
      const matchesQuery =
        !query ||
        normalize(
          [store.name, store.note, store.floor, store.hours, store.phone, category.label, project.name, project.city].join(
            " "
          )
        ).includes(query);
      return matchesRegion && matchesCity && matchesProject && matchesCategory && matchesQuery;
    })
    .sort((a, b) => b.rating - a.rating);
}

function storeCard(store) {
  const category = getCategory(store.category);
  const project = getProject(store.projectId);
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
          <h3>${store.name}</h3>
        </div>
      </div>
      <p>${store.note}</p>
      <div class="meta-list">
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

function storeImage(store, project) {
  return store.image || project?.image || fallbackImage;
}

function categoryButton(category) {
  return `
    <button class="${category.id === state.category ? "is-active" : ""}" type="button" data-category="${category.id}">
      <i data-lucide="${category.icon}" aria-hidden="true"></i>
      ${category.label}
    </button>
  `;
}

function categoryOptions() {
  return storeCategories
    .map(
      (category) =>
        `<option value="${category.id}" ${category.id === state.category ? "selected" : ""}>${category.label}</option>`
    )
    .join("");
}

function regionOptions() {
  return Object.entries(regionMeta)
    .map(([id, meta]) => `<option value="${id}" ${id === state.region ? "selected" : ""}>${meta.label}</option>`)
    .join("");
}

function cityOptions() {
  const cities = [...new Set(projectsForState({ includeCity: false }).map((project) => project.city))].sort((a, b) =>
    a.localeCompare(b, "vi", { sensitivity: "base" })
  );
  return [
    `<option value="all" ${state.city === "all" ? "selected" : ""}>Tất cả tỉnh/thành</option>`,
    ...cities.map((city) => `<option value="${city}" ${city === state.city ? "selected" : ""}>${city}</option>`),
  ].join("");
}

function projectOptions() {
  return [
    `<option value="all" ${state.projectId === "all" ? "selected" : ""}>Tất cả dự án</option>`,
    ...projectsForState({ includeProject: false }).map(
      (project) => `<option value="${project.id}" ${project.id === state.projectId ? "selected" : ""}>${project.name}</option>`
    ),
  ].join("");
}

function projectsForState({ includeCity = true, includeProject = true } = {}) {
  return projects.filter((project) => {
    const matchesRegion = state.region === "all" || project.region === state.region;
    const matchesCity = !includeCity || state.city === "all" || project.city === state.city;
    const matchesProject = !includeProject || state.projectId === "all" || project.id === state.projectId;
    return matchesRegion && matchesCity && matchesProject;
  });
}

function storeSummary(total) {
  const project = getSelectedProject();
  const region = state.region === "all" ? "tất cả khu vực" : regionMeta[state.region].label;
  const city = state.city === "all" ? "" : ` / ${state.city}`;
  const category = getCategory(state.category);
  const categoryText = state.category === "all" ? "tất cả loại hình" : category.label.toLowerCase();
  const scope = project ? project.name : `${region}${city}`;
  return `Đang hiển thị ${total} gian hàng thuộc ${categoryText} tại ${scope}.`;
}

function getSelectedProject() {
  return state.projectId === "all" ? null : getProject(state.projectId);
}

function getProject(projectId) {
  return projects.find((project) => project.id === projectId);
}

function getCategory(categoryId) {
  return storeCategories.find((category) => category.id === categoryId) ?? storeCategories[0];
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

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function syncIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
