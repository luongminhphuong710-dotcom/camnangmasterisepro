"use client";

import {
  Download,
  Eye,
  FileJson,
  FolderOpen,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Newspaper,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Store,
  Tags,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type FormEvent } from "react";
import { camnangData } from "@/lib/data";

const CMS_API = "/api/cms";
const SESSION_KEY = "camnangCmsSession";

type CmsValue = string | number | string[] | undefined;
type CmsItem = Record<string, CmsValue>;

type SiteData = {
  fallbackImage: string;
  regionMeta: Record<string, { label?: string; name?: string }>;
  projects: CmsItem[];
  storeCategories: CmsItem[];
  stores: CmsItem[];
  newsItems: CmsItem[];
};

type SectionKey = "projects" | "stores" | "newsItems" | "storeCategories";
type StatusType = "success" | "error" | "loading";
type ArrayMode = "lines" | "tags" | "paragraphs";

type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "url" | "tel" | "number" | "textarea" | "select" | "array";
  helper?: string;
  full?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  mode?: ArrayMode;
  options?: Array<{ value: string; label: string }>;
};

type SectionConfig = {
  key: SectionKey;
  label: string;
  collection: SectionKey;
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  titleField: string;
  subtitle: (item: CmsItem, data: SiteData) => string;
  preview: (item: CmsItem) => string;
  createItem: (data: SiteData) => CmsItem;
  fields: (data: SiteData) => FieldConfig[];
};

type Session = {
  token: string;
  user: string;
  expiresAt: number;
};

