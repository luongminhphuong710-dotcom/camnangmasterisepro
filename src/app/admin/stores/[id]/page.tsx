import type { Metadata } from "next";
import { AdminClient } from "../../AdminClient";

export const metadata: Metadata = {
  title: "CMS xem gian hàng",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminStoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminClient initialSection="stores" initialMode="view" initialItemId={id} />;
}
