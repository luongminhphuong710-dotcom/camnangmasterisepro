import type { Metadata } from "next";
import { AdminClient } from "../AdminClient";

export const metadata: Metadata = {
  title: "CMS danh mục",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminCategoriesPage() {
  return <AdminClient initialSection="categories" />;
}
