"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/gian-hang", label: "Gian hàng" },
  { href: "/du-an", label: "Dự án" },
  { href: "/tin-tuc", label: "Tin Tức" },
];

export function Header({ logo = "" }: { logo?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Cẩm Nang Masterise">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Cẩm Nang Masterise" className="brand-logo-image" />
        ) : (
          <span className="brand-mark">CM</span>
        )}
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
