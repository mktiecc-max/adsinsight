# ĐẶC TẢ KỸ THUẬT
## Webapp báo cáo & phân tích hiệu suất Facebook Ads

> **Tài liệu này dùng để code backend + logic nghiệp vụ.**
> Phần giao diện nằm ở file riêng: `1-brief-thiet-ke-giao-dien.md` (kèm bản thiết kế Claude Design trả về).
>
> Phiên bản 1.0 · Tiền tệ: VND · Múi giờ: `Asia/Ho_Chi_Minh` · Ngôn ngữ giao diện: Tiếng Việt

---

# PHẦN A — TỔNG QUAN

## A1. Mục tiêu

Hệ thống trả lời 4 câu hỏi theo một khoảng thời gian tùy chọn:

| # | Câu hỏi | Chỉ số trả lời |
|---|---|---|
| 1 | Toàn bộ hoạt động quảng cáo đang thế nào? | Chi tiêu, tin nhắn, SQL, CPR, CPSQL toàn cục |
| 2 | Chiến dịch/quảng cáo nào ra nhiều số nhất? | `sql_count` giảm dần |
| 3 | Chiến dịch/quảng cáo nào ra số rẻ nhất? | `cpsql` tăng dần |
| 4 | Số đó có chất lượng không? | `escape_rate`, `cp_l2`, `cp_l4` |

**Nguyên tắc xuyên suốt:** câu 3 và câu 4 phải luôn đọc cùng nhau. Quảng cáo ra số rẻ nhất thường là quảng cáo tệ nhất về chất lượng — hệ thống tồn tại chủ yếu để phát hiện trường hợp này.

## A2. Phân quyền

Một tổ chức, đăng nhập qua Supabase Auth (email + magic link). Hai vai trò:

- `user` — xem toàn bộ báo cáo
- `admin` — thêm quyền vào Cài đặt và bấm Đồng bộ

Không phân quyền phức tạp hơn ở giai đoạn 1.

## A3. Stack

| Tầng | Công nghệ | Lý do |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind | Stack sẵn có |
| UI | shadcn/ui + TanStack Table + Recharts | Bảng dày dữ liệu là màn hình chính |
| Backend | Next.js Route Handlers trên Vercel | Không cần server riêng |
| DB | Supabase Postgres — **region Singapore** | Độ trễ từ Hà Nội |
| Kết nối DB | Supabase **Pooler / Transaction mode** | Serverless mở nhiều kết nối rời rạc |
| Nguồn dữ liệu | Google Sheets API v4, Service Account read-only | Đồng bộ thủ công |
| Tầng diễn giải | Anthropic API (Claude) | Chỉ viết chữ, không tính số |
| Vercel function region | `sin1` | Cùng vùng với DB |

## A4. Bản đồ Stability Gradient

```
🔒 CỐ ĐỊNH — đầu tư kỹ, sửa sau rất đau
   ├── Schema DB (PHẦN B)
   ├── Quy tắc chuẩn hóa SĐT: 9 số bên phải
   ├── Chuỗi join: Ads --ad_id--> POSCAKE --SĐT--> CRM
   ├── Quy tắc first-touch (SĐT gán cho ad đầu tiên mang về)
   ├── Bảng quy đổi rank level
   └── Cơ chế ảnh chụp CRM + diff (không hồi tố được)

🔄 LINH HOẠT — cứ làm, sửa dễ
   ├── Toàn bộ giao diện, layout, biểu đồ
   ├── Thứ tự cột trong bảng, bộ lọc
   └── Prompt tầng AI

📦 TÁCH RIÊNG — sửa qua màn hình Cài đặt, không cần deploy
   ├── Ánh xạ cột sheet → trường chuẩn
   ├── Bảng quy đổi giá trị level → rank
   ├── Ngưỡng cảnh báo, ngưỡng cỡ mẫu tối thiểu
   ├── ID spreadsheet, tên tab, dòng header
   └── Danh sách SĐT loại trừ
```

> ⚠️ **Không được hardcode tên cột sheet ở bất kỳ đâu trong code.** Mọi thứ đọc từ bảng `sync_field_map`. Người dùng đổi tên cột trong sheet phải sửa được qua giao diện, không cần deploy lại.

## A5. Kiến trúc

```
┌──────────────────────────────────────────────────────────┐
│  GOOGLE SHEETS (nguồn, chỉ đọc)                          │
│  ① Dữ liệu quảng cáo   ② POSCAKE (lead)   ③ CRM level    │
└────────────────────────┬─────────────────────────────────┘
                         │ Google Sheets API v4 (Service Account)
                         │ ⚡ kích hoạt bằng NÚT BẤM THỦ CÔNG
┌────────────────────────▼─────────────────────────────────┐
│  VERCEL — Next.js Route Handlers (region sin1)           │
│  /api/sync/start → /step (lặp) → /finish                 │
│  Transform · Validate · Ghi bảng staging                 │
└────────────────────────┬─────────────────────────────────┘
                         │ Supabase Pooler (transaction mode)
┌────────────────────────▼─────────────────────────────────┐
│  SUPABASE POSTGRES (region Singapore)                    │
│  ├── Cấu hình   sync_source, sync_field_map, ...         │
│  ├── Staging    stg_*  (xóa sau mỗi lần sync)            │
│  ├── Sự kiện    fact_ad_daily, fact_lead, crm_row        │
│  ├── Chiều      dim_ad, dim_customer                     │
│  ├── Lịch sử    crm_snapshot, fact_level_reach           │
│  └── View       mv_ad_daily_enriched                     │
└────────────────────────┬─────────────────────────────────┘
                         │ SQL (đọc)
┌────────────────────────▼─────────────────────────────────┐
│  TẦNG QUY TẮC (deterministic, SQL/TypeScript)            │
│  Phân loại ma trận · Phát hiện bất thường · JSON output  │
└────────────────────────┬─────────────────────────────────┘
                         │ JSON có cấu trúc
┌────────────────────────▼─────────────────────────────────┐
│  TẦNG AI (Claude API) — chỉ diễn giải, KHÔNG tính số     │
└──────────────────────────────────────────────────────────┘
```

---

# PHẦN B — TẦNG DỮ LIỆU 🔒

## B1. Ba nguồn và chuỗi join

```
① Dữ liệu quảng cáo ──ad_id──> ② POSCAKE ──SĐT (9 số)──> ③ CRM
   spend, messages               first-touch                max_rank
   (theo ngày)                   (ngày lead vào)            (bậc cao nhất)
```

`Ngày tạo đơn` của POSCAKE là **nguồn ngày duy nhất** cho tầng chất lượng. Sheet CRM không có cột ngày, nên mọi phân tích theo cohort đều lấy ngày từ POSCAKE truyền sang qua SĐT.

