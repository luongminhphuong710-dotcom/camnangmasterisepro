const CMS_API = "/api/cms";
const SESSION_KEY = "camnangCmsSession";

const state = {
  data: null,
  section: "projects",
  selectedIds: {},
  query: "",
  sessionToken: "",
  currentUser: "",
  isDirty: false,
};

const sectionConfigs = {
  projects: {
    label: "Dự án",
    collection: "projects",
    icon: "building-2",
    titleField: "name",
    subtitle: (item) => `${regionLabel(item.region)} / ${item.city || "Chưa có tỉnh"}`,
    preview: (item) => `project.html?id=${encodeURIComponent(item.id)}`,
    createItem: () => ({
      id: uniqueId("du-an-moi", getCollection("projects")),
      name: "Dự án mới",
      region: "north",
      city: "",
      location: "",
      segment: "",
      status: "",
      image: "",
      source: "",
      summary: "",
      highlights: [],
    }),
    fields: () => [
      { key: "id", label: "ID đường dẫn", type: "text", helper: "Dùng chữ thường, không dấu, ví dụ: masteri-grand-coast." },
      { key: "name", label: "Tên dự án", type: "text" },
      { key: "region", label: "Miền", type: "select", options: regionOptions() },
      { key: "city", label: "Tỉnh / thành phố", type: "text" },
      { key: "location", label: "Vị trí", type: "text", full: true },
      { key: "segment", label: "Phân khúc", type: "text" },
      { key: "status", label: "Trạng thái", type: "text" },
      { key: "image", label: "Ảnh đại diện", type: "url", full: true },
      { key: "source", label: "Link nguồn Masterise", type: "url", full: true },
      { key: "summary", label: "Mô tả chính", type: "textarea", full: true, rows: 5 },
      {
        key: "highlights",
        label: "Điểm cần theo dõi",
        type: "array",
        mode: "lines",
        full: true,
        rows: 5,
        helper: "Mỗi dòng là một ý hiển thị trong trang dự án.",
      },
    ],
  },
  stores: {
    label: "Gian hàng",
    collection: "stores",
    icon: "store",
    titleField: "name",
    subtitle: (item) => `${projectName(item.projectId)} / ${categoryLabel(item.category)}`,
    preview: (item) => `store.html?id=${encodeURIComponent(item.id)}`,
    createItem: () => ({
      id: uniqueId("gian-hang-moi", getCollection("stores")),
      name: "Gian hàng mới",
      projectId: firstProjectId(),
      category: firstCategoryId(),
      floor: "",
      hours: "08:00 - 20:00",
      phone: "0988 458 783",
      rating: 4.5,
      note: "",
    }),
    fields: () => [
      { key: "id", label: "ID đường dẫn", type: "text", helper: "Dùng cho link chi tiết gian hàng." },
      { key: "name", label: "Tên gian hàng", type: "text" },
      { key: "projectId", label: "Dự án", type: "select", options: projectOptions() },
      { key: "category", label: "Loại dịch vụ", type: "select", options: categoryOptions() },
      { key: "floor", label: "Vị trí / tầng", type: "text" },
      { key: "hours", label: "Giờ hoạt động", type: "text" },
      { key: "phone", label: "Số liên hệ", type: "tel" },
      { key: "rating", label: "Đánh giá", type: "number", min: 1, max: 5, step: 0.1 },
      { key: "note", label: "Mô tả ngắn", type: "textarea", full: true, rows: 5 },
    ],
  },
  newsItems: {
    label: "Tin tức",
    collection: "newsItems",
    icon: "newspaper",
    titleField: "title",
    subtitle: (item) => `${regionLabel(item.region)} / ${item.date || "Chưa có ngày"}`,
    preview: (item) => `article.html?id=${encodeURIComponent(item.id)}`,
    createItem: () => ({
      id: uniqueId("bai-viet-moi", getCollection("newsItems")),
      title: "Bài viết mới",
      projectId: firstProjectId(),
      region: "north",
      date: new Date().toLocaleDateString("vi-VN"),
      category: "Tin tức",
      hashtags: [],
      image: "",
      excerpt: "",
      content: [],
    }),
    fields: () => [
      { key: "id", label: "ID đường dẫn", type: "text", helper: "Dùng cho link bài viết." },
      { key: "title", label: "Tiêu đề bài viết", type: "text", full: true },
      { key: "projectId", label: "Dự án liên quan", type: "select", options: projectOptions() },
      { key: "region", label: "Miền", type: "select", options: regionOptions() },
      { key: "date", label: "Ngày đăng", type: "text", helper: "Ví dụ: 16/06/2026" },
      { key: "category", label: "Danh mục", type: "text" },
      {
        key: "hashtags",
        label: "Hashtag",
        type: "array",
        mode: "tags",
        full: true,
        rows: 3,
        helper: "Ngăn cách bằng dấu phẩy hoặc xuống dòng.",
      },
      { key: "image", label: "Ảnh bài viết", type: "url", full: true },
      { key: "excerpt", label: "Mô tả ngắn", type: "textarea", full: true, rows: 4 },
      {
        key: "content",
        label: "Nội dung bài viết",
        type: "array",
        mode: "paragraphs",
        full: true,
        rows: 10,
        helper: "Mỗi đoạn cách nhau bằng một dòng trống.",
      },
    ],
  },
  storeCategories: {
    label: "Danh mục",
    collection: "storeCategories",
    icon: "tags",
    titleField: "label",
    subtitle: (item) => `Icon: ${item.icon || "layout-grid"}`,
    preview: () => "stores.html",
    createItem: () => ({
      id: uniqueId("danh-muc-moi", getCollection("storeCategories")),
      label: "Danh mục mới",
      icon: "store",
    }),
    fields: () => [
      { key: "id", label: "ID danh mục", type: "text" },
      { key: "label", label: "Tên hiển thị", type: "text" },
      {
        key: "icon",
        label: "Lucide icon",
        type: "text",
        helper: "Ví dụ: utensils, shopping-bag, heart-pulse, concierge-bell.",
      },
    ],
  },
};

