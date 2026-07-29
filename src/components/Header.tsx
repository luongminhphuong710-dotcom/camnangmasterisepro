"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useState } from "react";

const defaultCommunityUrl = "https://www.facebook.com/groups/nhatoiomasterise/?ref=share&mibextid=wwXIfr&rdid=JJS7ZUwlGkdHCBA1&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fg%2F1ESLX4FN6y%2F%3Fmibextid%3DwwXIfr%26_rdc%3D2%26_rdr%23";

const navItems = [
  { href: "/gian-hang", label: "Gian hàng" },
  { href: "/du-an", label: "Dự án" },
  { href: "/tin-tuc", label: "Tin tức" },
];

export function Header({ communityUrl = defaultCommunityUrl, logoUrl }: { communityUrl?: string; logoUrl?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="camnangmasterise">
        <BrandLogo src={logoUrl} className="brand-wordmark-header" />
      </Link>

      <button
        className="menu-toggle"
        type="button"
        aria-label={isOpen ? "Đóng menu" : "Mở menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
      </button>

      <div className={`header-menu ${isOpen ? "open" : ""}`}>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <a href={communityUrl} target="_blank" rel="noreferrer" onClick={() => setIsOpen(false)}>
            Cộng đồng
          </a>
          <Link
            className="header-cta"
            href="/contact"
            aria-current={pathname === "/contact" ? "page" : undefined}
            onClick={() => setIsOpen(false)}
          >
            Đăng gian hàng
          </Link>
        </nav>
      </div>
    </header>
  );
}