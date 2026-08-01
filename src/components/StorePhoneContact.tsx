"use client";

import { Check, Copy, Phone, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type StorePhoneContactProps = {
  storeName: string;
  phone: string;
  className?: string;
};

export function StorePhoneContact({ storeName, phone, className = "primary-button" }: StorePhoneContactProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const phoneHref = `tel:${phone.replace(/\s/g, "")}`;

  useEffect(() => {
    if (!isCopied) return;
    const timeout = window.setTimeout(() => setIsCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(phone);
    } catch {
      const input = document.createElement("textarea");
      input.value = phone;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setIsCopied(true);
  }

  return (
    <>
      <a className={`${className} store-phone-mobile`} href={phoneHref}>
        <Phone size={17} aria-hidden />
        Gọi điện
      </a>
      <button className={`${className} store-phone-desktop`} type="button" onClick={() => setIsOpen(true)}>
        <Phone size={17} aria-hidden />
        Gọi điện
      </button>

      {isOpen && typeof document !== "undefined" ? createPortal((
        <div className="store-phone-modal" role="dialog" aria-modal="true" aria-labelledby="store-phone-modal-title" onClick={() => setIsOpen(false)}>
          <div className="store-phone-modal-card" onClick={(event) => event.stopPropagation()}>
            <button className="store-phone-modal-close" type="button" onClick={() => setIsOpen(false)} aria-label="Đóng popup">
              <X size={18} aria-hidden />
            </button>
            <span className="store-phone-modal-icon"><Phone size={22} aria-hidden /></span>
            <p>Số điện thoại gian hàng</p>
            <h2 id="store-phone-modal-title">{storeName}</h2>
            <div className="store-phone-modal-number">
              <strong>{phone}</strong>
              <button className="store-phone-modal-copy" type="button" onClick={copyPhone} aria-label="Sao chép số điện thoại">
                {isCopied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      ), document.body) : null}
    </>
  );
}