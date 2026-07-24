-- Script chỉ đọc, dùng để kiểm tra sau khi chạy schema.sql và seed.sql.
-- Cột status của tất cả dòng nên là OK.

with expected_tables(table_name) as (
  values
    ('sync_source'),
    ('sync_field_map'),
    ('sync_value_map'),
    ('app_setting'),
    ('phone_blocklist'),
    ('stg_ads_daily'),
    ('stg_lead'),
    ('stg_crm'),
    ('dim_ad'),
    ('fact_ad_daily'),
    ('fact_lead'),
    ('crm_row'),
    ('dim_customer'),
    ('crm_snapshot'),
    ('fact_level_reach'),
    ('sync_run'),
    ('sync_row_error')
),
actual_tables as (
  select tablename as table_name
  from pg_tables
  where schemaname = 'public'
),
rls_tables as (
  select relname as table_name
  from pg_class
  where relnamespace = 'public'::regnamespace
    and relkind = 'r'
    and relrowsecurity
)
select
  '01_tables_created' as check_name,
  case
    when (select count(*) from expected_tables e join actual_tables a using (table_name)) = 17
      then 'OK'
    else 'ERROR'
  end as status,
  format(
    '%s/17 bảng',
    (select count(*) from expected_tables e join actual_tables a using (table_name))
  ) as detail
union all
select
  '02_rls_enabled',
  case
    when (select count(*) from expected_tables e join rls_tables r using (table_name)) = 17
      then 'OK'
    else 'ERROR'
  end,
  format(
    '%s/17 bảng bật RLS',
    (select count(*) from expected_tables e join rls_tables r using (table_name))
  )
union all
select
  '03_anon_has_no_fact_access',
  case
    when not has_table_privilege('anon', 'public.fact_lead', 'select')
      and not has_table_privilege('anon', 'public.fact_ad_daily', 'select')
      then 'OK'
    else 'ERROR'
  end,
  'anon không được đọc bảng fact'
union all
select
  '04_authenticated_can_read_reports',
  case
    when has_table_privilege('authenticated', 'public.fact_lead', 'select')
      and has_table_privilege('authenticated', 'public.fact_ad_daily', 'select')
      and has_table_privilege('authenticated', 'public.dim_customer', 'select')
      then 'OK'
    else 'ERROR'
  end,
  'authenticated được SELECT các bảng báo cáo'
union all
select
  '05_authenticated_cannot_read_staging',
  case
    when not has_table_privilege('authenticated', 'public.stg_ads_daily', 'select')
      and not has_table_privilege('authenticated', 'public.stg_lead', 'select')
      and not has_table_privilege('authenticated', 'public.stg_crm', 'select')
      then 'OK'
    else 'ERROR'
  end,
  'staging chỉ dành cho secret/service role'
union all
select
  '06_sources_seeded',
  case when (select count(*) from public.sync_source) = 3 then 'OK' else 'ERROR' end,
  format('%s/3 nguồn', (select count(*) from public.sync_source))
union all
select
  '07_settings_seeded',
  case when (select count(*) from public.app_setting) >= 9 then 'OK' else 'ERROR' end,
  format('%s cấu hình', (select count(*) from public.app_setting))
union all
select
  '08_field_maps_seeded',
  case when (select count(*) from public.sync_field_map) >= 20 then 'OK' else 'ERROR' end,
  format('%s field mappings', (select count(*) from public.sync_field_map))
union all
select
  '09_materialized_view_private',
  case
    when not has_table_privilege('anon', 'public.mv_ad_daily_enriched', 'select')
      and not has_table_privilege('authenticated', 'public.mv_ad_daily_enriched', 'select')
      and has_table_privilege('service_role', 'public.mv_ad_daily_enriched', 'select')
      then 'OK'
    else 'ERROR'
  end,
  'materialized view chỉ cấp cho service_role'
order by check_name;

-- Kiểm tra user admin. Có thể trả 0 dòng nếu chưa chạy 03_make_admin.sql.
select
  id,
  email,
  raw_app_meta_data ->> 'role' as role,
  last_sign_in_at
from auth.users
where raw_app_meta_data ->> 'role' = 'admin'
order by created_at;

-- Kiểm tra policy đã tạo.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
