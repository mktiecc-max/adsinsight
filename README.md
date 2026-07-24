# AdsInsight

Ứng dụng nội bộ trên Next.js 15 App Router, báo cáo và phân tích hiệu suất Facebook Ads theo chuỗi:

`Chi tiêu → Tin nhắn → SĐT → Bậc 1–4`

Mục tiêu quan trọng nhất là đọc CPSQL cùng chất lượng lead để phát hiện “bẫy số rẻ”.

## Chạy ngay

Yêu cầu Node.js 20+.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Khi chưa có `.env.local`, ứng dụng tự chạy bằng dữ liệu demo và toàn bộ màn hình vẫn tương tác được. Mỗi màn hình hiển thị rõ đang dùng **Dữ liệu thật**, **Dữ liệu demo** hay nguồn đang lỗi.

## Chức năng

- Tổng quan: KPI, so kỳ trước, phễu trách nhiệm, xu hướng, ma trận 2 trục, diễn giải.
- Hiệu suất: lọc, tìm, sắp xếp, chọn cột, xuất CSV, dòng cỡ mẫu nhỏ, drawer chẩn đoán.
- Phễu & chất lượng: chuyển đổi, phân bố bậc, organic và sức khỏe dữ liệu.
- Cảnh báo: lọc mức độ, bằng chứng so trung vị, hành động, bỏ qua 7 ngày.
- Lead: tìm SĐT mọi định dạng, sao chép, lọc trạng thái, xuất CSV.
- Đồng bộ: chạy thử/ghi, tiến trình, hủy và nhật ký (mô phỏng trong demo).
- Cài đặt: kết nối Sheet, xem trước, ánh xạ trường, quy đổi bậc và ngưỡng chung.
- Đăng nhập Supabase magic link khi có biến môi trường.
- Live-data repository: API báo cáo, phễu, cảnh báo và lead tự đọc Supabase khi đủ server credentials.
- Google Sheets inspector: đọc metadata, header và 5 dòng mẫu bằng OAuth Service Account phía server.

## Kết nối Supabase

Hướng dẫn triển khai chi tiết:

- [Kết nối Supabase](docs/SUPABASE_SETUP.md)
- [Deploy và kết nối Vercel](docs/VERCEL_SETUP.md)

Sao chép `.env.example` thành `.env.local`, điền URL, publishable key và secret key. Secret key chỉ dùng phía server, tuyệt đối không đặt dưới tiền tố `NEXT_PUBLIC_`.

`ADSINSIGHT_DATA_MODE` hỗ trợ:

- `auto`: dùng live khi có đủ Supabase credentials, nếu không dùng demo.
- `demo`: luôn dùng dữ liệu mẫu.
- `live`: dành cho môi trường production đã cấu hình đủ secrets.

Schema nguồn nằm tại `supabase/schema.sql`; dữ liệu seed nằm tại `supabase/seed.sql`. Do schema chưa gắn với một Supabase project cụ thể, hãy tạo migration bằng CLI trong project của bạn rồi chép nội dung schema vào migration đó, hoặc chạy trực tiếp qua SQL Editor. Sau khi áp dụng:

1. Chạy `supabase/seed.sql`.
2. Đặt `app_metadata.role = "admin"` cho tài khoản được vào Đồng bộ/Cài đặt.
3. Share ba Google Sheet cho email Service Account với quyền Viewer.
4. Điền `GOOGLE_SERVICE_ACCOUNT_B64`.

Tạo giá trị `GOOGLE_SERVICE_ACCOUNT_B64` bằng cách mã hóa base64 toàn bộ file JSON Service Account. JSON được giải mã và ký JWT chỉ trên server; trình duyệt không nhận private key.

Các bảng public đã bật RLS. Người dùng đăng nhập chỉ có quyền đọc báo cáo; ghi cấu hình và nhật ký yêu cầu vai trò `admin`. Materialized view chỉ cấp cho `service_role`.

## Kiểm tra

```bash
npm run typecheck
npm run build
```

API tại `app/api` có fallback demo. Các route báo cáo, lead, nguồn cấu hình và inspect Google Sheet đã hỗ trợ live mode. State machine đồng bộ hiện chạy qua API và vẫn dùng store demo; worker ghi dữ liệu Google Sheets → staging → bảng fact sẽ là bước triển khai tiếp theo khi có project Supabase và cấu trúc Sheet thật để kiểm chứng mapping.
