# Đăng ký & duyệt gian hàng tự động

Luồng: **Google Form → Google Sheet (duyệt) → web**.

| Thành phần | Ở đâu |
|---|---|
| Thư mục Drive chung | https://drive.google.com/drive/folders/1B3lf-7at78zTn55XvGeslbXZ9aY-6ppW |
| Sheet duyệt | "Cẩm nang Masterise – Đăng ký & duyệt gian hàng" (`18JWqthDthQ_ojySAWKAC7BNuKDpVsmWAAJbgEVlu4gY`) |
| Form | "Đăng ký gian hàng – Cẩm nang Masterise", do `setup()` tạo trong cùng thư mục |
| Apps Script | gắn với Sheet (Tiện ích mở rộng → Apps Script). Bản gốc: `scripts/apps-script/store-submissions.gs` + `appsscript.json` |
| API web | `src/app/api/store-submissions/route.ts` |
| Bí mật dùng chung | biến môi trường Vercel `STORE_SYNC_SECRET` (sensitive) = `CONFIG.SYNC_SECRET` trong Apps Script |

## Cách hoạt động
1. Gian hàng gửi Form → câu trả lời vào tab "Dữ liệu Form (gốc)" → trigger `onStoreFormSubmit` chép sang tab **Duyệt gian hàng** (mã `GH-0001`…, Trạng thái `Chờ duyệt`) và gửi email báo về luongminhphuong710@gmail.com.
2. Phương sửa dòng nếu cần, đổi **Trạng thái = OK** → trigger `onReviewEdit` → `publishRow_`:
   - ảnh Google Drive được tải lên `?action=upload-image` (ảnh > 3,8 MB dùng bản thu nhỏ 1600px của Drive); link Cloudinary được nhớ trong Script Properties (`img:<driveId>`);
   - gọi `?action=publish` → web tạo/cập nhật dòng trong bảng `stores`, ghi mốc `store-submission:<mã>` trong `site_settings`, làm mới cache (`revalidateTag("site-data", { expire: 0 })` + các trang gian hàng/dự án);
   - Sheet ghi `Đã đăng`, ID, link, thời gian. Lỗi → `Lỗi` + lý do + email.
3. **Gỡ khỏi web** → `?action=unpublish` xóa gian hàng do dòng đó tạo.
4. Trigger 10 phút/lần (`processPendingRows`) xử lý dòng `OK` bị sót; trigger 6h hằng ngày (`refreshOptions`) cập nhật danh sách Dự án/Loại hình cho Form và Sheet từ `?action=options`.

## Quy tắc của API
- Mọi request cần header `x-store-sync-secret`. Thiếu biến môi trường → 503.
- Dự án nhận theo id hoặc tên; Loại hình theo id hoặc nhãn (bỏ qua `all`, `unassigned`). Sai → 400 kèm danh sách hợp lệ.
- ID gian hàng = slug của tên; trùng thì thêm `-<projectId>` hoặc số. Duyệt lại cùng một dòng = cập nhật đúng gian hàng đó; không đụng gian hàng tạo trong admin.
- Khi cập nhật: giữ nguyên đánh giá; giữ ảnh/ưu đãi cũ nếu dòng để trống.
- Link Google Maps (kể cả `maps.app.goo.gl`) được đổi sang dạng nhúng; không đổi được thì trang dùng bản đồ tìm theo tên + vị trí.
- Nội dung chi tiết = các đoạn "Giới thiệu chi tiết" + link fanpage + câu kết chuẩn của Cẩm nang.

## Cài đặt lại / đổi bí mật
1. Đặt `STORE_SYNC_SECRET` mới trên Vercel và triển khai lại.
2. Sửa `CONFIG.SYNC_SECRET` trong Apps Script cho khớp.
3. Chạy lại `setup()` nếu cần (không tạo Form mới khi `FORM_ID` còn trong Script Properties; trigger được cài lại).

## Giới hạn đã biết
- Apps Script không tạo được câu hỏi "Tải tệp lên", nên câu **"Ảnh gian hàng"** được thêm tay trong Form (đúng tên đó). Câu hỏi tải tệp bắt người điền đăng nhập Google; có câu "Link ảnh" dự phòng.
- Sheet đọc theo vị trí cột A–Y: không chèn/xóa cột giữa bảng.
