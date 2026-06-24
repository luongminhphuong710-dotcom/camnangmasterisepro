import type { Metadata } from "next";
import { AdminClient } from "../AdminClient";

export const metadata: Metadata = {
  title: "CMS phân quyền",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPermissionsPage() {
  return <AdminClient initialSection="permissions" />;
}
