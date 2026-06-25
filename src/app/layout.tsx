import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getSiteData } from "@/lib/runtime-data";
import { siteUrl } from "@/lib/seo";
import "quill/dist/quill.snow.css";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cẩm Nang Masterise | Nhà tôi ở Masterise",
    template: "%s | Cẩm Nang Masterise",
  },
  description:
    "Cẩm nang cư dân Masterise: tra cứu dự án theo miền, thông tin dự án, gian hàng và tin tức cần biết.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const data = await getSiteData();
  const headerLogo = data.homeSettings?.headerLogo || data.homeSettings?.logo || "";
  const footerLogo = data.homeSettings?.footerLogo || data.homeSettings?.logo || "";

  return (
    <html lang="vi">
      <body className={beVietnamPro.variable}>
        <Header logo={headerLogo} />
        {children}
        <Footer logo={footerLogo} />
      </body>
    </html>
  );
}
