import type { Metadata } from "next";
import { AdminClient } from "../AdminClient";

export const metadata: Metadata = {
  title: "CMS gian hàng",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminStoresPage() {
  return <AdminClient initialSection="stores" />;
}
