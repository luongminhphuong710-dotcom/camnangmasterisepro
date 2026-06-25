"use client";

import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  FolderOpen,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  XCircle,
  Star,
  Store,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { camnangData } from "@/lib/data";

const CMS_API = "/api/cms";
const SESSION_KEY = "camnangCmsSession";
const ITEMS_PER_PAGE = 20;
const UNASSIGNED_CATEGORY_ID = "unassigned";
const UNASSIGNED_CATEGORY_LABEL = "Chưa xác định";
const reviewerAdjectives = ["Empathetic", "Gentle", "Bright", "Calm", "Kind", "Lucky", "Sunny", "Urban", "Cozy", "Happy"];
const reviewerNouns = ["Carrot", "Lotus", "River", "Cloud", "Lantern", "Harbor", "Maple", "Pearl", "Garden", "Comet"];

type Role = "super_admin" | "admin" | "employee";
type VoucherItem = {
  code: string;
  title?: string;
  description: string;
  expires: string;
  redeemCount?: number;
};
type ReviewItem = {
  name: string;
  rating: number;
  comment: string;
  isAnonymous?: boolean;
  images?: ReviewImageItem[];
};
type ReviewImageItem = {
  id: string;
  name: string;
  url: string;
};
type CmsValue = string | number | string[] | VoucherItem[] | ReviewItem[] | undefined;
type CmsItem = Record<string, CmsValue>;
type NavKey = "stores" | "projects" | "categories" | "permissions";
type ViewMode = "list" | "view" | "edit";
type StatusType = "success" | "error" | "loading";
type ToastItem = { id: number; type: "success" | "error"; message: string };
type ArrayMode = "lines" | "tags" | "paragraphs";
type SortKey = "createdAt" | "updatedAt" | "rating";
type SortDirection = "asc" | "desc";

type SiteData = {
  fallbackImage: string;
  regionMeta: Record<string, { label?: string; name?: string }>;
  projects: CmsItem[];
  storeCategories: CmsItem[];
  stores: CmsItem[];
  newsItems: CmsItem[];
};

type FieldConfig = {
  key: string;
  label: string;
  type:
    | "text"
    | "url"
    | "tel"
    | "number"
    | "textarea"
    | "select"
    | "array"
    | "vouchers"
    | "reviews"
    | "image"
    | "gallery"
    | "mapembed"
    | "richtext";
  helper?: string;
  full?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  mode?: ArrayMode;
  options?: Array<{ value: string; label: string }>;
};

type SelectOption = NonNullable<FieldConfig["options"]>[number];

type Session = {
  token: string;
  user: string;
  role: Role;
  expiresAt: number;
};

type PermissionUser = {
  username: string;
  role: Role;
  lastLoginAt?: string;
};

type AdminClientProps = {
  initialSection?: NavKey;
  initialMode?: ViewMode;
  initialItemId?: string;
};

const navItems: Array<{ key: NavKey; label: string; icon: typeof Store }> = [
  { key: "stores", label: "Gian hàng", icon: Store },
  { key: "projects", label: "Dự án", icon: LayoutDashboard },
  { key: "categories", label: "Danh mục", icon: Tags },
  { key: "permissions", label: "Phân quyền", icon: ShieldCheck },
];

const roleLabels: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  employee: "Nhân viên",
};

