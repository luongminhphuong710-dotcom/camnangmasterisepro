import { Mail, Phone, Send } from "lucide-react";

export const metadata = {
  title: "Liên hệ hợp tác",
  description: "Liên hệ hợp tác gian hàng, truyền thông và dịch vụ cư dân cùng Cẩm Nang Masterise.",
};

export default function ContactPage() {
  return (
    <main className="detail-shell">
      <section className="detail-hero">
        <div className="grid content-center gap-5">
          <p className="eyebrow">Liên hệ hợp tác</p>
          <h1 className="h1">Kết nối gian hàng và dịch vụ cư dân</h1>
          <p className="body-text">
            Gửi thông tin hợp tác để Cẩm Nang Masterise hỗ trợ hiển thị gian hàng, dịch vụ hoặc nội dung truyền thông
            phù hợp với từng dự án.
          </p>
          <div className="action-row max-w-xl">
            <a
              className="primary-button"
              href="mailto:luongminhphuong710@gmail.com?subject=Li%C3%AAn%20h%E1%BB%87%20h%E1%BB%A3p%20t%C3%A1c%20C%E1%BA%A9m%20Nang%20Masterise"
            >
              <Mail size={17} aria-hidden />
              Gửi email
            </a>
            <a className="secondary-button" href="tel:0988458783">
              <Phone size={17} aria-hidden />
              Gọi hotline
            </a>
          </div>
        </div>
        <form className="grid gap-3 rounded-lg bg-masterise-soft p-5">
          <input className="rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary" placeholder="Họ và tên" />
          <input className="rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary" placeholder="Số điện thoại" />
          <input className="rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary" placeholder="Email" />
          <select className="rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary" defaultValue="Gian hàng cư dân">
            <option>Gian hàng cư dân</option>
            <option>Truyền thông dự án</option>
            <option>Dịch vụ cư dân</option>
            <option>Liên hệ khác</option>
          </select>
          <textarea className="min-h-28 rounded-lg border border-masterise-line px-4 py-3 outline-masterise-primary" placeholder="Nội dung cần hỗ trợ" />
          <button className="primary-button justify-self-start" type="button">
            <Send size={17} aria-hidden />
            Gửi thông tin
          </button>
        </form>
      </section>
    </main>
  );
}