document.addEventListener("DOMContentLoaded", () => {
  hydrateSession();
  bindAuth();
  bindWorkspaceActions();
  if (state.sessionToken) {
    loadFromApi(true);
  } else {
    useLocalData(
      "Đã nạp dữ liệu hiện tại để xem thử. Hãy đăng nhập admin để tải dữ liệu mới nhất và lưu thay đổi."
    );
  }
  syncIcons();
});

function hydrateSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    state.sessionToken = saved.token || "";
    state.currentUser = saved.user || "";
  } catch {
    state.sessionToken = "";
    state.currentUser = "";
  }

  setInputValue("adminUsername", state.currentUser || "admin");
}

function bindAuth() {
  document.querySelector("#cmsLoginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loginAndLoadData();
  });

  document.querySelector("#useLocalDataButton")?.addEventListener("click", () => {
    useLocalData("Đã chuyển sang dữ liệu hiện tại đang có trong website.");
  });

  document.querySelector("#logoutCmsButton")?.addEventListener("click", () => {
    state.sessionToken = "";
    state.currentUser = "";
    sessionStorage.removeItem(SESSION_KEY);
    setInputValue("adminPassword", "");
    setStatus("Đã đăng xuất khỏi CMS. Bạn vẫn có thể xem dữ liệu hiện tại, nhưng cần đăng nhập để lưu.", "success");
  });
}

function bindWorkspaceActions() {
  document.querySelector("#cmsTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    state.section = button.dataset.section;
    state.query = "";
    setInputValue("cmsSearchInput", "");
    ensureSelection();
    renderWorkspace();
  });

  document.querySelector("#cmsSearchInput")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderItemList();
  });

  document.querySelector("#cmsItemList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-item-id]");
    if (!button) return;
    state.selectedIds[state.section] = button.dataset.itemId;
    renderItemList();
    renderEditor();
  });

  document.querySelector("#addItemButton")?.addEventListener("click", addItem);
  document.querySelector("#saveGithubButton")?.addEventListener("click", saveToGithub);
  document.querySelector("#exportDataButton")?.addEventListener("click", exportData);
  document.querySelector("#importDataInput")?.addEventListener("change", importData);

  document.querySelector("#cmsEditorPanel")?.addEventListener("input", handleEditorInput);
  document.querySelector("#cmsEditorPanel")?.addEventListener("change", handleEditorInput);
  document.querySelector("#cmsEditorPanel")?.addEventListener("click", handleEditorClick);
}

