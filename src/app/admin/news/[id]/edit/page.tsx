import { AdminClient } from "../../../AdminClient";

type AdminNewsEditPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Chỉnh sửa bài viết | CMS Cẩm Nang Masterise",
};

export const dynamic = "force-dynamic";

export default async function AdminNewsEditPage({ params }: AdminNewsEditPageProps) {
  const { id } = await params;
  return <AdminClient initialSection="news" initialMode="edit" initialItemId={id} />;
}
