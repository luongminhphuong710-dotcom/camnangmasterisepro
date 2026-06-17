import { projects, regionMeta, storeCategories, stores, type Project, type Store } from "@/lib/data";

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

export function getProject(projectId: string | undefined): Project | undefined {
  return projects.find((project) => project.id === projectId);
}

export function getCategory(categoryId: string | undefined) {
  return storeCategories.find((category) => category.id === categoryId) ?? storeCategories[0];
}

export function storesForProject(projectId: string): readonly Store[] {
  return stores.filter((store) => store.projectId === projectId);
}

export function regionLabel(region: keyof typeof regionMeta | string): string {
  return region in regionMeta ? regionMeta[region as keyof typeof regionMeta].label : String(region);
}

export function normalize(value: unknown): string {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
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