async function loginAndLoadData() {
  const username = document.querySelector("#adminUsername")?.value.trim() || "admin";
  const password = document.querySelector("#adminPassword")?.value || "";
  if (!password) {
    setStatus("Bạn cần nhập mật khẩu admin.", "error");
    return;
  }

  setStatus("Đang đăng nhập CMS...", "loading");
  try {
    const session = await apiRequest("login", {
      method: "POST",
      body: { username, password },
      auth: false,
    });
    state.sessionToken = session.token;
    state.currentUser = session.user || username;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: state.sessionToken, user: state.currentUser }));
    setInputValue("adminPassword", "");
    await loadFromApi();
  } catch (error) {
    setStatus(`Không đăng nhập được: ${error.message}`, "error");
  }
}

async function loadFromApi(isAutoLoad = false) {
  if (!state.sessionToken) {
    if (!isAutoLoad) setStatus("Bạn cần đăng nhập admin để tải dữ liệu từ CMS.", "error");
    return;
  }

  setStatus("Đang tải dữ liệu mới nhất từ CMS...", "loading");
  try {
    const response = await apiRequest("data", { method: "GET" });
    state.data = normalizeData(response.data);
    state.isDirty = false;
    ensureSelection();
    showWorkspace();
    renderWorkspace();
    setStatus(`Đã đăng nhập ${state.currentUser || "admin"} và tải dữ liệu mới nhất.`, "success");
  } catch (error) {
    if (isAutoLoad && error.statusCode === 401) {
      state.sessionToken = "";
      sessionStorage.removeItem(SESSION_KEY);
    }
    setStatus(`Không tải được dữ liệu từ CMS: ${error.message}`, "error");
  }
}

function useLocalData(message) {
  state.data = normalizeData(deepClone(window.CAMNANG_DATA || {}));
  state.remoteSha = "";
  state.isDirty = false;
  ensureSelection();
  showWorkspace();
  renderWorkspace();
  setStatus(message, "success");
}

async function saveToGithub() {
  if (!state.sessionToken) {
    setStatus("Bạn cần đăng nhập admin trước khi lưu thay đổi.", "error");
    return;
  }
  if (!state.data) {
    setStatus("Chưa có dữ liệu để lưu.", "error");
    return;
  }

  setStatus("Đang lưu dữ liệu qua CMS...", "loading");
  try {
    await apiRequest("data", {
      method: "PUT",
      body: { data: state.data },
    });
    state.isDirty = false;
    renderToolbarState();
    setStatus("Đã lưu lên GitHub qua CMS. Vercel sẽ tự deploy lại website sau commit này.", "success");
  } catch (error) {
    setStatus(`Không lưu được qua CMS: ${error.message}`, "error");
  }
}