### Cấu trúc thực tế của 3 sheet

| Sheet | Cột hiện có |
|---|---|
| **① Quảng cáo** | `ad_id` · `account_id` · `campaign_name` · `adset_name` · `ad_name` · `date_start` · `spend` · `cpm` · `cpc` · `ctr` · `Loại kết quả` · `Kết quả` |
| **② POSCAKE** | `Khách hàng` · `Thẻ` (rỗng) · `Chat page` · `SĐT phụ huynh` · `Ngày tạo đơn` · `ad_id` |
| **③ CRM** | `SĐT phụ huynh` · `Năm sinh con` · `Level UCMAS` · `Level UCKID` · `Trung tâm` · `Sale đặt lịch` · `Nguồn` · `Fanpage` |

### Đặc điểm dữ liệu đã kiểm chứng — phải xử lý

| # | Đặc điểm | Xử lý |
|---|---|---|
| 1 | Cột SĐT bị Sheets ép kiểu số → mất số 0 đầu (`0766000255` → `766000255`). Đồng thời có cả dạng `84965493772` | Quy tắc **9 số bên phải** |
| 2 | Cột `ctr` là **tỷ lệ thập phân**, không phải phần trăm. Kiểm chứng: spend 377.638 ÷ cpm 50.998 × 1000 = 7.405 impressions; ÷ cpc 5.810 = 65 clicks; CTR thật = 0,88% nhưng sheet ghi `0,01` | `ratio_to_pct` (× 100). Bị làm tròn 2 chữ số nên **không dùng để cảnh báo được** |
| 3 | Số dùng dấu phẩy thập phân, dấu chấm ngăn nghìn | `number_vn` |
| 4 | Cột `Kết quả` rỗng khi = 0 | Rỗng → `0` |
| 5 | `account_id` **rỗng hoàn toàn** ở nhóm ad hậu tố `...0550` | Không suy luận từ `ad_id`. Bộ lọc chính dùng `brand` parse từ `campaign_name` |
| 6 | Tên ad/campaign bị mojibake (`ð\x9f\x8f\x86` = 🏆) | `fix_mojibake` |
| 7 | POSCAKE có SĐT lặp nhiều dòng (một người nhắn nhiều lần) | Khử trùng + `is_first_touch` |
| 8 | CRM có SĐT lặp nhiều dòng (một phụ huynh nhiều con), có cả trường hợp **cùng SĐT, cùng năm sinh, khác level** | Không dùng `(phone, birth_year)` làm khóa. Lấy `MAX(rank)` theo SĐT |
| 9 | CRM **không có cột ngày nào** | Lịch sử bậc chỉ dựng được bằng diff giữa các lần sync |
| 10 | Thiếu `campaign_id`, `adset_id`, `impressions`, `clicks`, `reach`, `frequency` | Khóa tạm theo tên. 3 quy tắc cảnh báo tự tắt |

## B2. Schema đầy đủ

```sql
-- ══════════════════════════════════════════════════════════
-- CẤU HÌNH (📦 sửa qua giao diện)
-- ══════════════════════════════════════════════════════════

CREATE TABLE sync_source (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,      -- 'ads_daily' | 'leads' | 'crm_levels'
  display_name    text NOT NULL,
  spreadsheet_id  text,
  sheet_tab       text,
  header_row      int  DEFAULT 1,
  enabled         bool DEFAULT true,
  incremental_mode text DEFAULT 'full',      -- 'full' | 'by_date' | 'append_only'
  lookback_days   int  DEFAULT 7,
  last_sync_at    timestamptz,
  last_status     text,
  last_row_count  int,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE sync_field_map (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    uuid REFERENCES sync_source(id) ON DELETE CASCADE,
  target_field text NOT NULL,
  sheet_column text,
  transform    text DEFAULT 'none',
  is_required  bool DEFAULT false,
  sort_order   int  DEFAULT 0,
  UNIQUE (source_id, target_field)
);

CREATE TABLE sync_value_map (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    uuid REFERENCES sync_source(id) ON DELETE CASCADE,
  target_field text NOT NULL,        -- 'level_ucmas' | 'level_uckid'
  raw_value    text NOT NULL,        -- 'L3.1'
  rank         int  NOT NULL,        -- 3
  UNIQUE (source_id, target_field, raw_value)
);

CREATE TABLE app_setting (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE phone_blocklist (
  phone      char(9) PRIMARY KEY,
  reason     text,
  created_at timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════════════════
-- STAGING (xóa sau mỗi lần sync thành công)
-- ══════════════════════════════════════════════════════════

CREATE TABLE stg_ads_daily (
  run_id uuid, sheet_row int,
  ad_id text, account_id text,
  campaign_name text, adset_name text, ad_name text,
  date date, spend numeric, cpm_raw numeric, cpc_raw numeric,
  ctr_raw numeric, result_type text, messages int,
  impressions bigint, clicks bigint, reach bigint, frequency numeric
);

CREATE TABLE stg_lead (
  run_id uuid, sheet_row int,
  lead_name text, page_name text,
  phone_raw text, created_at date, ad_id text,
  source_row_key text
);

CREATE TABLE stg_crm (
  run_id uuid, sheet_row int,
  phone_raw text, child_birth_year int,
  level_ucmas_raw text, level_uckid_raw text,
  center text, sale_owner text, crm_source text, page_name text
);

-- ══════════════════════════════════════════════════════════
-- SỰ KIỆN & CHIỀU
-- ══════════════════════════════════════════════════════════

CREATE TABLE dim_ad (
  ad_id         text PRIMARY KEY,
  account_id    text,
  campaign_name text,
  adset_name    text,
  ad_name       text,
  owner         text,           -- parse từ campaign_name
  brand         text,           -- chuẩn hóa chữ thường: 'ucmas' | 'uckid'
  objective     text,
  theme         text,
  parse_status  text DEFAULT 'ok',   -- 'ok' | 'unparsed'
  creative_key  text,           -- normalize(ad_name)
  audience_key  text,           -- normalize(adset_name)
  page_name     text,
  first_seen    date,
  last_seen     date
);
CREATE INDEX ix_dim_ad_brand    ON dim_ad(brand);
CREATE INDEX ix_dim_ad_owner    ON dim_ad(owner);
CREATE INDEX ix_dim_ad_campaign ON dim_ad(campaign_name);

CREATE TABLE fact_ad_daily (
  date        date NOT NULL,
  ad_id       text NOT NULL REFERENCES dim_ad(ad_id),
  spend       numeric NOT NULL DEFAULT 0,
  messages    int     NOT NULL DEFAULT 0,
  result_type text,
  impressions bigint, clicks bigint, reach bigint, frequency numeric,
  cpm_raw numeric, cpc_raw numeric, ctr_raw numeric,
  PRIMARY KEY (date, ad_id)
);
CREATE INDEX ix_fad_date ON fact_ad_daily(date);

CREATE TABLE fact_lead (
  source_row_key text PRIMARY KEY,
  phone          char(9),
  phone_raw      text,
  phone_status   text NOT NULL,   -- 'valid' | 'invalid' | 'excluded'
  created_at     date,
  ad_id          text,            -- NULL = organic
  lead_name      text,
  page_name      text,
  is_first_touch bool DEFAULT false,
  run_id         uuid
);
CREATE INDEX ix_fl_phone   ON fact_lead(phone);
CREATE INDEX ix_fl_created ON fact_lead(created_at);
CREATE INDEX ix_fl_adid    ON fact_lead(ad_id);

CREATE TABLE crm_row (
  row_hash         text PRIMARY KEY,      -- md5 toàn bộ nội dung dòng
  phone            char(9),
  child_birth_year int,
  level_ucmas_raw  text, rank_ucmas int,
  level_uckid_raw  text, rank_uckid int,
  center text, sale_owner text, crm_source text, page_name text,
  first_seen_run   uuid,
  last_seen_run    uuid
);
CREATE INDEX ix_crm_phone ON crm_row(phone);

-- Bảng trung tâm: 1 dòng / 1 SĐT
CREATE TABLE dim_customer (
  phone          char(9) PRIMARY KEY,
  first_seen_at  date,          -- ngày lead vào, từ POSCAKE
  first_ad_id    text,          -- first-touch, NULL = organic
  first_page     text,
  max_rank       int NOT NULL DEFAULT 0,
  current_rank   int NOT NULL DEFAULT 0,
  in_crm         bool DEFAULT false,
  crm_row_count  int DEFAULT 0,
  center         text,
  sale_owner     text,
  updated_at     timestamptz DEFAULT now()
);
CREATE INDEX ix_dc_first_ad   ON dim_customer(first_ad_id);
CREATE INDEX ix_dc_first_seen ON dim_customer(first_seen_at);
CREATE INDEX ix_dc_maxrank    ON dim_customer(max_rank);

-- ══════════════════════════════════════════════════════════
-- LỊCH SỬ (không hồi tố được — phải có từ ngày đầu)
-- ══════════════════════════════════════════════════════════

CREATE TABLE crm_snapshot (
  run_id   uuid,
  phone    char(9),
  max_rank int,
  taken_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, phone)
);

CREATE TABLE fact_level_reach (
  phone            char(9),
  rank             int,
  first_reached_at timestamptz,   -- thời điểm SYNC phát hiện, không phải thời điểm thật
  detected_by_run  uuid,
  PRIMARY KEY (phone, rank)
);

-- ══════════════════════════════════════════════════════════
-- NHẬT KÝ
-- ══════════════════════════════════════════════════════════

CREATE TABLE sync_run (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   uuid REFERENCES sync_source(id),
  mode        text,        -- 'dry_run' | 'commit'
  status      text,        -- 'running' | 'success' | 'failed' | 'cancelled'
  cursor_row  int DEFAULT 0,
  total_rows  int,
  rows_read int, rows_upserted int, rows_skipped int, rows_error int,
  summary     jsonb,
  error_detail jsonb,
  started_at  timestamptz DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE sync_row_error (
  id        bigserial PRIMARY KEY,
  run_id    uuid REFERENCES sync_run(id) ON DELETE CASCADE,
  sheet_row int,
  raw_row   jsonb,
  reason    text
);
```

