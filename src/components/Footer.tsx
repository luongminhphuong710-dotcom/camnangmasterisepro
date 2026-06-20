import Link from "next/link";
import { ChevronRight, Copyright, Globe2, Mail, MapPin, Music2, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="footer" id="contact">
      <div>
        <h3>Liên hệ</h3>
        <ul>
          <li className="flex items-center gap-2">
            <MapPin size={17} aria-hidden />
            Timecity - Hà Nội
          </li>
          <li className="flex items-center gap-2">
            <Phone size={17} aria-hidden />
            Hotline: 0988 458 783
          </li>
          <li className="flex items-center gap-2">
            <Mail size={17} aria-hidden />
            <a href="mailto:luongminhphuong710@gmail.com">luongminhphuong710@gmail.com</a>
          </li>
        </ul>
      </div>
      <div>
        <h3>Thông tin</h3>
        <ul>
          <li className="flex items-center gap-2">
            <ChevronRight size={16} aria-hidden />
            Giới thiệu
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={16} aria-hidden />
            <Link href="/news">Thông tin cần biết</Link>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight size={16} aria-hidden />
            <Link href="/contact">Liên hệ hợp tác</Link>
          </li>
        </ul>
      </div>
      <div>
        <h3>Theo dõi</h3>
        <ul>
          <li className="flex items-center gap-2">
            <Globe2 size={17} aria-hidden />
            Page: Cẩm Nang Masterise
          </li>
          <li className="flex items-center gap-2">
            <Music2 size={17} aria-hidden />
            TikTok: Cẩm Nang Masterise
          </li>
          <li className="flex items-center gap-2">
            <Copyright size={17} aria-hidden />
            Copyright 2026
          </li>
        </ul>
      </div>
    </footer>
  );
}
