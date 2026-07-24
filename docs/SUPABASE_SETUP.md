# Kết nối AdsInsight với Supabase

## 1. Tạo project

1. Đăng nhập <https://supabase.com/dashboard>.
2. Chọn **New project**.
3. Chọn region gần Việt Nam, đặt mật khẩu database mạnh và lưu trong password
   manager.
4. Chờ project khởi tạo xong.

## 2. Cài database bằng SQL Editor

Mở **SQL Editor → New query**, chạy lần lượt:

1. [`supabase/schema.sql`](../supabase/schema.sql)
2. [`supabase/seed.sql`](../supabase/seed.sql)
3. Tạo user trước, sau đó sửa email và chạy
   [`supabase/manual-setup/03_make_admin.sql`](../supabase/manual-setup/03_make_admin.sql)
4. Chạy
   [`supabase/manual-setup/04_verify_setup.sql`](../supabase/manual-setup/04_verify_setup.sql)
5. Tùy chọn chạy
   [`supabase/manual-setup/05_smoke_test.sql`](../supabase/manual-setup/05_smoke_test.sql)

Tất cả dòng trong file verify phải trả `status = OK`.

Hướng dẫn SQL chi tiết:
[`supabase/manual-setup/README.md`](../supabase/manual-setup/README.md)

## 3. Lấy URL và API Keys

Trong project mở **Connect** hoặc **Settings → API Keys**.

Sao chép:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
```

- Publishable key được dùng ở trình duyệt và được bảo vệ bằng RLS.
- Secret key chỉ dùng trong Vercel Functions/server và có quyền vượt RLS.
- Không gửi secret key qua chat, email hoặc commit vào Git.

Tài liệu chính thức:
<https://supabase.com/docs/guides/getting-started/api-keys>

## 4. Cấu hình Magic Link

Trong Supabase mở **Authentication → Sign In / Providers → Email**:

1. Bật Email provider.
2. Bật Magic Link/OTP.
3. Nếu chỉ dùng nội bộ, có thể tắt đăng ký công khai sau khi đã tạo đủ user.

Tiếp theo mở **Authentication → URL Configuration**.

### Local

Thêm Redirect URL:

```text
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

### Production

Site URL:

```text
https://TEN-DU-AN.vercel.app
```

Redirect URL:

```text
https://TEN-DU-AN.vercel.app/auth/callback
```

Nếu dùng custom domain, thêm:

```text
https://TEN-MIEN-CUA-BAN/auth/callback
```

### Vercel Preview

Chỉ thêm wildcard cho preview nếu thực sự cần đăng nhập trên preview:

```text
https://*-TEN-TEAM-VERCEL.vercel.app/**
```

Production nên dùng URL chính xác, không dùng wildcard.

Tài liệu chính thức:
<https://supabase.com/docs/guides/auth/redirect-urls>

## 5. Tạo tài khoản admin

1. Tạo user trong **Authentication → Users**, hoặc đăng nhập Magic Link một
   lần để user xuất hiện.
2. Mở `supabase/manual-setup/03_make_admin.sql`.
3. Thay `THAY_EMAIL_ADMIN_CUA_BAN@example.com` bằng email thật.
4. Chạy file.
5. Đăng xuất rồi đăng nhập lại để JWT nhận `app_metadata.role = admin`.

Ứng dụng dùng `app_metadata`, không dùng `user_metadata`, vì người dùng có thể
tự chỉnh user metadata.

## 6. Cấu hình local

Sao chép `.env.example` thành `.env.local`:

```dotenv
ADSINSIGHT_DATA_MODE=live
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
GOOGLE_SERVICE_ACCOUNT_B64=
SYNC_CHUNK_SIZE=1000
SYNC_LOCK_TIMEOUT_MINUTES=15
```

Sau đó chạy:

```bash
npm install
npm run dev
```

## 7. Kết nối với Vercel

Nhập cùng các biến trên vào **Vercel → Project → Settings → Environment
Variables**, theo hướng dẫn:

[`docs/VERCEL_SETUP.md`](./VERCEL_SETUP.md)

Sau mỗi lần đổi key hoặc biến môi trường, phải tạo deployment mới/redeploy.

## 8. Kiểm tra lỗi thường gặp

### API trả `42501`

Chạy lại `supabase/manual-setup/04_verify_setup.sql`. Lỗi này thường do thiếu
explicit grant hoặc RLS/policy chưa được tạo đầy đủ.

### Magic Link quay về localhost

Kiểm tra **Site URL** và **Redirect URLs** trong Authentication.

### Đăng nhập được nhưng không vào Cài đặt/Đồng bộ

- Kiểm tra `raw_app_meta_data ->> 'role' = 'admin'`.
- Đăng xuất rồi đăng nhập lại để refresh JWT.

### Giao diện vẫn hiện Dữ liệu demo

- `ADSINSIGHT_DATA_MODE` phải là `live`.
- Kiểm tra đủ URL, publishable key và secret key.
- Redeploy Vercel sau khi thêm biến.
