# Quy trình tự động đăng tin tức – Cẩm nang Masterise

Tài liệu này là hướng dẫn vận hành cho các lịch chạy tự động của Claude. Mỗi lần chạy, đọc toàn bộ file này rồi làm đúng phần được giao (Phần A hoặc Phần B). Chủ web: Phương (luongminhphuong710@gmail.com). Mọi nội dung gửi cho Phương và mọi bài đăng viết bằng tiếng Việt.

## 1. Thông tin hệ thống

| Mục | Giá trị |
|---|---|
| Web | https://www.camnangmasterise.vn (bài tin: `/tin-tuc/<id>`) |
| Repo GitHub | `luongminhphuong710-dotcom/camnangmasterisepro`, nhánh `main` (push lên `main` là Vercel tự triển khai) |
| Vercel | project `prj_Qjb9G8qsq3YCL7uKpmYT35qPuL6E`, team `team_n1uN7ZCOkXCsWQ0XacsCR7pa` |
| Google Sheet quản lý | ID `18EMedXCIq7qqRf2lna7cTkcdWUDuDjtojyVckaEESkU` |
| Múi giờ | Asia/Bangkok (UTC+7). "Hôm nay" luôn tính theo giờ Việt Nam |

### Các tab trong Google Sheet

- **Duyệt kế hoạch** (A:E): Tháng (`MM/YYYY`) | Ngày gửi | Số bài | Trạng thái (`Chờ duyệt` / `OK` / `Cần sửa`) | Góp ý của bạn
- **Kế hoạch tháng** (A:H): Tháng | Ngày đăng (`dd/mm/yyyy`) | Chủ đề bài | Từ khóa SEO chính | Dự án liên quan | Góc khai thác | Trạng thái (`Chưa đăng` / `Đã đăng` / `Bỏ qua`) | Link bài
- **Bài từ thông tin của tôi** (A:G): Ngày gửi | Thông tin / link tài liệu | Dự án liên quan | Bản nháp (link Google Doc) | Trạng thái (`Mới` / `Chờ duyệt` / `OK` / `Cần sửa` / `Đã đăng`) | Góp ý của bạn | Link bài đã đăng
- **Nhật ký đăng bài** (A:E): Ngày đăng | Tiêu đề | Link bài | Nguồn tham khảo | Loại bài (`Tin báo chí` / `Thông tin của Phương`)

Khi ghi ngày hoặc tháng vào Sheet, thêm dấu `'` phía trước (ví dụ `'15/11/2026`, `'11/2026`) để Sheets giữ dạng chữ. Chỉ thêm dòng mới hoặc sửa đúng ô cần sửa; không xóa dòng của Phương.

## 2. Nguồn tin

Chỉ dùng báo chí chính thống và kênh chính thức:

- Báo: VnExpress, Tuổi Trẻ, Thanh Niên, Dân trí, VietnamPlus (TTXVN), VnEconomy, Báo Đầu tư / Nhịp cầu Đầu tư, CafeF, CafeLand, ZNews, Người Lao Động, Tiền Phong, Lao Động, Thời báo Kinh tế Sài Gòn, Báo Xây dựng, Diễn đàn Doanh nghiệp, Vietnam Investment Review.
- Kênh chính thức: masterisehomes.com, masterisegroup.com.
- Không dùng: diễn đàn, mạng xã hội, trang rao vặt, trang môi giới tự đăng, trang tổng hợp không rõ tác giả.

Từ khóa tìm (tìm riêng từng cụm): "Masterise Homes", "Masterise Group", "Masterise" + tên từng dự án đang có trên web (lấy danh sách ở mục 4), "Masteri", "LUMIÈRE", "The Global City", "Grand Marina Saigon". Ưu tiên tin trong 48 giờ gần nhất, tối đa 7 ngày.

## 3. Quy tắc viết bài

