import type { Metadata } from "next";
import { ProjectsClient } from "./ProjectsClient";
import { toProjectsClientData } from "@/lib/client-data";
import { getSiteData } from "@/lib/runtime-data";
import { seoMetadata } from "@/lib/seo";

export const metadata: Metadata = seoMetadata({
  title: "Dự án Masterise",
  description: "Khám phá danh sách dự án Masterise theo miền, tỉnh thành và phân khúc, kèm thông tin tiện ích và gian hàng cư dân.",
  path: "/du-an",
});

export default async function ProjectsPage() {
  const data = await getSiteData();
  return <ProjectsClient initialData={toProjectsClientData(data)} />;
}
