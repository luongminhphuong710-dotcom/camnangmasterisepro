"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronRight, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const defaultCommunityUrl = "https://www.facebook.com/groups/nhatoiomasterise/?ref=share&mibextid=wwXIfr&rdid=JJS7ZUwlGkdHCBA1&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1ESLX4FN6y%2F%3Fmibextid%3DwwXIfr%26_rdc%3D2%26_rdr%23";

type FooterProps = {
  communityUrl?: string;
  facebookUrl?: string;
  logoUrl?: string;
  contactAddress?: string;
  contactPhone?: string;
};

export function Footer({ communityUrl = defaultCommunityUrl, facebookUrl = communityUrl, logoUrl, contactAddress = "Timecity - Hà Nội", contactPhone = "0988 458 783" }: FooterProps) {
  const pathname = usePathname();
  const quickLinks = [
    { href: "/", label: "Trang chủ" },
    { href: "/du-an", label: "Dự án" },
    { href: "/gian-hang", label: "Gian hàng" },
    { href: "/tin-tuc", label: "Tin tức" },
    { href: communityUrl, label: "Cộng đồng", external: true },
    { href: "/contact", label: "Liên hệ" },
  ];

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="footer" id="contact">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="footer-logo-row" href="/" aria-label="camnangmasterise">
            <BrandLogo src={logoUrl} variant="dark" className="brand-wordmark-footer" />
          </Link>
          <p>Kênh tổng hợp thông tin dự án, tiện ích, gian hàng và dịch vụ quanh cộng đồng cư dân Masterise.</p>
        </div>

        <nav className="footer-column" aria-label="Liên kết nhanh">
          <h3>Khám phá</h3>
          <ul>
            {quickLinks.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a href={link.href} target="_blank" rel="noreferrer">
                    <ChevronRight size={16} aria-hidden />
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href}>
                    <ChevronRight size={16} aria-hidden />
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-column">
          <h3>Liên hệ</h3>
          <ul>
            <li><span><MapPin size={17} aria-hidden />{contactAddress}</span></li>
            <li><a href={`tel:${contactPhone.replace(/\s/g, "")}`}><Phone size={17} aria-hidden />Hotline: {contactPhone}</a></li>
            <li>
              <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Cộng đồng Facebook">
                <FacebookIcon />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Cẩm Nang Masterise. All rights reserved.</p>
        <span><Building2 size={16} aria-hidden />Masterise resident guide</span>
      </div>
    </footer>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden focusable="false">
      <path fill="currentColor" d="M13.75 21v-8h2.68l.4-3.12h-3.08V7.89c0-.9.25-1.52 1.55-1.52h1.66V3.58c-.29-.04-1.27-.12-2.42-.12-2.4 0-4.04 1.46-4.04 4.15v2.27H7.8V13h2.7v8h3.25Z" />
    </svg>
  );
}