**Bản quyền và độ chính xác (bắt buộc):**
- Viết bài mới hoàn toàn bằng lời của mình. Tổng hợp dữ kiện từ ít nhất 2 nguồn khi có thể. Không chép câu, không giữ nguyên bố cục hay trình tự đoạn của bài gốc. Trích dẫn trực tiếp tối đa 1 câu ngắn (dưới 15 từ) mỗi nguồn, đặt trong ngoặc kép và ghi rõ nguồn.
- Chỉ đưa số liệu (giá, tiến độ, diện tích, ngày tháng, chính sách) khi nguồn ghi rõ. Không suy đoán, không hứa hẹn lợi nhuận, không viết như quảng cáo bán hàng.
- Cuối bài luôn có mục "Nguồn tham khảo" liệt kê tên báo và link bài gốc.
**Ảnh đại diện (Phương chốt 15/11/2026):**
- Mỗi bài dùng một ảnh mới, không trùng ảnh của bài đã đăng (kể cả ảnh dự án đang dùng cho bài khác). `check-news-queue.mjs` báo lỗi nếu trùng.
- Lấy ảnh trong chính các nguồn thông tin của bài, theo thứ tự ưu tiên:
  1. Kênh chính thức của chủ đầu tư hoặc đơn vị liên quan: masterisehomes.com (ảnh og:image hoặc ảnh trong bài), trang dự án, thông cáo báo chí của Masterise, trang của trường/đối tác được nói tới trong bài.
  2. Ảnh trong bài báo nguồn **chỉ khi** chú thích ghi ảnh do chủ đầu tư/đơn vị cung cấp (ví dụ "Ảnh: Masterise Homes", "Ảnh: King's College Wimbledon TP.HCM"). Không dùng ảnh do phóng viên/báo tự chụp (ghi "Ảnh: <tên phóng viên>", "Ảnh: VnExpress"...) hoặc ảnh không rõ nguồn.
  3. Nếu nguồn không có ảnh phù hợp: dùng ảnh trong gallery dự án trên web (mục 4) mà chưa bài nào dùng.
- Lấy URL ảnh bằng WebFetch trang nguồn (hỏi danh sách og:image và img trong bài kèm chú thích). Ghi `imageCredit` (đơn vị sở hữu ảnh) trong bài ở hàng chờ, và thêm dòng `<p><em>Ảnh: <đơn vị></em></p>` ngay trước mục "Nguồn tham khảo".
- Host của ảnh phải có trong `images.remotePatterns` của `next.config.ts`; nếu chưa có thì thêm host đó trong cùng commit (`check-news-queue.mjs` báo lỗi nếu thiếu).
- Đổi ảnh bài đã đăng: sửa `image` trong hàng chờ và thêm `"replacesImage": "<URL ảnh cũ>"`. Khi triển khai, web chỉ thay ảnh nếu ảnh trong database vẫn là ảnh cũ (ảnh đã sửa trong admin được giữ nguyên).
- Ảnh Phương gửi trong chat (infographic, ảnh chủ đầu tư phát hành): lưu vào `public/anh-bai-viet/<id-bài>.jpg` (rộng 1600px, JPEG ~85%), đặt `"image": "/anh-bai-viet/<file>"`. Ảnh nằm trên chính web nên không phụ thuộc host ngoài. Không dùng thư mục `public/news/` vì `/news/*` được chuyển hướng sang `/tin-tuc/*`.

**Sửa lại bài đã đăng (nội dung, tiêu đề, ảnh):** giữ nguyên `id` (link bài không đổi), sửa các trường trong hàng chờ và thêm `"revision": 2` (lần sửa sau tăng lên 3, 4...). Khi triển khai, web ghi đè tiêu đề, tóm tắt, nội dung, ảnh, hashtag, dự án của bài đúng một lần cho mỗi số revision (mốc `news-revision:<id>` trong `site_settings`). Lưu ý: thao tác này ghi đè cả chỉnh sửa đã làm trong admin. Cập nhật tab "Kế hoạch tháng" và "Nhật ký đăng bài" theo tiêu đề mới.

**Chuẩn SEO:**
- Tiêu đề 50–70 ký tự, chứa từ khóa chính ở đầu, không giật tít, không viết hoa toàn bộ.
- `excerpt` 120–160 ký tự (dùng làm meta description), chứa từ khóa chính, tóm đúng ý chính.
- `id` là slug không dấu, chữ thường, nối bằng gạch ngang, 4–10 từ, chứa từ khóa chính (ví dụ `masterise-homes-khoi-cong-masteri-grand-coast-giai-doan-2`). Không trùng id đã có.
- Thân bài 700–1.200 từ: mở bài 2–3 câu nêu thông tin chính (có từ khóa chính); 3–5 mục `<h2>`, có thể thêm `<h3>`; đoạn văn ngắn 2–4 câu; dùng `<ul>`/`<li>` cho danh sách; có ít nhất 1 liên kết nội bộ tới trang dự án trên web (`https://www.camnangmasterise.vn/du-an/<projectId>`) hoặc trang tin liên quan; kết bài tóm tắt ý chính cho cư dân/khách hàng.
- Không dùng `<h1>`, `<script>`, `<style>`, `<iframe>`, thuộc tính `style` hay `on...`. Chỉ dùng `<p> <h2> <h3> <ul> <ol> <li> <strong> <em> <a> <blockquote>`.
- `hashtags`: 3–6 thẻ dạng `#masterise-homes`, `#ten-du-an`.

## 4. Dữ liệu web hiện có

