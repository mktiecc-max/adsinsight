create or replace function report_performance(
  p_from_date date default null,
  p_to_date date default null,
  p_level text default 'campaign',
  p_brands text[] default null,
  p_owners text[] default null,
  p_accounts text[] default null
) returns table (
  id text,
  name text,
  owner text,
  brand text,
  objective text,
  spend numeric,
  messages bigint,
  impressions bigint,
  clicks bigint,
  reach bigint,
  sql_count bigint,
  rank1 bigint,
  rank2 bigint,
  rank3 bigint,
  rank4 bigint,
  duplicate_rate numeric,
  invalid_rate numeric,
  match_rate numeric
) language sql stable security definer as $$
  with filtered_ads as (
    select
      ad_id,
      owner,
      brand,
      objective,
      case
        when p_level = 'account' then account_id
        when p_level = 'campaign' then campaign_name
        when p_level = 'adset' then adset_name
        when p_level = 'ad' then ad_name
        when p_level = 'owner' then owner
        when p_level = 'brand' then brand
        when p_level = 'creative' then creative_key
        else ad_id
      end as group_id,
      case
        when p_level = 'account' then account_id
        when p_level = 'campaign' then campaign_name
        when p_level = 'adset' then adset_name
        when p_level = 'ad' then ad_name
        when p_level = 'owner' then owner
        when p_level = 'brand' then brand
        when p_level = 'creative' then creative_key
        else ad_name
      end as group_name,
      spend, messages, impressions, clicks, reach
    from public.mv_ad_daily_enriched
    where (p_from_date is null or date >= p_from_date)
      and (p_to_date is null or date <= p_to_date)
      and (p_brands is null or brand = any(p_brands))
      and (p_owners is null or owner = any(p_owners))
      and (p_accounts is null or account_id = any(p_accounts))
  ),
  ad_groups as (
    select
      group_id,
      max(group_name) as group_name,
      max(owner) as owner,
      max(brand) as brand,
      max(objective) as objective,
      sum(spend) as spend,
      sum(messages) as messages,
      sum(impressions) as impressions,
      sum(clicks) as clicks,
      sum(reach) as reach,
      array_agg(distinct ad_id) as ad_ids
    from filtered_ads
    group by group_id
  ),
  lead_stats as (
    select
      ag.group_id,
      count(fl.phone) as total_lead_rows,
      count(fl.phone) filter (where fl.phone_status = 'invalid') as invalid_lead_rows,
      count(distinct fl.phone) filter (where fl.phone_status = 'valid') as sql_count,
      count(fl.phone) filter (where fl.phone_status = 'valid') as valid_lead_rows,
      count(distinct c.phone) filter (where c.max_rank >= 1) as rank1,
      count(distinct c.phone) filter (where c.max_rank >= 2) as rank2,
      count(distinct c.phone) filter (where c.max_rank >= 3) as rank3,
      count(distinct c.phone) filter (where c.max_rank >= 4) as rank4,
      count(distinct c.phone) filter (where c.in_crm) as matched_crm
    from ad_groups ag
    left join public.fact_lead fl on fl.ad_id = any(ag.ad_ids)
      and (p_from_date is null or fl.created_at >= p_from_date)
      and (p_to_date is null or fl.created_at <= p_to_date)
    left join public.dim_customer c on c.phone = fl.phone and fl.phone_status = 'valid'
    group by ag.group_id
  )
  select
    ag.group_id as id,
    ag.group_name as name,
    ag.owner,
    ag.brand,
    ag.objective,
    ag.spend,
    ag.messages,
    ag.impressions,
    ag.clicks,
    ag.reach,
    coalesce(ls.sql_count, 0) as sql_count,
    coalesce(ls.rank1, 0) as rank1,
    coalesce(ls.rank2, 0) as rank2,
    coalesce(ls.rank3, 0) as rank3,
    coalesce(ls.rank4, 0) as rank4,
    case when ls.valid_lead_rows > 0 then (ls.valid_lead_rows - coalesce(ls.sql_count, 0))::numeric / ls.valid_lead_rows else 0 end as duplicate_rate,
    case when ls.total_lead_rows > 0 then ls.invalid_lead_rows::numeric / ls.total_lead_rows else 0 end as invalid_rate,
    case when coalesce(ls.sql_count, 0) > 0 then ls.matched_crm::numeric / ls.sql_count else 0 end as match_rate
  from ad_groups ag
  left join lead_stats ls on ls.group_id = ag.group_id;
$$;
