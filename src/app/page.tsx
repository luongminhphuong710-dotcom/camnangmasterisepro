import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { camnangData } from "@/lib/data";
import { toHomeClientData } from "@/lib/client-data";
import { getSiteData } from "@/lib/runtime-data";
import { jsonLd, seoMetadata, siteName, siteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();
  const settings = data.homeSettings || camnangData.homeSettings;
  const title = settings.metaTitle || camnangData.homeSettings.metaTitle;
  const description = settings.metaDescription || camnangData.homeSettings.metaDescription;
  const image = settings.headBannerImage || camnangData.homeSettings.headBannerImage;

  return {
    ...seoMetadata({ title, description, path: "/", image }),
    title: { absolute: title },
  };
}

export default async function Page() {
  const data = await getSiteData();

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteJsonLd) }} />
      <HomeClient initialData={toHomeClientData(data)} />
    </>
  );
}
