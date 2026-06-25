import type { NewsItem, Project, SiteData, Store } from "@/lib/site-types";

export function toHomeClientData(data: SiteData): SiteData {
  return {
    ...baseClientData(data),
    projects: data.projects.map(toProjectListItem),
    stores: data.stores.map(toStoreListItem),
    newsItems: data.newsItems.slice(0, 8).map(toNewsListItem),
  };
}

export function toStoresClientData(data: SiteData): SiteData {
  return {
    ...baseClientData(data),
    projects: data.projects.map(toProjectListItem),
    stores: data.stores.map(toStoreListItem),
    newsItems: [],
  };
}

export function toProjectsClientData(data: SiteData): SiteData {
  return {
    ...baseClientData(data),
    projects: data.projects.map(toProjectListItem),
    stores: data.stores.map(({ id, projectId, category }) => ({
      id,
      projectId,
      category,
      name: "",
      image: "",
      floor: "",
      hours: "",
      phone: "",
      note: "",
    })),
    newsItems: [],
  };
}

export function toNewsClientData(data: SiteData): SiteData {
  return {
    ...baseClientData(data),
    projects: data.projects.map(toProjectListItem),
    stores: [],
    newsItems: data.newsItems.map(toNewsListItem),
  };
}

function baseClientData(data: SiteData): SiteData {
  return {
    fallbackImage: data.fallbackImage,
    homeSettings: data.homeSettings,
    regionMeta: data.regionMeta,
    projects: [],
    storeCategories: data.storeCategories,
    stores: [],
    newsItems: [],
  };
}

function toProjectListItem(project: Project): Project {
  return {
    id: project.id,
    name: project.name,
    region: project.region,
    city: project.city,
    location: project.location,
    segment: project.segment,
    status: project.status,
    image: project.image,
    source: "",
    summary: project.summary,
    highlights: [],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

function toStoreListItem(store: Store): Store {
  return {
    id: store.id,
    name: store.name,
    projectId: store.projectId,
    category: store.category,
    image: store.image,
    floor: store.floor,
    hours: store.hours,
    phone: store.phone,
    rating: store.rating,
    reviewCount: store.reviewCount,
    note: store.note,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

function toNewsListItem(item: NewsItem): NewsItem {
  return {
    id: item.id,
    title: item.title,
    projectId: item.projectId,
    region: item.region,
    date: item.date,
    category: item.category,
    hashtags: item.hashtags,
    image: item.image,
    excerpt: item.excerpt,
    content: [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