async function apiRequest(action, { method = "GET", body = null, auth = true } = {}) {
  const headers = {
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";
  if (auth && state.sessionToken) headers.Authorization = `Bearer ${state.sessionToken}`;

  const response = await fetch(`${CMS_API}?action=${encodeURIComponent(action)}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `CMS API lỗi ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

function showWorkspace() {
  document.querySelector("#cmsWorkspace")?.removeAttribute("hidden");
}

function renderWorkspace() {
  renderToolbarState();
  renderStats();
  renderTabs();
  renderItemList();
  renderEditor();
  syncIcons();
}

function renderToolbarState() {
  const title = document.querySelector("#cmsSectionTitle");
  const saveButton = document.querySelector("#saveGithubButton");
  if (title) title.textContent = sectionConfigs[state.section].label;
  if (saveButton) {
    saveButton.classList.toggle("is-dirty", state.isDirty);
    saveButton.innerHTML = `
      <i data-lucide="save" aria-hidden="true"></i>
      ${state.isDirty ? "Lưu thay đổi" : "Lưu qua CMS"}
    `;
  }
  syncIcons();
}

function renderStats() {
  const root = document.querySelector("#cmsStats");
  if (!root) return;
  const data = state.data;
  root.innerHTML = [
    statCard("Dự án", data.projects.length, "building-2"),
    statCard("Gian hàng", data.stores.length, "store"),
    statCard("Bài viết", data.newsItems.length, "newspaper"),
    statCard("Danh mục", data.storeCategories.length, "tags"),
  ].join("");
}

function statCard(label, value, icon) {
  return `
    <article>
      <i data-lucide="${icon}" aria-hidden="true"></i>
      <strong>${value}</strong>
      <span>${label}</span>
    </article>
  `;
}

function renderTabs() {
  const root = document.querySelector("#cmsTabs");
  if (!root) return;
  root.innerHTML = Object.entries(sectionConfigs)
    .map(
      ([key, config]) => `
        <button class="${key === state.section ? "is-active" : ""}" type="button" data-section="${key}">
          <i data-lucide="${config.icon}" aria-hidden="true"></i>
          ${config.label}
        </button>
      `
    )
    .join("");
}

function renderItemList() {
  const root = document.querySelector("#cmsItemList");
  if (!root) return;
  const config = sectionConfigs[state.section];
  const query = normalize(state.query);
  const items = getCollection(state.section).filter((item) => itemMatchesQuery(item, query));

  if (!items.length) {
    root.innerHTML = `<div class="cms-empty">Không có mục phù hợp với từ khóa hiện tại.</div>`;
    return;
  }

  root.innerHTML = items
    .map((item) => {
      const isActive = item.id === state.selectedIds[state.section];
      return `
        <button class="${isActive ? "is-active" : ""}" type="button" data-item-id="${escapeAttribute(item.id)}">
          <strong>${escapeHtml(item[config.titleField] || item.id)}</strong>
          <span>${escapeHtml(config.subtitle(item))}</span>
        </button>
      `;
    })
    .join("");
}

function renderEditor() {
  const root = document.querySelector("#cmsEditorPanel");
  if (!root) return;
  const config = sectionConfigs[state.section];
  const item = getCurrentItem();

  if (!item) {
    root.innerHTML = `
      <div class="cms-empty editor-empty">
        <i data-lucide="file-plus-2" aria-hidden="true"></i>
        <strong>Chưa có nội dung</strong>
        <span>Bấm “Thêm mới” để tạo mục đầu tiên trong nhóm này.</span>
      </div>
    `;
    syncIcons();
    return;
  }

  root.innerHTML = `
    <div class="cms-editor-head">
      <div>
        <p class="eyebrow">${config.label}</p>
        <h3>${escapeHtml(item[config.titleField] || item.id)}</h3>
      </div>
      <div>
        <a class="secondary-action" href="${config.preview(item)}" target="_blank" rel="noreferrer">
          <i data-lucide="external-link" aria-hidden="true"></i>
          Xem trang
        </a>
        <button class="secondary-action" type="button" data-editor-action="duplicate">
          <i data-lucide="copy" aria-hidden="true"></i>
          Nhân bản
        </button>
        <button class="danger-action" type="button" data-editor-action="delete">
          <i data-lucide="trash-2" aria-hidden="true"></i>
          Xóa
        </button>
      </div>
    </div>

    <form class="cms-editor-form">
      ${config.fields().map((field) => renderField(field, item)).join("")}
    </form>
  `;
  syncIcons();
}

function renderField(field, item) {
  const value = item[field.key] ?? "";
  const isFull = field.full ? "full" : "";
  const helper = field.helper ? `<small>${escapeHtml(field.helper)}</small>` : "";

  if (field.type === "select") {
    return `
      <label class="${isFull}">
        <span>${field.label}</span>
        <select data-field="${field.key}">
          ${field.options
            .map(
              (option) => `
                <option value="${escapeAttribute(option.value)}" ${option.value === value ? "selected" : ""}>
                  ${escapeHtml(option.label)}
                </option>
              `
            )
            .join("")}
        </select>
        ${helper}
      </label>
    `;
  }

  if (field.type === "textarea" || field.type === "array") {
    const textValue = field.type === "array" ? arrayToText(value, field.mode) : value;
    return `
      <label class="${isFull}">
        <span>${field.label}</span>
        <textarea data-field="${field.key}" data-mode="${field.mode || ""}" rows="${field.rows || 4}">${escapeHtml(
          textValue
        )}</textarea>
        ${helper}
      </label>
    `;
  }

  return `
    <label class="${isFull}">
      <span>${field.label}</span>
      <input
        data-field="${field.key}"
        type="${field.type || "text"}"
        value="${escapeAttribute(value)}"
        ${field.min !== undefined ? `min="${field.min}"` : ""}
        ${field.max !== undefined ? `max="${field.max}"` : ""}
        ${field.step !== undefined ? `step="${field.step}"` : ""}
      />
      ${helper}
    </label>
  `;
}

function handleEditorInput(event) {
  const input = event.target.closest("[data-field]");
  if (!input) return;
  const item = getCurrentItem();
  if (!item) return;

  const field = findField(input.dataset.field);
  if (!field) return;

  const oldId = item.id;
  const value = readFieldValue(input, field);
  item[field.key] = value;

  if (field.key === "id") {
    item.id = slugify(String(value)) || oldId;
    input.value = item.id;
    if (item.id !== oldId) {
      updateReferences(oldId, item.id);
      state.selectedIds[state.section] = item.id;
    }
  }

  if (state.section === "newsItems" && field.key === "projectId") {
    const project = projectById(value);
    if (project) item.region = project.region;
  }

  markDirty();
  renderStats();
  renderItemList();
  renderToolbarState();
}

function handleEditorClick(event) {
  const actionButton = event.target.closest("[data-editor-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.editorAction;
  if (action === "duplicate") duplicateItem();
  if (action === "delete") deleteItem();
}

function readFieldValue(input, field) {
  if (field.type === "number") {
    const number = Number(input.value);
    return Number.isFinite(number) ? number : 0;
  }
  if (field.type === "array") {
    return textToArray(input.value, field.mode);
  }
  return input.value;
}

function findField(key) {
  return sectionConfigs[state.section].fields().find((field) => field.key === key);
}

function addItem() {
  const config = sectionConfigs[state.section];
  const item = config.createItem();
  getCollection(state.section).unshift(item);
  state.selectedIds[state.section] = item.id;
  markDirty();
  renderWorkspace();
}

function duplicateItem() {
  const item = getCurrentItem();
  if (!item) return;
  const copy = deepClone(item);
  copy.id = uniqueId(`${item.id}-copy`, getCollection(state.section));
  const titleField = sectionConfigs[state.section].titleField;
  copy[titleField] = `${copy[titleField] || "Bản sao"} (bản sao)`;
  getCollection(state.section).unshift(copy);
  state.selectedIds[state.section] = copy.id;
  markDirty();
  renderWorkspace();
}

function deleteItem() {
  const item = getCurrentItem();
  if (!item) return;
  const config = sectionConfigs[state.section];
  const label = item[config.titleField] || item.id;
  if (!window.confirm(`Xóa "${label}" khỏi CMS?`)) return;

  const collection = getCollection(state.section);
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index >= 0) collection.splice(index, 1);

  if (state.section === "projects") {
    state.data.stores = state.data.stores.filter((store) => store.projectId !== item.id);
    state.data.newsItems = state.data.newsItems.filter((news) => news.projectId !== item.id);
  }
  if (state.section === "storeCategories") {
    state.data.stores.forEach((store) => {
      if (store.category === item.id) store.category = firstCategoryId();
    });
  }

  state.selectedIds[state.section] = getCollection(state.section)[0]?.id || "";
  markDirty();
  renderWorkspace();
}

function updateReferences(oldId, newId) {
  if (state.section === "projects") {
    state.data.stores.forEach((store) => {
      if (store.projectId === oldId) store.projectId = newId;
    });
    state.data.newsItems.forEach((news) => {
      if (news.projectId === oldId) news.projectId = newId;
    });
  }

  if (state.section === "storeCategories") {
    state.data.stores.forEach((store) => {
      if (store.category === oldId) store.category = newId;
    });
  }
}

function exportData() {
  if (!state.data) return;
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `camnang-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Đã xuất file JSON dữ liệu.", "success");
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    state.data = normalizeData(imported);
    state.isDirty = true;
    ensureSelection();
    renderWorkspace();
    setStatus("Đã nhập JSON. Bấm lưu để đẩy dữ liệu này lên GitHub.", "success");
  } catch (error) {
    setStatus(`Không đọc được file JSON: ${error.message}`, "error");
  } finally {
    event.target.value = "";
  }
}

function ensureSelection() {
  Object.keys(sectionConfigs).forEach((section) => {
    const collection = getCollection(section);
    const currentId = state.selectedIds[section];
    if (!collection.some((item) => item.id === currentId)) {
      state.selectedIds[section] = collection[0]?.id || "";
    }
  });
}

function getCurrentItem() {
  const currentId = state.selectedIds[state.section];
  return getCollection(state.section).find((item) => item.id === currentId) || null;
}

function getCollection(section) {
  if (!state.data) return [];
  const key = sectionConfigs[section]?.collection || section;
  if (!Array.isArray(state.data[key])) state.data[key] = [];
  return state.data[key];
}

function normalizeData(data) {
  const source = data || {};
  return {
    fallbackImage:
      source.fallbackImage ||
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    regionMeta: source.regionMeta || {
      all: { label: "Tất cả", name: "Tất cả dự án" },
      north: { label: "Miền Bắc", name: "Dự án miền Bắc" },
      central: { label: "Miền Trung", name: "Dự án miền Trung" },
      south: { label: "Miền Nam", name: "Dự án miền Nam" },
    },
    projects: Array.isArray(source.projects) ? source.projects : [],
    storeCategories: Array.isArray(source.storeCategories) ? source.storeCategories : [],
    stores: Array.isArray(source.stores) ? source.stores : [],
    newsItems: Array.isArray(source.newsItems) ? source.newsItems : [],
  };
}

function parseSiteData(source) {
  const sandbox = {};
  try {
    return new Function("window", `${source}; return window.CAMNANG_DATA;`)(sandbox);
  } catch (error) {
    throw new Error(`Không đọc được site-data.js: ${error.message}`);
  }
}

function markDirty() {
  state.isDirty = true;
}

function setStatus(message, type = "info") {
  const root = document.querySelector("#cmsStatus");
  if (!root) return;
  root.className = `cms-status ${type}`;
  root.textContent = message;
}

function itemMatchesQuery(item, query) {
  if (!query) return true;
  return normalize(Object.values(item).flat().join(" ")).includes(query);
}

function regionOptions() {
  return Object.entries(state.data?.regionMeta || {})
    .filter(([id]) => id !== "all")
    .map(([value, meta]) => ({ value, label: meta.label || value }));
}

function projectOptions() {
  return (state.data?.projects || []).map((project) => ({ value: project.id, label: project.name || project.id }));
}

function categoryOptions() {
  return (state.data?.storeCategories || []).map((category) => ({
    value: category.id,
    label: category.label || category.id,
  }));
}

function firstProjectId() {
  return state.data?.projects?.[0]?.id || "";
}

function firstCategoryId() {
  return state.data?.storeCategories?.[0]?.id || "";
}

function projectById(id) {
  return state.data?.projects?.find((project) => project.id === id);
}

function projectName(id) {
  return projectById(id)?.name || "Chưa chọn dự án";
}

function categoryLabel(id) {
  return state.data?.storeCategories?.find((category) => category.id === id)?.label || "Chưa chọn danh mục";
}

function regionLabel(id) {
  return state.data?.regionMeta?.[id]?.label || id || "Chưa chọn miền";
}

function arrayToText(value, mode) {
  const items = Array.isArray(value) ? value : [];
  if (mode === "paragraphs") return items.join("\n\n");
  if (mode === "tags") return items.join(", ");
  return items.join("\n");
}

function textToArray(value, mode) {
  const text = String(value || "").trim();
  if (!text) return [];
  if (mode === "paragraphs") {
    return text
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (mode === "tags") {
    return text
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueId(base, collection) {
  const root = slugify(base) || "item";
  const existing = new Set(collection.map((item) => item.id));
  if (!existing.has(root)) return root;
  let index = 2;
  while (existing.has(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

function slugify(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function decodeBase64(value) {
  const binary = atob(String(value || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function setInputValue(id, value) {
  const input = document.querySelector(`#${id}`);
  if (input) input.value = value || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function syncIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