## B3. Thư viện transform

| Mã | Hành vi | Lỗi thì làm gì |
|---|---|---|
| `phone_vn` | Bỏ ký tự không phải số → **lấy 9 ký tự bên phải** → kiểm đầu số ∈ {3,5,7,8,9} | `phone_status='invalid'`, ghi `sync_row_error` |
| `date_dmy` | `dd/MM/yyyy` → `date` | ghi lỗi dòng |
| `date_iso` | `yyyy-MM-dd` → `date` | ghi lỗi dòng |
| `number_vn` | Bỏ dấu chấm ngăn nghìn, đổi `,` → `.`, bỏ `₫`/`VND`/`%`. Rỗng → `0` | ghi lỗi dòng |
| `ratio_to_pct` | `number_vn` rồi × 100 | ghi lỗi dòng |
| `fix_mojibake` | Sửa chuỗi UTF-8 bị đọc nhầm Latin-1 | giữ nguyên nếu không sửa được |
| `text_trim` | Trim + gộp khoảng trắng thừa | — |
| `value_map` | Tra `sync_value_map` | giá trị lạ → `rank=0` + cảnh báo trong log |
| `none` | Giữ nguyên | — |

### `phone_vn`

```typescript
export function phoneVN(raw: string): { phone: string | null; status: 'valid' | 'invalid' } {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 9) return { phone: null, status: 'invalid' };
  const p = digits.slice(-9);                        // LẤY 9 SỐ BÊN PHẢI
  if (!/^[35789]/.test(p)) return { phone: null, status: 'invalid' };
  return { phone: p, status: 'valid' };
}
```

> **Vì sao phải kiểm đầu số:** cắt-phải-9 luôn trả về chuỗi trông hợp lệ kể cả khi số gốc thừa/thiếu chữ số. Không có chốt chặn này thì lỗi nhập liệu lọt vào im lặng và biến thành một SQL ma.

### Parse `campaign_name`

```
"haicm/ucmas/mess/content a tùng - Bản sao"
  → owner='haicm', brand='ucmas', objective='mess', theme='content a tùng - Bản sao'
```

Tách bằng `/`, tối đa 4 phần, phần thứ 4 giữ nguyên toàn bộ phần còn lại. `brand` chuẩn hóa chữ thường (sheet đang lẫn `ucmas` và `UCMAS`). Không đủ 4 phần → `parse_status='unparsed'`, giữ nguyên tên đầy đủ, hiện cảnh báo trong log sync.

### `creative_key` / `audience_key`

```typescript
const normalize = (s: string) =>
  s.replace(/\s*-\s*Bản sao(\s*\d+)?\s*$/gi, '').trim().toLowerCase();
```

## B4. Ánh xạ 3 nguồn (seed cho `sync_field_map`)

### ① `ads_daily` — chế độ `by_date`, lookback 7 ngày, upsert theo `(date, ad_id)`