export function AdminClient({ initialSection = "stores", initialMode = "list", initialItemId = "" }: AdminClientProps) {
  const [data, setData] = useState<SiteData>(() => normalizeData(camnangData));
  const [activeNav, setActiveNav] = useState<NavKey>(initialSection);
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [detailId, setDetailId] = useState(initialItemId);
  const [selectedIds, setSelectedIds] = useState<Partial<Record<NavKey, string>>>({});
  const [pageBySection, setPageBySection] = useState<Record<"stores" | "projects", number>>({ stores: 1, projects: 1 });
  const [sortBySection, setSortBySection] = useState<Record<"stores" | "projects", { key: SortKey; direction: SortDirection }>>({
    stores: { key: "createdAt", direction: "desc" },
    projects: { key: "createdAt", direction: "desc" },
  });
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({
    type: "success",
    message: "Sẵn sàng. Đăng nhập để quản trị dữ liệu CMS.",
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  function dismissToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  const listSection = activeNav === "projects" ? "projects" : "stores";
  const collection = activeNav === "projects" ? data.projects : data.stores;
  const selectedId = detailId || getSelectedId(listSection, collection, selectedIds);
  const selectedItem = collection.find((item) => stringValue(item.id) === selectedId) || (mode === "list" ? collection[0] : undefined);
  const canWrite = session ? ["super_admin", "admin"].includes(session.role) : false;
  const canDelete = session ? ["super_admin", "admin"].includes(session.role) : false;

  const filteredItems = useMemo(() => {
    const text = normalize(query);
    let items = text ? collection.filter((item) => normalize(Object.values(item).flat().join(" ")).includes(text)) : collection;
    if (listSection === "stores") {
      if (categoryFilter) items = items.filter((item) => stringValue(item.category) === categoryFilter);
      if (projectFilter) items = items.filter((item) => stringValue(item.projectId) === projectFilter);
    }
    return sortItems(items, sortBySection[listSection]);
  }, [collection, listSection, query, sortBySection, categoryFilter, projectFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(pageBySection[listSection] || 1, totalPages);
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(pageStartIndex, pageStartIndex + ITEMS_PER_PAGE);
  const resultStart = filteredItems.length ? pageStartIndex + 1 : 0;
  const resultEnd = Math.min(pageStartIndex + ITEMS_PER_PAGE, filteredItems.length);

  const loadFromApi = useCallback(async (token: string, quiet = false) => {
    if (!token) return;
    if (!quiet) setStatus({ type: "loading", message: "Đang tải dữ liệu mới nhất..." });

    try {
      const result = await apiRequest<{ data: unknown }>("data", { method: "GET", token });
      setData(normalizeData(result.data));
      setIsDirty(false);
      setStatus({ type: "success", message: "Đã tải dữ liệu mới nhất từ CMS." });
    } catch (error) {
      setStatus({
        type: quiet ? "success" : "error",
        message: quiet ? "Đang dùng dữ liệu local để xem thử." : errorMessage(error),
      });
    }
  }, []);

  useEffect(() => {
    function handlePopState() {
      const route = routeFromPath(window.location.pathname);
      setActiveNav(route.section);
      setMode(route.mode);
      setDetailId(route.itemId);
      setQuery("");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored || cancelled) return;

      try {
        const nextSession = JSON.parse(stored) as Session;
        if (!nextSession.token || nextSession.expiresAt <= Math.floor(Date.now() / 1000)) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }

        setSession({ ...nextSession, role: normalizeRole(nextSession.role) });
        setUsername(nextSession.user || "admin");
        await loadFromApi(nextSession.token, true);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(SESSION_KEY);
          setStatus({ type: "success", message: "Đang dùng dữ liệu local để xem thử." });
        }
      }
    }

    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, [loadFromApi]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setStatus({ type: "error", message: "Bạn cần nhập mật khẩu." });
      return;
    }

    setIsBusy(true);
    setStatus({ type: "loading", message: "Đang đăng nhập CMS..." });
    try {
      const result = await apiRequest<{ token: string; user: string; role: Role; expiresAt: number }>("login", {
        method: "POST",
        body: { username, password },
      });
      const nextSession = {
        token: result.token,
        user: result.user || username,
        role: normalizeRole(result.role),
        expiresAt: result.expiresAt,
      };
      setSession(nextSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      setPassword("");
      await loadFromApi(nextSession.token);
    } catch (error) {
      const message = errorMessage(error);
      setStatus({ type: "error", message });
      pushToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function saveData(overrideData?: SiteData) {
    if (!session?.token) {
      const message = "Bạn cần đăng nhập trước khi lưu.";
      setStatus({ type: "error", message });
      pushToast(message, "error");
      return;
    }
    if (!canWrite) {
      const message = "Tài khoản hiện tại chỉ có quyền xem.";
      setStatus({ type: "error", message });
      pushToast(message, "error");
      return;
    }

    const payload = overrideData ?? data;
    if (overrideData) setData(overrideData);
    setIsBusy(true);
    setStatus({ type: "loading", message: "Đang lưu dữ liệu..." });
    try {
      const result = await apiRequest<{ message?: string }>("data", { method: "PUT", token: session.token, body: { data: payload } });
      setIsDirty(false);
      const message = result.message || "Đã lưu. Thay đổi đã có hiệu lực ngay trên website.";
      setStatus({ type: "success", message });
      pushToast(message);
    } catch (error) {
      const message = errorMessage(error);
      setStatus({ type: "error", message });
      pushToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setStatus({ type: "success", message: "Đã đăng xuất CMS." });
  }

  function useLocalData() {
    setData(normalizeData(camnangData));
    setSelectedIds({});
    setIsDirty(false);
    setStatus({ type: "success", message: "Đã chuyển sang dữ liệu local trong source." });
  }

  function navigateTo(section: NavKey, nextMode: ViewMode = "list", itemId = "") {
    setActiveNav(section);
    setMode(nextMode);
    setDetailId(itemId);
    setQuery("");
    setCategoryFilter("");
    setProjectFilter("");
    if (itemId && section !== "permissions") {
      setSelectedIds((current) => ({ ...current, [section]: itemId }));
    }
    window.history.pushState(null, "", adminPath(section, nextMode, itemId));
  }

  function setCurrentPage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setPageBySection((current) => ({ ...current, [listSection]: nextPage }));
  }

  function sortBy(key: SortKey) {
    setSortBySection((current) => {
      const currentSort = current[listSection];
      const nextDirection = currentSort.key === key && currentSort.direction === "desc" ? "asc" : "desc";
      return { ...current, [listSection]: { key, direction: nextDirection } };
    });
    setPageBySection((current) => ({ ...current, [listSection]: 1 }));
  }

  function addItem() {
    if (!canWrite) return;
    const item = listSection === "stores" ? createStore(data) : createProject(data);
    const id = stringValue(item.id);
    setData((current) => ({
      ...current,
      [listSection]: [...current[listSection], item],
    }));
    setSelectedIds((current) => ({ ...current, [listSection]: id }));
    setMode("edit");
    setDetailId(id);
    window.history.pushState(null, "", adminPath(listSection, "edit", id));
    setIsDirty(true);
    pushToast(listSection === "stores" ? "Đã tạo gian hàng mới. Bấm Lưu để lưu lên CMS." : "Đã tạo trang dự án mới. Bấm Lưu để lưu lên CMS.");
    setStatus({ type: "success", message: listSection === "stores" ? "Đã tạo gian hàng mới." : "Đã tạo trang dự án mới." });
  }

  function deleteItem(item?: CmsItem) {
    const target = item ?? selectedItem;
    if (!target || !canDelete) return;
    const title = itemTitle(listSection, target);
    if (!window.confirm(`Xóa "${title}"?`)) return;

    const nextCollection = collection.filter((current) => current !== target);
    setData((current) => ({
      ...current,
      [listSection]: nextCollection,
    }));
    setSelectedIds((current) => ({ ...current, [listSection]: stringValue(nextCollection[0]?.id) }));
    if (target === selectedItem) navigateTo(listSection, "list");
    setIsDirty(true);
    setStatus({ type: "success", message: "Đã xóa mục đã chọn. Bấm lưu để đẩy thay đổi." });
    pushToast("Đã xóa thành công.");
  }

  function updateSelectedItem(key: string, value: CmsValue) {
    if (!selectedItem || !canWrite) return;
    const oldId = stringValue(selectedItem.id);
    const updatedAt = nowIso();
    const reviewStats = key === "reviews" ? calculatedReviewStats(value) : null;
    // The id still matches the auto-slug of the current name, so it hasn't been
    // manually customized yet: keep it in sync while the store is being named.
    // Once staff edit the id directly (or it diverges from the name), this stops.
    const shouldAutoSyncId =
      key === "name" && listSection === "stores" && oldId === slugify(stringValue(selectedItem.name));
    const nextId = shouldAutoSyncId ? uniqueId(stringValue(value), collection.filter((item) => item !== selectedItem)) : oldId;
    setData((current) => ({
      ...current,
      [listSection]: current[listSection].map((item) =>
        stringValue(item.id) === oldId
          ? {
              ...item,
              [key]: value,
              ...(shouldAutoSyncId ? { id: nextId } : {}),
              ...(key === "images" ? { image: firstGalleryImage(value) } : {}),
              ...(reviewStats ? { rating: reviewStats.rating, reviewCount: reviewStats.count } : {}),
              updatedAt,
            }
          : item,
      ),
    }));
    if (key === "id" || shouldAutoSyncId) {
      const nextIdValue = shouldAutoSyncId ? nextId : stringValue(value);
      setDetailId(nextIdValue);
      setSelectedIds((current) => ({ ...current, [listSection]: nextIdValue }));
      window.history.replaceState(null, "", adminPath(listSection, mode, nextIdValue));
    }
    setIsDirty(true);
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-masterise-surface">
        <section className="page-shell grid min-h-screen content-center gap-5 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid content-center gap-6">
            <div>
              <p className="eyebrow">CMS Cẩm Nang Masterise</p>
              <h1 className="h1 max-w-3xl">Quản trị gian hàng và dự án</h1>
              <p className="body-text mt-4 max-w-2xl">
                Nền hiện tại là Next.js App Router. CMS dùng API server-side kết nối Neon (database) và Cloudinary (lưu ảnh), phân quyền theo role.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Capability title="Super admin" detail="Toàn quyền tạo, sửa, xóa và lưu." />
              <Capability title="Admin" detail="Tạo, sửa và lưu nội dung." />
              <Capability title="Nhân viên" detail="Đăng nhập xem dữ liệu vận hành." />
            </div>
          </div>

          <form className="grid content-start gap-4 rounded-lg border border-masterise-line bg-white p-5 shadow-masterise" onSubmit={login}>
            <ShieldCheck className="text-masterise-primary" size={34} aria-hidden />
            <div>
              <h2 className="text-2xl font-extrabold">Đăng nhập CMS</h2>
              <p className="mt-2 text-sm leading-6 text-masterise-muted">Dùng tài khoản được cấu hình trong biến môi trường.</p>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Tên đăng nhập
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
            <button className="primary-button" type="submit" disabled={isBusy}>
              {isBusy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <LogIn size={18} aria-hidden />}
              Đăng nhập
            </button>
            <button className="secondary-button" type="button" onClick={useLocalData}>
              Dữ liệu local
            </button>
            <StatusMessage status={status} />
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1ea]">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="grid min-h-screen lg:grid-cols-[264px_1fr]">
        <aside className="border-b border-masterise-line bg-masterise-ink p-4 text-white lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-extrabold text-masterise-primary">CM</span>
            <div>
              <strong className="block leading-tight">CMS</strong>
              <small className="text-white/65">Cẩm Nang Masterise</small>
            </div>
          </div>

          <nav className="grid gap-2" aria-label="CMS navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activeNav;
              return (
                <button
                  key={item.key}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${
                    isActive ? "bg-white text-masterise-primary" : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                  type="button"
                  onClick={() => navigateTo(item.key)}
                >
                  <Icon size={18} aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <span className="block text-white/60">Đang đăng nhập</span>
            <strong className="mt-1 block truncate">{session.user}</strong>
            <span className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{roleLabels[session.role]}</span>
          </div>

          <button
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-bold text-white/80 transition hover:bg-white hover:text-masterise-ink"
            type="button"
            onClick={logout}
          >
            <LogOut size={18} aria-hidden />
            Đăng xuất
          </button>
        </aside>

        <section className="grid content-start gap-5 p-4 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold">
              {activeNav === "stores"
                ? "Quản lý gian hàng"
                : activeNav === "projects"
                  ? "Quản lý dự án"
                  : activeNav === "categories"
                    ? "Quản lý danh mục"
                    : "Phân quyền"}
            </h1>
          </header>

          {activeNav === "permissions" ? (
            <PermissionsPanel session={session} pushToast={pushToast} />
          ) : activeNav === "categories" ? (
            <CategoriesPanel
              categories={data.storeCategories}
              stores={data.stores}
              canWrite={canWrite}
              canDelete={canDelete}
              isBusy={isBusy}
              onSaveCategories={(nextCategories) => void saveData({ ...data, storeCategories: nextCategories })}
              onDeleteCategory={(categoryId) => {
                const nextCategories = data.storeCategories.filter((category) => stringValue(category.id) !== categoryId);
                const nextStores = data.stores.map((store) =>
                  stringValue(store.category) === categoryId ? { ...store, category: UNASSIGNED_CATEGORY_ID } : store,
                );
                void saveData({ ...data, storeCategories: nextCategories, stores: nextStores });
              }}
              onViewStores={(categoryId) => {
                navigateTo("stores");
                setCategoryFilter(categoryId);
              }}
              pushToast={pushToast}
            />
          ) : mode === "list" ? (
            <section className="rounded-lg border border-masterise-line bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-masterise-line p-4">
                <label className="flex min-h-11 min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-masterise-line px-3">
                  <Search size={18} className="text-masterise-primary" aria-hidden />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    placeholder={listSection === "stores" ? "Tìm gian hàng..." : "Tìm dự án..."}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setPageBySection((current) => ({ ...current, [listSection]: 1 }));
                    }}
                  />
                </label>
                {activeNav === "stores" ? (
                  <>
                    <div className="w-[200px]">
                      <CustomSelect
                        disabled={false}
                        options={[{ value: "", label: "Tất cả danh mục" }, ...categoryOptions(data)]}
                        value={categoryFilter}
                        onChange={(value) => {
                          setCategoryFilter(stringValue(value));
                          setPageBySection((current) => ({ ...current, stores: 1 }));
                        }}
                      />
                    </div>
                    <div className="w-[200px]">
                      <CustomSelect
                        disabled={false}
                        options={[{ value: "", label: "Tất cả dự án" }, ...projectOptions(data)]}
                        value={projectFilter}
                        onChange={(value) => {
                          setProjectFilter(stringValue(value));
                          setPageBySection((current) => ({ ...current, stores: 1 }));
                        }}
                      />
                    </div>
                  </>
                ) : null}
                {canWrite ? (
                  <button className="primary-button" type="button" onClick={addItem}>
                    <Plus size={18} aria-hidden />
                    {listSection === "stores" ? "Tạo gian hàng" : "Tạo trang dự án"}
                  </button>
                ) : null}
              </div>

              {activeNav === "stores" ? (
                <StoresTable
                  items={paginatedItems}
                  data={data}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  currentPage={currentPage}
                  resultEnd={resultEnd}
                  resultStart={resultStart}
                  sort={sortBySection[listSection]}
                  totalCount={filteredItems.length}
                  totalPages={totalPages}
                  onDelete={deleteItem}
                  onEdit={(id) => navigateTo("stores", "edit", id)}
                  onPageChange={setCurrentPage}
                  onSort={sortBy}
                  onView={(id) => navigateTo("stores", "view", id)}
                  pushToast={pushToast}
                />
              ) : (
                <ProjectsTable
                  items={paginatedItems}
                  data={data}
                  canWrite={canWrite}
                  currentPage={currentPage}
                  resultEnd={resultEnd}
                  resultStart={resultStart}
                  sort={sortBySection[listSection]}
                  totalCount={filteredItems.length}
                  totalPages={totalPages}
                  onEdit={(id) => navigateTo("projects", "edit", id)}
                  onPageChange={setCurrentPage}
                  onSort={sortBy}
                  onView={(id) => navigateTo("projects", "view", id)}
                />
              )}
            </section>
          ) : selectedItem ? (
            <section className="rounded-lg border border-masterise-line bg-white p-4 shadow-sm md:p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-masterise-line pb-4">
                <div>
                  <button
                    className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-masterise-primary"
                    type="button"
                  onClick={() => navigateTo(listSection)}
                  >
                    <ArrowLeft size={17} aria-hidden />
                    Quay lại danh sách
                  </button>
                  <p className="text-xs font-bold uppercase text-masterise-primary">
                    {mode === "edit" ? "Chỉnh sửa" : "Thông tin chi tiết"}
                  </p>
                  <h2 className="text-2xl font-extrabold">{itemTitle(listSection, selectedItem)}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="secondary-button"
                    href={listSection === "stores" ? `/stores/${stringValue(selectedItem.id)}` : `/projects/${stringValue(selectedItem.id)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Eye size={18} aria-hidden />
                    Xem public
                  </a>
                  {mode === "view" && canWrite ? (
                    <button className="primary-button" type="button" onClick={() => navigateTo(listSection, "edit", stringValue(selectedItem.id))}>
                      <Pencil size={18} aria-hidden />
                      Chỉnh sửa
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button className="secondary-button border-red-200 text-red-700 hover:border-red-700" type="button" onClick={() => deleteItem()}>
                      <Trash2 size={18} aria-hidden />
                      Xóa
                    </button>
                  ) : null}
                </div>
              </div>

              {mode === "edit" ? (
                <>
                  {canWrite ? (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-masterise-line bg-masterise-surface p-3">
                      <p className="text-sm font-semibold text-masterise-muted">
                        {isDirty ? "Có thay đổi chưa lưu." : "Thông tin hiện tại đã được lưu."}
                      </p>
                      <button className="primary-button" type="button" onClick={() => void saveData()} disabled={isBusy || !isDirty}>
                        {isBusy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
                        Lưu
                      </button>
                    </div>
                  ) : null}

                  {listSection === "stores" ? (
                    <StoreEditSections
                      data={data}
                      disabled={!canWrite}
                      item={selectedItem}
                      token={session.token}
                      pushToast={pushToast}
                      onChange={updateSelectedItem}
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {fieldsFor(listSection, data).map((field) => (
                        <FieldEditor
                          key={field.key}
                          field={field}
                          item={selectedItem}
                          token={session.token}
                          value={selectedItem[field.key]}
                          disabled={!canWrite}
                          onChange={(value) => updateSelectedItem(field.key, value)}
                        />
                      ))}
                    </div>
                  )}

                  {canWrite ? (
                    <div className="mt-5 flex justify-end border-t border-masterise-line pt-4">
                      <button className="primary-button" type="button" onClick={() => void saveData()} disabled={isBusy || !isDirty}>
                        {isBusy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
                        Lưu
                      </button>
                    </div>
                  ) : null}
                </>
              ) : listSection === "stores" ? (
                <StoreEditSections
                  data={data}
                  disabled
                  item={selectedItem}
                  token={session.token}
                  pushToast={pushToast}
                  onChange={() => {}}
                />
              ) : (
                <DetailView section={listSection} item={selectedItem} data={data} />
              )}
            </section>
          ) : (
            <section className="rounded-lg border border-masterise-line bg-white p-4 shadow-sm">
              <div className="grid min-h-[280px] place-items-center rounded-lg border border-dashed border-masterise-line p-8 text-center text-masterise-muted">
                <div>
                  <FolderOpen className="mx-auto mb-3 text-masterise-primary" size={36} aria-hidden />
                  Không tìm thấy mục này.
                </div>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function Capability({ title, detail }: { title: string; detail: string }) {
  return (
    <article className="rounded-lg border border-masterise-line bg-white p-4 shadow-sm">
      <strong className="block text-sm text-masterise-ink">{title}</strong>
      <span className="mt-2 block text-xs leading-5 text-masterise-muted">{detail}</span>
    </article>
  );
}

function StatusMessage({ status }: { status: { type: StatusType; message: string } }) {
  return (
    <p
      className={`rounded-lg border px-4 py-3 text-sm ${
        status.type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : status.type === "loading"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {status.message}
    </p>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] grid gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-masterise ${
            toast.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role="status"
        >
          {toast.type === "error" ? (
            <XCircle className="mt-0.5 shrink-0" size={18} aria-hidden />
          ) : (
            <CheckCircle2 className="mt-0.5 shrink-0" size={18} aria-hidden />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            className="shrink-0 text-current/70 transition hover:text-current"
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Đóng thông báo"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}

function PermissionsPanel({ session, pushToast }: { session: Session; pushToast: (message: string, type?: ToastItem["type"]) => void }) {
  const [users, setUsers] = useState<PermissionUser[]>([]);
  const [message, setMessage] = useState("Đang tải danh sách tài khoản...");
  const [editingUser, setEditingUser] = useState<PermissionUser | null>(null);
  const [formMode, setFormMode] = useState<"create" | "update">("create");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canManageUsers = session.role === "super_admin" || session.role === "admin";
  const canDeleteUsers = session.role === "super_admin" || session.role === "admin";

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      try {
        const result = await apiRequest<{ users: PermissionUser[] }>("permissions", {
          method: "GET",
          token: session.token,
        });
        if (cancelled) return;
        setUsers(result.users || []);
        setMessage("");
      } catch (error) {
        if (!cancelled) setMessage(errorMessage(error));
      }
    }

    void loadPermissions();
    return () => {
      cancelled = true;
    };
  }, [session.token]);

  function startCreate() {
    setFormMode("create");
    setEditingUser(null);
    setUsername("");
    setRole("admin");
    setPassword("");
    setConfirmPassword("");
    setTemporaryPassword("");
    setMessage("");
    setIsAccountModalOpen(true);
  }

  function startEdit(user: PermissionUser) {
    setFormMode("update");
    setEditingUser(user);
    setUsername(user.username);
    setRole(user.role === "super_admin" ? "super_admin" : user.role);
    setPassword("");
    setConfirmPassword("");
    setTemporaryPassword("");
    setMessage("");
    setIsAccountModalOpen(true);
  }

  function closeAccountModal() {
    if (isSaving) return;
    setIsAccountModalOpen(false);
    setTemporaryPassword("");
    setPassword("");
    setConfirmPassword("");
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Mật khẩu mới và xác nhận mật khẩu chưa khớp.");
      return;
    }
    if (!canManageUsers && editingUser?.username !== session.user) {
      setMessage("Bạn chỉ có thể tự đổi mật khẩu tài khoản của mình.");
      return;
    }

    setIsSaving(true);
    setTemporaryPassword("");
    setMessage("Đang lưu tài khoản...");
    try {
      const result = await apiRequest<{ users: PermissionUser[]; message?: string; temporaryPassword?: string }>("user", {
        method: "PUT",
        token: session.token,
        body: {
          mode: formMode,
          originalUsername: editingUser?.username,
          username,
          role,
          password,
        },
      });
      setUsers(result.users || []);
      setMessage(result.message || "Đã lưu tài khoản.");
      pushToast(result.message || "Đã lưu tài khoản thành công.");
      if (result.temporaryPassword) setTemporaryPassword(result.temporaryPassword);
      if (formMode === "create") {
        setUsername("");
        setRole("admin");
        setPassword("");
        setConfirmPassword("");
      } else {
        setPassword("");
        setConfirmPassword("");
        setIsAccountModalOpen(false);
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUser(usernameToDelete: string) {
    if (!window.confirm(`Xóa tài khoản "${usernameToDelete}"?`)) return;

    setIsSaving(true);
    setMessage("Đang xóa tài khoản...");
    try {
      const response = await fetch(`${CMS_API}?action=user&username=${encodeURIComponent(usernameToDelete)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || `CMS API lỗi ${response.status}.`);
      setUsers(payload.users || []);
      setMessage(payload.message || "Đã xóa tài khoản.");
      if (editingUser?.username === usernameToDelete) closeAccountModal();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const roleRows: Array<{ role: Role; description: string; manage: boolean; delete: boolean; view: boolean }> = [
    { role: "super_admin", description: "Toàn quyền vận hành CMS và quản lý tài khoản.", manage: true, delete: true, view: true },
    { role: "admin", description: "Quản trị nội dung gian hàng và dự án hằng ngày.", manage: true, delete: true, view: true },
    { role: "employee", description: "Theo dõi dữ liệu và tự đổi mật khẩu cá nhân.", manage: false, delete: false, view: true },
  ];

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        {roleRows.map((row) => (
          <article key={row.role} className="rounded-lg border border-masterise-line bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-masterise-soft text-masterise-primary">
                <ShieldCheck size={22} aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">{roleLabels[row.role]}</h2>
                <p className="mt-1 text-sm leading-5 text-masterise-muted">{row.description}</p>
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              <PermissionPill enabled={row.manage} label="Tạo / sửa / lưu" />
              <PermissionPill enabled={row.delete} label="Xóa dữ liệu" />
              <PermissionPill enabled={row.view} label="Xem CMS" />
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-masterise-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-masterise-line p-4">
          <div>
            <h2 className="text-lg font-extrabold">Tên đăng nhập CMS</h2>
            <p className="mt-1 text-sm text-masterise-muted">Mật khẩu được lưu dạng hash, không hiển thị lại sau khi tạo.</p>
          </div>
          {canManageUsers ? (
            <button className="primary-button" type="button" onClick={startCreate}>
              <Plus size={18} aria-hidden />
              Tạo tài khoản
            </button>
          ) : null}
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-masterise-surface text-xs uppercase text-masterise-muted">
                <tr>
                  <th className="px-4 py-3">Tên đăng nhập</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Đăng nhập gần nhất</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.username} className="border-t border-masterise-line">
                    <td className="px-4 py-3 font-bold">{user.username}</td>
                    <td className="px-4 py-3">{roleLabels[user.role]}</td>
                    <td className="px-4 py-3">{formatCmsDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {(canManageUsers || user.username === session.user) ? (
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary"
                            type="button"
                            onClick={() => startEdit(user)}
                            aria-label="Chỉnh sửa tài khoản"
                          >
                            <Pencil size={16} aria-hidden />
                          </button>
                        ) : null}
                        {canDeleteUsers && user.role !== "super_admin" ? (
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:border-red-700"
                            type="button"
                            onClick={() => void deleteUser(user.username)}
                            aria-label="Xóa tài khoản"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {message && !isAccountModalOpen ? (
            <p className="mt-4 rounded-lg border border-masterise-line bg-masterise-surface px-3 py-2 text-sm text-masterise-muted">{message}</p>
          ) : null}
        </div>
      </div>

      {isAccountModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true">
          <form
            className="grid w-full max-w-[520px] content-start gap-4 rounded-lg border border-masterise-line bg-white p-5 shadow-2xl"
            onSubmit={saveUser}
          >
            <div className="flex items-start justify-between gap-4 border-b border-masterise-line pb-4">
              <div>
                <h3 className="text-lg font-extrabold">{formMode === "create" ? "Tạo tài khoản" : `Chỉnh sửa ${username}`}</h3>
                <p className="mt-1 text-sm text-masterise-muted">
                  {formMode === "create"
                    ? "Tài khoản mới sẽ được cấp mật khẩu tạm, người dùng có thể tự đổi sau khi đăng nhập."
                    : "Đổi mật khẩu chỉ cần nhập mật khẩu mới và xác nhận lại mật khẩu mới."}
                </p>
              </div>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-masterise-line text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-primary"
                type="button"
                onClick={closeAccountModal}
                aria-label="Đóng"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Tên đăng nhập
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={!canManageUsers || (formMode === "update" && editingUser?.role === "super_admin")}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <div className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Vai trò
              <CustomSelect
                disabled={!canManageUsers || editingUser?.role === "super_admin"}
                options={[
                  ...(editingUser?.role === "super_admin" ? [{ value: "super_admin", label: "Super admin" }] : []),
                  { value: "admin", label: "Admin" },
                  { value: "employee", label: "Nhân viên" },
                ]}
                value={role}
                onChange={(value) => setRole(normalizeRole(value))}
              />
            </div>
            {formMode === "update" ? (
              <>
                <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
                  Mật khẩu mới
                  <input
                    className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
                  Xác nhận mật khẩu mới
                  <input
                    className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
              </>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button className="secondary-button" type="button" onClick={closeAccountModal} disabled={isSaving}>
                Hủy
              </button>
              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
                {formMode === "create" ? "Tạo tài khoản" : "Lưu tài khoản"}
              </button>
            </div>
            {temporaryPassword ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <span className="block font-bold">Mật khẩu tạm</span>
                <code className="mt-2 block rounded-md bg-white px-3 py-2 font-bold text-masterise-ink">{temporaryPassword}</code>
              </div>
            ) : null}
            {message ? <p className="rounded-lg border border-masterise-line bg-masterise-surface px-3 py-2 text-sm text-masterise-muted">{message}</p> : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}

function CategoriesPanel({
  categories,
  stores,
  canWrite,
  canDelete,
  isBusy,
  onSaveCategories,
  onDeleteCategory,
  onViewStores,
  pushToast,
}: {
  categories: CmsItem[];
  stores: CmsItem[];
  canWrite: boolean;
  canDelete: boolean;
  isBusy: boolean;
  onSaveCategories: (next: CmsItem[]) => void;
  onDeleteCategory: (categoryId: string) => void;
  onViewStores: (categoryId: string) => void;
  pushToast: (message: string, type?: ToastItem["type"]) => void;
}) {
  const [modalState, setModalState] = useState<{ mode: "create" | "edit"; id: string; label: string } | null>(null);

  function storeCountFor(categoryId: string) {
    return stores.filter((store) => stringValue(store.category) === categoryId).length;
  }

  function openCreate() {
    setModalState({ mode: "create", id: "", label: "" });
  }

  function openEdit(category: CmsItem) {
    setModalState({ mode: "edit", id: stringValue(category.id), label: stringValue(category.label) });
  }

  function closeModal() {
    setModalState(null);
  }

  function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modalState || !canWrite) return;
    const label = modalState.label.trim();
    if (!label) return;

    if (modalState.mode === "create") {
      onSaveCategories([...categories, { id: uniqueId(label, categories), label }]);
      pushToast("Đã thêm danh mục.");
    } else {
      onSaveCategories(
        categories.map((category) => (stringValue(category.id) === modalState.id ? { ...category, label } : category)),
      );
      pushToast("Đã lưu danh mục.");
    }
    closeModal();
  }

  function removeCategory(category: CmsItem) {
    const id = stringValue(category.id);
    const usageCount = storeCountFor(id);
    const warning =
      usageCount > 0
        ? `Danh mục "${stringValue(category.label) || id}" đang được dùng cho ${usageCount} gian hàng. Các gian hàng này sẽ chuyển sang danh mục "${UNASSIGNED_CATEGORY_LABEL}". Vẫn xóa danh mục này?`
        : `Xóa danh mục "${stringValue(category.label) || id}"?`;
    if (!window.confirm(warning)) return;
    onDeleteCategory(id);
    pushToast("Đã xóa danh mục.");
  }

  return (
    <section className="grid gap-5">

      <div className="rounded-lg border border-masterise-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-masterise-line p-4">
          <div>
            <h2 className="text-lg font-extrabold">Danh mục gian hàng</h2>
            <p className="mt-1 text-sm text-masterise-muted">Quản lý các danh mục dùng để phân loại gian hàng.</p>
          </div>
          {canWrite ? (
            <button className="primary-button" type="button" onClick={openCreate} disabled={isBusy}>
              <Plus size={18} aria-hidden />
              Thêm danh mục
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead className="bg-masterise-surface text-xs uppercase text-masterise-muted">
              <tr>
                <th className="px-4 py-3">Tên danh mục</th>
                <th className="px-4 py-3 text-right">Số gian hàng</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const id = stringValue(category.id);
                const isAll = id === "all";
                const isUnassigned = id === UNASSIGNED_CATEGORY_ID;
                return (
                  <tr key={id} className="border-t border-masterise-line">
                    <td className="px-4 py-3 font-bold text-masterise-ink">
                      <button
                        className="text-left underline-offset-4 transition hover:text-masterise-primary hover:underline"
                        type="button"
                        onClick={() => onViewStores(isAll ? "" : id)}
                      >
                        {stringValue(category.label) || id}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{storeCountFor(id)}</td>
                    <td className="px-4 py-3 text-right">
                      {!canWrite || isUnassigned ? (
                        "-"
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary"
                            type="button"
                            onClick={() => openEdit(category)}
                            disabled={isBusy}
                            aria-label="Chỉnh sửa danh mục"
                          >
                            <Pencil size={16} aria-hidden />
                          </button>
                          {canDelete && !isAll ? (
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:border-red-700"
                              type="button"
                              onClick={() => removeCategory(category)}
                              disabled={isBusy}
                              aria-label="Xóa danh mục"
                            >
                              <Trash2 size={16} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!categories.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-masterise-muted" colSpan={3}>
                    Chưa có danh mục nào.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {modalState ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true">
          <form className="grid w-full max-w-[420px] gap-4 rounded-lg border border-masterise-line bg-white p-5 shadow-2xl" onSubmit={saveCategory}>
            <div className="flex items-start justify-between gap-4 border-b border-masterise-line pb-4">
              <h3 className="text-lg font-extrabold">{modalState.mode === "create" ? "Thêm danh mục" : "Chỉnh sửa danh mục"}</h3>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-masterise-line text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-primary"
                type="button"
                onClick={closeModal}
                aria-label="Đóng"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Tên danh mục
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary"
                autoFocus
                value={modalState.label}
                onChange={(event) =>
                  setModalState((current) => (current ? { ...current, label: event.target.value } : current))
                }
              />
            </label>
            {modalState.mode === "edit" ? <p className="text-xs font-semibold text-masterise-muted">ID: {modalState.id}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button className="secondary-button" type="button" onClick={closeModal}>
                Hủy
              </button>
              <button className="primary-button" type="submit">
                <Save size={18} aria-hidden />
                Lưu danh mục
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function PermissionPill({ enabled, label }: { enabled: boolean; label: string }) {
  const Icon = enabled ? CheckCircle2 : XCircle;
  return (
    <span
      className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 font-semibold ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-masterise-line bg-masterise-surface text-masterise-muted"
      }`}
    >
      {label}
      <Icon size={17} aria-hidden />
    </span>
  );
}

function DetailView({ section, item, data }: { section: NavKey; item: CmsItem; data: SiteData }) {
  const details =
    section === "stores"
      ? [
          ["ID đường dẫn", stringValue(item.id)],
          ["Tên gian hàng", stringValue(item.name)],
          ["Dự án", projectName(data, item.projectId)],
          ["Danh mục", categoryLabel(data, item.category)],
          ["Địa chỉ", stringValue(item.floor)],
          ["Giờ hoạt động", stringValue(item.hours)],
          ["Số liên hệ", stringValue(item.phone)],
          ["Link iframe Google Maps", stringValue(item.mapEmbedUrl)],
          ["Thông tin chi tiết", richTextPreview(item.detailContent)],
          ["Đánh giá", stringValue(item.rating)],
          ["Số lượt đánh giá", stringValue(item.reviewCount)],
          ["Thời gian tạo", formatCmsDate(item.createdAt)],
          ["Update mới nhất", formatCmsDate(item.updatedAt)],
          ["Ảnh đại diện", stringValue(item.image)],
          ["Mô tả ngắn", stringValue(item.note)],
          ["Ưu đãi", vouchersSummary(item.vouchers)],
          ["Đánh giá chi tiết", reviewsSummary(item.reviews)],
        ]
      : [
          ["ID đường dẫn", stringValue(item.id)],
          ["Tên dự án", stringValue(item.name)],
          ["Miền", regionLabel(data, item.region)],
          ["Tỉnh / thành phố", stringValue(item.city)],
          ["Vị trí", stringValue(item.location)],
          ["Phân khúc", stringValue(item.segment)],
          ["Trạng thái", stringValue(item.status)],
          ["Thời gian tạo", formatCmsDate(item.createdAt)],
          ["Update mới nhất", formatCmsDate(item.updatedAt)],
          ["Ảnh đại diện", stringValue(item.image)],
          ["Link nguồn Masterise", stringValue(item.source)],
          ["Mô tả chính", stringValue(item.summary)],
          ["Điểm cần theo dõi", arrayToText(item.highlights, "lines")],
        ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {details.map(([label, value]) => (
        <div
          key={label}
          className={`rounded-lg border border-masterise-line bg-masterise-surface p-4 ${
            String(value).length > 90 ? "md:col-span-2" : ""
          }`}
        >
          <span className="block text-xs font-bold uppercase text-masterise-muted">{label}</span>
          <strong className="mt-2 block break-words text-sm leading-6 text-masterise-ink">{value || "-"}</strong>
        </div>
      ))}
    </div>
  );
}

function TableSummary({
  currentPage,
  resultEnd,
  resultStart,
  totalCount,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  resultEnd: number;
  resultStart: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-masterise-line px-4 py-3 text-sm">
      <span className="font-semibold text-masterise-muted">
        Tổng số {totalCount} mục, hiển thị {resultStart}-{resultEnd}
      </span>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <button
            className="secondary-button min-h-9 px-3 text-xs"
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Back
          </button>
          <span className="rounded-full border border-masterise-line px-3 py-2 text-xs font-bold text-masterise-ink">
            {currentPage} / {totalPages}
          </span>
          <button
            className="secondary-button min-h-9 px-3 text-xs"
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SortHeader({
  activeSort,
  label,
  sortKey,
  onSort,
}: {
  activeSort: { key: SortKey; direction: SortDirection };
  label: string;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSort.key === sortKey;
  const SortIcon = !isActive ? ArrowUpDown : activeSort.direction === "desc" ? ArrowDown : ArrowUp;

  return (
    <button
      className={`inline-flex items-center gap-1.5 text-xs font-extrabold uppercase transition hover:text-masterise-primary ${
        isActive ? "text-masterise-primary" : "text-masterise-muted"
      }`}
      type="button"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <SortIcon size={14} aria-hidden />
    </button>
  );
}

function StoresTable({
  items,
  data,
  canWrite,
  canDelete,
  currentPage,
  resultEnd,
  resultStart,
  sort,
  totalCount,
  totalPages,
  onDelete,
  onEdit,
  onPageChange,
  onSort,
  onView,
  pushToast,
}: {
  items: CmsItem[];
  data: SiteData;
  canWrite: boolean;
  canDelete: boolean;
  currentPage: number;
  resultEnd: number;
  resultStart: number;
  sort: { key: SortKey; direction: SortDirection };
  totalCount: number;
  totalPages: number;
  onDelete: (item: CmsItem) => void;
  onEdit: (id: string) => void;
  onPageChange: (page: number) => void;
  onSort: (key: SortKey) => void;
  onView: (id: string) => void;
  pushToast: (message: string, type?: ToastItem["type"]) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyPhone(event: ReactMouseEvent, id: string, phone: string) {
    event.stopPropagation();
    if (!phone) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(phone).catch(() => undefined);
    }
    setCopiedId(id);
    pushToast("Đã sao chép số điện thoại.");
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  }

  return (
    <div>
      <TableSummary
        currentPage={currentPage}
        resultEnd={resultEnd}
        resultStart={resultStart}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className="bg-masterise-surface text-xs uppercase text-masterise-muted">
            <tr>
              <th className="px-4 py-3">Gian hàng</th>
              <th className="px-4 py-3">Dự án</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Giờ mở cửa</th>
              <th className="px-4 py-3">Liên hệ</th>
              <th className="px-4 py-3 text-right">
                <SortHeader activeSort={sort} label="Đánh giá" sortKey="rating" onSort={onSort} />
              </th>
              <th className="px-4 py-3">
                <SortHeader activeSort={sort} label="Thời gian tạo" sortKey="createdAt" onSort={onSort} />
              </th>
              <th className="px-4 py-3">
                <SortHeader activeSort={sort} label="Update mới nhất" sortKey="updatedAt" onSort={onSort} />
              </th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const id = stringValue(item.id);
              return (
                <tr
                  key={id}
                  className="cursor-pointer border-t border-masterise-line transition hover:bg-masterise-soft/70"
                  onClick={() => onView(id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md border border-masterise-line bg-masterise-soft">
                        <Image
                          src={stringValue(item.image) || data.fallbackImage}
                          alt={stringValue(item.name) || "Ảnh gian hàng"}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <span className="min-w-0">
                        <strong className="block truncate text-masterise-ink">{stringValue(item.name) || id}</strong>
                        <span className="block truncate text-xs text-masterise-muted">{stringValue(item.floor) || "Chưa có địa chỉ"}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{projectName(data, item.projectId)}</td>
                  <td className="px-4 py-3">{categoryLabel(data, item.category)}</td>
                  <td className="px-4 py-3">{stringValue(item.hours) || "-"}</td>
                  <td className="px-4 py-3">
                    {stringValue(item.phone) ? (
                      <span className="inline-flex items-center gap-1.5">
                        {stringValue(item.phone)}
                        <button
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary hover:bg-white"
                          type="button"
                          onClick={(event) => void copyPhone(event, id, stringValue(item.phone))}
                          aria-label="Sao chép số điện thoại"
                        >
                          {copiedId === id ? (
                            <CheckCircle2 size={13} aria-hidden />
                          ) : (
                            <Copy size={13} aria-hidden />
                          )}
                        </button>
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-1.5 font-bold">
                      <Star className="fill-masterise-primary text-masterise-primary" size={15} aria-hidden />
                      {stringValue(item.rating) || "-"}({stringValue(item.reviewCount) || 0})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-masterise-muted">{formatCmsDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-masterise-muted">{formatCmsDate(item.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary hover:bg-white"
                        href={`/stores/${id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Xem trang gian hàng"
                      >
                        <Eye size={16} aria-hidden />
                      </a>
                      {canWrite ? (
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary hover:bg-white"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(id);
                        }}
                        aria-label="Chỉnh sửa gian hàng"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                      ) : null}
                      {canDelete ? (
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:border-red-700"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(item);
                        }}
                        aria-label="Xóa gian hàng"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-masterise-muted" colSpan={9}>
                  Không có gian hàng phù hợp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectsTable({
  items,
  data,
  canWrite,
  currentPage,
  resultEnd,
  resultStart,
  sort,
  totalCount,
  totalPages,
  onEdit,
  onPageChange,
  onSort,
  onView,
}: {
  items: CmsItem[];
  data: SiteData;
  canWrite: boolean;
  currentPage: number;
  resultEnd: number;
  resultStart: number;
  sort: { key: SortKey; direction: SortDirection };
  totalCount: number;
  totalPages: number;
  onEdit: (id: string) => void;
  onPageChange: (page: number) => void;
  onSort: (key: SortKey) => void;
  onView: (id: string) => void;
}) {
  return (
    <div>
      <TableSummary
        currentPage={currentPage}
        resultEnd={resultEnd}
        resultStart={resultStart}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
          <thead className="bg-masterise-surface text-xs uppercase text-masterise-muted">
            <tr>
              <th className="px-4 py-3">Dự án</th>
              <th className="px-4 py-3">Miền</th>
              <th className="px-4 py-3">Tỉnh / thành</th>
              <th className="px-4 py-3">Phân khúc</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">
                <SortHeader activeSort={sort} label="Thời gian tạo" sortKey="createdAt" onSort={onSort} />
              </th>
              <th className="px-4 py-3">
                <SortHeader activeSort={sort} label="Update mới nhất" sortKey="updatedAt" onSort={onSort} />
              </th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const id = stringValue(item.id);
              return (
                <tr
                  key={id}
                  className="cursor-pointer border-t border-masterise-line transition hover:bg-masterise-soft/70"
                  onClick={() => onView(id)}
                >
                  <td className="px-4 py-3">
                    <strong className="block text-masterise-ink">{stringValue(item.name) || id}</strong>
                    <span className="text-xs text-masterise-muted">/projects/{id}</span>
                  </td>
                  <td className="px-4 py-3">{regionLabel(data, item.region)}</td>
                  <td className="px-4 py-3">{stringValue(item.city) || "-"}</td>
                  <td className="px-4 py-3">{stringValue(item.segment) || "-"}</td>
                  <td className="px-4 py-3">{stringValue(item.status) || "-"}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-masterise-muted">{formatCmsDate(item.createdAt)}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-masterise-muted">{formatCmsDate(item.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary hover:bg-white"
                        href={`/projects/${id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        aria-label="Xem trang dự án"
                      >
                        <Eye size={16} aria-hidden />
                      </a>
                      {canWrite ? (
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary hover:bg-white"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(id);
                        }}
                        aria-label="Chỉnh sửa dự án"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-masterise-muted" colSpan={8}>
                  Không có dự án phù hợp.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StoreEditSections({
  data,
  disabled,
  item,
  token,
  pushToast,
  onChange,
}: {
  data: SiteData;
  disabled: boolean;
  item: CmsItem;
  token: string;
  pushToast: (message: string, type?: ToastItem["type"]) => void;
  onChange: (key: string, value: CmsValue) => void;
}) {
  const fields = fieldsFor("stores", data);
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  const vouchers = vouchersValue(item.vouchers);
  const reviews = reviewsValue(item.reviews);
  const [voucherModalIndex, setVoucherModalIndex] = useState<number | null>(null);
  const [voucherDraft, setVoucherDraft] = useState<VoucherItem>({
    code: "",
    description: "",
    expires: "",
    redeemCount: 0,
  });
  const [reviewModalIndex, setReviewModalIndex] = useState<number | null>(null);
  const [reviewDraft, setReviewDraft] = useState<ReviewItem>({
    name: "",
    rating: 5,
    comment: "",
    isAnonymous: true,
    images: [],
  });
  const sections = [
    {
      title: "Thông tin cơ bản",
      description: "Tên gian hàng, đường dẫn, dự án, danh mục, hình ảnh, vị trí, liên hệ và bản đồ nhúng.",
      keys: ["images", "name", "id", "projectId", "category", "floor", "hours", "phone", "mapEmbedUrl", "note"],
    },
    {
      title: "Thông tin chi tiết",
      description: "Soạn nội dung WYSIWYG để hiển thị trong section chi tiết trên trang public.",
      keys: ["detailContent"],
    },
    {
      title: "Ưu đãi",
      description: "Quản lý mã ưu đãi, điều kiện sử dụng và số người đã redeem.",
      keys: ["vouchers"],
      isVoucherSection: true,
    },
    {
      title: "Đánh giá",
      description: "Điểm đánh giá tổng quan, số lượt đánh giá và các review mẫu hiển thị.",
      keys: ["reviews"],
      withReviewStats: true,
      isReviewSection: true,
    },
  ];

  function openCreateVoucher() {
    setVoucherDraft({
      code: uniqueVoucherCode(vouchers),
      description: "",
      expires: "Số lượng có hạn",
      redeemCount: 0,
    });
    setVoucherModalIndex(-1);
  }

  function openEditVoucher(index: number) {
    setVoucherDraft(vouchers[index]);
    setVoucherModalIndex(index);
  }

  function closeVoucherModal() {
    setVoucherModalIndex(null);
  }

  function updateVoucherDraft(key: keyof VoucherItem, value: string | number | undefined) {
    setVoucherDraft((current) => ({ ...current, [key]: value }));
  }

  function saveVoucher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextVoucher = {
      ...voucherDraft,
      code: voucherDraft.code.trim().toUpperCase(),
      description: voucherDraft.description.trim(),
      expires: voucherDraft.expires.trim(),
      redeemCount: Number(voucherDraft.redeemCount) || 0,
    };

    if (voucherModalIndex === -1) {
      onChange("vouchers", [...vouchers, nextVoucher]);
    } else if (voucherModalIndex !== null) {
      onChange(
        "vouchers",
        vouchers.map((voucher, index) => (index === voucherModalIndex ? nextVoucher : voucher)),
      );
    }
    closeVoucherModal();
    pushToast("Đã lưu ưu đãi thành công.");
  }

  function removeVoucher(index: number) {
    onChange("vouchers", vouchers.filter((_, currentIndex) => currentIndex !== index));
  }

  function openCreateReview() {
    setReviewDraft({
      name: createRandomReviewerName(),
      rating: 5,
      comment: "",
      isAnonymous: true,
      images: [],
    });
    setReviewModalIndex(-1);
  }

  function openEditReview(index: number) {
    setReviewDraft(reviews[index]);
    setReviewModalIndex(index);
  }

  function closeReviewModal() {
    setReviewModalIndex(null);
  }

  function updateReviewDraft(key: keyof ReviewItem, value: string | number | boolean | ReviewImageItem[] | undefined) {
    setReviewDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleReviewAnonymous(checked: boolean) {
    setReviewDraft((current) => ({
      ...current,
      name: checked ? createRandomReviewerName() : isGeneratedAnonymousName(current.name) ? "" : current.name,
      isAnonymous: checked,
    }));
  }

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isAnonymous = Boolean(reviewDraft.isAnonymous);
    const trimmedName = reviewDraft.name.trim();
    const nextReview = {
      ...reviewDraft,
      name: isAnonymous ? (isGeneratedAnonymousName(trimmedName) ? trimmedName : createRandomReviewerName()) : trimmedName,
      rating: Math.min(5, Math.max(1, Number(reviewDraft.rating) || 5)),
      comment: reviewDraft.comment.trim(),
      isAnonymous,
      images: normalizeReviewImages(reviewDraft.images),
    };

    if (reviewModalIndex === -1) {
      onChange("reviews", [...reviews, nextReview]);
    } else if (reviewModalIndex !== null) {
      onChange(
        "reviews",
        reviews.map((review, index) => (index === reviewModalIndex ? nextReview : review)),
      );
    }
    closeReviewModal();
    pushToast("Đã lưu đánh giá thành công.");
  }

  function removeReview(index: number) {
    onChange("reviews", reviews.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="grid gap-5">
      {sections.map((section) => (
        <section key={section.title} className="rounded-lg border border-masterise-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-masterise-line bg-masterise-surface px-4 py-3">
            <div>
              <h3 className="text-base font-extrabold text-masterise-ink">{section.title}</h3>
              <p className="mt-1 text-sm text-masterise-muted">{section.description}</p>
            </div>
            {section.isVoucherSection && !disabled ? (
              <button className="primary-button min-h-10 px-4 text-sm" type="button" onClick={openCreateVoucher}>
                <Plus size={17} aria-hidden />
                Thêm ưu đãi
              </button>
            ) : null}
            {section.isReviewSection && !disabled ? (
              <button className="primary-button min-h-10 px-4 text-sm" type="button" onClick={openCreateReview}>
                <Plus size={17} aria-hidden />
                Thêm đánh giá
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            {section.withReviewStats ? <ReviewStatsSummary reviews={item.reviews} /> : null}
            {section.isVoucherSection ? (
              <VoucherTable disabled={disabled} vouchers={vouchers} onEdit={openEditVoucher} onRemove={removeVoucher} />
            ) : section.isReviewSection ? (
              <ReviewTable disabled={disabled} reviews={reviews} onEdit={openEditReview} onRemove={removeReview} />
            ) : (
              section.keys.map((key) => {
                const field = fieldByKey.get(key);
                if (!field) return null;
                const editor = (
                  <FieldEditor
                    key={field.key}
                    field={field}
                    item={item}
                    token={token}
                    value={item[field.key]}
                    disabled={disabled}
                    onChange={(value) => onChange(field.key, value)}
                  />
                );
                if (section.title === "Thông tin cơ bản" && (key === "name" || key === "id")) {
                  return (
                    <Fragment key={field.key}>
                      {editor}
                      <div className="hidden md:block" aria-hidden />
                    </Fragment>
                  );
                }
                return editor;
              })
            )}
          </div>
        </section>
      ))}

      {voucherModalIndex !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true">
          <form className="grid w-full max-w-[560px] gap-4 rounded-lg border border-masterise-line bg-white p-5 shadow-2xl" onSubmit={saveVoucher}>
            <div className="flex items-start justify-between gap-4 border-b border-masterise-line pb-4">
              <div>
                <h3 className="text-lg font-extrabold">{voucherModalIndex === -1 ? "Thêm ưu đãi" : "Chỉnh sửa ưu đãi"}</h3>
                <p className="mt-1 text-sm text-masterise-muted">Nhập thông tin voucher, sau khi lưu sẽ hiển thị trong bảng bên dưới.</p>
              </div>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-masterise-line text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-primary"
                type="button"
                onClick={closeVoucherModal}
                aria-label="Đóng"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-masterise-ink md:col-span-2">
                Mã ưu đãi
                <input
                  className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary"
                  value={voucherDraft.code}
                  onChange={(event) => updateVoucherDraft("code", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-masterise-ink md:col-span-2">
                Mô tả ưu đãi
                <textarea
                  className="min-h-[110px] rounded-lg border border-masterise-line px-3 py-3 text-sm outline-none focus:border-masterise-primary"
                  value={voucherDraft.description}
                  onChange={(event) => updateVoucherDraft("description", event.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="secondary-button" type="button" onClick={closeVoucherModal}>
                Hủy
              </button>
              <button className="primary-button" type="submit">
                <Save size={18} aria-hidden />
                Lưu ưu đãi
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {reviewModalIndex !== null ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true">
          <form className="grid w-full max-w-[560px] gap-4 rounded-lg border border-masterise-line bg-white p-5 shadow-2xl" onSubmit={saveReview}>
            <div className="flex items-start justify-between gap-4 border-b border-masterise-line pb-4">
              <div>
                <h3 className="text-lg font-extrabold">{reviewModalIndex === -1 ? "Thêm đánh giá" : "Chỉnh sửa đánh giá"}</h3>
                <p className="mt-1 text-sm text-masterise-muted">Sau khi lưu, điểm đánh giá và số lượt đánh giá sẽ được tự động tính lại.</p>
              </div>
              <button
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-masterise-line text-masterise-muted transition hover:border-masterise-primary hover:text-masterise-primary"
                type="button"
                onClick={closeReviewModal}
                aria-label="Đóng"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
              <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
                Tên người đánh giá
                <input
                  className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary"
                  disabled={Boolean(reviewDraft.isAnonymous)}
                  value={reviewDraft.name}
                  onChange={(event) => updateReviewDraft("name", event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
                Điểm
                <input
                  className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary"
                  max={5}
                  min={1}
                  step={1}
                  type="number"
                  value={stringValue(reviewDraft.rating)}
                  onChange={(event) => updateReviewDraft("rating", Math.min(5, Math.max(1, numberValue(event.target.value) || 1)))}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-masterise-ink md:col-span-2">
                Nội dung đánh giá
                <textarea
                  className="min-h-[110px] rounded-lg border border-masterise-line px-3 py-3 text-sm outline-none focus:border-masterise-primary"
                  value={reviewDraft.comment}
                  onChange={(event) => updateReviewDraft("comment", event.target.value)}
                />
              </label>
              <div className="grid gap-2 text-sm font-semibold text-masterise-ink md:col-span-2">
                <span>Ảnh đánh giá</span>
                <ReviewImageUploadSlots
                  disabled={disabled}
                  token={token}
                  value={normalizeReviewImages(reviewDraft.images)}
                  onChange={(images) => updateReviewDraft("images", images)}
                />
              </div>
              <label className="inline-flex w-fit items-center gap-2 rounded-lg border border-masterise-line bg-masterise-surface px-3 py-2 text-sm font-semibold text-masterise-ink">
                <input
                  className="h-4 w-4 accent-masterise-primary"
                  checked={Boolean(reviewDraft.isAnonymous)}
                  type="checkbox"
                  onChange={(event) => toggleReviewAnonymous(event.target.checked)}
                />
                Hiển thị ẩn danh
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="secondary-button" type="button" onClick={closeReviewModal}>
                Hủy
              </button>
              <button className="primary-button" type="submit">
                <Save size={18} aria-hidden />
                Lưu đánh giá
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function ReviewStatsSummary({ reviews }: { reviews: CmsValue }) {
  const stats = calculatedReviewStats(reviews);
  return (
    <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
      <div className="rounded-lg border border-masterise-line bg-masterise-surface p-4">
        <span className="block text-xs font-bold uppercase text-masterise-muted">Đánh giá tự tính</span>
        <strong className="mt-2 flex items-center gap-2 text-2xl text-masterise-ink">
          <Star className="fill-masterise-primary text-masterise-primary" size={22} aria-hidden />
          {stats.rating.toFixed(1)}
        </strong>
      </div>
      <div className="rounded-lg border border-masterise-line bg-masterise-surface p-4">
        <span className="block text-xs font-bold uppercase text-masterise-muted">Số lượt đánh giá</span>
        <strong className="mt-2 block text-2xl text-masterise-ink">{stats.count}</strong>
      </div>
    </div>
  );
}

function VoucherTable({
  disabled,
  vouchers,
  onEdit,
  onRemove,
}: {
  disabled: boolean;
  vouchers: VoucherItem[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="md:col-span-2">
      <div className="overflow-x-auto rounded-lg border border-masterise-line">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-masterise-surface text-xs uppercase text-masterise-muted">
            <tr>
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Mô tả</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher, index) => (
              <tr key={`${voucher.code}-${index}`} className="border-t border-masterise-line">
                <td className="px-4 py-3 font-bold text-masterise-ink">{voucher.code || "-"}</td>
                <td className="max-w-[280px] px-4 py-3 text-masterise-muted">
                  <span className="line-clamp-2">{voucher.description || "-"}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {!disabled ? (
                    <div className="flex justify-end gap-2">
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary"
                        type="button"
                        onClick={() => onEdit(index)}
                        aria-label="Chỉnh sửa ưu đãi"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:border-red-700"
                        type="button"
                        onClick={() => onRemove(index)}
                        aria-label="Xóa ưu đãi"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {!vouchers.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-masterise-muted" colSpan={3}>
                  Chưa có ưu đãi nào. Bấm Thêm ưu đãi để tạo voucher mới.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewTable({
  disabled,
  reviews,
  onEdit,
  onRemove,
}: {
  disabled: boolean;
  reviews: ReviewItem[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="md:col-span-2">
      <div className="overflow-x-auto rounded-lg border border-masterise-line">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-masterise-surface text-xs uppercase text-masterise-muted">
            <tr>
              <th className="px-4 py-3">Người đánh giá</th>
              <th className="px-4 py-3 text-right">Điểm</th>
              <th className="px-4 py-3">Nội dung</th>
              <th className="px-4 py-3">Ảnh</th>
              <th className="px-4 py-3">Hiển thị</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review, index) => (
              <tr key={`${review.name}-${index}`} className="border-t border-masterise-line">
                <td className="px-4 py-3 font-bold text-masterise-ink">{review.name || "-"}</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 font-bold">
                    <Star className="fill-masterise-primary text-masterise-primary" size={15} aria-hidden />
                    {review.rating}
                  </span>
                </td>
                <td className="max-w-[360px] px-4 py-3 text-masterise-muted">
                  <span className="line-clamp-2">{review.comment || "-"}</span>
                </td>
                <td className="px-4 py-3">
                  {review.images?.length ? (
                    <div className="flex gap-1.5">
                      {review.images.map((image) => (
                        <span key={image.id} className="relative block h-10 w-12 overflow-hidden rounded-md border border-masterise-line bg-masterise-surface">
                          <Image src={image.url} alt={image.name} fill sizes="48px" className="object-cover" />
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">{review.isAnonymous ? "Ẩn danh" : "Tên thật"}</td>
                <td className="px-4 py-3 text-right">
                  {!disabled ? (
                    <div className="flex justify-end gap-2">
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-masterise-line text-masterise-primary transition hover:border-masterise-primary"
                        type="button"
                        onClick={() => onEdit(index)}
                        aria-label="Chỉnh sửa đánh giá"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:border-red-700"
                        type="button"
                        onClick={() => onRemove(index)}
                        aria-label="Xóa đánh giá"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {!reviews.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-masterise-muted" colSpan={6}>
                  Chưa có đánh giá nào. Bấm Thêm đánh giá để tạo review mới.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  item,
  token,
  value,
  disabled,
  onChange,
}: {
  field: FieldConfig;
  item: CmsItem;
  token: string;
  value: CmsValue;
  disabled: boolean;
  onChange: (value: CmsValue) => void;
}) {
  const className = `grid gap-2 text-sm font-semibold text-masterise-ink ${field.full ? "md:col-span-2" : ""}`;
  const inputClass =
    "min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted";

  if (field.type === "vouchers") {
    return (
      <div className={className}>
        <span>{field.label}</span>
        <VoucherEditor value={value} disabled={disabled} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "reviews") {
    return (
      <div className={className}>
        <span>{field.label}</span>
        <ReviewEditor value={value} disabled={disabled} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <div className={className}>
        <span>{field.label}</span>
        <ImageUploadField value={stringValue(value)} disabled={disabled} token={token} onChange={onChange} />
        {field.helper ? <small className="text-xs font-normal leading-5 text-masterise-muted">{field.helper}</small> : null}
      </div>
    );
  }

  if (field.type === "gallery") {
    return (
      <div className={className}>
        <span>{field.label}</span>
        <GalleryUploadField
          value={galleryValue(value, item.image)}
          disabled={disabled}
          token={token}
          onChange={onChange}
        />
        <small className="text-xs font-normal leading-5 text-masterise-muted">
          Kéo nhiều ảnh vào khung để upload. Kéo ảnh để đổi thứ tự; ảnh đầu tiên luôn là ảnh đại diện.
        </small>
      </div>
    );
  }

  if (field.type === "richtext") {
    return (
      <div className={className}>
        <span>{field.label}</span>
        <RichTextEditor value={stringValue(value)} disabled={disabled} token={token} onChange={onChange} />
        {field.helper ? <small className="text-xs font-normal leading-5 text-masterise-muted">{field.helper}</small> : null}
      </div>
    );
  }

  if (field.type === "mapembed") {
    return (
      <div className={className}>
        <span>{field.label}</span>
        <MapEmbedEditor
          disabled={disabled}
          helper={field.helper}
          value={stringValue(value)}
          onChange={(nextValue) => onChange(nextValue)}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className={className}>
        <span>{field.label}</span>
        <CustomSelect disabled={disabled} options={field.options || []} value={stringValue(value)} onChange={onChange} />
        {field.helper ? <small className="text-xs font-normal leading-5 text-masterise-muted">{field.helper}</small> : null}
      </div>
    );
  }

  return (
    <label className={className}>
      {field.label}
      {field.type === "textarea" || field.type === "array" ? (
        <textarea
          className={`${inputClass} min-h-[120px] py-3`}
          rows={field.rows || 4}
          disabled={disabled}
          value={field.type === "array" ? arrayToText(value, field.mode || "lines") : stringValue(value)}
          onChange={(event) =>
            onChange(field.type === "array" ? textToArray(event.target.value, field.mode || "lines") : event.target.value)
          }
        />
      ) : (
        <input
          className={inputClass}
          type={field.type}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={disabled}
          value={stringValue(value)}
          onChange={(event) => onChange(field.type === "number" ? numberValue(event.target.value) : event.target.value)}
        />
      )}
      {field.helper ? <small className="text-xs font-normal leading-5 text-masterise-muted">{field.helper}</small> : null}
    </label>
  );
}

function RichTextEditor({
  disabled,
  value,
  onChange,
  token,
}: {
  disabled: boolean;
  value: string;
  onChange: (value: CmsValue) => void;
  token: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Awaited<ReturnType<typeof createQuillEditor>> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const tokenRef = useRef(token);
  const disabledRef = useRef(disabled);
  const [isFocused, setIsFocused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  async function insertImageAtSelection(file: File) {
    const quill = quillRef.current;
    if (!quill || disabledRef.current) return;
    setUploadError("");
    setIsUploadingImage(true);
    try {
      const url = await uploadCmsImage(file, tokenRef.current);
      const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
      quill.insertEmbed(range.index, "image", url, "user");
      quill.setSelection(range.index + 1, 0, "user");
    } catch (error) {
      setUploadError(errorMessage(error));
    } finally {
      setIsUploadingImage(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const editorElement = editorRef.current;
    if (!editorElement || quillRef.current) return;

    // Mount each Quill instance into its own wrapper (instead of editorElement
    // directly) so React 18 dev StrictMode's mount->cleanup->mount replay can't
    // leave two toolbars behind: the cancelled instance's wrapper is removed
    // wholesale instead of colliding with the surviving instance's DOM.
    const wrapper = document.createElement("div");
    const target = document.createElement("div");
    wrapper.appendChild(target);
    editorElement.appendChild(wrapper);

    function handlePaste(event: ClipboardEvent) {
      if (disabledRef.current) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      // Capture phase + stopImmediatePropagation so this runs before (and blocks)
      // Quill's own clipboard module and the browser's native paste-image-as-base64
      // default, which would otherwise also insert the pasted image a second time.
      event.preventDefault();
      event.stopImmediatePropagation();
      void insertImageAtSelection(file);
    }

    async function initializeEditor() {
      const quill = await createQuillEditor(target, sanitizeRichTextHtml(value), () => fileInputRef.current?.click());
      if (cancelled) {
        wrapper.remove();
        return;
      }
      quillRef.current = quill;
      quill.enable(!disabled);
      quill.on("text-change", () => {
        onChangeRef.current(sanitizeRichTextHtml(quill.root.innerHTML));
      });
      quill.on("selection-change", (range) => {
        setIsFocused(Boolean(range));
      });
      quill.root.addEventListener("paste", handlePaste, true);
      setIsReady(true);
    }

    void initializeEditor();
    return () => {
      cancelled = true;
      quillRef.current?.root.removeEventListener("paste", handlePaste, true);
    };
    // disabled/value updates after mount are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    quill.enable(!disabled);
  }, [disabled]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || isFocused) return;
    const nextValue = sanitizeRichTextHtml(value);
    if (sanitizeRichTextHtml(quill.root.innerHTML) === nextValue) return;
    quill.clipboard.dangerouslyPasteHTML(nextValue || "");
  }, [isFocused, value]);

  return (
    <div className="quill-editor-shell rounded-lg border border-masterise-line bg-white">
      {!isReady ? (
        <div className="grid min-h-[240px] place-items-center text-sm font-semibold text-masterise-muted">Đang tải editor...</div>
      ) : null}
      <div ref={editorRef} className={isReady ? "" : "hidden"} />
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void insertImageAtSelection(file);
        }}
      />
      {isUploadingImage ? (
        <p className="flex items-center gap-2 border-t border-masterise-line px-3 py-2 text-xs font-semibold text-masterise-muted">
          <Loader2 className="animate-spin" size={14} aria-hidden />
          Đang upload ảnh...
        </p>
      ) : null}
      {uploadError ? (
        <p className="border-t border-masterise-line px-3 py-2 text-xs font-semibold text-red-700">{uploadError}</p>
      ) : null}
    </div>
  );
}

async function createQuillEditor(editor: HTMLDivElement, value: string, onImageButtonClick: () => void) {
  const Quill = (await import("quill")).default;
  const quill = new Quill(editor, {
    theme: "snow",
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link", "image"],
          ["clean"],
        ],
        handlers: {
          image: onImageButtonClick,
        },
      },
    },
    placeholder: "Nhập thông tin chi tiết. Có thể dán ảnh từ clipboard hoặc dùng nút chèn ảnh trên toolbar.",
  });

  if (value) {
    quill.clipboard.dangerouslyPasteHTML(value);
  }

  return quill;
}

function MapEmbedEditor({
  disabled,
  helper,
  value,
  onChange,
}: {
  disabled: boolean;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const previewSrc = googleMapsEmbedSrc(value);

  return (
    <div className="grid gap-3">
      <textarea
        className="min-h-11 rounded-lg border border-masterise-line px-3 py-2.5 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
        rows={1}
        disabled={disabled}
        value={value}
        placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." ...></iframe>'
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="rounded-lg border border-masterise-line bg-masterise-surface p-3 text-xs leading-5 text-masterise-muted">
        <strong className="block text-masterise-ink">Cách lấy mã nhúng hoạt động được</strong>
        <span className="mt-1 block">
          Mở Google Maps, tìm địa điểm, chọn <strong>Chia sẻ</strong>, chuyển sang tab <strong>Nhúng bản đồ</strong>, rồi bấm{" "}
          <strong>Sao chép HTML</strong>. Dán toàn bộ đoạn iframe vào ô này. Nếu chỉ muốn dán link, lấy phần nằm trong{" "}
          <code className="rounded bg-white px-1 font-bold text-masterise-primary">src=&quot;...&quot;</code> của iframe.
        </span>
        {helper ? <span className="mt-1 block">{helper}</span> : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-masterise-line bg-white">
        {previewSrc ? (
          <iframe
            className="h-[260px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={previewSrc}
            title="Preview Google Maps"
          />
        ) : (
          <div className="grid min-h-[180px] place-items-center bg-masterise-surface p-5 text-center text-sm font-semibold text-masterise-muted">
            Dán iframe hoặc src Google Maps hợp lệ để xem preview bản đồ.
          </div>
        )}
      </div>
    </div>
  );
}

function CustomSelect({
  disabled,
  options,
  value,
  onChange,
}: {
  disabled: boolean;
  options: SelectOption[];
  value: string;
  onChange: (value: CmsValue) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || "Chọn giá trị";

  useEffect(() => {
    if (!isOpen) return;

    function close() {
      setIsOpen(false);
    }

    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-masterise-line bg-white px-3 text-left text-sm font-semibold text-masterise-ink outline-none transition hover:border-masterise-primary focus:border-masterise-primary ${
          disabled ? "cursor-not-allowed bg-masterise-surface text-masterise-muted" : ""
        }`}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown className={`shrink-0 text-masterise-primary transition ${isOpen ? "rotate-180" : ""}`} size={18} aria-hidden />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-auto rounded-lg border border-masterise-line bg-white p-1.5 shadow-masterise"
          role="listbox"
          onClick={(event) => event.stopPropagation()}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                className={`flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                  isSelected
                    ? "bg-masterise-primary text-white"
                    : "text-masterise-ink hover:bg-masterise-soft hover:text-masterise-dark"
                }`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ImageUploadField({
  disabled,
  token,
  value,
  onChange,
}: {
  disabled: boolean;
  token: string;
  value: string;
  onChange: (value: CmsValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(file: File) {
    setIsUploading(true);
    setError("");
    try {
      onChange(await uploadCmsImage(file, token));
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-masterise-line bg-masterise-surface p-3">
      {value ? (
        <div className="relative aspect-video overflow-hidden rounded-lg border border-masterise-line bg-white">
          <Image src={value} alt="Ảnh đại diện" fill sizes="(min-width: 768px) 640px, 100vw" className="object-cover" />
        </div>
      ) : (
        <div className="grid min-h-[180px] place-items-center rounded-lg border border-dashed border-masterise-line bg-white text-sm font-semibold text-masterise-muted">
          Chưa có ảnh đại diện.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button className="secondary-button" type="button" disabled={disabled || isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <ImagePlus size={18} aria-hidden />}
          {isUploading ? "Đang upload..." : "Upload ảnh"}
        </button>
        {value ? (
          <button className="secondary-button" type="button" disabled={disabled || isUploading} onClick={() => onChange("")}>
            Xóa ảnh
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void uploadImage(file);
        }}
      />
      <small className="text-xs font-normal leading-5 text-masterise-muted">Hỗ trợ JPG, PNG, WEBP, GIF. Dung lượng tối đa 5MB.</small>
      {error ? <small className="text-xs font-semibold leading-5 text-red-700">{error}</small> : null}
    </div>
  );
}

function GalleryUploadField({
  disabled,
  token,
  value,
  onChange,
}: {
  disabled: boolean;
  token: string;
  value: string[];
  onChange: (value: CmsValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length || disabled) return;

    setIsUploading(true);
    setError("");
    try {
      const uploadedImages: string[] = [];
      for (const file of imageFiles) {
        uploadedImages.push(await uploadCmsImage(file, token));
      }
      onChange([...value, ...uploadedImages]);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setIsUploading(false);
      setIsDraggingFiles(false);
    }
  }

  function moveImage(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || disabled) return;
    const nextImages = [...value];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, movedImage);
    onChange(nextImages);
  }

  function removeImage(index: number) {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files.length) {
      void uploadFiles(event.dataTransfer.files);
    }
    setIsDraggingFiles(false);
  }

  return (
    <div
      className={`grid gap-3 rounded-lg border border-dashed p-3 transition ${
        isDraggingFiles ? "border-masterise-primary bg-masterise-soft" : "border-masterise-line bg-masterise-surface"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDraggingFiles(true);
      }}
      onDragLeave={() => setIsDraggingFiles(false)}
      onDrop={handleDrop}
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {value.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="group relative aspect-[4/2.5] overflow-hidden rounded-lg border border-masterise-line bg-white"
            draggable={!disabled}
            onDragStart={(event) => {
              setDragIndex(index);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (dragIndex !== null) moveImage(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <Image src={image} alt={`Ảnh gian hàng ${index + 1}`} fill sizes="(min-width: 1280px) 420px, 100vw" className="object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-extrabold text-masterise-primary shadow-sm">
              {index === 0 ? "Đại diện" : index + 1}
            </span>
            {!disabled ? (
              <button
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-red-700 opacity-0 shadow-sm transition group-hover:opacity-100"
                type="button"
                onClick={() => removeImage(index)}
                aria-label="Xóa ảnh"
              >
                <Trash2 size={15} aria-hidden />
              </button>
            ) : null}
          </div>
        ))}

        {!disabled ? (
          <button
            className="grid aspect-[4/2.5] place-items-center rounded-lg border border-dashed border-masterise-line bg-white p-3 text-center text-sm font-bold text-masterise-primary transition hover:border-masterise-primary hover:bg-masterise-soft"
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <span className="grid justify-items-center gap-2">
              {isUploading ? <Loader2 className="animate-spin" size={24} aria-hidden /> : <ImagePlus size={24} aria-hidden />}
              {isUploading ? "Đang upload..." : "Thêm ảnh"}
            </span>
          </button>
        ) : null}
      </div>

      {!value.length ? (
        <div className="grid min-h-[140px] place-items-center rounded-lg border border-dashed border-masterise-line bg-white p-5 text-center text-sm font-semibold text-masterise-muted">
          Kéo ảnh vào đây hoặc bấm Thêm ảnh để upload.
        </div>
      ) : null}

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={(event) => {
          const files = event.target.files;
          event.target.value = "";
          if (files) void uploadFiles(files);
        }}
      />
      {error ? <small className="text-xs font-semibold leading-5 text-red-700">{error}</small> : null}
    </div>
  );
}

function ReviewImageUploadSlots({
  disabled,
  token,
  value,
  onChange,
}: {
  disabled: boolean;
  token: string;
  value: ReviewImageItem[];
  onChange: (value: ReviewImageItem[]) => void;
}) {
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function uploadSlotImage(slotIndex: number, file: File) {
    if (disabled) return;
    setUploadingSlot(slotIndex);
    setError("");
    try {
      const url = await uploadCmsImage(file, token);
      const nextImages = [...value];
      nextImages[slotIndex] = {
        id: `review-image-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name.replace(/\.[^.]+$/, ".webp"),
        url,
      };
      onChange(normalizeReviewImages(nextImages));
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setUploadingSlot(null);
    }
  }

  function removeSlotImage(slotIndex: number) {
    onChange(value.filter((_, index) => index !== slotIndex));
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-3">
        {[0, 1].map((slotIndex) => {
          const image = value[slotIndex];
          const isUploading = uploadingSlot === slotIndex;

          return (
            <label
              key={slotIndex}
              className={`relative grid h-24 w-32 overflow-hidden rounded-md border border-dashed border-masterise-line bg-masterise-surface text-center text-xs font-semibold text-masterise-muted transition ${
                disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-masterise-primary hover:text-masterise-primary"
              }`}
            >
              {image ? (
                <>
                  <Image src={image.url} alt={image.name} fill sizes="128px" className="object-cover" />
                  {!disabled ? (
                    <button
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-red-700 shadow-sm"
                      type="button"
                      aria-label="Xóa ảnh đánh giá"
                      onClick={(event) => {
                        event.preventDefault();
                        removeSlotImage(slotIndex);
                      }}
                    >
                      <X size={15} aria-hidden />
                    </button>
                  ) : null}
                </>
              ) : (
                <span className="grid h-full place-items-center justify-items-center gap-1 p-3">
                  {isUploading ? <Loader2 className="animate-spin" size={20} aria-hidden /> : <ImagePlus size={20} aria-hidden />}
                  {isUploading ? "Đang upload..." : `Thêm ảnh ${slotIndex + 1}`}
                </span>
              )}
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={disabled || isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadSlotImage(slotIndex, file);
                }}
              />
            </label>
          );
        })}
      </div>
      <small className="text-xs font-normal leading-5 text-masterise-muted">Tối đa 2 ảnh, dùng chung hiển thị với phần đánh giá ngoài client.</small>
      {error ? <small className="text-xs font-semibold leading-5 text-red-700">{error}</small> : null}
    </div>
  );
}

async function uploadCmsImage(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${CMS_API}?action=upload-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Upload ảnh lỗi ${response.status}.`);
  }
  return String(payload.url || "");
}

function VoucherEditor({
  value,
  disabled,
  onChange,
}: {
  value: CmsValue;
  disabled: boolean;
  onChange: (value: CmsValue) => void;
}) {
  const vouchers = vouchersValue(value);

  function updateVoucher(index: number, key: keyof VoucherItem, nextValue: string | number | undefined) {
    onChange(vouchers.map((voucher, currentIndex) => (currentIndex === index ? { ...voucher, [key]: nextValue } : voucher)));
  }

  function addVoucher() {
    onChange([
      ...vouchers,
      {
        code: uniqueVoucherCode(vouchers),
        title: "Ưu đãi mới",
        description: "",
        expires: "Số lượng có hạn",
        redeemCount: 0,
      },
    ]);
  }

  function removeVoucher(index: number) {
    onChange(vouchers.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="grid gap-3 rounded-lg border border-masterise-line bg-masterise-surface p-3">
      {vouchers.map((voucher, index) => (
        <div key={`${voucher.code}-${index}`} className="grid gap-3 rounded-lg border border-masterise-line bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm">Ưu đãi {index + 1}</strong>
            {!disabled ? (
              <button
                className="grid h-9 w-9 place-items-center rounded-full border border-red-200 text-red-700 transition hover:border-red-700"
                type="button"
                onClick={() => removeVoucher(index)}
                aria-label="Xóa ưu đãi"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Mã ưu đãi
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                value={voucher.code}
                onChange={(event) => updateVoucher(index, "code", event.target.value.toUpperCase())}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Tiêu đề ưu đãi
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                value={voucher.title}
                onChange={(event) => updateVoucher(index, "title", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink md:col-span-2">
              Mô tả ưu đãi
              <textarea
                className="min-h-[96px] rounded-lg border border-masterise-line px-3 py-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                value={voucher.description}
                onChange={(event) => updateVoucher(index, "description", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Hạn dùng / điều kiện
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                value={voucher.expires}
                onChange={(event) => updateVoucher(index, "expires", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Số người redeem
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                min={0}
                step={1}
                type="number"
                value={stringValue(voucher.redeemCount)}
                onChange={(event) => updateVoucher(index, "redeemCount", numberValue(event.target.value) || 0)}
              />
            </label>
          </div>
        </div>
      ))}

      {!vouchers.length ? (
        <div className="rounded-lg border border-dashed border-masterise-line bg-white p-4 text-sm text-masterise-muted">
          Chưa có ưu đãi nào cho gian hàng này.
        </div>
      ) : null}

      {!disabled ? (
        <button className="secondary-button w-fit" type="button" onClick={addVoucher}>
          <Plus size={18} aria-hidden />
          Thêm ưu đãi
        </button>
      ) : null}
    </div>
  );
}

function ReviewEditor({
  value,
  disabled,
  onChange,
}: {
  value: CmsValue;
  disabled: boolean;
  onChange: (value: CmsValue) => void;
}) {
  const reviews = reviewsValue(value);

  function updateReview(index: number, key: keyof ReviewItem, nextValue: string | number | boolean | undefined) {
    onChange(reviews.map((review, currentIndex) => (currentIndex === index ? { ...review, [key]: nextValue } : review)));
  }

  function addReview() {
    onChange([
      ...reviews,
      {
        name: createRandomReviewerName(),
        rating: 5,
        comment: "",
        isAnonymous: true,
      },
    ]);
  }

  function removeReview(index: number) {
    onChange(reviews.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <div className="grid gap-3 rounded-lg border border-masterise-line bg-masterise-surface p-3">
      {reviews.map((review, index) => (
        <div key={`${review.name}-${index}`} className="grid gap-3 rounded-lg border border-masterise-line bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm">Đánh giá {index + 1}</strong>
            {!disabled ? (
              <button
                className="grid h-9 w-9 place-items-center rounded-full border border-red-200 text-red-700 transition hover:border-red-700"
                type="button"
                onClick={() => removeReview(index)}
                aria-label="Xóa đánh giá"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Tên người đánh giá
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                value={review.name}
                onChange={(event) => updateReview(index, "name", event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink">
              Điểm
              <input
                className="min-h-11 rounded-lg border border-masterise-line px-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                max={5}
                min={1}
                step={1}
                type="number"
                value={stringValue(review.rating)}
                onChange={(event) => updateReview(index, "rating", Math.min(5, Math.max(1, numberValue(event.target.value) || 1)))}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-masterise-ink md:col-span-2">
              Nội dung đánh giá
              <textarea
                className="min-h-[96px] rounded-lg border border-masterise-line px-3 py-3 text-sm outline-none focus:border-masterise-primary disabled:bg-masterise-surface disabled:text-masterise-muted"
                disabled={disabled}
                value={review.comment}
                onChange={(event) => updateReview(index, "comment", event.target.value)}
              />
            </label>
            <label className="inline-flex w-fit items-center gap-2 rounded-lg border border-masterise-line bg-masterise-surface px-3 py-2 text-sm font-semibold text-masterise-ink">
              <input
                className="h-4 w-4 accent-masterise-primary"
                checked={Boolean(review.isAnonymous)}
                disabled={disabled}
                type="checkbox"
                onChange={(event) => updateReview(index, "isAnonymous", event.target.checked)}
              />
              Hiển thị ẩn danh
            </label>
          </div>
        </div>
      ))}

      {!reviews.length ? (
        <div className="rounded-lg border border-dashed border-masterise-line bg-white p-4 text-sm text-masterise-muted">
          Chưa có đánh giá mẫu nào cho gian hàng này.
        </div>
      ) : null}

      {!disabled ? (
        <button className="secondary-button w-fit" type="button" onClick={addReview}>
          <Plus size={18} aria-hidden />
          Thêm đánh giá
        </button>
      ) : null}
    </div>
  );
}

function fieldsFor(section: NavKey, data: SiteData): FieldConfig[] {
  if (section === "stores") {
    return [
      { key: "name", label: "Tên gian hàng", type: "text" },
      { key: "id", label: "ID đường dẫn", type: "text", helper: "Ví dụ: cafe-waterfront." },
      { key: "projectId", label: "Dự án", type: "select", options: projectOptions(data) },
      { key: "category", label: "Danh mục", type: "select", options: categoryOptions(data) },
      { key: "images", label: "Ảnh gian hàng", type: "gallery", full: true },
      { key: "floor", label: "Địa chỉ", type: "text" },
      { key: "hours", label: "Giờ hoạt động", type: "text" },
      { key: "phone", label: "Số liên hệ", type: "tel" },
      {
        key: "mapEmbedUrl",
        label: "Link iframe Google Maps",
        type: "mapembed",
        full: true,
        rows: 3,
        helper: "Trên Google Maps chọn Chia sẻ > Nhúng bản đồ > Sao chép HTML. Dán toàn bộ đoạn iframe hoặc chỉ phần src=\"...\" vào đây.",
      },
      { key: "note", label: "Mô tả ngắn", type: "textarea", full: true, rows: 5 },
      { key: "detailContent", label: "Thông tin chi tiết", type: "richtext", full: true },
      { key: "vouchers", label: "Thông tin ưu đãi", type: "vouchers", full: true },
      { key: "reviews", label: "Danh sách đánh giá", type: "reviews", full: true },
    ];
  }

  return [
    { key: "id", label: "ID đường dẫn", type: "text", helper: "Ví dụ: masteri-grand-coast." },
    { key: "name", label: "Tên dự án", type: "text" },
    { key: "region", label: "Miền", type: "select", options: regionOptions(data) },
    { key: "city", label: "Tỉnh / thành phố", type: "text" },
    { key: "location", label: "Vị trí", type: "text", full: true },
    { key: "segment", label: "Phân khúc", type: "text" },
    { key: "status", label: "Trạng thái", type: "text" },
    { key: "image", label: "Ảnh đại diện", type: "image", full: true },
    { key: "source", label: "Link nguồn Masterise", type: "url", full: true },
    { key: "summary", label: "Mô tả chính", type: "textarea", full: true, rows: 5 },
    { key: "highlights", label: "Điểm cần theo dõi", type: "array", mode: "lines", full: true, rows: 5 },
  ];
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

function normalizeStoreCategories(categories: CmsItem[]): CmsItem[] {
  const hasUnassigned = categories.some((category) => stringValue(category.id) === UNASSIGNED_CATEGORY_ID);
  if (hasUnassigned) return categories;
  return [...categories, { id: UNASSIGNED_CATEGORY_ID, label: UNASSIGNED_CATEGORY_LABEL }];
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
    storeCategories: normalizeStoreCategories(Array.isArray(source.storeCategories) ? source.storeCategories : []),
    stores: Array.isArray(source.stores) ? source.stores.map(normalizeStoreItem) : [],
    newsItems: Array.isArray(source.newsItems) ? source.newsItems : [],
  };
}

function normalizeStoreItem(item: CmsItem): CmsItem {
  const stats = calculatedReviewStats(item.reviews);
  return {
    ...item,
    address: stringValue(item.address),
    mapEmbedUrl: stringValue(item.mapEmbedUrl),
    detailContent: sanitizeRichTextHtml(stringValue(item.detailContent)),
    rating: stats.rating,
    reviewCount: stats.count,
  };
}

function clone(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function getSelectedId(section: NavKey, collection: CmsItem[], selectedIds: Partial<Record<NavKey, string>>) {
  const explicitSelectedId = selectedIds[section];
  return explicitSelectedId && collection.some((item) => stringValue(item.id) === explicitSelectedId)
    ? explicitSelectedId
    : stringValue(collection[0]?.id);
}

function createStore(data: SiteData): CmsItem {
  const timestamp = nowIso();
  return {
    id: uniqueId("gian-hang-moi", data.stores),
    name: "Gian hàng mới",
    projectId: firstProjectId(data),
    category: firstCategoryId(data),
    image: "",
    floor: "",
    hours: "08:00 - 20:00",
    phone: "0988 458 783",
    address: "",
    mapEmbedUrl: "",
    detailContent: "",
    rating: 5,
    reviewCount: 0,
    images: [],
    vouchers: [],
    reviews: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    note: "",
  };
}

function createProject(data: SiteData): CmsItem {
  const timestamp = nowIso();
  return {
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
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function itemTitle(section: NavKey, item: CmsItem) {
  return stringValue(section === "stores" ? item.name : item.name) || stringValue(item.id) || "Chưa có tiêu đề";
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
  return data.storeCategories
    .filter((category) => stringValue(category.id) !== "all")
    .map((category) => ({ value: stringValue(category.id), label: stringValue(category.label || category.id) }));
}

function firstProjectId(data: SiteData) {
  return stringValue(data.projects[0]?.id);
}

function firstCategoryId(data: SiteData) {
  return stringValue(data.storeCategories.find((category) => category.id !== "all")?.id || data.storeCategories[0]?.id);
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

function galleryValue(value: CmsValue, fallbackImage: CmsValue) {
  const list = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item)) : [];
  const fallback = stringValue(fallbackImage);
  if (!list.length && fallback) return [fallback];
  return list;
}

function firstGalleryImage(value: CmsValue) {
  return Array.isArray(value) ? stringValue(value.find((item) => typeof item === "string")) : "";
}

function vouchersValue(value: CmsValue): VoucherItem[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[])
    .filter((item) => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((item) => item as Partial<VoucherItem>)
    .map((item) => ({
      code: stringValue(item.code).toUpperCase(),
      title: stringValue(item.title),
      description: stringValue(item.description),
      expires: stringValue(item.expires),
      redeemCount: numberValue(stringValue(item.redeemCount)) || 0,
    }));
}

function vouchersSummary(value: CmsValue) {
  const vouchers = vouchersValue(value);
  if (!vouchers.length) return "Chưa có ưu đãi";
  return vouchers
    .map((voucher) => `${voucher.code || "NO-CODE"} - ${voucher.description || "Ưu đãi"}`)
    .join("\n");
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

function reviewsValue(value: CmsValue): ReviewItem[] {
  if (!Array.isArray(value)) return [];
  const reviews: ReviewItem[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const source = item as Partial<ReviewItem>;
    const rawName = stringValue(source.name);
    const isAnonymous = Boolean(source.isAnonymous) || rawName === "Cư dân ẩn danh" || isGeneratedAnonymousName(rawName);
    reviews.push({
      name: isAnonymous && !isGeneratedAnonymousName(rawName) ? createRandomReviewerName() : rawName,
      rating: Math.min(5, Math.max(1, Number(source.rating) || 5)),
      comment: stringValue(source.comment),
      isAnonymous,
      images: normalizeReviewImages(source.images),
    });
  });
  return reviews;
}

function normalizeReviewImages(value: unknown): ReviewImageItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return item ? { id: `review-image-${index}`, name: `review-image-${index + 1}`, url: item } : null;
      }
      if (!item || typeof item !== "object") return null;
      const source = item as Partial<ReviewImageItem>;
      const url = stringValue(source.url);
      if (!url) return null;
      return {
        id: stringValue(source.id) || `review-image-${index}`,
        name: stringValue(source.name) || `review-image-${index + 1}`,
        url,
      };
    })
    .filter((item): item is ReviewImageItem => Boolean(item))
    .slice(0, 2);
}

function calculatedReviewStats(value: CmsValue) {
  const reviews = reviewsValue(value);
  if (!reviews.length) return { rating: 5, count: 0 };
  const rating = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  return { rating: Number(rating.toFixed(1)), count: reviews.length };
}

function reviewsSummary(value: CmsValue) {
  const reviews = reviewsValue(value);
  if (!reviews.length) return "Chưa có đánh giá chi tiết";
  return reviews.map((review) => `${review.name} - ${review.rating}/5`).join("\n");
}

function uniqueVoucherCode(vouchers: VoucherItem[]) {
  const existing = new Set(vouchers.map((voucher) => voucher.code));
  let index = vouchers.length + 1;
  let code = `UUDAI${index}`;
  while (existing.has(code)) {
    index += 1;
    code = `UUDAI${index}`;
  }
  return code;
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

function sanitizeRichTextHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s(?:on\w+|style)=("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)=("|\')\s*javascript:[^"\']*\2/gi, "")
    .trim();
}

function richTextPreview(value: CmsValue) {
  const text = sanitizeRichTextHtml(stringValue(value))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || "Chưa có nội dung";
}

function googleMapsEmbedSrc(value?: string) {
  const rawValue = value?.trim();
  if (!rawValue) return "";
  const iframeSrc = (rawValue.match(/src=["']([^"']+)["']/i)?.[1] || rawValue).replace(/&amp;/g, "&");

  try {
    const url = new URL(iframeSrc);
    const host = url.hostname.replace(/^www\./, "");
    return host === "google.com" || host.endsWith(".google.com") ? url.toString() : "";
  } catch {
    return "";
  }
}

function stringValue(value: CmsValue) {
  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
}

function numberValue(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeRole(role: unknown): Role {
  return role === "super_admin" || role === "admin" || role === "employee" ? role : "employee";
}

function sortItems(items: CmsItem[], sort: { key: SortKey; direction: SortDirection }) {
  return [...items].sort((left, right) => {
    if (sort.key === "rating") {
      const leftRating = numericSortValue(left.rating);
      const rightRating = numericSortValue(right.rating);
      if (leftRating !== rightRating) {
        return sort.direction === "desc" ? rightRating - leftRating : leftRating - rightRating;
      }
      return 0;
    }

    const leftTime = dateTimeValue(left[sort.key]);
    const rightTime = dateTimeValue(right[sort.key]);
    if (leftTime !== rightTime) {
      return sort.direction === "desc" ? rightTime - leftTime : leftTime - rightTime;
    }
    return 0;
  });
}

function numericSortValue(value: CmsValue) {
  const parsed = Number(stringValue(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateTimeValue(value: CmsValue) {
  const parsed = Date.parse(stringValue(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCmsDate(value: CmsValue) {
  const timestamp = dateTimeValue(value);
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(timestamp));
}

function nowIso() {
  return new Date().toISOString();
}

function adminPath(section: NavKey, mode: ViewMode = "list", itemId = "") {
  if (section === "permissions" || section === "categories") return `/admin/${section}`;
  if (mode === "list" || !itemId) return `/admin/${section}`;
  return `/admin/${section}/${encodeURIComponent(itemId)}${mode === "edit" ? "/edit" : ""}`;
}

function routeFromPath(pathname: string): { section: NavKey; mode: ViewMode; itemId: string } {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[1] === "permissions" || parts[1] === "categories") return { section: parts[1], mode: "list", itemId: "" };
  const section = parts[1] === "projects" ? "projects" : "stores";
  const itemId = parts[2] ? decodeURIComponent(parts[2]) : "";
  const mode = itemId ? (parts[3] === "edit" ? "edit" : "view") : "list";
  return { section, mode, itemId };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
