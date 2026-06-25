import { AdminClient } from "../../AdminClient";

type AdminNewsDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Chi tiết bài viết | CMS Cẩm Nang Masterise",
};

export const dynamic = "force-dynamic";

export default async function AdminNewsDetailPage({ params }: AdminNewsDetailPageProps) {
  const { id } = await params;
  return <AdminClient initialSection="news" initialMode="view" initialItemId={id} />;
}