| `target_field` | `sheet_column` | `transform` | Bắt buộc |
|---|---|---|---|
| `ad_id` | `ad_id` | `text_trim` | ✔ |
| `account_id` | `account_id` | `text_trim` | |
| `campaign_name` | `campaign_name` | `fix_mojibake` | ✔ |
| `adset_name` | `adset_name` | `fix_mojibake` | |
| `ad_name` | `ad_name` | `fix_mojibake` | |
| `date` | `date_start` | `date_iso` | ✔ |
| `spend` | `spend` | `number_vn` | ✔ |
| `messages` | `Kết quả` | `number_vn` | ✔ |
| `result_type` | `Loại kết quả` | `text_trim` | |
| `cpm_raw` | `cpm` | `number_vn` | |
| `cpc_raw` | `cpc` | `number_vn` | |
| `ctr_raw` | `ctr` | `ratio_to_pct` | |
| `impressions` `clicks` `reach` `frequency` | *(chưa có trong sheet)* | `number_vn` | |

### ② `leads` (POSCAKE) — chế độ `append_only`

| `target_field` | `sheet_column` | `transform` | Bắt buộc |
|---|---|---|---|
| `lead_name` | `Khách hàng` | `text_trim` | |
| `page_name` | `Chat page` | `text_trim` | |
| `phone_raw` | `SĐT phụ huynh` | `phone_vn` | ✔ |
| `created_at` | `Ngày tạo đơn` | `date_dmy` | ✔ |
| `ad_id` | `ad_id` | `text_trim` | |

`source_row_key = md5(phone || created_at || COALESCE(ad_id,'') || sheet_row)`.
Cột `Thẻ` rỗng 100% — không ánh xạ.

### ③ `crm_levels` — chế độ `full`

| `target_field` | `sheet_column` | `transform` | Bắt buộc |
|---|---|---|---|
| `phone_raw` | `SĐT phụ huynh` | `phone_vn` | ✔ |
| `child_birth_year` | `Năm sinh con` | `number_vn` | |
| `level_ucmas_raw` | `Level UCMAS` | `value_map` | |
| `level_uckid_raw` | `Level UCKID` | `value_map` | |
| `center` | `Trung tâm` | `text_trim` | |
| `sale_owner` | `Sale đặt lịch` | `text_trim` | |
| `crm_source` | `Nguồn` | `text_trim` | |
| `page_name` | `Fanpage` | `text_trim` | |

`row_hash = md5(tất cả cột nối lại)`.

### Bảng quy đổi rank (seed `sync_value_map`, áp dụng cho cả 2 cột level)

| `raw_value` | `rank` |
|---|---|
| `L0.R`, `L0.K`, `L1.KK` | **0** |
| `L1`, `L1.2` | 1 |
| `L2.2A`, `L2.2B`, `L2.3` | 2 |
| `L3.1`, `L3.3` | 3 |
| `L4.1`, `L4.3`, `L4.4` | 4 |
| *(SĐT không có trong CRM)* | 0 |

## B5. Dựng `dim_customer` (chạy trong `/finish`)

Bắt buộc **khử trùng cả hai đầu trước khi join**. Không khử thì quan hệ thành nhiều-nhiều và số liệu phồng lên.

```sql
WITH poscake AS (
  SELECT phone,
         MIN(created_at) AS first_seen_at,
         (ARRAY_AGG(ad_id     ORDER BY created_at, source_row_key)
            FILTER (WHERE ad_id IS NOT NULL))[1] AS first_ad_id,
         (ARRAY_AGG(page_name ORDER BY created_at))[1] AS first_page
  FROM fact_lead
  WHERE phone_status = 'valid'
  GROUP BY phone
),
crm AS (
  SELECT phone,
         MAX(GREATEST(COALESCE(rank_ucmas,0), COALESCE(rank_uckid,0))) AS max_rank,
         COUNT(*) AS crm_rows,
         (ARRAY_AGG(center     ORDER BY row_hash) FILTER (WHERE center     <> ''))[1] AS center,
         (ARRAY_AGG(sale_owner ORDER BY row_hash) FILTER (WHERE sale_owner <> ''))[1] AS sale_owner
  FROM crm_row GROUP BY phone
)
INSERT INTO dim_customer (phone, first_seen_at, first_ad_id, first_page,
                          max_rank, current_rank, in_crm, crm_row_count,
                          center, sale_owner, updated_at)
SELECT p.phone, p.first_seen_at, p.first_ad_id, p.first_page,
       COALESCE(c.max_rank,0),
       GREATEST(COALESCE(c.max_rank,0), COALESCE(dc.max_rank,0)),  -- không bao giờ giảm
       (c.phone IS NOT NULL), COALESCE(c.crm_rows,0),
       c.center, c.sale_owner, now()
FROM poscake p
LEFT JOIN crm c USING (phone)
LEFT JOIN dim_customer dc USING (phone)
ON CONFLICT (phone) DO UPDATE SET
  max_rank      = GREATEST(dim_customer.max_rank, EXCLUDED.max_rank),
  current_rank  = EXCLUDED.current_rank,
  in_crm        = EXCLUDED.in_crm,
  crm_row_count = EXCLUDED.crm_row_count,
  center        = COALESCE(EXCLUDED.center, dim_customer.center),
  sale_owner    = COALESCE(EXCLUDED.sale_owner, dim_customer.sale_owner),
  updated_at    = now();
```

Sau đó gắn cờ first-touch và ghi lịch sử:

```sql
UPDATE fact_lead fl SET is_first_touch = true
FROM dim_customer dc
WHERE fl.phone = dc.phone AND fl.created_at = dc.first_seen_at
  AND fl.source_row_key = (
    SELECT MIN(source_row_key) FROM fact_lead
    WHERE phone = dc.phone AND created_at = dc.first_seen_at);

INSERT INTO fact_level_reach (phone, rank, first_reached_at, detected_by_run)
SELECT phone, generate_series(1, max_rank), now(), :run_id
FROM dim_customer WHERE max_rank >= 1
ON CONFLICT DO NOTHING;

INSERT INTO crm_snapshot (run_id, phone, max_rank)
SELECT :run_id, phone, max_rank FROM dim_customer;
```

**Lý do dùng `max_rank` chứ không dùng bậc hiện tại:** một khách lên bậc 3 rồi bị đẩy về bậc 1 (nghỉ, hoãn) vẫn phải được ghi nhận là quảng cáo đó đã mang về một lead chạm bậc 3. Nếu tính theo bậc hiện tại, hiệu quả quảng cáo quá khứ sẽ tự bào mòn theo thời gian. Ở đây còn là bắt buộc vì sheet CRM không có cột ngày để biết dòng nào mới hơn.

## B6. ⚠️ Quy tắc mẫu số — nhầm chiều là sai toàn bộ báo cáo

