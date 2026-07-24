# Kết nối AdsInsight với Vercel

Repository: <https://github.com/mktiecc-max/adsinsight>

## 1. Import repository

1. Đăng nhập <https://vercel.com>.
2. Chọn **Add New → Project**.
3. Chọn **Import Git Repository** và import `mktiecc-max/adsinsight`.
4. Cấu hình:
   - Framework Preset: **Next.js**
   - Root Directory: `.`
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: để mặc định
   - Node.js: 20 trở lên

Không cần sửa `vercel.json`.

Tài liệu chính thức: <https://vercel.com/docs/git>

## 2. Khai báo Environment Variables

Trong Vercel mở **Project → Settings → Environment Variables**.

Thêm các biến dưới đây cho cả **Production** và **Preview**:

```dotenv
ADSINSIGHT_DATA_MODE=live
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
GOOGLE_SERVICE_ACCOUNT_B64=BASE64_JSON_SERVICE_ACCOUNT
SYNC_CHUNK_SIZE=1000
SYNC_LOCK_TIMEOUT_MINUTES=15
```

Biến tùy chọn:

```dotenv
ANTHROPIC_API_KEY=
```

Quy tắc bảo mật:

- Chỉ `NEXT_PUBLIC_SUPABASE_URL` và
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` được đưa xuống trình duyệt.
- Tuyệt đối không đổi `SUPABASE_SECRET_KEY` thành tên bắt đầu bằng
  `NEXT_PUBLIC_`.
- Không commit `.env.local` lên GitHub.

Tài liệu Vercel:

- Environment Variables: <https://vercel.com/docs/environment-variables>
- Môi trường Production/Preview: <https://vercel.com/docs/deployments/environments>

## 3. Deploy lần đầu

1. Sau khi nhập đủ biến, bấm **Deploy**.
2. Chờ bước `npm run build` hoàn tất.
3. Ghi lại URL production, ví dụ:

   `https://adsinsight.vercel.app`

4. Dùng URL này để cấu hình Supabase Auth theo file
   `docs/SUPABASE_SETUP.md`.
5. Sau khi sửa Supabase Redirect URLs, quay lại Vercel và mở:
   **Deployments → deployment mới nhất → Redeploy**.

Lưu ý: biến môi trường mới hoặc vừa thay đổi chỉ áp dụng cho deployment mới.

## 4. Custom domain

Nếu có tên miền riêng:

1. Mở **Project → Settings → Domains**.
2. Thêm domain, làm theo hướng dẫn DNS của Vercel.
3. Đổi **Site URL** trong Supabase thành domain production mới.
4. Thêm `https://TEN-MIEN-CUA-BAN/auth/callback` vào Supabase Redirect URLs.
5. Redeploy Vercel.

## 5. Kiểm tra sau deploy

- `/login`: gửi được Magic Link.
- Sau khi đăng nhập, `/` hiện **Dữ liệu thật**.
- `/performance`: tải được bảng hiệu suất.
- `/settings/ads`: đọc được cấu trúc Google Sheet.
- `/sync`: tài khoản không phải admin bị chặn.

Nếu giao diện hiện **Lỗi nguồn dữ liệu**, kiểm tra Vercel Function Logs và xác
nhận tất cả biến môi trường đã được áp dụng cho đúng environment.
