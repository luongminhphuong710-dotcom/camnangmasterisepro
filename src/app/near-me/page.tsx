import type { Metadata } from "next";
import { NearMeClient } from "./NearMeClient";
import { getSiteData } from "@/lib/runtime-data";
import { seoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = seoMetadata({
  title: "Dịch vụ gần bạn",
  description: "Tìm nhanh các gian hàng và dịch vụ tiện ích gần khu vực dự án Masterise của bạn.",
  path: "/near-me",
});

export default async function NearMePage() {
  const data = await getSiteData();
  return <NearMeClient initialData={data} />;
}
