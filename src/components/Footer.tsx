"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronRight, ExternalLink, Globe2, MapPin, Phone } from "lucide-react";

export function Footer({ logo = "" }: { logo?: string }) {
  const pathname = usePathname();
  const quickLinks = [
    { href: "/", label: "Trang chủ" },
    { href: "/du-an", label: "Dự án" },
    { href: "/gian-hang", label: "Gian hàng" },
    { href: "/contact", label: "Liên hệ" },
  ];

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="footer" id="contact">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="footer-logo-row" href="/">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Cẩm Nang Masterise" className="footer-logo-image" />
            ) : (
              <span className="footer-logo">CM</span>
            )}
          </Link>
          <p>
            Kênh tổng hợp thông tin dự án, tiện ích, gian hàng và dịch vụ quanh cộng đồng cư dân Masterise.
          </p>
          <div className="footer-actions">
            <a className="footer-action primary" href="tel:0988458783">
              <Phone size={17} aria-hidden />
              Gọi hotline
            </a>
            <a
              className="footer-action"
              href="https://www.facebook.com/camnangmasterisehomes/"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={17} aria-hidden />
              Facebook
            </a>
          </div>
        </div>

        <nav className="footer-column" aria-label="Liên kết nhanh">
          <h3>Khám phá</h3>
          <ul>
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
                  <ChevronRight size={16} aria-hidden />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-column">
          <h3>Liên hệ</h3>
          <ul>
            <li>
              <span>
                <MapPin size={17} aria-hidden />
                Timecity - Hà Nội
              </span>
            </li>
            <li>
              <a href="tel:0988458783">
                <Phone size={17} aria-hidden />
                Hotline: 0988 458 783
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/camnangmasterisehomes/" target="_blank" rel="noreferrer">
                <Globe2 size={17} aria-hidden />
                Page: Cẩm Nang Masterise
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Cẩm Nang Masterise. All rights reserved.</p>
        <span>
          <Building2 size={16} aria-hidden />
          Masterise resident guide
        </span>
      </div>
    </footer>
  );
}
