import { AdminClient } from "../AdminClient";

export const metadata = {
  title: "CMS Tin tức | Cẩm Nang Masterise",
};

export const dynamic = "force-dynamic";

export default function AdminNewsPage() {
  return <AdminClient initialSection="news" />;
}