| Trường hợp | Vào mẫu số báo cáo quảng cáo? | Xử lý |
|---|---|---|
| SĐT có trong POSCAKE, **không** có trong CRM | ✔ Có | `max_rank = 0`, tính bình thường |
| SĐT có trong POSCAKE **và** trong CRM | ✔ Có | Lấy `max_rank` từ CRM |
| SĐT có trong CRM, **không** có trong POSCAKE | ✘ **Không** | Học viên cũ / nguồn PUSH / khách offline. Không tính là lead thành công, cũng không tính là lead thất bại. Hoàn toàn nằm ngoài mọi mẫu số |
| `phone_status = 'invalid'` | ✘ Không | Chỉ đếm vào `invalid_rate` |
| SĐT trong `phone_blocklist` | ✘ Không | Chỉ đếm vào log |
| Lead có SĐT nhưng `ad_id` rỗng | ✘ Không tính cho ad nào | Vào nhóm **organic**, hiển thị riêng |

## B7. Seed `app_setting`

```json
{
  "min_messages_for_ranking": 20,
  "min_sql_for_ranking": 5,
  "alert_cpr_spike_pct": 40,
  "alert_capture_trap_ratio": 0.6,
  "alert_quality_trap_ratio": 0.5,
  "alert_junk_rate": 0.25,
  "alert_frequency_cap": 3,
  "default_date_range_days": 30,
  "currency": "VND",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

## B8. Materialized view

```sql
CREATE MATERIALIZED VIEW mv_ad_daily_enriched AS
SELECT f.date, f.ad_id, d.account_id, d.campaign_name, d.adset_name, d.ad_name,
       d.owner, d.brand, d.objective, d.theme, d.creative_key, d.audience_key,
       f.spend, f.messages, f.impressions, f.clicks, f.reach, f.frequency
FROM fact_ad_daily f JOIN dim_ad d USING (ad_id);

CREATE UNIQUE INDEX ON mv_ad_daily_enriched(date, ad_id);
CREATE INDEX ON mv_ad_daily_enriched(brand, date);
CREATE INDEX ON mv_ad_daily_enriched(owner, date);
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ad_daily_enriched;  (trong /finish)
```

Chỉ vật hóa phần chi tiêu theo ngày. Phần lead/CRM tính trực tiếp trong truy vấn vì phải lọc theo `first_seen_at` trong khoảng ngày người dùng chọn.

---

# PHẦN C — TẦNG NGHIỆP VỤ 🔒

## C1. Từ điển chỉ số

```
Chi tiêu → Tin nhắn → SĐT (SQL) → rank 1 → 2 → 3 → 4
          └─ CPR ─┘  └─ CPSQL ─┘
             Meta      Đội chat     Đội tư vấn
```

| Mã | Tên hiển thị | Công thức | Hướng tốt | Đơn vị |
|---|---|---|---|---|
| `spend` | Chi tiêu | `SUM(spend)` | — | đ |
| `messages` | Tin nhắn | `SUM(messages)` | ↑ | số |
| `cpr` | CPR — Giá 1 tin nhắn | `spend / messages` | ↓ | đ |
| `sql_count` | SQL — Số điện thoại | `COUNT(dim_customer)` | ↑ | số |
| `capture_rate` | Tỷ lệ lấy số | `sql_count / messages` | ↑ | % |
| `cpsql` | CPSQL — Giá 1 SĐT | `spend / sql_count` | ↓ | đ |
| `escape_rate` | Tỷ lệ thoát bậc 0 | `r1 / sql_count` | ↑ | % |
| `cp_l1` … `cp_l4` | Giá 1 lead đạt bậc N | `spend / rN` | ↓ | đ |
| `step_rate_n` | Tỷ lệ chuyển bậc N | `rN / r(N−1)` | ↑ | % |
| `organic_share` | Tỷ trọng organic | `lead không ad_id / tổng lead` | — | % |
| `dup_rate` | Tỷ lệ trùng | `dòng không first_touch / tổng dòng` | ↓ | % |
| `invalid_rate` | Tỷ lệ SĐT lỗi | `invalid / tổng dòng` | ↓ | % |
| `match_rate` | Tỷ lệ khớp CRM | `in_crm / sql_count` | — | % |

`rN = COUNT(*) FILTER (WHERE max_rank >= N)`

> **Quan hệ then chốt phải hiện rõ trên giao diện:**
> `CPSQL = CPR ÷ Tỷ lệ lấy số`
> Khi CPSQL xấu đi, người dùng phải thấy ngay là do **CPR tăng** (lỗi quảng cáo) hay do **tỷ lệ lấy số giảm** (lỗi đội chat).

## C2. Công thức phân rã chẩn đoán

```
CP_L2 = CPR × (1 / capture_rate) × (1 / step_rate_2)
         ↑           ↑                    ↑
     Meta/creative  Đội chat          Đội tư vấn
```

Mỗi khi chi phí cuối tăng, hệ thống phải chỉ ra **vế nào** hỏng, không báo chung chung "quảng cáo kém hiệu quả". Đây là dữ liệu cho khối *Phân rã chẩn đoán* trong panel chi tiết.

## C3. Truy vấn báo cáo chính

Gộp riêng hai vế rồi mới nối — tránh nhân dòng.

```sql
WITH s AS (
  SELECT ad_id, SUM(spend) spend, SUM(messages) messages,
         SUM(impressions) impressions, SUM(clicks) clicks,
         MAX(frequency) frequency
  FROM mv_ad_daily_enriched
  WHERE date BETWEEN :from AND :to
  GROUP BY ad_id
),
l AS (
  SELECT first_ad_id AS ad_id,
         COUNT(*)                              AS sql_count,
         COUNT(*) FILTER (WHERE max_rank >= 1) AS r1,
         COUNT(*) FILTER (WHERE max_rank >= 2) AS r2,
         COUNT(*) FILTER (WHERE max_rank >= 3) AS r3,
         COUNT(*) FILTER (WHERE max_rank >= 4) AS r4,
         COUNT(*) FILTER (WHERE in_crm)        AS matched
  FROM dim_customer
  WHERE first_seen_at BETWEEN :from AND :to
    AND first_ad_id IS NOT NULL
  GROUP BY first_ad_id
)
SELECT d.ad_id, d.campaign_name, d.adset_name, d.ad_name,
       d.owner, d.brand, d.objective, d.theme, d.creative_key,
       s.spend, s.messages, COALESCE(l.sql_count,0) AS sql_count,
       s.spend             / NULLIF(s.messages,0)   AS cpr,
       l.sql_count::numeric/ NULLIF(s.messages,0)   AS capture_rate,
       s.spend             / NULLIF(l.sql_count,0)  AS cpsql,
       l.r1::numeric       / NULLIF(l.sql_count,0)  AS escape_rate,
       s.spend / NULLIF(l.r1,0) AS cp_l1,
       s.spend / NULLIF(l.r2,0) AS cp_l2,
       s.spend / NULLIF(l.r3,0) AS cp_l3,
       s.spend / NULLIF(l.r4,0) AS cp_l4,
       l.matched::numeric  / NULLIF(l.sql_count,0)  AS match_rate,
       (s.messages >= :min_msg AND COALESCE(l.sql_count,0) >= :min_sql) AS is_rankable
