# Cài Supabase thủ công cho AdsInsight

Các file được thiết kế để chạy trong **Supabase Dashboard → SQL Editor**.

## Thứ tự chạy

1. Chạy toàn bộ `../schema.sql`.
2. Chạy toàn bộ `../seed.sql`.
3. Tạo user trong **Authentication → Users**, hoặc đăng nhập Magic Link một lần.
4. Mở `03_make_admin.sql`, thay đúng email rồi chạy.
5. Chạy `04_verify_setup.sql`. Tất cả dòng kiểm tra phải có `status = OK`.
6. Tùy chọn: chạy `05_smoke_test.sql`. Script tự `ROLLBACK`, không để lại dữ liệu thử.

`schema.sql` và `seed.sql` có thể chạy lại. Policy được xóa/tạo lại và seed dùng
`ON CONFLICT`, nên không sinh bản ghi cấu hình trùng.

## Biến môi trường ứng dụng

Sao chép file `.env.example` ở thư mục gốc thành `.env.local`, sau đó điền:

```dotenv
ADSINSIGHT_DATA_MODE=live
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
GOOGLE_SERVICE_ACCOUNT_B64=YOUR_BASE64_SERVICE_ACCOUNT_JSON
```

- Publishable key có thể dùng ở trình duyệt vì mọi bảng public đã bật RLS.
- Secret key chỉ đặt trong biến môi trường server. Không đổi tên thành biến
  bắt đầu bằng `NEXT_PUBLIC_`.
- Sau khi cấp `app_metadata.role = admin`, đăng xuất rồi đăng nhập lại để JWT
  nhận role mới.

## Lấy key ở đâu

Trong Supabase Dashboard, mở **Project Settings → API Keys**:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret key → `SUPABASE_SECRET_KEY`

Không chụp màn hình, commit hoặc gửi secret key vào chat.

## Kiểm tra ứng dụng

Sau khi tạo `.env.local`:

```bash
npm run dev
```

Đăng nhập bằng email admin. Các màn hình phải hiện nhãn **Dữ liệu thật**.
Nếu API trả `42501`, chạy lại `04_verify_setup.sql` để kiểm tra grants và RLS.