const sectionConfigs: Record<SectionKey, SectionConfig> = {
  projects: {
    key: "projects",
    label: "Dự án",
    collection: "projects",
    icon: Layers,
    titleField: "name",
    subtitle: (item, data) => `${regionLabel(data, item.region)} / ${stringValue(item.city) || "Chưa có tỉnh"}`,
    preview: (item) => `/projects/${encodeURIComponent(stringValue(item.id))}`,
    createItem: (data) => ({
      id: uniqueId("du-an-moi", data.projects),
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
    fields: (data) => [
      { key: "id", label: "ID đường dẫn", type: "text", helper: "Dùng chữ thường, không dấu, ví dụ: masteri-grand-coast." },
      { key: "name", label: "Tên dự án", type: "text" },
      { key: "region", label: "Miền", type: "select", options: regionOptions(data) },
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
    key: "stores",
    label: "Gian hàng",
    collection: "stores",
    icon: Store,
    titleField: "name",
    subtitle: (item, data) => `${projectName(data, item.projectId)} / ${categoryLabel(data, item.category)}`,
    preview: (item) => `/stores/${encodeURIComponent(stringValue(item.id))}`,
    createItem: (data) => ({
      id: uniqueId("gian-hang-moi", data.stores),
      name: "Gian hàng mới",
      projectId: firstProjectId(data),
      category: firstCategoryId(data),
      image: "",
      floor: "",
      hours: "08:00 - 20:00",
      phone: "0988 458 783",
      rating: 4.5,
      reviewCount: 0,
      note: "",
    }),
    fields: (data) => [
      { key: "reviewCount", label: "Số lượt đánh giá", type: "number", min: 0, step: 1 },
      { key: "id", label: "ID đường dẫn", type: "text", helper: "Dùng cho link chi tiết gian hàng." },
      { key: "name", label: "Tên gian hàng", type: "text" },
      { key: "projectId", label: "Dự án", type: "select", options: projectOptions(data) },
      { key: "category", label: "Loại dịch vụ", type: "select", options: categoryOptions(data) },
      { key: "image", label: "Ảnh đại diện", type: "url", full: true },
      { key: "floor", label: "Vị trí / tầng", type: "text" },
      { key: "hours", label: "Giờ hoạt động", type: "text" },
      { key: "phone", label: "Số liên hệ", type: "tel" },
      { key: "rating", label: "Đánh giá", type: "number", min: 1, max: 5, step: 0.1 },
      { key: "note", label: "Mô tả ngắn", type: "textarea", full: true, rows: 5 },
    ],
  },
  newsItems: {
    key: "newsItems",
    label: "Tin tức",
    collection: "newsItems",
    icon: Newspaper,
    titleField: "title",
    subtitle: (item, data) => `${regionLabel(data, item.region)} / ${stringValue(item.date) || "Chưa có ngày"}`,
    preview: (item) => `/news/${encodeURIComponent(stringValue(item.id))}`,
    createItem: (data) => ({
      id: uniqueId("bai-viet-moi", data.newsItems),
      title: "Bài viết mới",
      projectId: firstProjectId(data),
      region: "north",
      date: new Date().toLocaleDateString("vi-VN"),
      category: "Tin tức",
      hashtags: [],
      image: "",
      excerpt: "",
      content: [],
    }),
    fields: (data) => [
      { key: "id", label: "ID đường dẫn", type: "text", helper: "Dùng cho link bài viết." },
      { key: "title", label: "Tiêu đề bài viết", type: "text", full: true },
      { key: "projectId", label: "Dự án liên quan", type: "select", options: projectOptions(data) },
      { key: "region", label: "Miền", type: "select", options: regionOptions(data) },
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
    key: "storeCategories",
    label: "Danh mục",
    collection: "storeCategories",
    icon: Tags,
    titleField: "label",
    subtitle: (item) => `Icon: ${stringValue(item.icon) || "layout-grid"}`,
    preview: () => "/stores",
    createItem: (data) => ({
      id: uniqueId("danh-muc-moi", data.storeCategories),
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

const sections = Object.values(sectionConfigs);

export function AdminClient() {
  const [data, setData] = useState<SiteData>(() => normalizeData(camnangData));
  const [section, setSection] = useState<SectionKey>("projects");
  const [selectedIds, setSelectedIds] = useState<Partial<Record<SectionKey, string>>>({});
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({
    type: "success",
    message: "Đã nạp dữ liệu hiện tại trong website. Đăng nhập để tải dữ liệu mới nhất và lưu lên GitHub.",
  });
  const importInputRef = useRef<HTMLInputElement>(null);

  const config = sectionConfigs[section];
  const collection = data[config.collection];
  const explicitSelectedId = selectedIds[section];
  const selectedId =
    explicitSelectedId && collection.some((item) => stringValue(item.id) === explicitSelectedId)
      ? explicitSelectedId
      : stringValue(collection[0]?.id);
  const selectedItem = collection.find((item) => stringValue(item.id) === selectedId) || collection[0];

  const filteredItems = useMemo(() => {
    const text = normalize(query);
    if (!text) return collection;
    return collection.filter((item) => normalize(Object.values(item).flat().join(" ")).includes(text));
  }, [collection, query]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setStatus({ type: "error", message: "Bạn cần nhập mật khẩu admin." });
      return;
    }

    setIsBusy(true);
    setStatus({ type: "loading", message: "Đang đăng nhập CMS..." });
    try {
      const result = await apiRequest<{ token: string; user: string; expiresAt: number }>("login", {
        method: "POST",
        body: { username, password },
      });
      const nextSession = { token: result.token, user: result.user || username, expiresAt: result.expiresAt };
      setSession(nextSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setPassword("");
      await loadFromApi(nextSession.token);
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  async function loadFromApi(token = session?.token || "", quiet = false) {
    if (!token) return;
    if (!quiet) setStatus({ type: "loading", message: "Đang tải dữ liệu mới nhất từ GitHub..." });

    try {
      const result = await apiRequest<{ data: unknown }>("data", { method: "GET", token });
      setData(normalizeData(result.data));
      setIsDirty(false);
      setStatus({ type: "success", message: "Đã tải dữ liệu mới nhất từ CMS." });
    } catch (error) {
      setStatus({ type: quiet ? "success" : "error", message: quiet ? "Đang dùng dữ liệu local để xem thử." : errorMessage(error) });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      await Promise.resolve();
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored || cancelled) return;

      try {
        const nextSession = JSON.parse(stored) as Session;
        if (!nextSession.token || nextSession.expiresAt <= Math.floor(Date.now() / 1000)) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }

        setSession(nextSession);
        setUsername(nextSession.user || "admin");

        const result = await apiRequest<{ data: unknown }>("data", { method: "GET", token: nextSession.token });
        if (cancelled) return;
        setData(normalizeData(result.data));
        setIsDirty(false);
        setStatus({ type: "success", message: "Đã tải dữ liệu mới nhất từ CMS." });
      } catch {
        if (!cancelled) {
          setStatus({ type: "success", message: "Đang dùng dữ liệu local để xem thử." });
        }
      }
    }

    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveToGithub() {
    if (!session?.token) {
      setStatus({ type: "error", message: "Bạn cần đăng nhập admin trước khi lưu lên GitHub." });
      return;
    }

    setIsBusy(true);
    setStatus({ type: "loading", message: "Đang lưu dữ liệu lên GitHub..." });
    try {
      await apiRequest("data", { method: "PUT", token: session.token, body: { data } });
      setIsDirty(false);
      setStatus({ type: "success", message: "Đã lưu lên GitHub. Vercel sẽ tự deploy lại website sau commit này." });
    } catch (error) {
      setStatus({ type: "error", message: errorMessage(error) });
    } finally {
      setIsBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setStatus({ type: "success", message: "Đã đăng xuất CMS. Bạn vẫn có thể xem và export dữ liệu local." });
  }

  function useLocalData() {
    setData(normalizeData(camnangData));
    setIsDirty(false);
    setStatus({ type: "success", message: "Đã chuyển sang dữ liệu hiện tại trong source Next.js." });
  }

  function addItem() {
    const item = config.createItem(data);
    setData((current) => ({
      ...current,
      [config.collection]: [...current[config.collection], item],
    }));
    setSelectedIds((current) => ({ ...current, [section]: stringValue(item.id) }));
    setIsDirty(true);
    setStatus({ type: "success", message: `Đã thêm ${config.label.toLowerCase()} mới.` });
  }

  function deleteItem() {
    if (!selectedItem) return;
    const title = stringValue(selectedItem[config.titleField]) || stringValue(selectedItem.id);
    if (!window.confirm(`Xóa "${title}"?`)) return;

    const nextCollection = collection.filter((item) => item !== selectedItem);
    setData((current) => ({
      ...current,
      [config.collection]: nextCollection,
    }));
    setSelectedIds((current) => ({ ...current, [section]: stringValue(nextCollection[0]?.id) }));
    setIsDirty(true);
    setStatus({ type: "success", message: "Đã xóa mục đã chọn. Bấm lưu để đẩy thay đổi lên GitHub." });
  }

  function updateSelectedItem(key: string, value: CmsValue) {
    if (!selectedItem) return;
    const oldId = stringValue(selectedItem.id);
    setData((current) => ({
      ...current,
      [config.collection]: current[config.collection].map((item) =>
        stringValue(item.id) === oldId ? { ...item, [key]: value } : item,
      ),
    }));
    if (key === "id") {
      setSelectedIds((current) => ({ ...current, [section]: stringValue(value) }));
    }
    setIsDirty(true);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `camnang-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus({ type: "success", message: "Đã xuất file JSON dữ liệu." });
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = JSON.parse(await file.text());
      setData(normalizeData(imported));
      setSelectedIds({});
      setIsDirty(true);
      setStatus({ type: "success", message: "Đã nhập JSON. Bấm lưu để đẩy dữ liệu này lên GitHub." });
    } catch (error) {
      setStatus({ type: "error", message: `Không đọc được file JSON: ${errorMessage(error)}` });
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-masterise-surface">
      <section className="page-shell grid gap-5 py-6 md:py-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-masterise-line bg-white p-5 shadow-masterise md:p-7">
            <p className="eyebrow">CMS Cẩm Nang Masterise</p>
            <h1 className="h1">Quản trị nội dung website</h1>
            <p className="body-text mt-3 max-w-3xl">
              Trang admin này đã được chuyển sang Next.js/React để quản lý dữ liệu tập trung, cùng stack với website
              đang deploy trên Vercel.
            </p>
          </div>

          <aside className="grid content-start gap-3 rounded-lg border border-masterise-line bg-masterise-primary p-5 text-white shadow-masterise">
            <ShieldCheck size={34} aria-hidden />
            <strong>CMS dùng API server-side</strong>
            <span className="text-sm leading-6 text-white/80">
              Token GitHub nằm trong biến môi trường, không đưa vào trình duyệt. Admin chỉ cần đăng nhập để tải và lưu
              dữ liệu.
            </span>
          </aside>
        </div>

        <section className="rounded-lg border border-masterise-line bg-white p-5 shadow-masterise">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <form className="grid gap-4 md:grid-cols-[minmax(150px,220px)_minmax(180px,280px)_auto]" onSubmit={login}>
              <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
                Tài khoản
                <input
                  className="min-h-11 rounded-lg border border-masterise-line px-3 outline-none focus:border-masterise-primary"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
                Mật khẩu
                <input
                  className="min-h-11 rounded-lg border border-masterise-line px-3 outline-none focus:border-masterise-primary"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="primary-button self-end" type="submit" disabled={isBusy}>
                {isBusy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <LogIn size={18} aria-hidden />}
                Đăng nhập
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <button className="secondary-button" type="button" onClick={useLocalData}>
                <FileJson size={18} aria-hidden />
                Dữ liệu local
              </button>
              {session ? (
                <button className="secondary-button" type="button" onClick={logout}>
                  <LogOut size={18} aria-hidden />
                  Đăng xuất
                </button>
              ) : null}
            </div>
          </div>

          <p
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : status.type === "loading"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {status.message}
          </p>
        </section>

        <section className="grid gap-5">
          <div className="grid gap-3 rounded-lg border border-masterise-line bg-white p-4 shadow-masterise md:grid-cols-4">
            <Stat label="Dự án" value={data.projects.length} />
            <Stat label="Gian hàng" value={data.stores.length} />
            <Stat label="Tin tức" value={data.newsItems.length} />
            <Stat label="Danh mục" value={data.storeCategories.length} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-masterise-line bg-white p-4 shadow-masterise">
            <div>
              <p className="text-xs font-bold uppercase text-masterise-primary">Workspace</p>
              <h2 className="text-xl font-extrabold">{config.label}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="secondary-button" type="button" onClick={() => importInputRef.current?.click()}>
                <Upload size={18} aria-hidden />
                Import
              </button>
              <input ref={importInputRef} className="hidden" type="file" accept="application/json,.json" onChange={importData} />
              <button className="secondary-button" type="button" onClick={exportData}>
                <Download size={18} aria-hidden />
                Export
              </button>
              <button className="primary-button" type="button" onClick={saveToGithub} disabled={isBusy || !isDirty}>
                {isBusy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
                Lưu GitHub
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === section;
              return (
                <button
                  key={item.key}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition ${
                    isActive
                      ? "border-masterise-primary bg-masterise-primary text-white"
                      : "border-masterise-line bg-white text-masterise-ink hover:border-masterise-primary"
                  }`}
                  type="button"
                  onClick={() => {
                    setSection(item.key);
                    setQuery("");
                  }}
                >
                  <Icon size={18} aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-lg border border-masterise-line bg-white p-4 shadow-masterise">
              <div className="mb-3 flex items-center justify-between gap-3">
                <strong>Danh sách</strong>
                <button className="icon-button" type="button" onClick={addItem} aria-label="Thêm mục mới">
                  <Plus size={18} aria-hidden />
                </button>
              </div>
              <label className="mb-3 flex min-h-11 items-center gap-2 rounded-lg border border-masterise-line px-3">
                <Search size={18} className="text-masterise-primary" aria-hidden />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Tìm nhanh..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              <div className="grid max-h-[620px] gap-2 overflow-auto pr-1">
                {filteredItems.length ? (
                  filteredItems.map((item) => {
                    const id = stringValue(item.id);
                    const title = stringValue(item[config.titleField]) || id || "Chưa có tiêu đề";
                    const isActive = id === selectedId;
                    return (
                      <button
                        key={id}
                        className={`grid gap-1 rounded-lg border p-3 text-left transition ${
                          isActive
                            ? "border-masterise-primary bg-masterise-soft"
                            : "border-masterise-line hover:border-masterise-primary"
                        }`}
                        type="button"
                        onClick={() => setSelectedIds((current) => ({ ...current, [section]: id }))}
                      >
                        <strong className="text-sm">{title}</strong>
                        <span className="text-xs leading-5 text-masterise-muted">{config.subtitle(item, data)}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-masterise-line p-5 text-sm text-masterise-muted">
                    Không có mục phù hợp.
                  </div>
                )}
              </div>
            </aside>

            <section className="rounded-lg border border-masterise-line bg-white p-4 shadow-masterise md:p-5">
              {selectedItem ? (
                <>
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-masterise-line pb-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-masterise-primary">Đang chỉnh sửa</p>
                      <h3 className="text-2xl font-extrabold">
                        {stringValue(selectedItem[config.titleField]) || stringValue(selectedItem.id)}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a className="secondary-button" href={config.preview(selectedItem)} target="_blank" rel="noreferrer">
                        <Eye size={18} aria-hidden />
                        Xem
                      </a>
                      <button className="secondary-button border-red-200 text-red-700 hover:border-red-700" type="button" onClick={deleteItem}>
                        <Trash2 size={18} aria-hidden />
                        Xóa
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {config.fields(data).map((field) => (
                      <FieldEditor
                        key={field.key}
                        field={field}
                        value={selectedItem[field.key]}
                        onChange={(value) => updateSelectedItem(field.key, value)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="grid min-h-[280px] place-items-center rounded-lg border border-dashed border-masterise-line p-8 text-center text-masterise-muted">
                  <div>
                    <FolderOpen className="mx-auto mb-3 text-masterise-primary" size={36} aria-hidden />
                    Chọn hoặc thêm một mục để bắt đầu chỉnh sửa.
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-masterise-line bg-masterise-surface p-4">
      <strong className="block text-2xl font-extrabold">{value}</strong>
      <span className="text-sm text-masterise-muted">{label}</span>
    </article>
  );
}

function FieldEditor({ field, value, onChange }: { field: FieldConfig; value: CmsValue; onChange: (value: CmsValue) => void }) {
  const className = `grid gap-2 text-sm font-semibold text-masterise-ink ${field.full ? "md:col-span-2" : ""}`;
  const inputClass = "min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary";

  return (
    <label className={className}>
      {field.label}
      {field.type === "textarea" || field.type === "array" ? (
        <textarea
          className={`${inputClass} min-h-[120px] py-3`}
          rows={field.rows || 4}
          value={field.type === "array" ? arrayToText(value, field.mode || "lines") : stringValue(value)}
          onChange={(event) =>
            onChange(field.type === "array" ? textToArray(event.target.value, field.mode || "lines") : event.target.value)
          }
        />
      ) : field.type === "select" ? (
        <select className={inputClass} value={stringValue(value)} onChange={(event) => onChange(event.target.value)}>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={inputClass}
          type={field.type}
          min={field.min}
          max={field.max}
          step={field.step}
          value={stringValue(value)}
          onChange={(event) => onChange(field.type === "number" ? numberValue(event.target.value) : event.target.value)}
        />
      )}
      {field.helper ? <small className="text-xs font-normal leading-5 text-masterise-muted">{field.helper}</small> : null}
    </label>
  );
}

async function apiRequest<T = unknown>(
  action: string,
  options: { method: "GET" | "POST" | "PUT"; token?: string; body?: unknown },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${CMS_API}?action=${encodeURIComponent(action)}`, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `CMS API lỗi ${response.status}.`);
  }
  return payload as T;
}

function normalizeData(data: unknown): SiteData {
  const source = clone(data) as Partial<SiteData>;
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

function clone(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function regionOptions(data: SiteData) {
  return Object.entries(data.regionMeta)
    .filter(([id]) => id !== "all")
    .map(([value, meta]) => ({ value, label: meta.label || value }));
}

function projectOptions(data: SiteData) {
  return data.projects.map((project) => ({ value: stringValue(project.id), label: stringValue(project.name || project.id) }));
}

function categoryOptions(data: SiteData) {
  return data.storeCategories.map((category) => ({ value: stringValue(category.id), label: stringValue(category.label || category.id) }));
}

function firstProjectId(data: SiteData) {
  return stringValue(data.projects[0]?.id);
}

function firstCategoryId(data: SiteData) {
  return stringValue(data.storeCategories[0]?.id);
}

function projectName(data: SiteData, id: CmsValue) {
  return stringValue(data.projects.find((project) => project.id === id)?.name) || "Chưa chọn dự án";
}

function categoryLabel(data: SiteData, id: CmsValue) {
  return stringValue(data.storeCategories.find((category) => category.id === id)?.label) || "Chưa chọn danh mục";
}

function regionLabel(data: SiteData, id: CmsValue) {
  return data.regionMeta[stringValue(id)]?.label || stringValue(id) || "Chưa chọn miền";
}

function arrayToText(value: CmsValue, mode: ArrayMode) {
  const list = Array.isArray(value) ? value : [];
  if (mode === "tags") return list.join(", ");
  if (mode === "paragraphs") return list.join("\n\n");
  return list.join("\n");
}

function textToArray(value: string, mode: ArrayMode) {
  if (mode === "tags") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (mode === "paragraphs") {
    return value
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueId(base: string, collection: CmsItem[]) {
  const root = slugify(base) || "item";
  const existing = new Set(collection.map((item) => stringValue(item.id)));
  if (!existing.has(root)) return root;

  let index = 2;
  while (existing.has(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

function slugify(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function stringValue(value: CmsValue) {
  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
}

function numberValue(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
