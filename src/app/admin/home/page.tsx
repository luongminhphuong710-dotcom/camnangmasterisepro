import { AdminClient } from "../AdminClient";

export const metadata = {
  title: "CMS Trang home | Cẩm Nang Masterise",
};

export default function AdminHomePage() {
  return <AdminClient initialSection="home" />;
}