FROM s
JOIN dim_ad d USING (ad_id)
LEFT JOIN l USING (ad_id);
```

Đổi `GROUP BY` và khóa join sang `campaign_name` / `adset_name` / `creative_key` / `owner` / `brand` để có các mức gộp khác. Mức gộp nào cũng dùng chung mẫu truy vấn này.

## C4. Quy tắc cỡ mẫu 🔒

Ad có `messages < 20` **hoặc** `sql_count < 5` trong khoảng đã chọn thì:

- Trả về với cờ `is_rankable = false` (giao diện hiển thị mờ + nhãn)
- **Không** đưa vào xếp hạng
- **Không** đưa vào tính trung vị dùng làm ngưỡng cảnh báo

> Lý do bắt buộc: một ad chạy 2 ngày trong khoảng 90 ngày với 1 tin nhắn 1 lead sẽ cho `capture_rate = 100%` và leo lên đầu bảng, đồng thời kéo lệch trung vị dùng làm ngưỡng phân loại cho **tất cả** ad còn lại.

Ngưỡng đọc từ `app_setting`, sửa được qua giao diện.

## C5. Ma trận 2 trục

So sánh với **trung vị của nhóm cùng loại** (cùng `brand` + `objective`), tính động trong khoảng ngày đã chọn, chỉ trên các dòng `is_rankable = true`.

Trục X = `cpsql` · Trục Y = `escape_rate`

| Vùng | Điều kiện | Nhãn | Hành động đề xuất |
|---|---|---|---|
| 🟢 | CPSQL thấp + thoát bậc cao | **Nhân rộng** | Tăng ngân sách 20–30% mỗi lần, không nhân đôi đột ngột |
| 🔴 | CPSQL thấp + thoát bậc **thấp** | **Bẫy số rẻ** | Không tăng ngân sách. Soi lại creative/tệp |
| 🟡 | CPSQL cao + thoát bậc cao | **Đúng tệp nhưng đắt** | Giữ, tối ưu chi phí: đổi định dạng, siết vị trí, giảm frequency |
| ⚫ | CPSQL cao + thoát bậc thấp | **Dừng** | Tắt, dồn ngân sách sang nhóm 🟢 |

Ô 🔴 là lý do toàn bộ tầng CRM tồn tại trong hệ thống này.

## C6. Bộ quy tắc cảnh báo

`chi phí vượt chuẩn = spend − (sql_count × cpsql_trung_vị_nhóm)` — dùng để xếp thứ tự ưu tiên. Đây là số tiền lẽ ra tiết kiệm được nếu ad chạy ở mức hiệu quả trung bình.

| # | Cảnh báo | Điều kiện | Mức | Cần cột |
|---|---|---|---|---|
| 1 | **Bẫy tin nhắn rẻ** | `cpr < median` và `capture_rate < 0.6 × median` | 🔴 Cao | có sẵn |
| 2 | **Bẫy số rẻ** | `cpsql < median` và `escape_rate < 0.5 × median` | 🔴 Cao | có sẵn |
| 3 | **Đốt tiền không ra tin nhắn** | `spend ≥ 3 × median_cpr` và `messages = 0` | 🔴 Cao | có sẵn |
| 4 | **Đốt tiền không ra số** | `messages ≥ 10` và `sql_count = 0` | 🔴 Cao | có sẵn |
| 5 | **Tỷ lệ lấy số > 100%** | `capture_rate > 1` | 🔴 Cao | có sẵn |
| 6 | **Sập tỷ lệ lấy số toàn tài khoản** | giảm > 30% so với kỳ trước cùng độ dài, ở ≥ 70% số ad | 🔴 Cao | có sẵn |
| 7 | **Số rác bất thường** | `invalid_rate + dup_rate > 25%` | 🔴 Cao | có sẵn |
| 8 | **CPR leo thang** | tăng > 40% so với kỳ trước cùng độ dài | 🟡 TB | có sẵn |
| 9 | **Tắc ở một bậc** | `step_rate_n < 0.4 × median` bậc đó | 🟡 TB | có sẵn |
| 10 | **Bão hòa tệp** | `frequency > 3` và `cpr` tăng đồng thời | 🟡 TB | ⚠ thiếu |
| 11 | **Creative mòn** | `ctr` giảm > 25% và `frequency > 3` | 🟡 TB | ⚠ thiếu |
| 12 | **Đấu giá đắt lên** | `cpm` tăng > 30% nhưng `ctr` không đổi | 🔵 Thấp | ⚠ thiếu |

### Suy giảm mềm khi thiếu cột

Nếu nguồn chưa bổ sung `impressions`, `clicks`, `frequency` thì quy tắc 10–12 **tự tắt**, API trả về `disabled_rules` kèm danh sách cột còn thiếu. Toàn bộ phần còn lại chạy đủ.

Cột `ctr` hiện có **không** thay thế được: đang là tỷ lệ thập phân bị làm tròn 2 chữ số, gộp cả dải 0,5%–2,4% vào hai giá trị `0,01` và `0,02`.

### Cảnh báo #6 — phân biệt lỗi quảng cáo với lỗi vận hành

So sánh phương sai `capture_rate` giữa các ad trong cùng kỳ:

- **Lệch đều ở mọi ad** → vấn đề ở kịch bản chat hoặc thời gian phản hồi, không phải Meta
- **Lệch cục bộ ở vài ad** → vấn đề ở tệp/creative của chính những ad đó

Hệ thống tự chạy phép so sánh này và ghi kết luận vào cảnh báo.

## C7. Tầng AI — nguyên tắc "CODE TÍNH, AI VIẾT"

**Tầng quy tắc** (SQL/TypeScript) tính toàn bộ con số, xuất JSON.
**Tầng AI** (Claude API) nhận JSON, chỉ viết diễn giải tiếng Việt. AI **không** được tự tính số.

Kết quả: chạy lại 10 lần vẫn ra cùng một con số, chỉ khác cách diễn đạt.

```
Bạn là chuyên gia phân tích quảng cáo Facebook cho ngành giáo dục trẻ em tại Việt Nam.

DỮ LIỆU (đã tính sẵn, tuyệt đối không tính lại, không suy diễn thêm số):
{{JSON_METRICS}}

BỐI CẢNH:
- Mục tiêu quảng cáo là tin nhắn. Phễu: Chi tiêu → Tin nhắn → SĐT → bậc 1,2,3,4
- CPR thuộc trách nhiệm người chạy ads
- Tỷ lệ lấy số thuộc trách nhiệm đội chat
- Tỷ lệ chuyển bậc thuộc trách nhiệm đội tư vấn
- Hành trình khách hàng ngành giáo dục dài ngày, bậc 3–4 cần 30–90 ngày mới chín

