import type { Metadata } from "next";
import { AdminClient } from "../../AdminClient";

export const metadata: Metadata = {
  title: "CMS xem dự án",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminClient initialSection="projects" initialMode="view" initialItemId={id} />;
}
