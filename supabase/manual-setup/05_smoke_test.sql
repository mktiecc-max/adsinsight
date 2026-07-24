-- Smoke test có transaction và ROLLBACK: không để lại dữ liệu thử.
-- Chạy sau 04_verify_setup.sql.

begin;

insert into public.dim_ad (
  ad_id,
  campaign_name,
  adset_name,
  ad_name,
  owner,
  brand,
  objective,
  first_seen,
  last_seen
)
values (
  '__adsinsight_smoke_test__',
  'Smoke test campaign',
  'Smoke test adset',
  'Smoke test ad',
  'system',
  'ucmas',
  'Tin nhắn',
  current_date,
  current_date
);

insert into public.fact_ad_daily (
  date,
  ad_id,
  spend,
  messages,
  impressions,
  clicks,
  reach
)
values (
  current_date,
  '__adsinsight_smoke_test__',
  100000,
  10,
  2000,
  50,
  1500
);

select
  d.campaign_name,
  f.spend,
  f.messages,
  round(f.spend / nullif(f.messages, 0), 2) as cpr
from public.fact_ad_daily f
join public.dim_ad d using (ad_id)
where f.ad_id = '__adsinsight_smoke_test__';

rollback;

-- Kết quả mong đợi sau rollback: 0.
select count(*) as smoke_rows_after_rollback
from public.dim_ad
where ad_id = '__adsinsight_smoke_test__';