YÊU CẦU:
1. Viết 3–5 câu tóm tắt hiện trạng khoảng {{FROM}} – {{TO}}
2. Với mỗi cảnh báo trong danh sách, viết 1–2 câu giải thích nguyên nhân khả dĩ
   và 1 hành động cụ thể. Xếp theo "chi phí vượt chuẩn" giảm dần.
3. Chỉ rõ vấn đề thuộc vế nào của phễu (quảng cáo / đội chat / đội tư vấn)

RÀNG BUỘC:
- Chỉ dùng đúng các con số có trong JSON. Không làm tròn khác đi, không ước lượng.
- Không đề xuất tăng ngân sách cho ad có nhãn "Bẫy số rẻ", dù CPSQL thấp.
- Ad có is_rankable = false: nêu là chưa đủ dữ liệu, không kết luận hiệu quả.
- Tiếng Việt, văn phong trực tiếp, không khách sáo, không mở đầu bằng lời chào.
- Trả về markdown thuần, không dùng heading cấp 1.
```

Cache kết quả theo `hash(khoảng ngày + bộ lọc + max(updated_at))` để không gọi lại API khi dữ liệu chưa đổi.

---

# PHẦN D — TẦNG API

## D1. Danh sách route

| Method | Route | Mô tả | Quyền |
|---|---|---|---|
| `GET` | `/api/report/summary` | KPI tổng + so sánh kỳ trước | user |
| `GET` | `/api/report/performance` | Bảng hiệu suất theo mức gộp | user |
| `GET` | `/api/report/timeseries` | Chuỗi thời gian theo ngày | user |
| `GET` | `/api/report/detail/:level/:id` | Chi tiết 1 đối tượng | user |
| `GET` | `/api/report/funnel` | Phân rã phễu + phân bố bậc | user |
| `GET` | `/api/report/alerts` | Cảnh báo đã xếp hạng | user |
| `POST` | `/api/report/ai-summary` | Diễn giải AI | user |
| `GET` | `/api/leads` | Tra cứu lead / SĐT | user |
| `GET` | `/api/health/data-quality` | Chỉ số sức khỏe dữ liệu | user |
| `GET` | `/api/settings/sources` | Đọc cấu hình 3 nguồn | admin |
| `PUT` | `/api/settings/sources/:code` | Lưu cấu hình | admin |
| `POST` | `/api/settings/inspect-sheet` | Đọc header + 5 dòng đầu | admin |
| `POST` | `/api/settings/automap` | Gợi ý khớp cột tự động | admin |
| `GET` | `/api/settings/level-values` | Quét giá trị level chưa gán rank | admin |
| `POST` | `/api/sync/start` | Khởi tạo phiên đồng bộ | admin |
| `POST` | `/api/sync/step` | Xử lý 1 lô | admin |
| `POST` | `/api/sync/finish` | Chốt vào bảng chính | admin |
| `POST` | `/api/sync/cancel` | Hủy phiên treo | admin |
| `GET` | `/api/sync/runs` | Lịch sử 20 lần gần nhất | admin |
| `GET` | `/api/sync/runs/:id/errors` | Chi tiết dòng lỗi | admin |

## D2. Tham số dùng chung

Mọi route `/api/report/*` nhận:

```typescript
{
  from: string;          // 'YYYY-MM-DD' — BẮT BUỘC
  to: string;            // 'YYYY-MM-DD' — BẮT BUỘC
  level?: 'ad' | 'adset' | 'campaign' | 'creative' | 'owner' | 'brand';  // mặc định 'campaign'
  brand?: string[];
  owner?: string[];
  account_id?: string[];
  page_name?: string[];
  include_unrankable?: boolean;   // mặc định false
  sort?: string;                  // 'cpsql:asc'
  page?: number;
  page_size?: number;             // mặc định 50
}
```

`level` và `sort` phải đối chiếu với **danh sách trắng** trước khi ghép vào SQL.

## D3. Máy trạng thái đồng bộ

```
POST /api/sync/start   { source_id, mode: 'dry_run' | 'commit' }
  → khóa: nếu đã có sync_run status='running' < 15 phút → trả 409
  → tạo sync_run, cursor_row = header_row + 1
  → trả { run_id, total_rows }

POST /api/sync/step    { run_id }
  → đọc 500–2000 dòng từ cursor_row
  → transform → validate → ghi stg_* (hoặc chỉ đếm nếu dry_run)
  → cập nhật cursor_row
  → trả { done: boolean, progress: 0..1, rows_ok, rows_error }
  → lặp cho đến done = true

POST /api/sync/finish  { run_id }
  → nếu dry_run: trả báo cáo, xóa staging, kết thúc
  → nếu commit, trong MỘT transaction:
      1. upsert dim_ad (parse campaign_name, sinh creative_key/audience_key)
      2. upsert fact_ad_daily theo (date, ad_id)
      3. upsert fact_lead theo source_row_key
      4. replace crm_row (mode 'full')
      5. dựng lại dim_customer  (B5)
      6. gắn cờ is_first_touch
      7. ghi fact_level_reach + crm_snapshot
      8. REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ad_daily_enriched
      9. ghi sync_run, xóa staging
  → trả tóm tắt

POST /api/sync/cancel  { run_id }
```

Frontend gọi `/step` liên tục và vẽ thanh tiến trình. Mỗi lượt chỉ vài giây nên không bao giờ chạm giới hạn thời gian của Vercel, dù dữ liệu lớn đến đâu. Bảng staging riêng theo `run_id` để lỗi giữa chừng thì bảng chính vẫn nguyên vẹn.

## D4. Bảo mật

- Khóa Google Service Account lưu ở env var **dạng base64**, không lưu trong DB
- Share 3 sheet cho email service account với quyền **Viewer**
- Route `/api/sync/*` và `/api/settings/*` kiểm `role = 'admin'` từ Supabase Auth
- RLS bật trên toàn bộ bảng; `service_role` chỉ dùng trong route handler phía server
- Route `/api/report/*` chỉ đọc, không nhận SQL thô từ client

---

# PHẦN E — TRIỂN KHAI

## E1. Cấu trúc thư mục

```
/app
  /(dashboard)
    layout.tsx
    page.tsx                    → Tổng quan
    /performance/page.tsx
    /funnel/page.tsx
    /alerts/page.tsx
    /leads/page.tsx
  /(admin)
    /sync/page.tsx
    /settings/[tab]/page.tsx
  /api
    /report/{summary,performance,timeseries,detail,funnel,alerts,ai-summary}/route.ts
    /leads/route.ts
    /health/data-quality/route.ts
    /settings/{sources,inspect-sheet,automap,level-values}/route.ts
    /sync/{start,step,finish,cancel,runs}/route.ts
/lib
  /sheets      googleClient.ts · reader.ts
  /transform   index.ts · phone.ts · date.ts · number.ts · mojibake.ts · campaign.ts
  /domain      metrics.ts · matrix.ts · alerts.ts · thresholds.ts   ← 🔒
  /db          client.ts · queries/*.sql.ts
  /ai          prompt.ts · client.ts · cache.ts
  /format      vnd.ts · percent.ts · date.ts
/components    atoms/ molecules/ organisms/ templates/
/supabase      /migrations/*.sql · seed.sql
```

`/lib/domain` **không được import** bất cứ thứ gì từ Next.js, React hay Supabase client. Toàn bộ logic tính chỉ số, phân loại ma trận và phát hiện cảnh báo nằm ở đây, nhận vào dữ liệu thuần và trả về dữ liệu thuần — để test được và để đổi framework không phải viết lại.

## E2. Biến môi trường

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                      # Pooler / transaction mode
GOOGLE_SERVICE_ACCOUNT_B64=        # JSON key mã hóa base64
ANTHROPIC_API_KEY=
SYNC_CHUNK_SIZE=1000
SYNC_LOCK_TIMEOUT_MINUTES=15
```

## E3. Định dạng hiển thị (dùng chung frontend)

```
Tiền:      < 1.000          → "847 đ"
           1.000–999.999    → "285 N"
           ≥ 1.000.000      → "1,24 Tr"
           ≥ 1.000.000.000  → "1,24 Tỷ"
           Bảng chi tiết: số đầy đủ "285.087 đ"

Phần trăm: 1 chữ số thập phân — "12,3%"
Số đếm:    ngăn nghìn dấu chấm — "1.240"
Thập phân: dấu phẩy
Rỗng:      "—"  (không hiện "0" hay "NaN")
```

## E4. Lộ trình 2 pha

**Pha 1 — dùng được (1–2 tuần)**
Schema đầy đủ (kể cả bảng lịch sử) · 3 luồng sync + Cài đặt · Tổng quan · Bảng hiệu suất · Đồng bộ

> ⚠️ `crm_snapshot` và `fact_level_reach` **phải có ngay từ pha 1** dù chưa dùng đến. Sheet CRM không có cột ngày, nên lịch sử bậc chỉ dựng được bằng cách so sánh ảnh chụp giữa các lần sync — dữ liệu không hồi tố được, chậm ngày nào mất ngày đó.

**Pha 2 — phân tích (1 tuần)**
Phễu & chất lượng · Cảnh báo · Diễn giải AI · Tra cứu lead · Ma trận 2 trục

## E5. Rủi ro kỹ thuật

| # | Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|
| 1 | **Tỷ lệ khớp lead → CRM thấp** | Toàn bộ tầng chất lượng rỗng | Hiện `match_rate` trên màn hình Đồng bộ ngay từ lần sync đầu. Dưới 10% → cảnh báo. Hệ thống vẫn chạy đủ với CPR + CPSQL |
| 2 | Cột SĐT kiểu số, mất số 0 đầu | Sai định dạng | Quy tắc 9-số-bên-phải đã xử lý. Vẫn nên đổi cột sang kiểu Văn bản ở nguồn |
| 3 | Timeout Vercel khi dữ liệu lớn | Sync đứt giữa chừng | Chunk + cursor (D3) |
| 4 | Hết connection slot Postgres | Lỗi ngẫu nhiên | Pooler transaction mode, bắt buộc |
| 5 | Supabase free tier tự ngủ | Sync thất bại sau vài ngày không dùng | Gói trả phí, hoặc cron ping hằng tuần |
| 6 | Đổi tên chiến dịch | Vỡ lịch sử vì chưa có `campaign_id` | Bổ sung `campaign_id`/`adset_id` vào export. Trước mắt: khóa theo tên + `first_seen` |
| 7 | Giá trị level mới trong CRM | Tính nhầm rank 0 | Quét tự động, gắn nhãn 🆕, cảnh báo sau mỗi sync |
| 8 | Hai người bấm Đồng bộ cùng lúc | Dữ liệu nửa vời | Khóa `sync_run` + timeout 15 phút + nút hủy thủ công |

## E6. Cột nên bổ sung vào nguồn dữ liệu quảng cáo

| Cột | Mở khóa được gì |
|---|---|
| `impressions`, `clicks` | Tính lại CTR/CPC chính xác (cột `ctr` hiện tại không dùng được) |
| `frequency`, `reach` | Cảnh báo #10 Bão hòa tệp, #11 Creative mòn |
| `campaign_id`, `adset_id` | Khóa bền — hiện chỉ có tên, đổi tên là vỡ lịch sử |
| `ad_status` | Phân biệt "ad kém" với "ad đã tắt" |
| `account_id` cho nhóm `...0550` | Bộ lọc theo tài khoản quảng cáo |

Không có cũng chạy được — 9/12 cảnh báo vẫn hoạt động.

## E7. Checklist nghiệm thu

- [ ] `0912345678`, `84912345678`, `+84 912 345 678`, `912345678` đều cho `912345678`
- [ ] Số bắt đầu bằng 0/1/2/4/6 sau chuẩn hóa → `invalid`, hiện trong bảng lỗi
- [ ] Chạy sync 2 lần liên tiếp không tạo bản ghi trùng
- [ ] SĐT xuất hiện 4 lần cùng ngày cùng ad → đúng 1 SQL
- [ ] SĐT có trong CRM nhưng không có trong POSCAKE → không xuất hiện ở bất kỳ mẫu số nào
- [ ] `L0.R`, `L0.K`, `L1.KK` đều cho rank 0
- [ ] Phụ huynh có 3 con ở 3 bậc → `max_rank` = bậc cao nhất, đúng 1 dòng `dim_customer`
- [ ] Khách từng lên bậc 3 rồi tụt về bậc 1 → `max_rank` vẫn = 3
- [ ] Đổi khoảng ngày → mọi chỉ số đổi theo, kể cả tầng chất lượng
- [ ] Ad có 12 tin nhắn → `is_rankable = false`, không vào xếp hạng, không vào trung vị
- [ ] Đổi tên cột trong sheet → sửa được trong Cài đặt, không cần deploy
- [ ] Chạy thử không ghi gì vào bảng chính
- [ ] Ngắt mạng giữa chừng khi sync → bảng chính nguyên vẹn
- [ ] Diễn giải AI chạy 3 lần cho cùng dữ liệu → con số không đổi
- [ ] Thiếu cột `frequency` → 3 cảnh báo tự tắt kèm lý do, phần còn lại chạy đủ
