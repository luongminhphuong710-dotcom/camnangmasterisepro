# Cẩm Nang Masterise

Website đã được chuẩn bị để chạy bằng stack mới:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 3
- ESLint
- Lucide React Icons
- Vercel Route Handlers cho CMS

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
- `src/app/admin`: CMS quản trị nội dung.
- `src/app/api/cms`: API đăng nhập, đọc dữ liệu và lưu dữ liệu qua GitHub.
- `src/components`: Header, Footer, card dự án, card gian hàng, dropdown theme.
- `src/lib/data.ts`: nguồn dữ liệu chính cho dự án, gian hàng, danh mục và tin tức.
- `src/app/globals.css`: Tailwind CSS và theme Masterise.

## CMS

CMS chạy tại:

```bash
http://localhost:3000/admin
```

Khi deploy lên Vercel, cần cấu hình các biến môi trường trong `.env.example`. Biến `CMS_DATA_PATH` đang trỏ về `src/lib/data.ts`, đây là nguồn dữ liệu chính của bản Next.js.
