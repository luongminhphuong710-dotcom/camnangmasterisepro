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
5. Trigger mỗi giờ (`syncFromWeb`, cũng chạy cuối `setup()`) gọi `?action=list`: mọi gian hàng trên web có đúng 1 dòng (khớp cột V "ID trên web"). Gian hàng chưa có dòng → thêm dòng `Đã đăng`, mã `WEB-<id>`, Nguồn `Admin web`. Dòng `Đã đăng` mà web sửa sau cột X → chép nội dung từ web. Dòng `Đã đăng` mà web không còn → `Đã gỡ`. Dòng ở trạng thái khác không bị ghi đè.
6. Tab **Báo cáo** chỉ có công thức (locale vi_VN nên dấu phân cách là `;`): tổng quan trạng thái, thiếu thông tin, pivot theo dự án / loại hình, danh sách việc cần xử lý, danh sách gian hàng thiếu SĐT/mô tả.

## Quy tắc của API
- Mọi request cần header `x-store-sync-secret`. Thiếu biến môi trường → 503.
- Dự án nhận theo id hoặc tên; Loại hình theo id hoặc nhãn (bỏ qua `all`, `unassigned`). Sai → 400 kèm danh sách hợp lệ.
- ID gian hàng = slug của tên; trùng thì thêm `-<projectId>` hoặc số. Duyệt lại cùng một dòng = cập nhật đúng gian hàng đó.
- Gian hàng tạo trong admin: `publish`/`unpublish` gửi kèm `storeId` (cột V); nếu chưa dòng nào quản lý gian hàng đó thì dòng này nhận quản lý (ghi mốc). Gian hàng đã có dòng khác quản lý → lỗi 409.
- Khi cập nhật: giữ nguyên đánh giá; giữ ảnh cũ nếu ô ảnh trống; giữ HTML chi tiết nếu chữ trong ô Giới thiệu không đổi (so sánh sau khi bỏ thẻ HTML); giữ danh sách ưu đãi nếu ưu đãi đầu tiên không đổi, đổi thì thay ưu đãi đầu tiên.
- Link Google Maps (kể cả `maps.app.goo.gl`) được đổi sang dạng nhúng; không đổi được thì trang dùng bản đồ tìm theo tên + vị trí.
- Nội dung chi tiết = các đoạn "Giới thiệu chi tiết" + link fanpage + câu kết chuẩn của Cẩm nang.

## Cài đặt lại / đổi bí mật
1. Đặt `STORE_SYNC_SECRET` mới trên Vercel và triển khai lại.
2. Sửa `CONFIG.SYNC_SECRET` trong Apps Script cho khớp.
3. Chạy lại `setup()` nếu cần (không tạo Form mới khi `FORM_ID` còn trong Script Properties; trigger được cài lại).

## Giới hạn đã biết
- Apps Script không tạo được câu hỏi "Tải tệp lên", nên câu **"Ảnh gian hàng"** được thêm tay trong Form (đúng tên đó). Câu hỏi tải tệp bắt người điền đăng nhập Google; có câu "Link ảnh" dự phòng.
- Sheet đọc theo vị trí cột A–AB (Z Nguồn, AA Đánh giá TB, AB Số đánh giá): không chèn/xóa cột giữa bảng.
- Ô Ưu đãi chỉ chứa ưu đãi đầu tiên; xóa ưu đãi phải làm trong admin.
