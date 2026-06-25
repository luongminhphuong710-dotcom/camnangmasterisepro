import type { Project, RegionMeta, SiteData, Store, StoreCategory } from "@/lib/site-types";

export const projectCoordinates: Record<string, { lat: number; lng: number }> = {
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

export function getProjectFromData(data: Pick<SiteData, "projects">, projectId: string | undefined): Project | undefined {
  return data.projects.find((project) => project.id === projectId);
}

export function getCategoryFromList(categories: readonly StoreCategory[], categoryId: string | undefined) {
  return categories.find((category) => category.id === categoryId) ?? categories[0] ?? { id: "all", label: "Tất cả" };
}

export function storesForProjectFromData(data: Pick<SiteData, "stores">, projectId: string): Store[] {
  return data.stores.filter((store) => store.projectId === projectId);
}

export function regionLabelFromMeta(regionMeta: RegionMeta, region: string): string {
  return region in regionMeta ? regionMeta[region]?.label || region : region;
}

export function normalize(value: unknown): string {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\u0111/g, "d")
    .trim();
}

export function slugify(value: unknown): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function shortText(value: unknown, maxLength = 160): string {
  const text = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength).replace(/\s+\S*$/, "").trim();
  return `${clipped || text.slice(0, maxLength).trim()}...`;
}

export function distanceInKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const earthRadius = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
