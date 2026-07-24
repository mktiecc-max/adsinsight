-- AdsInsight v1 — schema nguồn cho Supabase Postgres.
-- Áp dụng bằng Supabase SQL Editor hoặc psql. Tất cả bảng public đều bật RLS.

begin;

create extension if not exists pgcrypto;

-- ═══════════════════════════════════════════════════════════════
-- CẤU HÌNH
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.sync_source (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('ads_daily', 'leads', 'crm_levels')),
  display_name text not null,
  spreadsheet_id text,
  sheet_tab text,
  header_row integer not null default 1 check (header_row > 0),
  enabled boolean not null default true,
  incremental_mode text not null default 'full'
    check (incremental_mode in ('full', 'by_date', 'append_only')),
  lookback_days integer not null default 7 check (lookback_days >= 0),
  last_sync_at timestamptz,
  last_status text check (last_status is null or last_status in ('running', 'success', 'failed', 'cancelled')),
  last_row_count bigint check (last_row_count is null or last_row_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_field_map (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sync_source(id) on delete cascade,
  target_field text not null,
  sheet_column text,
  transform text not null default 'none'
    check (transform in ('phone_vn', 'date_dmy', 'date_iso', 'number_vn', 'ratio_to_pct', 'fix_mojibake', 'text_trim', 'value_map', 'none')),
  is_required boolean not null default false,
  sort_order integer not null default 0,
  unique (source_id, target_field)
);

create index if not exists sync_field_map_source_id_idx on public.sync_field_map(source_id);

create table if not exists public.sync_value_map (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sync_source(id) on delete cascade,
  target_field text not null check (target_field in ('level_ucmas', 'level_uckid')),
  raw_value text not null,
  rank smallint not null check (rank between 0 and 4),
  unique (source_id, target_field, raw_value)
);

create index if not exists sync_value_map_source_id_idx on public.sync_value_map(source_id);

create table if not exists public.app_setting (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.phone_blocklist (
  phone char(9) primary key check (phone ~ '^[35789][0-9]{8}$'),
  reason text,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- STAGING — tách theo run_id để phiên lỗi không ảnh hưởng dữ liệu chính.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.stg_ads_daily (
  run_id uuid not null,
  sheet_row bigint not null check (sheet_row > 0),
  ad_id text,
  account_id text,
  campaign_name text,
  adset_name text,
  ad_name text,
  date date,
  spend numeric(18, 2),
  cpm_raw numeric(18, 4),
  cpc_raw numeric(18, 4),
  ctr_raw numeric(12, 6),
  result_type text,
  messages bigint,
  impressions bigint,
  clicks bigint,
  reach bigint,
  frequency numeric(12, 4)
);

create index if not exists stg_ads_daily_run_id_idx on public.stg_ads_daily(run_id);

create table if not exists public.stg_lead (
  run_id uuid not null,
  sheet_row bigint not null check (sheet_row > 0),
  lead_name text,
  page_name text,
  phone_raw text,
  created_at date,
  ad_id text,
  source_row_key text
);

create index if not exists stg_lead_run_id_idx on public.stg_lead(run_id);

create table if not exists public.stg_crm (
  run_id uuid not null,
  sheet_row bigint not null check (sheet_row > 0),
  phone_raw text,
  child_birth_year integer,
  level_ucmas_raw text,
  level_uckid_raw text,
  center text,
  sale_owner text,
  crm_source text,
  page_name text
);

create index if not exists stg_crm_run_id_idx on public.stg_crm(run_id);

-- ═══════════════════════════════════════════════════════════════
-- SỰ KIỆN & CHIỀU
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.dim_ad (
  ad_id text primary key,
  account_id text,
  campaign_name text,
  adset_name text,
  ad_name text,
  owner text,
  brand text check (brand is null or brand in ('ucmas', 'uckid')),
  objective text,
  theme text,
  parse_status text not null default 'ok' check (parse_status in ('ok', 'unparsed')),
  creative_key text,
  audience_key text,
  page_name text,
  first_seen date,
  last_seen date,
  check (first_seen is null or last_seen is null or first_seen <= last_seen)
);

create index if not exists dim_ad_brand_owner_idx on public.dim_ad(brand, owner);
create index if not exists dim_ad_campaign_name_idx on public.dim_ad(campaign_name);
create index if not exists dim_ad_creative_key_idx on public.dim_ad(creative_key);

create table if not exists public.fact_ad_daily (
  date date not null,
  ad_id text not null references public.dim_ad(ad_id) on delete restrict,
  spend numeric(18, 2) not null default 0 check (spend >= 0),
  messages bigint not null default 0 check (messages >= 0),
  result_type text,
  impressions bigint check (impressions is null or impressions >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  reach bigint check (reach is null or reach >= 0),
  frequency numeric(12, 4) check (frequency is null or frequency >= 0),
  cpm_raw numeric(18, 4),
  cpc_raw numeric(18, 4),
  ctr_raw numeric(12, 6),
  primary key (date, ad_id)
);

create index if not exists fact_ad_daily_ad_id_idx on public.fact_ad_daily(ad_id);
create index if not exists fact_ad_daily_date_ad_id_idx on public.fact_ad_daily(date, ad_id);

create table if not exists public.fact_lead (
  source_row_key text primary key,
  phone char(9),
  phone_raw text,
  phone_status text not null check (phone_status in ('valid', 'invalid', 'excluded')),
  created_at date,
  ad_id text references public.dim_ad(ad_id) on delete set null,
  lead_name text,
  page_name text,
  is_first_touch boolean not null default false,
  run_id uuid,
  check (phone is null or phone ~ '^[35789][0-9]{8}$')
);

create index if not exists fact_lead_phone_created_idx on public.fact_lead(phone, created_at);
create index if not exists fact_lead_created_at_ad_id_idx on public.fact_lead(created_at, ad_id);
create index if not exists fact_lead_ad_id_idx on public.fact_lead(ad_id);

create table if not exists public.crm_row (
  row_hash text primary key,
  phone char(9),
  child_birth_year integer check (child_birth_year is null or child_birth_year between 1990 and 2100),
  level_ucmas_raw text,
  rank_ucmas smallint check (rank_ucmas is null or rank_ucmas between 0 and 4),
  level_uckid_raw text,
  rank_uckid smallint check (rank_uckid is null or rank_uckid between 0 and 4),
  center text,
  sale_owner text,
  crm_source text,
  page_name text,
  first_seen_run uuid,
  last_seen_run uuid,
  check (phone is null or phone ~ '^[35789][0-9]{8}$')
);

create index if not exists crm_row_phone_idx on public.crm_row(phone);

create table if not exists public.dim_customer (
  phone char(9) primary key check (phone ~ '^[35789][0-9]{8}$'),
  first_seen_at date,
  first_ad_id text references public.dim_ad(ad_id) on delete set null,
  first_page text,
  max_rank smallint not null default 0 check (max_rank between 0 and 4),
  current_rank smallint not null default 0 check (current_rank between 0 and 4),
  in_crm boolean not null default false,
  crm_row_count bigint not null default 0 check (crm_row_count >= 0),
  center text,
  sale_owner text,
  updated_at timestamptz not null default now()
);

create index if not exists dim_customer_first_ad_id_idx on public.dim_customer(first_ad_id);
create index if not exists dim_customer_first_seen_ad_idx on public.dim_customer(first_seen_at, first_ad_id);
create index if not exists dim_customer_max_rank_idx on public.dim_customer(max_rank);

-- ═══════════════════════════════════════════════════════════════
-- LỊCH SỬ — phải tồn tại từ lần sync đầu vì CRM không có ngày.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.crm_snapshot (
  run_id uuid not null,
  phone char(9) not null references public.dim_customer(phone) on delete cascade,
  max_rank smallint not null check (max_rank between 0 and 4),
  taken_at timestamptz not null default now(),
  primary key (run_id, phone)
);

create index if not exists crm_snapshot_phone_idx on public.crm_snapshot(phone);
create index if not exists crm_snapshot_taken_at_idx on public.crm_snapshot(taken_at);

create table if not exists public.fact_level_reach (
  phone char(9) not null references public.dim_customer(phone) on delete cascade,
  rank smallint not null check (rank between 1 and 4),
  first_reached_at timestamptz not null,
  detected_by_run uuid not null,
  primary key (phone, rank)
);

create index if not exists fact_level_reach_detected_by_run_idx on public.fact_level_reach(detected_by_run);

-- ═══════════════════════════════════════════════════════════════
-- NHẬT KÝ
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.sync_run (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sync_source(id) on delete restrict,
  mode text not null check (mode in ('dry_run', 'commit')),
  status text not null check (status in ('running', 'success', 'failed', 'cancelled')),
  cursor_row bigint not null default 0 check (cursor_row >= 0),
  total_rows bigint check (total_rows is null or total_rows >= 0),
  rows_read bigint not null default 0 check (rows_read >= 0),
  rows_upserted bigint not null default 0 check (rows_upserted >= 0),
  rows_skipped bigint not null default 0 check (rows_skipped >= 0),
  rows_error bigint not null default 0 check (rows_error >= 0),
  summary jsonb,
  error_detail jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (finished_at is null or finished_at >= started_at)
);

create index if not exists sync_run_source_started_idx on public.sync_run(source_id, started_at desc);
create unique index if not exists sync_run_one_running_idx on public.sync_run((status))
  where status = 'running';

create table if not exists public.sync_row_error (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.sync_run(id) on delete cascade,
  sheet_row bigint,
  raw_row jsonb not null,
  reason text not null
);

create index if not exists sync_row_error_run_id_idx on public.sync_row_error(run_id);

-- Materialized view chỉ phục vụ server/service_role; không expose thẳng qua Data API.
create materialized view if not exists public.mv_ad_daily_enriched as
select
  f.date,
  f.ad_id,
  d.account_id,
  d.campaign_name,
  d.adset_name,
  d.ad_name,
  d.owner,
  d.brand,
  d.objective,
  d.theme,
  d.creative_key,
  d.audience_key,
  f.spend,
  f.messages,
  f.impressions,
  f.clicks,
  f.reach,
  f.frequency
from public.fact_ad_daily f
join public.dim_ad d using (ad_id)
with no data;

create unique index if not exists mv_ad_daily_enriched_date_ad_idx
  on public.mv_ad_daily_enriched(date, ad_id);
create index if not exists mv_ad_daily_enriched_brand_date_idx
  on public.mv_ad_daily_enriched(brand, date);
create index if not exists mv_ad_daily_enriched_owner_date_idx
  on public.mv_ad_daily_enriched(owner, date);

-- ═══════════════════════════════════════════════════════════════
-- RLS & QUYỀN TỐI THIỂU
-- ═══════════════════════════════════════════════════════════════

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sync_source', 'sync_field_map', 'sync_value_map', 'app_setting',
    'phone_blocklist', 'stg_ads_daily', 'stg_lead', 'stg_crm',
    'dim_ad', 'fact_ad_daily', 'fact_lead', 'crm_row', 'dim_customer',
    'crm_snapshot', 'fact_level_reach', 'sync_run', 'sync_row_error'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Báo cáo: mọi người dùng đã đăng nhập trong tổ chức được đọc.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'dim_ad', 'fact_ad_daily', 'fact_lead', 'crm_row', 'dim_customer',
    'crm_snapshot', 'fact_level_reach'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_authenticated_read',
      table_name
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null)',
      table_name || '_authenticated_read',
      table_name
    );
  end loop;
end $$;

-- Cấu hình và nhật ký: user được đọc, chỉ admin từ app_metadata được ghi.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sync_source', 'sync_field_map', 'sync_value_map', 'app_setting',
    'phone_blocklist', 'sync_run', 'sync_row_error'
  ]
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_authenticated_read',
      table_name
    );
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_admin_write',
      table_name
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) is not null)',
      table_name || '_authenticated_read',
      table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (((select auth.jwt()) -> ''app_metadata'' ->> ''role'') = ''admin'') with check (((select auth.jwt()) -> ''app_metadata'' ->> ''role'') = ''admin'')',
      table_name || '_admin_write',
      table_name
    );
  end loop;
end $$;

-- Staging chỉ đi qua server bằng secret/service role, không có policy client.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant select on table
  public.dim_ad,
  public.fact_ad_daily,
  public.fact_lead,
  public.crm_row,
  public.dim_customer,
  public.crm_snapshot,
  public.fact_level_reach,
  public.sync_source,
  public.sync_field_map,
  public.sync_value_map,
  public.app_setting,
  public.phone_blocklist,
  public.sync_run,
  public.sync_row_error
to authenticated;

grant insert, update, delete on table
  public.sync_source,
  public.sync_field_map,
  public.sync_value_map,
  public.app_setting,
  public.phone_blocklist
to authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on public.mv_ad_daily_enriched from anon, authenticated;
grant select on public.mv_ad_daily_enriched to service_role;

-- Project cũ có thể tự grant bảng mới. Thu hồi mặc định cho client roles để
-- các bảng tạo về sau chỉ xuất hiện trên Data API khi được opt-in rõ ràng.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
