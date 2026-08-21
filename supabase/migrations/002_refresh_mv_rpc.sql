create or replace function refresh_mv_ad_daily_enriched()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view public.mv_ad_daily_enriched;
end;
$$;
