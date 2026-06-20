"use client";

import { Check, ChevronLeft, ChevronRight, Copy, TicketPercent } from "lucide-react";
import { useState } from "react";

type Voucher = {
  code: string;
  title: string;
  description: string;
  expires: string;
};

type StoreVoucherTicketsProps = {
  storeName: string;
};

const vouchers: Voucher[] = [
  {
    code: "CUDAN10",
    title: "Giảm 10%",
    description: "Áp dụng cho cư dân khi sử dụng dịch vụ trực tiếp tại gian hàng.",
    expires: "Hết hạn cuối tháng",
  },
  {
    code: "MASTERI50",
    title: "Ưu đãi 50K",
    description: "Giảm trực tiếp cho hóa đơn từ 300K, tùy điều kiện từng thời điểm.",
    expires: "Số lượng có hạn",
  },
  {
    code: "WELCOME",
    title: "Quà chào mừng",
    description: "Nhận phần quà nhỏ khi ghé gian hàng lần đầu và xác nhận thông tin cư dân.",
    expires: "Áp dụng trong tuần",
  },
];

const vouchersPerPage = 3;

export function StoreVoucherTickets({ storeName }: StoreVoucherTicketsProps) {
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.ceil(vouchers.length / vouchersPerPage);
  const canPaginate = vouchers.length > vouchersPerPage;
  const visibleVouchers = vouchers.slice(pageIndex * vouchersPerPage, pageIndex * vouchersPerPage + vouchersPerPage);

  function goToPreviousPage() {
    setPageIndex((index) => (index === 0 ? pageCount - 1 : index - 1));
  }

  function goToNextPage() {
    setPageIndex((index) => (index === pageCount - 1 ? 0 : index + 1));
  }

  async function claimVoucher(code: string) {
    setClaimedCode(code);

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(code).catch(() => undefined);
    }
  }

  return (
    <div className="grid gap-3">
      {canPaginate ? (
        <div className="flex items-center justify-end gap-2">
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-masterise-primary text-masterise-primary transition hover:bg-masterise-primary hover:text-white focus:bg-masterise-primary focus:text-white focus:outline-none"
            type="button"
            aria-label="Xem ưu đãi trước"
            onClick={goToPreviousPage}
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-masterise-primary text-masterise-primary transition hover:bg-masterise-primary hover:text-white focus:bg-masterise-primary focus:text-white focus:outline-none"
            type="button"
            aria-label="Xem ưu đãi tiếp theo"
            onClick={goToNextPage}
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        {visibleVouchers.map((voucher) => {
          const isClaimed = claimedCode === voucher.code;

          return (
            <button
              key={voucher.code}
              className={`voucher-ticket text-left transition ${
                isClaimed ? "border-masterise-primary bg-masterise-soft" : "hover:border-masterise-primary"
              }`}
              type="button"
              aria-label={`Lấy mã ${voucher.code} tại ${storeName}`}
              onClick={() => void claimVoucher(voucher.code)}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="grid gap-1">
                  <span className="flex items-center gap-2 text-sm font-bold uppercase text-masterise-primary">
                    <TicketPercent size={17} aria-hidden />
                    Voucher
                  </span>
                  <strong className="text-xl leading-tight text-masterise-ink">{voucher.title}</strong>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-masterise-primary">
                  {isClaimed ? <Check size={18} aria-hidden /> : <Copy size={17} aria-hidden />}
                </span>
              </span>

              <span className="mt-3 block text-sm leading-[1.5] text-masterise-muted">{voucher.description}</span>

              <span className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-masterise-line pt-3">
                <span className="text-xs font-semibold text-masterise-muted">{voucher.expires}</span>
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-extrabold tracking-[0.08em] text-masterise-primary">
                  {isClaimed ? voucher.code : "LẤY MÃ"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
