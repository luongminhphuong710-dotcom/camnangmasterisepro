"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, UserRound, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/near-me", label: "Gần bạn" },
  { href: "/stores", label: "Gian hàng" },
  { href: "/projects", label: "Dự án" },
  { href: "/news", label: "Tin Tức" },
  { href: "/contact", label: "Liên hệ hợp tác" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="Cẩm Nang Masterise">
        <span className="brand-mark">CM</span>
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
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="icon-button" href="/projects" aria-label="Danh sách dự án">
            <UserRound size={20} aria-hidden />
          </Link>
          <a className="icon-button" href="tel:0988458783" aria-label="Gọi hotline">
            <Phone size={20} aria-hidden />
          </a>
        </div>
      </div>
    </header>
  );
}
