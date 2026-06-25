import { ExternalLink, Phone } from "lucide-react";
import { seoMetadata } from "@/lib/seo";

export const metadata = seoMetadata({
  title: "Liên hệ",
  description: "Gọi hotline hoặc theo dõi Facebook Cẩm Nang Masterise để được hỗ trợ nhanh chóng.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="contact-shell">
      <section className="contact-section">
        <div className="contact-intro">
          <p className="eyebrow">Liên hệ</p>
          <h1 className="h1">Cần hỗ trợ? Kết nối ngay với Cẩm Nang Masterise</h1>
          <p className="body-text">
            Để được tư vấn hoặc cập nhật thông tin mới nhất, vui lòng gọi hotline hoặc truy cập Facebook chính thức của
            Cẩm Nang Masterise.
          </p>
        </div>

        <div className="contact-methods">
          <p className="text-sm font-semibold uppercase tracking-[0.02em] text-masterise-primary">Kênh liên hệ</p>
          <h2 className="h3">Chọn cách thuận tiện nhất cho bạn</h2>
          <p className="body-text">
            Hotline hỗ trợ nhanh trong giờ làm việc. Facebook là nơi cập nhật thông tin dự án, tiện ích và dịch vụ cư dân.
          </p>
          <div className="contact-buttons">
            <a className="secondary-button w-full" href="tel:0988458783">
              <Phone size={17} aria-hidden />
              Gọi hotline
            </a>
            <a
              className="primary-button w-full"
              href="https://www.facebook.com/camnangmasterisehomes/"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={17} aria-hidden />
              Vào Facebook
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