Lấy dữ liệu đang chạy trên web:
1. `list_deployments` (Vercel) với project và team ở mục 1, `target: production`, `state: READY`, `limit: 1` → lấy `url`.
2. `web_fetch_vercel_url` với `https://<url>/api/site-data`. Kết quả lớn sẽ được lưu ra file; đọc bằng Python: `json.loads(w["text"])["data"]`.
3. Dùng `projects` (id, name, region, image, ảnh gallery) để chọn `projectId`, `region` và ảnh đại diện. Dùng `newsItems` (id, title) để tránh trùng chủ đề và trùng id.

## 5. Định dạng một bài trong hàng chờ

Bài được đăng bằng cách thêm một phần tử vào cuối mảng trong `src/content/news-queue.json`. Khi Vercel triển khai, web tự nhập bài vào database đúng một lần (sau đó Phương sửa/xóa trong admin bình thường).

```json
{
  "id": "slug-khong-dau",
  "title": "Tiêu đề 50–70 ký tự",
  "projectId": "id-du-an-tren-web hoặc chuỗi rỗng",
  "region": "north | central | south | chuỗi rỗng",
  "date": "dd/mm/yyyy (ngày đăng, giờ Việt Nam)",
  "category": "Tin tức",
  "hashtags": ["#masterise-homes"],
  "image": "https://... (ảnh mới lấy từ nguồn, xem mục 3)",
  "imageCredit": "Masterise Homes",
  "excerpt": "120–160 ký tự",
  "contentHtml": "<p>...</p><h2>...</h2>..."
}
```

## 6. Quy trình đăng bài (dùng chung)

1. Chuẩn bị repo: nếu chưa có thư mục repo, gọi `add_repo` (owner `luongminhphuong710-dotcom`, repo `camnangmasterisepro`, access `push`) rồi clone theo hướng dẫn trả về. Nếu đã có, `git pull --ff-only` (hoặc fetch `--depth=5` rồi rebase).
2. Thêm bài vào cuối `src/content/news-queue.json` (giữ JSON hợp lệ, UTF-8, thụt lề 2 dấu cách).
3. Chạy `node scripts/check-news-queue.mjs`. Lỗi thì sửa bài rồi chạy lại.
4. Commit với message `Đăng tin: <tiêu đề>` (kèm dòng attribution nếu phiên yêu cầu) và push lên `main` bằng `git -c push.negotiate=true push origin main`.
5. Chờ Vercel: gọi `list_deployments` lọc theo `sha` của commit, lặp lại mỗi ~60 giây (tối đa ~10 phút) đến khi `READY` hoặc `ERROR`.
   - `ERROR`: đọc log build bằng `list_deployment_events` (`builds: 1`), sửa nếu lỗi do bài vừa thêm và push lại; nếu không sửa được, `git revert` commit đó, push, và báo lỗi trong email.
6. Kiểm tra: `web_fetch_vercel_url` mở `https://<url deployment>/tin-tuc/<id>` và xác nhận tiêu đề bài xuất hiện.
7. Link gửi Phương: `https://www.camnangmasterise.vn/tin-tuc/<id>`.
8. Ghi một dòng vào tab **Nhật ký đăng bài**.

## 7. Phần A – Lập kế hoạch tháng (chạy ngày 1 hàng tháng)

1. Đọc tab **Duyệt kế hoạch** và **Kế hoạch tháng**. Nếu tháng này đã có kế hoạch, không tạo lại: chỉ nhắc lại trạng thái trong email.
2. Tìm tin mới nhất (mục 2) và xem dữ liệu web (mục 4) để biết dự án, sự kiện, mốc tiến độ đáng chú ý trong tháng.
3. Lập kế hoạch mỗi ngày 1 bài cho tất cả các ngày còn lại của tháng (kể cả ngày hôm nay). Trộn các nhóm: tin doanh nghiệp/tập đoàn, tiến độ và bàn giao dự án, chính sách bán hàng (chỉ khi có nguồn), tiện ích và cộng đồng cư dân, thị trường bất động sản liên quan đến Masterise, cẩm nang cho cư dân. Mỗi dự án đang có trên web xuất hiện ít nhất một lần nếu có thông tin. Không lặp chủ đề đã đăng trong 30 ngày (xem Nhật ký).
4. Ghi vào tab **Kế hoạch tháng**: mỗi ngày một dòng, Trạng thái `Chưa đăng`.
5. Thêm một dòng ở **Duyệt kế hoạch**: Tháng, Ngày gửi, Số bài, Trạng thái `Chờ duyệt`.
6. Kết thúc bằng email (mục 10).

