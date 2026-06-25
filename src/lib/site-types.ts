export type RegionMeta = Record<string, { label?: string; name?: string }>;

export type Project = {
  id: string;
  name: string;
  region: string;
  city: string;
  location: string;
  segment: string;
  status: string;
  image: string;
  source: string;
  summary: string;
  address?: string;
  mapEmbedUrl?: string;
  overviewItems?: readonly ProjectOverviewItem[];
  highlights: readonly string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectOverviewItem = {
  label: string;
  value: string;
};

export type StoreCategory = {
  id: string;
  label: string;
  icon?: string;
};

export type StoreReview = {
  name: string;
  rating: number;
  comment: string;
  isAnonymous?: boolean;
  images?: Array<{ id: string; name: string; url: string }>;
};

export type StoreVoucher = {
  code: string;
  title?: string;
  description: string;
  expires: string;
  redeemCount?: number;
};

export type Store = {
  id: string;
  name: string;
  projectId: string;
  category: string;
  image: string;
  images?: readonly string[];
  floor: string;
  hours: string;
  phone: string;
  rating?: number;
  reviewCount?: number;
  note: string;
  address?: string;
  mapEmbedUrl?: string;
  detailContent?: string;
  vouchers?: readonly StoreVoucher[];
  reviews?: readonly StoreReview[];
  createdAt?: string;
  updatedAt?: string;
};

export type NewsItem = {
  id: string;
  title: string;
  projectId: string;
  region: string;
  date: string;
  category: string;
  hashtags: readonly string[];
  image: string;
  excerpt: string;
  content: readonly string[];
  contentHtml?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SiteHomeSettings = {
  logo?: string;
  headerLogo?: string;
  footerLogo?: string;
  metaTitle?: string;
  metaDescription?: string;
  headBannerImage?: string;
};

export type SiteData = {
  fallbackImage: string;
  homeSettings?: SiteHomeSettings;
  regionMeta: RegionMeta;
  projects: readonly Project[];
  storeCategories: readonly StoreCategory[];
  stores: readonly Store[];
  newsItems: readonly NewsItem[];
};
