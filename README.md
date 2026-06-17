# Cẩm Nang Masterise

Website đã được chuẩn bị để chạy bằng stack mới:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 3
- ESLint
- Lucide React Icons

## Chạy local

Máy cần cài Node.js trước. Sau đó chạy:

```bash
npm install
npm run dev
```

Build kiểm tra trước khi deploy:

```bash
npm run lint
npm run build
```

## Cấu trúc chính

- `src/app`: App Router của Next.js.
- `src/components`: Header, Footer, card dự án, card gian hàng, dropdown theme.
- `src/lib/data.ts`: dữ liệu dự án, gian hàng, tin tức chuyển từ bản static cũ.
- `src/app/globals.css`: Tailwind CSS và theme Masterise.

Các file HTML/CSS/JS cũ vẫn được giữ lại trong repo để đối chiếu trong giai đoạn chuyển nền.
