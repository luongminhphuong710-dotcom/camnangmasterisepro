import type { Metadata } from "next";
import { AdminClient } from "../../../AdminClient";

export const metadata: Metadata = {
  title: "CMS chỉnh sửa dự án",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminClient initialSection="projects" initialMode="edit" initialItemId={id} />;
}
