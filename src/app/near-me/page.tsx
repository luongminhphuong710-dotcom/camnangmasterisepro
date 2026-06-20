"use client";

import { Navigation, Search, SlidersHorizontal, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StoreCard } from "@/components/StoreCard";
import { ThemeSelect } from "@/components/ThemeSelect";
import { storeCategories, stores } from "@/lib/data";
import { distanceInKm, getProject, normalize, projectCoordinates } from "@/lib/helpers";

const radiusOptions = [
  { value: "3", label: "Trong 3 km" },
  { value: "5", label: "Trong 5 km" },
  { value: "10", label: "Trong 10 km" },
  { value: "20", label: "Trong 20 km" },
];

export default function NearMePage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState("10");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Bật định vị để sắp xếp dịch vụ theo khoảng cách.");

  const categoryOptions = storeCategories.map((item) => ({ value: item.id, label: item.label }));

  const items = useMemo(() => {
    const text = normalize(query);
    return stores
      .map((store) => {
        const project = getProject(store.projectId);
        const coords = projectCoordinates[store.projectId];
        const distance = location && coords ? distanceInKm(location, coords) : null;
        return { store, project, distance };
      })
      .filter(({ store, project, distance }) => {
        if (!project) return false;
        const matchesRadius = !location || distance === null || distance <= Number(radius);
        const matchesCategory = category === "all" || store.category === category;
        const matchesQuery =
          !text || normalize([store.name, store.note, store.floor, project.name, project.city].join(" ")).includes(text);
        return matchesRadius && matchesCategory && matchesQuery;
      })
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [category, location, query, radius]);

  function locate() {
    if (!navigator.geolocation) {
      setMessage("Trình duyệt chưa hỗ trợ định vị.");
      return;
    }

    setMessage("Đang lấy vị trí của bạn...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setMessage("Đã bật định vị. Danh sách đang ưu tiên dịch vụ gần bạn.");
      },
      () => setMessage("Không thể lấy vị trí. Danh sách đang hiển thị theo đánh giá nổi bật."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <main className="detail-shell">
      <section className="detail-hero mb-8">
        <div className="grid content-center gap-5">
          <p className="eyebrow">Gần bạn</p>
          <h1 className="h1">Dịch vụ gần bạn</h1>
          <p className="body-text">{message}</p>
          <div className="action-row max-w-md">
            <button className="primary-button" type="button" onClick={locate}>
              <Navigation size={17} aria-hidden />
              Bật định vị
            </button>
            <Link className="secondary-button" href="/stores">
              Xem tất cả
            </Link>
          </div>
        </div>
        <aside className="rounded-lg bg-masterise-soft p-6">
          <Target className="mb-4 text-masterise-primary" size={32} aria-hidden />
          <strong>Dự án gần nhất</strong>
          <p className="body-text mt-2 text-sm">
            Khi có vị trí, hệ thống sẽ dựa trên tọa độ dự án để ưu tiên dịch vụ trong phạm vi bạn chọn.
          </p>
        </aside>
      </section>

      <section className="rounded-lg border border-masterise-line bg-white p-5">
        <div className="section-heading">
          <p className="eyebrow">Danh sách đề xuất</p>
          <h2 className="h2">Dịch vụ trong phạm vi gần</h2>
        </div>
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="filter-field rounded-lg border border-masterise-line">
            <Target size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect label="Chọn phạm vi" value={radius} options={radiusOptions} onChange={setRadius} />
          </div>
          <div className="filter-field rounded-lg border border-masterise-line">
            <SlidersHorizontal size={19} aria-hidden className="text-masterise-primary" />
            <ThemeSelect label="Chọn loại dịch vụ" value={category} options={categoryOptions} onChange={setCategory} />
          </div>
          <label className="filter-field rounded-lg border border-masterise-line" htmlFor="nearSearchInput">
            <Search size={19} aria-hidden className="text-masterise-primary" />
            <input
              id="nearSearchInput"
              className="filter-input"
              type="search"
              placeholder="Tìm dịch vụ gần bạn..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="store-grid">
          {items.map(({ store, project, distance }) => (
            <StoreCard key={store.id} store={store} project={project} distance={distance} />
          ))}
        </div>
      </section>
    </main>
  );
}