**Sửa kế hoạch:** nếu một tháng có Trạng thái `Cần sửa`, đọc Góp ý, sửa các dòng tương ứng trong Kế hoạch tháng, đặt lại Trạng thái `Chờ duyệt`, ghi "Đã sửa theo góp ý ngày dd/mm" vào cột Góp ý (giữ nguyên góp ý cũ phía trước) và báo trong email.

## 8. Phần B – Chạy hằng ngày

Làm theo thứ tự:

1. **Kế hoạch tháng bị yêu cầu sửa:** xử lý như mục 7, phần "Sửa kế hoạch".
2. **Tháng mới chưa có kế hoạch** (hôm nay sau ngày 1 mà chưa có dòng của tháng này): làm Phần A.
3. **Bài từ thông tin của Phương** (tab Bài từ thông tin của tôi):
   - Dòng `Mới`: đọc thông tin/link (link Google Drive thì đọc bằng Drive). Viết bài theo mục 3 (nguồn là thông tin Phương cung cấp; nếu bổ sung từ báo thì ghi nguồn). Tạo Google Doc bản nháp bằng Drive `create_file` (tải lên HTML, `contentMimeType: text/html`, tiêu đề `[Nháp] <tiêu đề>`), trong đó ghi rõ tiêu đề, excerpt, id, dự án, ảnh dự kiến và thân bài. Ghi link Doc vào cột Bản nháp, đổi Trạng thái thành `Chờ duyệt`.
   - Dòng `Cần sửa`: sửa bản nháp theo góp ý (cập nhật Doc cũ hoặc tạo Doc mới và thay link), đổi lại `Chờ duyệt`.
   - Dòng `OK`: đăng bài theo mục 6 dùng nội dung bản nháp mới nhất (đọc lại Doc, vì Phương có thể đã sửa trực tiếp). Ghi link vào cột Link bài đã đăng, đổi Trạng thái `Đã đăng`, Nhật ký ghi Loại bài `Thông tin của Phương`.
   - Bài loại này không tính vào chỉ tiêu 1 bài báo chí mỗi ngày.
4. **Bài tin tức hằng ngày:** chỉ làm khi kế hoạch của tháng hiện tại có Trạng thái `OK`.
   - Nếu Nhật ký đã có bài `Tin báo chí` của hôm nay thì bỏ qua (không đăng 2 bài).
   - Tìm tin mới (mục 2). Nếu có tin quan trọng trong 48 giờ chưa được đăng (so với Nhật ký và `newsItems`), viết về tin đó và ghi vào cột Góc khai thác của dòng hôm nay: "Thay bằng tin mới: <tiêu đề>".
   - Nếu không có, viết theo dòng kế hoạch của hôm nay, dùng thông tin mới nhất từ nguồn uy tín.
   - Đăng theo mục 6. Cập nhật dòng kế hoạch: Trạng thái `Đã đăng`, Link bài.
   - Nếu không tìm được đủ nguồn đáng tin để viết đúng sự thật, không đăng bài bịa; đặt dòng kế hoạch `Bỏ qua` và giải thích trong email.
5. Kết thúc bằng email (mục 10).

## 9. Khi gặp lỗi

- Không đọc/ghi được Google Sheet, không push được repo, hoặc Vercel lỗi: dừng phần bị ảnh hưởng, vẫn làm các phần khác, và báo rõ trong email (bước nào lỗi, thông báo lỗi, việc Phương cần làm).
- Không bao giờ sửa code web ngoài `src/content/news-queue.json`, trừ khi cần revert commit của chính lần chạy này.
- Không xóa bài đã có, không sửa dữ liệu dự án/gian hàng.

## 10. Email báo cáo

Câu trả lời cuối cùng của mỗi lần chạy được gửi vào email của Phương, nên viết như một email ngắn, tiếng Việt, không markdown phức tạp:

- Dòng đầu là tiêu đề: `[Cẩm nang Masterise] <việc chính hôm nay>` (ví dụ `Đã đăng bài mới 15/11`, `Kế hoạch tháng 12/2026 chờ duyệt`, `1 bài nháp chờ duyệt`).
- Bài đã đăng: tiêu đề + link `https://www.camnangmasterise.vn/tin-tuc/<id>` + 1 câu tóm tắt + nguồn tham khảo.
- Bản nháp chờ duyệt: tiêu đề + link Google Doc + nhắc "Đổi Trạng thái thành OK trong Sheet để đăng".
- Kế hoạch chờ duyệt: số bài, 5 chủ đề tiêu biểu, nhắc "Đổi Trạng thái thành OK ở tab Duyệt kế hoạch".
- Link Google Sheet: https://docs.google.com/spreadsheets/d/18EMedXCIq7qqRf2lna7cTkcdWUDuDjtojyVckaEESkU/edit
- Lỗi (nếu có) và việc Phương cần làm.
