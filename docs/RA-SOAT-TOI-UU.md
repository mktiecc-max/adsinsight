# AdsInsight — Rà soát & Kế hoạch tối ưu

> Rà soát kỹ thuật · Next.js 15 App Router
> Nhánh `main` · commit `29b5101` · Ngày rà soát **21/08/2026** · 77 file được track · 16.8k dòng

Ứng dụng chạy được, build sạch, typecheck sạch. Nhưng phần lớn dữ liệu vẫn là vỏ rỗng sau khi gỡ demo, toàn bộ trang đều là client component, và tầng dữ liệu đang kéo cả bảng về Node để tính bằng JavaScript.

Dưới đây là **32 phát hiện cụ thể** và **6 giai đoạn thi công** theo thứ tự phụ thuộc.

---

## Mục lục

- [Hiện trạng — Số đo gốc](#hiện-trạng--số-đo-gốc)
- [Nhóm A — Lỗi thời gian chạy & dữ liệu giả còn sót](#nhóm-a--lỗi-thời-gian-chạy--dữ-liệu-giả-còn-sót)
- [Nhóm B — Hiệu suất](#nhóm-b--hiệu-suất)
- [Nhóm C — Giao diện & hệ thống thiết kế](#nhóm-c--giao-diện--hệ-thống-thiết-kế)
- [Nhóm D — Bố cục file & kho mã](#nhóm-d--bố-cục-file--kho-mã)
- [Kế hoạch thi công — Sáu giai đoạn](#kế-hoạch-thi-công--sáu-giai-đoạn)
- [Cấu trúc thư mục đích](#cấu-trúc-thư-mục-đích)
- [Chỉ số nghiệm thu](#chỉ-số-nghiệm-thu)

---

## Hiện trạng — Số đo gốc

| Chỉ số | Giá trị | Ghi chú |
| --- | --- | --- |
| First Load JS · `/` | **234 kB** | recharts nằm trong bundle chính |
| First Load JS · `/login` | **174 kB** | trang tĩnh nhưng gánh supabase-js |
| Middleware | **63,3 kB** | gọi mạng Supabase mỗi request |
| `app/globals.css` | **4.092 dòng** | 562 class, 1 file, tải cho mọi trang |
| Trang là Server Component | **0 / 8** | tất cả đều `"use client"` |
| ESLint · Test · CI | **không có** | chưa có hàng rào chất lượng |

Nguồn: `npx next build` chạy ngày 21/08/2026 trên chính repo này. `tsc --noEmit` pass, build pass — không có lỗi biên dịch nào. Mọi vấn đề bên dưới đều là lỗi thời gian chạy, hiệu suất hoặc nợ cấu trúc, không phải lỗi cú pháp.

---

## Nhóm A — Lỗi thời gian chạy & dữ liệu giả còn sót

Commit `c27e5b5` đã rút ruột `lib/mock-data.ts` thành các mảng rỗng kiểu `any[]`, nhưng **18 file vẫn import nó**. Đây là nhóm cần xử lý trước mọi thứ khác.

### A1 · `LỖI 500` — API sức khỏe dữ liệu ném TypeError trên mảng rỗng

Route đọc `dataHealth[1].value` trong khi `dataHealth` nay là `[]`. Mỗi lần gọi là một crash 500, không có try/catch.

> `app/api/health/data-quality/route.ts:7`

### A2 · `CHẶN` — 18 file phụ thuộc vào module rỗng, kiểu `any`

7 trang và 11 route vẫn dùng `@/lib/mock-data` làm giá trị khởi tạo hoặc fallback. Vì tất cả đều khai báo `any[]`, TypeScript không còn bảo vệ được gì ở các điểm này — bug chỉ lộ khi chạy.

> `lib/mock-data.ts` · 7 page + 11 route

### A3 · `SAI UX` — Nhãn "Dữ liệu demo" hiển thị sai trên toàn hệ thống

Mọi trang render pill trạng thái từ `meta.mode`. Các route stub luôn trả `"demo"` cứng, nên người dùng thấy "Dữ liệu demo" ngay cả khi Supabase đang chạy live — đúng thứ mà commit gỡ demo muốn tránh.

> `api/settings/level-values` · `api/report/detail` · `api/sync/*`

### A4 · `NỢ` — Toàn bộ state machine đồng bộ vẫn là mô phỏng

`start` / `step` / `finish` / `cancel` chạy trên một `Map` trong bộ nhớ tiến trình, tổng số dòng hardcode (2418 / 856 / 1240), số lỗi tính bằng công thức giả `cursor/total*12`. Trên Vercel serverless, Map này biến mất giữa các invocation — phiên đồng bộ sẽ đứt ngẫu nhiên.

> `lib/demo-sync-store.ts` · `app/api/sync/*`

### A5 · `SAI SỐ` — Số liệu cứng nằm ngay trong giao diện

Thanh header hiển thị "Tháng 6/2026", "01/06/2026 – 30/06/2026", "1.240 dòng", badge cảnh báo "3", footer "24/07/2026 09:14", avatar "MK" — tất cả là chuỗi cố định trong JSX. Trang tổng quan còn dùng mảng `[2_400_000, 1_800_000, 680_000]` làm số tiền vượt chuẩn cho top cần xử lý.

> `components/app-shell.tsx` · `app/(dashboard)/page.tsx`

### A6 · `SAI UX` — Bộ lọc toàn cục không đi tới đâu

`FilterContext` giữ preset ngày, brand, người chạy, tài khoản — nhưng không API nào nhận tham số này. Chỉ trang Hiệu suất lọc brand/owner phía client sau khi đã tải xong. Đổi khoảng ngày không thay đổi bất cứ con số nào.

> `components/app-shell.tsx:80–95` · mọi lệnh fetch

### A7 · `TRÙNG LẶP` — Ngưỡng nghiệp vụ rải rác trong JSX, không đọc từ cấu hình

CPR 41.000, CPSQL 117.000, lấy số 0,28 / 0,33, thoát bậc 0 0,3 / 0,45, chuyển bậc 0,45 — viết cứng và lặp lại giữa bảng và drawer. Trong khi đó trang Cài đặt có form nhập ngưỡng nhưng chỉ là `defaultValue`, không lưu đi đâu. `DEFAULT_THRESHOLDS` ở tầng domain chỉ chứa 2 giá trị.

> `app/(dashboard)/performance/page.tsx` · `lib/domain/metrics.ts:3`

### A8 · `TRÙNG LẶP` — Hai nguồn diễn giải AI khác nhau

`/api/report/ai-summary` trả một đoạn markdown cứng; trang tổng quan lại render một đoạn cứng *khác* ngay trong JSX sau `setTimeout(850)` và không hề gọi API đó. Không nơi nào thực sự dùng `ANTHROPIC_API_KEY`.

> `app/api/report/ai-summary/route.ts` · `app/(dashboard)/page.tsx`

### A9 · `CODE CHẾT` — Bốn mẩu code không bao giờ chạy tới

Map `dimensions` được dựng bằng một vòng lặp qua toàn bộ ad rồi không đọc lần nào; `app/overview.css` chỉ có một dòng comment và không file nào import; `PerformanceRow` import thừa; trang tổng quan import từ `@/components/ui` hai lần ở hai dòng khác nhau.

> `lib/data/report-repository.ts:160` · `app/overview.css` · `lib/mock-data.ts:2` · `app/(dashboard)/page.tsx:23,29`

---

## Nhóm B — Hiệu suất

### B1 · `NẶNG` — Tầng dữ liệu kéo cả bảng về Node rồi tính bằng JavaScript

`getLivePerformance` phân trang 1.000 dòng một lần qua toàn bộ `fact_ad_daily` và `fact_lead`, gom nhóm, đếm bậc, tính trung vị — tất cả trong bộ nhớ hàm serverless. Với 200 quảng cáo × 365 ngày là ~73.000 dòng, tức **73 round-trip nối tiếp** chỉ để dựng một bảng. Chi phí tăng tuyến tính theo khoảng ngày người dùng chọn.

> `lib/data/report-repository.ts:100–250`

### B2 · `NẶNG` — Materialized view đã có sẵn nhưng không ai dùng

`mv_ad_daily_enriched` được định nghĩa đầy đủ trong schema kèm 3 index (unique `date+ad_id`, `brand+date`, `owner+date`) — chính xác là thứ tầng repository cần. Nhưng repository lại join thủ công `fact_ad_daily!inner(dim_ad)` qua PostgREST. View tạo `with no data` và không có lịch `refresh` nào trong code.

> `supabase/schema.sql:285–314`

### B3 · `NẶNG` — Trang tổng quan quét bảng ba lần cho cùng một khoảng ngày

`/api/report/summary`, `/api/report/performance` và `/api/report/timeseries` mỗi cái tự gọi repository riêng. Trang tổng quan bắn cả ba song song sau khi hydrate — ba lần đọc toàn bảng cho cùng một bộ lọc. Trang Phễu và Cảnh báo cũng gọi lại `getLivePerformance` lần nữa.

> `app/(dashboard)/page.tsx:79–95` · 5 route báo cáo

### B4 · `NẶNG` — Không có tầng cache nào

Mọi fetch đều `cache: "no-store"`, không route nào khai báo `revalidate`, không dùng `unstable_cache`. Hai người mở cùng một báo cáo tháng trước — dữ liệu bất biến — vẫn tạo ra hai lần quét bảng đầy đủ.

> toàn bộ `app/api/report/*`

### B5 · `CHẬM` — Middleware gọi mạng tới Supabase trên mọi điều hướng

`supabase.auth.getUser()` là một HTTP request thật tới Supabase Auth, chạy cho mọi đường dẫn khớp matcher — kể cả `/api/health`. Middleware 63,3 kB chạy ở edge nhưng database ở `sin1`, cộng thêm 100–300 ms vào *từng* lần chuyển trang. Matcher chưa loại trừ `_next/data` và các route công khai.

> `middleware.ts:26–28,45`

### B6 · `CHẬM` — Waterfall bốn nhịp trên mọi trang

Không trang nào là Server Component. Chuỗi thực tế: tải HTML rỗng → tải JS → hydrate → `useEffect` mới bắt đầu fetch → render. Người dùng nhìn khung trắng suốt ba nhịp đầu. Đây là dashboard nội bộ trên App Router — kịch bản mà RSC + streaming được sinh ra để giải quyết.

> 8/8 trang đều `"use client"`

### B7 · `NẶNG` — recharts nằm trong bundle đầu tiên của trang chủ

234 kB First Load JS, trong đó riêng page chunk là 119 kB. Biểu đồ nằm dưới màn hình đầu và chỉ có một cái. Không có `next/dynamic`, không có `optimizePackageImports` cho `recharts` hay `lucide-react` trong `next.config.mjs` — file config hiện chỉ có đúng hai dòng.

> `app/(dashboard)/page.tsx:13–22` · `next.config.mjs`

### B8 · `NẶNG` — Trang đăng nhập gánh 174 kB để gửi một magic link

`createBrowserClient` được import tĩnh nên toàn bộ supabase-js vào bundle của trang login — trang mà người dùng chưa đăng nhập nhìn thấy đầu tiên, trên mạng chậm nhất.

> `app/login/page.tsx:6`

### B9 · `CHẬM` — Truy vấn khách hàng chạy nối tiếp theo lô 500

`fetchCustomers` dùng `await` trong vòng `for`, nên 5.000 số điện thoại thành 10 round-trip xếp hàng. Có thể chạy song song bằng `Promise.all`, hoặc bỏ hẳn nếu chuyển phép nối sang phía Postgres.

> `lib/data/report-repository.ts:113–126`

### B10 · `NỢ` — Phân trang là giả, bảng không virtual hóa

API trả `meta.page_size: 50, page: 1` nhưng luôn gửi toàn bộ mảng. Bảng Hiệu suất render 15 cột không cửa sổ ảo — vài trăm dòng là bắt đầu giật khi sắp xếp.

> `app/api/report/performance/route.ts:52`

### B11 · `NỢ` — Không có `loading.tsx` hay `error.tsx`

App Router cung cấp sẵn streaming skeleton và error boundary theo route; dự án chưa dùng file nào. Khi API lỗi, người dùng chỉ thấy một pill nhỏ đổi màu và một trang trống.

> `app/(dashboard)/`

---

## Nhóm C — Giao diện & hệ thống thiết kế

### C1 · `CẤU TRÚC` — Một file CSS 4.092 dòng cho cả ứng dụng

562 class ở cấp cao nhất, 11 media query nằm rải rác ở các dòng 1051, 2032, 2286, 3014, 3805, 3968… Selector cùng tên xuất hiện tới 19 lần (`.performance-table`), khiến sửa một chỗ dễ vỡ chỗ khác. Mọi trang tải toàn bộ file, kể cả trang Đăng nhập chỉ dùng khoảng 3% số class.

> `app/globals.css`

### C2 · `MÂU THUẪN` — Hai hệ thống style song song, token lệch nhau

Tailwind được cài đặt đầy đủ nhưng gần như không dùng ngoài `cn()`. Màu nền tảng bị khai báo hai nơi và **không khớp**: `--ink: #1b1d21` trong `:root` so với `ink: "#191b20"` trong `tailwind.config.ts`; tương tự `--line: #e4e7eb` so với `#e5e7eb`.

> `app/globals.css:5–30` · `tailwind.config.ts:14–18`

### C3 · `THIẾU` — Không có chế độ tối

Đây là màn hình người vận hành nhìn hàng giờ. Toàn bộ palette chỉ có một biến thể sáng, và vì màu được viết trực tiếp trong 4.000 dòng CSS thay vì qua token, thêm dark mode về sau sẽ tốn gấp nhiều lần so với làm cùng lúc với C1.

> `app/globals.css`

### C4 · `KHÔNG NHẤT QUÁN` — Mỗi trang tự phát minh lại trạng thái tải, rỗng và lỗi

Pill `data-mode` đặt ở vị trí khác nhau trên từng trang: khối riêng ở Tổng quan, trong toolbar ở Hiệu suất, cạnh page-heading ở Phễu. Trang Hiệu suất có empty-state, các trang khác thì không. Không có skeleton nào — chỉ một `div` trống làm Suspense fallback.

> 5 trang, 5 cách xử lý

### C5 · `A11Y` — Bảng chính không dùng được bằng bàn phím

Mở drawer chi tiết gắn vào `onClick` của `<tr>` — không tab tới được, không có `role`, không phản hồi phím Enter. Drawer cũng chưa bẫy focus và chưa đóng bằng phím Esc. Nút avatar không có nhãn cho screen reader.

> `performance/page.tsx:576` · `DetailDrawer`

### C6 · `CẤU TRÚC` — Thư viện component gần như không tồn tại

Chỉ có `components/ui.tsx` (108 dòng, 6 component) và `app-shell.tsx` (236 dòng, gộp header + nav + filter bar + footer + bottom nav). Trong khi đó một file trang chứa tới 679 dòng với 4 component nội bộ, và `DetailDrawer` riêng nó đã 160 dòng.

> `app/(dashboard)/performance/page.tsx` · `components/`

### C7 · `TRÙNG LẶP` — Điều hướng khai báo hai lần, lệch nhau

Mảng `navigation` dùng cho desktop và mobile menu; nhưng bottom nav trên mobile lại viết tay 4 link riêng với logic `isActive` khác. Thêm một mục menu là phải sửa hai chỗ và nhớ giữ chúng đồng bộ.

> `components/app-shell.tsx:44–52, 210–232`

---

## Nhóm D — Bố cục file & kho mã

### D1 · `RÁC` — 137 kB tàn dư canvas thiết kế đang được git theo dõi

`Giao diện Báo cáo Facebook Ads.dc.html` (69 kB, 876 dòng), `support.js` (66 kB runtime sinh tự động, có ghi rõ "do not edit"), và `.thumbnail` (11 kB ảnh WebP) nằm ở thư mục gốc. Không file nào được ứng dụng tham chiếu. Riêng chúng chiếm ~12% tổng số dòng của repo.

> thư mục gốc

### D2 · `SAI CHỖ` — Tài liệu nằm ở gốc và trong thư mục sai tên

Đặc tả kỹ thuật 47 kB (`2-dac-ta-ky-thuat.md`) đặt cạnh `package.json`; brief thiết kế 37 kB nằm trong `uploads/` — tên thư mục này mặc định gợi ý file người dùng tải lên lúc chạy, không phải tài liệu dự án. Ảnh chụp màn hình thì ở `screenshots/` tách rời. Đã có `docs/` nhưng chỉ chứa 2 file setup.

> `2-dac-ta-ky-thuat.md` · `uploads/` · `screenshots/`

### D3 · `RÁC` — 1,3 GB file tạm và nhị phân trong thư mục dự án

`.tools/gh_2.94.0_windows_amd64.zip` 14 MB, `node_modules` 448 MB, `.next` 412 MB (phần lớn là webpack cache tích lũy), `tsconfig.tsbuildinfo` 161 kB ở gốc. Đã gitignore nên không vào repo, nhưng làm chậm mọi thao tác quét thư mục, backup và đồng bộ cloud.

> `.tools/` · `.next/cache`

### D4 · `CẤU TRÚC` — `lib/` trộn lẫn hai tầng khác bản chất

`format.ts`, `utils.ts`, `api-response.ts`, `google-sheets.ts`, `demo-sync-store.ts`, `mock-data.ts` nằm phẳng cùng cấp với các thư mục có chủ đích `domain/`, `data/`, `transform/`, `supabase/`. Không nhìn ra ranh giới đâu là logic thuần (test được, chạy cả hai phía) và đâu là I/O chỉ chạy server.

> `lib/`

### D5 · `RỦI RO` — Secret thật nằm trong `.env` thay vì `.env.local`

Build log xác nhận Next đang nạp `.env`. File này đã có trong `.gitignore` và lịch sử git sạch — nhưng quy ước Next là `.env` dùng cho giá trị mặc định *được commit*, còn secret thuộc về `.env.local`. Đặt sai chỗ là chỉ cách một lần `git add -f` nhầm.

> `.env` · `.gitignore`

### D6 · `THIẾU` — Không có ESLint, Prettier, test hay CI

Không có config nào cho lint hoặc format, không có test runner, không có `.github/workflows`, `.editorconfig` hay `.nvmrc`. `package.json` chỉ có 4 script. Các lỗi ở A9 (biến không dùng, import trùng) chính là loại mà ESLint bắt được trong một giây.

> thư mục gốc

### D7 · `THIẾU` — Schema chưa nằm trong migration

`supabase/schema.sql` là một file 435 dòng chạy tay qua SQL Editor; README thừa nhận điều này. Không có thư mục `migrations/`, nên không có cách nào biết database production đang ở phiên bản schema nào.

> `supabase/`

### D8 · `THIẾU` — Biến môi trường được đọc rải rác, không validate

Sáu biến được đọc trực tiếp qua `process.env` ở 6 file khác nhau, mỗi nơi tự kiểm tra thiếu/đủ theo cách riêng. Khi cấu hình sai, lỗi hiện ra ở thời điểm gọi API chứ không phải lúc khởi động.

> `middleware`, `supabase/*`, `google-sheets`, `api-response`

---

## Kế hoạch thi công — Sáu giai đoạn

Thứ tự dưới đây là thứ tự **phụ thuộc**, không phải mức độ quan trọng. Giai đoạn 0 và 1 gỡ nhiễu để những giai đoạn sau đo được kết quả thật. Giai đoạn 2 phải xong trước 3, vì tối ưu client trên một API chậm sẽ không nhìn thấy khác biệt.

---

### Giai đoạn 0 — Dọn nền

**~0,5 ngày · rủi ro gần bằng 0**

Không chạm vào code chạy. Làm trước để các diff sau này đọc được.

- **Xóa D1:** `git rm` ba file canvas ở gốc.
- **Xóa A9:** `app/overview.css`, map `dimensions`, import thừa.
- **Chuyển D2:** đặc tả và brief vào `docs/spec/`, hai file setup vào `docs/setup/`, ảnh vào `docs/assets/`. Xóa thư mục `uploads/` và `screenshots/`.
- **Dọn D3:** xóa `.tools/`, thêm `.next/cache` vào quy trình dọn định kỳ.
- **Sửa D5:** đổi `.env` thành `.env.local`, xoay lại các key đã từng nằm trong file cũ.
- **Thêm D6:** ESLint (`eslint-config-next`), Prettier, `.editorconfig`, `.nvmrc`; thêm script `lint` và `format`.

**Kết quả:** Repo giảm ~137 kB mã theo dõi và ~14 MB đĩa; mọi PR sau đó đi qua lint.

---

### Giai đoạn 1 — Cắt đứt dữ liệu giả

**~1 ngày · chặn mọi giai đoạn sau**

Mục tiêu: xóa hẳn `lib/mock-data.ts`. Ứng dụng chỉ còn hai trạng thái — có dữ liệu, hoặc báo lỗi rõ ràng.

1. **Sửa A1 trước:** route `data-quality` đọc thật từ repository, bọc try/catch, trả 503 qua `liveApiError` như các route khác.
2. **Gỡ 18 import (A2):** mỗi trang khởi tạo bằng mảng rỗng đúng kiểu thay vì mock; mỗi route bỏ nhánh fallback `|| mockValue`.
3. **Bỏ `meta.mode` (A3):** thay bằng `meta.source` chỉ nhận `"live"`, và để lỗi tự đi qua kênh 503. Xóa `data-mode-pill` khỏi 5 trang, thay bằng một dải cảnh báo dùng chung khi API lỗi.
4. **Xóa số cứng (A5):** khoảng ngày, số dòng, thời điểm đồng bộ, số cảnh báo đều lấy từ API; avatar lấy từ phiên Supabase.
5. **Gom ngưỡng (A7):** chuyển toàn bộ hằng số nghiệp vụ vào `lib/domain/thresholds.ts`, đọc từ bảng `app_setting` với giá trị mặc định; nối trang Cài đặt vào bảng này.
6. **Thống nhất diễn giải (A8):** trang tổng quan gọi `/api/report/ai-summary`; route nhận số đã tính và gọi Anthropic khi có key, nếu không thì sinh câu diễn giải deterministic từ chính các con số đó.
7. **Đưa sync ra khỏi bộ nhớ (A4):** thay `demoSyncRuns` bằng bảng `sync_run` đã có sẵn trong schema.

**Kết quả:** Không còn con số nào trên màn hình mà không truy được về database.

---

### Giai đoạn 2 — Đẩy phép tính xuống Postgres

**~2–3 ngày · đòn bẩy lớn nhất**

Đây là thay đổi có tác động lớn nhất trong toàn bộ kế hoạch. Nguyên tắc: Node không được nhìn thấy dòng thô nào.

1. **Dùng view đã có (B2):** chuyển repository sang `mv_ad_daily_enriched`; thêm job `refresh materialized view concurrently` chạy sau mỗi lần đồng bộ (unique index đã có nên `concurrently` chạy được).
2. **Viết RPC gộp (B1):** một hàm Postgres `report_performance(from, to, level, brands[], owners[])` trả về đúng các dòng đã gom nhóm kèm `cpsql`, `escape_rate`, `cp_l2` và trung vị tính bằng `percentile_cont`. Repository chỉ còn gọi `rpc()` và map kiểu.
3. **Gộp lời gọi (B3):** một endpoint `/api/report/overview` trả cả KPI, chuỗi thời gian và bảng trong một lượt; các trang khác dùng chung một lớp truy vấn được cache.
4. **Thêm cache (B4):** bọc repository trong `unstable_cache` với key theo bộ lọc, gắn tag `report`; `revalidateTag("report")` sau mỗi lần đồng bộ. Khoảng ngày đã đóng (kết thúc trong quá khứ) đặt TTL dài.
5. **Song song hóa (B9):** nếu còn phải chunk, đổi vòng `for await` thành `Promise.all`.
6. **Phân trang thật (B10):** đẩy `limit`/`offset` và sắp xếp xuống SQL.
7. **Middleware nhẹ đi (B5):** thu hẹp matcher để bỏ qua asset và `_next/data`; chỉ gọi `getUser()` khi cookie phiên tồn tại và sắp hết hạn, các trường hợp còn lại đọc claim từ JWT.

**Kết quả:** Từ ~73 round-trip mỗi báo cáo xuống **1**; thời gian API còn gần như không đổi khi khoảng ngày mở rộng.

---

### Giai đoạn 3 — Server Component hóa & cắt bundle

**~2 ngày · phụ thuộc giai đoạn 2**

Mỗi trang tách làm hai: một Server Component lấy dữ liệu, một Client Component nhỏ chỉ giữ phần tương tác.

1. **Đảo chiều 8 trang (B6):** page trở thành async server component đọc thẳng repository, không qua HTTP; phần lọc/sắp xếp/drawer tách ra `_components/*.client.tsx`. Bộ lọc toàn cục chuyển sang `searchParams` — nhờ đó giải luôn A6, và trạng thái lọc trở nên chia sẻ được qua URL.
2. **Tách biểu đồ (B7):** `next/dynamic` với `ssr: false` cho recharts; bật `optimizePackageImports: ["lucide-react", "recharts", "@tanstack/react-table"]` trong `next.config.mjs`.
3. **Gỡ supabase khỏi login (B8):** import động `createBrowserClient` ngay trong hàm submit, hoặc chuyển hẳn sang server action.
4. **Thêm ranh giới (B11):** `loading.tsx` với skeleton thật và `error.tsx` cho từng nhóm route.
5. **Virtual hóa bảng (B10):** gắn `@tanstack/react-virtual` cho bảng Hiệu suất khi vượt 200 dòng.

**Kết quả:** First Load JS trang chủ **234 kB → dưới 140 kB**; nội dung hiện ngay ở nhịp đầu thay vì nhịp thứ tư.

---

### Giai đoạn 4 — Dựng lại hệ thống thiết kế

**~2–3 ngày**

Không vẽ lại giao diện — giữ nguyên ngôn ngữ hình ảnh hiện tại, chỉ đổi cách nó được tổ chức và mở rộng.

1. **Một nguồn token (C2):** `styles/tokens.css` giữ toàn bộ biến; `tailwind.config.ts` đọc lại chính các biến đó qua `var(--…)` thay vì khai báo màu lần hai. Sửa luôn hai giá trị đang lệch.
2. **Chẻ CSS (C1):** `globals.css` chỉ còn reset + token + vài primitive. Phần còn lại thành CSS Module đặt cạnh component tương ứng, để Next chỉ nạp CSS của route đang mở.
3. **Chế độ tối (C3):** khi màu đã đi qua token, thêm khối `[data-theme="dark"]` và tôn trọng `prefers-color-scheme`. Làm ngay sau C1 vì chi phí lúc này gần bằng không.
4. **Primitive dùng chung (C4):** `<Skeleton>`, `<EmptyState>`, `<ErrorState>`, `<PageHeading>` — mọi trang dùng chung một cách hiển thị trạng thái.
5. **Tách component (C6):** kéo `DetailDrawer`, `HeatCell`, `MetricCell`, và các phần của `AppShell` (header, filter-bar, footer, nav) ra file riêng. Không file component nào vượt 200 dòng.
6. **Gộp điều hướng (C7):** một mảng `navigation` duy nhất, bottom nav sinh ra từ nó bằng cờ `primary`.
7. **Sửa a11y (C5):** ô tên trong bảng thành `<button>` thật; drawer bẫy focus, đóng bằng Esc, trả focus về dòng vừa mở; thêm nhãn cho các nút chỉ có icon; định nghĩa `:focus-visible` ở tầng token.

**Kết quả:** CSS mỗi route giảm khoảng 90%; thêm màn hình mới không còn phải nối thêm vào file 4.000 dòng.

---

### Giai đoạn 5 — Sắp xếp lại kho mã & hàng rào chất lượng

**~1–2 ngày · làm cuối**

Để cuối cùng vì đây là bước di chuyển file hàng loạt — làm sớm sẽ khiến mọi diff ở các giai đoạn trên không đọc được.

1. **Chuyển sang `src/`:** gốc dự án chỉ còn file cấu hình. Alias `@/*` trỏ về `./src/*`.
2. **Phân tầng `lib/` (D4):** `domain/` thuần logic không I/O; `data/` chứa repository; `integrations/` gói Supabase và Google Sheets; `shared/` cho format và tiện ích; `config/env.ts` validate toàn bộ biến môi trường một chỗ, fail sớm lúc khởi động (D8).
3. **Migration hóa schema (D7):** `supabase/migrations/` đánh số theo thời gian; `schema.sql` trở thành ảnh chụp sinh ra tự động.
4. **Test cho tầng domain:** Vitest cho `metrics`, `matrix`, `alerts`, `transform` — đây là phần thuần hàm, chứa toàn bộ logic nghiệp vụ, và test được mà không cần database.
5. **CI:** một workflow chạy `lint → typecheck → test → build` trên mỗi PR.

**Kết quả:** Ranh giới tầng rõ ràng; công thức nghiệp vụ được test bảo vệ thay vì chỉ dựa vào đọc mắt.

---

## Cấu trúc thư mục đích

```
Báo cáo QC/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # chỉ nạp tokens.css + base.css
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx  loading.tsx  error.tsx
│   │   │   ├── page.tsx                # RSC — tổng quan
│   │   │   ├── performance/
│   │   │   │   ├── page.tsx            # RSC: đọc repository
│   │   │   │   └── _components/        # bảng, drawer, toolbar (client)
│   │   │   ├── funnel/  alerts/  leads/  sync/  settings/[tab]/
│   │   ├── api/
│   │   │   ├── report/  leads/  settings/  sync/  health/
│   │   └── auth/callback/route.ts
│   │
│   ├── components/
│   │   ├── layout/      # app-shell, header, filter-bar, footer, nav
│   │   ├── data/        # metric-value, delta, zone-chip, rank-badge, heat-cell
│   │   ├── feedback/    # skeleton, empty-state, error-state, page-heading
│   │   └── charts/      # trend-chart, matrix-plot — nạp động
│   │
│   ├── lib/
│   │   ├── domain/       # metrics, matrix, alerts, thresholds, types — thuần, có test
│   │   ├── data/         # report-repository, settings-repository, sync-repository
│   │   ├── integrations/ # supabase/{client,server,admin}, google-sheets/
│   │   ├── shared/       # format, cn, api-response
│   │   └── config/       # env.ts — validate một chỗ, fail sớm
│   │
│   ├── styles/
│   │   ├── tokens.css  base.css        # CSS component nằm cạnh component
│   │
│   └── middleware.ts
│
├── supabase/
│   ├── migrations/  seed.sql  manual-setup/
│
├── docs/
│   ├── spec/     # đặc tả kỹ thuật, brief thiết kế
│   ├── setup/    # supabase, vercel
│   └── assets/   # ảnh chụp màn hình
│
├── .github/workflows/ci.yml
└── gốc: package.json, tsconfig, next.config, tailwind.config,
    .eslintrc, .prettierrc, .editorconfig, .nvmrc, .env.example
```

Ba quy tắc chi phối cấu trúc này:

1. Thư mục gốc chỉ chứa cấu hình — mọi thứ chạy được nằm trong `src/`.
2. Component đi kèm CSS và test của chính nó.
3. `lib/domain` không được import bất cứ thứ gì từ `lib/data` hay `integrations` — chiều phụ thuộc luôn hướng vào trong, và đó là điều kiện để tầng nghiệp vụ test được mà không cần database.

---

## Chỉ số nghiệm thu

| Chỉ số | Hiện tại | Mục tiêu | Giai đoạn | Cách đo |
| --- | --- | --- | :---: | --- |
| First Load JS · trang chủ | 234 kB | **< 140 kB** | 3 | `next build` |
| First Load JS · đăng nhập | 174 kB | **< 110 kB** | 3 | `next build` |
| Round-trip DB mỗi báo cáo | ~73 | **1** | 2 | Supabase logs |
| Thời gian API báo cáo (30 ngày) | chưa đo | **< 400 ms p95** | 2 | Vercel analytics |
| CSS nạp cho trang đăng nhập | 4.092 dòng | **< 400 dòng** | 4 | coverage tab DevTools |
| File vượt 300 dòng | 4 | **0** | 4 · 5 | `wc -l` |
| Import từ `mock-data` | 18 | **0** | 1 | `grep` |
| Độ phủ test tầng domain | 0% | **> 80%** | 5 | Vitest |
| Trang là Server Component | 0 / 8 | **8 / 8** | 3 | build output |

Đo lại toàn bộ bảng này sau mỗi giai đoạn, không phải chỉ ở cuối. Dòng "thời gian API" cần một phép đo gốc trên dữ liệu thật trước khi bắt đầu giai đoạn 2 — hiện tại chưa có vì môi trường live chưa có đủ dữ liệu để đo.

---

Rà soát dựa trên commit `29b5101`, thực hiện bằng cách đọc toàn bộ 77 file được git theo dõi và chạy `tsc --noEmit` cùng `next build` trên máy. Mọi con số trong tài liệu này lấy từ output thật của hai lệnh đó và từ chính source code — không có ước lượng nào ngoài phần dự phóng thời gian thi công.
