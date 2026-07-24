begin;

insert into public.sync_source (code, display_name, incremental_mode, lookback_days)
values
  ('ads_daily', 'Quảng cáo', 'by_date', 7),
  ('leads', 'Lead POSCAKE', 'append_only', 0),
  ('crm_levels', 'Bậc CRM', 'full', 0)
on conflict (code) do update set
  display_name = excluded.display_name,
  incremental_mode = excluded.incremental_mode,
  lookback_days = excluded.lookback_days;

insert into public.app_setting (key, value)
values
  ('min_messages_for_ranking', '20'::jsonb),
  ('min_sql_for_ranking', '5'::jsonb),
  ('alert_cpr_spike_pct', '40'::jsonb),
  ('alert_capture_trap_ratio', '0.6'::jsonb),
  ('alert_quality_trap_ratio', '0.5'::jsonb),
  ('alert_junk_rate', '0.25'::jsonb),
  ('alert_frequency_cap', '3'::jsonb),
  ('default_date_range_days', '30'::jsonb),
  ('currency', '"VND"'::jsonb),
  ('timezone', '"Asia/Ho_Chi_Minh"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

with sources as (
  select id, code from public.sync_source
),
maps(code, target_field, sheet_column, transform, is_required, sort_order) as (
  values
    ('ads_daily', 'ad_id', 'ad_id', 'text_trim', true, 10),
    ('ads_daily', 'account_id', 'account_id', 'text_trim', false, 20),
    ('ads_daily', 'campaign_name', 'campaign_name', 'fix_mojibake', true, 30),
    ('ads_daily', 'adset_name', 'adset_name', 'fix_mojibake', false, 40),
    ('ads_daily', 'ad_name', 'ad_name', 'fix_mojibake', false, 50),
    ('ads_daily', 'date', 'date_start', 'date_iso', true, 60),
    ('ads_daily', 'spend', 'spend', 'number_vn', true, 70),
    ('ads_daily', 'messages', 'Kết quả', 'number_vn', true, 80),
    ('ads_daily', 'result_type', 'Loại kết quả', 'text_trim', false, 90),
    ('ads_daily', 'cpm_raw', 'cpm', 'number_vn', false, 100),
    ('ads_daily', 'cpc_raw', 'cpc', 'number_vn', false, 110),
    ('ads_daily', 'ctr_raw', 'ctr', 'ratio_to_pct', false, 120),
    ('leads', 'lead_name', 'Khách hàng', 'text_trim', false, 10),
    ('leads', 'page_name', 'Chat page', 'text_trim', false, 20),
    ('leads', 'phone_raw', 'SĐT phụ huynh', 'phone_vn', true, 30),
    ('leads', 'created_at', 'Ngày tạo đơn', 'date_dmy', true, 40),
    ('leads', 'ad_id', 'ad_id', 'text_trim', false, 50),
    ('crm_levels', 'phone_raw', 'SĐT phụ huynh', 'phone_vn', true, 10),
    ('crm_levels', 'child_birth_year', 'Năm sinh con', 'number_vn', false, 20),
    ('crm_levels', 'level_ucmas_raw', 'Level UCMAS', 'value_map', false, 30),
    ('crm_levels', 'level_uckid_raw', 'Level UCKID', 'value_map', false, 40),
    ('crm_levels', 'center', 'Trung tâm', 'text_trim', false, 50),
    ('crm_levels', 'sale_owner', 'Sale đặt lịch', 'text_trim', false, 60),
    ('crm_levels', 'crm_source', 'Nguồn', 'text_trim', false, 70),
    ('crm_levels', 'page_name', 'Fanpage', 'text_trim', false, 80)
)
insert into public.sync_field_map (source_id, target_field, sheet_column, transform, is_required, sort_order)
select sources.id, maps.target_field, maps.sheet_column, maps.transform, maps.is_required, maps.sort_order
from maps join sources using (code)
on conflict (source_id, target_field) do update set
  sheet_column = excluded.sheet_column,
  transform = excluded.transform,
  is_required = excluded.is_required,
  sort_order = excluded.sort_order;

with crm as (
  select id from public.sync_source where code = 'crm_levels'
),
levels(raw_value, rank) as (
  values
    ('L0.R', 0), ('L0.K', 0), ('L1.KK', 0),
    ('L1', 1), ('L1.2', 1),
    ('L2.2A', 2), ('L2.2B', 2), ('L2.3', 2),
    ('L3.1', 3), ('L3.3', 3),
    ('L4.1', 4), ('L4.3', 4), ('L4.4', 4)
),
targets(target_field) as (
  values ('level_ucmas'), ('level_uckid')
)
insert into public.sync_value_map (source_id, target_field, raw_value, rank)
select crm.id, targets.target_field, levels.raw_value, levels.rank
from crm cross join targets cross join levels
on conflict (source_id, target_field, raw_value) do update set rank = excluded.rank;

commit;
