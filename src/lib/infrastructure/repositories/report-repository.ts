import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePerformance, median } from "@/lib/domain/metrics";
import { classifyMatrix } from "@/lib/domain/matrix";
import type { CalculatedPerformanceRow, PerformanceRow } from "@/lib/domain/types";
import { createAdminClient, liveDataUnavailable } from "@/lib/infrastructure/supabase/admin";
import { unstable_cache } from "next/cache";

export type ReportLevel = "ad" | "adset" | "campaign" | "creative" | "owner" | "brand";

type AdDimension = {
  ad_id: string;
  account_id: string | null;
  campaign_name: string | null;
  adset_name: string | null;
  ad_name: string | null;
  owner: string | null;
  brand: "ucmas" | "uckid" | null;
  objective: string | null;
  creative_key: string | null;
};

type AdDailyRow = {
  date: string;
  ad_id: string;
  spend: number | string;
  messages: number | string;
  impressions: number | string | null;
  clicks: number | string | null;
  reach: number | string | null;
  frequency: number | string | null;
  dim_ad: AdDimension | AdDimension[] | null;
};

type LeadRow = {
  source_row_key: string;
  phone: string | null;
  phone_status: "valid" | "invalid" | "excluded";
  created_at: string | null;
  ad_id: string | null;
  lead_name: string | null;
  page_name: string | null;
  is_first_touch: boolean;
};

type CustomerRow = {
  phone: string;
  max_rank: number;
  in_crm: boolean;
};

type GroupAccumulator = {
  id: string;
  name: string;
  owner: string;
  brand: "ucmas" | "uckid";
  objective: string;
  adIds: Set<string>;
  spend: number;
  messages: number;
  impressions: number;
  clicks: number;
  reach: number;
  leadRows: LeadRow[];
};

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function oneDimension(value: AdDailyRow["dim_ad"]) {
  return Array.isArray(value) ? value[0] : value;
}

function levelIdentity(level: ReportLevel, dimension: AdDimension) {
  const values: Record<ReportLevel, string | null> = {
    ad: dimension.ad_name || dimension.ad_id,
    adset: dimension.adset_name,
    campaign: dimension.campaign_name,
    creative: dimension.creative_key || dimension.ad_name || dimension.ad_id,
    owner: dimension.owner,
    brand: dimension.brand,
  };
  const name = values[level] || "Chưa phân loại";
  return { id: `${level}:${name}`, name };
}

async function fetchAll<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function fetchCustomers(client: SupabaseClient, phones: string[]) {
  const result = new Map<string, CustomerRow>();
  for (let index = 0; index < phones.length; index += 500) {
    const chunk = phones.slice(index, index + 500);
    if (!chunk.length) continue;
    const { data, error } = await client
      .from("dim_customer")
      .select("phone,max_rank,in_crm")
      .in("phone", chunk);
    if (error) throw new Error(error.message);
    (data as CustomerRow[] | null)?.forEach((customer) => result.set(customer.phone, customer));
  }
  return result;
}

function warningFor(row: CalculatedPerformanceRow) {
  if (row.captureRate !== null && row.captureRate > 1) return "Tỷ lệ lấy số vượt 100%";
  if (row.zone === "trap") return "Bẫy số rẻ";
  if (row.zone === "stop") return "Đốt tiền không ra số";
  if ((row.frequency || 0) >= 3) return "CPR leo thang";
  return undefined;
}

export async function getLivePerformance(options: {
  from?: string | null;
  to?: string | null;
  level: ReportLevel;
  brand?: string | null;
  owner?: string | null;
  account?: string | null;
}): Promise<CalculatedPerformanceRow[] | null> {
  const fetchCached = unstable_cache(
    async () => {
      const client = createAdminClient();
      if (!client) return null;

      try {
        const { data: rawGroups, error } = await client.rpc("report_performance", {
          p_from_date: options.from || null,
          p_to_date: options.to || null,
          p_level: options.level === "creative" ? "creative" : options.level === "brand" ? "brand" : options.level === "owner" ? "owner" : options.level === "ad" ? "ad" : options.level === "adset" ? "adset" : options.level === "campaign" ? "campaign" : "account",
          p_brands: options.brand ? [options.brand] : null,
          p_owners: options.owner ? [options.owner] : null,
          p_accounts: options.account ? [options.account] : null,
        });
        if (error) throw error;

    const calculated = (rawGroups || []).map((group: any) => {
      const raw: PerformanceRow = {
        id: group.id,
        name: group.name,
        owner: group.owner,
        brand: group.brand,
        objective: group.objective,
        status: "active",
        spend: group.spend,
        messages: group.messages,
        sql: group.sql_count,
        rank1: group.rank1,
        rank2: group.rank2,
        rank3: group.rank3,
        rank4: group.rank4,
        duplicateRate: group.duplicate_rate,
        invalidRate: group.invalid_rate,
        matchRate: group.match_rate,
        cpm: group.impressions ? (group.spend / group.impressions) * 1000 : undefined,
        ctr: group.impressions ? group.clicks / group.impressions : undefined,
        frequency: group.reach ? group.impressions / group.reach : undefined,
        zone: "unranked",
      };
      return calculatePerformance(raw);
    });

    const rankable = calculated.filter((row: CalculatedPerformanceRow) => row.isRankable);
    const medianCpsql = median(rankable.map((row: CalculatedPerformanceRow) => row.cpsql)) || 0;
    const medianEscape = median(rankable.map((row: CalculatedPerformanceRow) => row.escapeRate)) || 0;
    return calculated.map((row: CalculatedPerformanceRow) => {
      const zone = classifyMatrix(row.cpsql, row.escapeRate, medianCpsql, medianEscape, row.isRankable);
      const next = { ...row, zone };
      return { ...next, warning: warningFor(next) };
    });
  } catch (error) {
    console.error("report_performance RPC error:", error);
    throw liveDataUnavailable(error);
  }
    },
    [`performance-${options.from || "all"}-${options.to || "all"}-${options.level}-${options.brand || "all"}-${options.owner || "all"}-${options.account || "all"}`],
    { tags: ["report"], revalidate: 3600 }
  );
  return fetchCached();
}

export async function getLiveTimeseries(options: { 
  from?: string | null; 
  to?: string | null;
  brand?: string | null;
  owner?: string | null;
  account?: string | null;
}) {
  const fetchCached = unstable_cache(
    async () => {
      const client = createAdminClient();
      if (!client) return null;

      try {
        const ads = await fetchAll<any>((from, to) => {
          let query = client
            .from("mv_ad_daily_enriched")
            .select("date,ad_id,spend,messages,impressions,clicks,reach")
            .order("date", { ascending: true })
            .range(from, to);
          if (options.from) query = query.gte("date", options.from);
          if (options.to) query = query.lte("date", options.to);
          if (options.brand) query = query.eq("brand", options.brand);
          if (options.owner) query = query.eq("owner", options.owner);
          if (options.account) query = query.eq("account_id", options.account);
          return query;
        });
    const leads = await fetchAll<any>(
      (from, to) => {
        let query = client
          .from("fact_lead")
          .select("source_row_key,created_at,phone,phone_status,dim_ad!inner(brand,owner,account_id)")
          .order("source_row_key", { ascending: true })
          .range(from, to);
        if (options.from) query = query.gte("created_at", options.from);
        if (options.to) query = query.lte("created_at", options.to);
        if (options.brand) query = query.eq("dim_ad.brand", options.brand);
        if (options.owner) query = query.eq("dim_ad.owner", options.owner);
        if (options.account) query = query.eq("dim_ad.account_id", options.account);
        return query;
      },
    );
    const days = new Map<string, { spend: number; phones: Set<string> }>();
    ads.forEach((row) => {
      const current = days.get(row.date) || { spend: 0, phones: new Set<string>() };
      current.spend += asNumber(row.spend);
      days.set(row.date, current);
    });
    leads.forEach((lead) => {
      if (!lead.created_at || lead.phone_status !== "valid" || !lead.phone) return;
      const current = days.get(lead.created_at) || { spend: 0, phones: new Set<string>() };
      current.phones.add(lead.phone);
      days.set(lead.created_at, current);
    });
    return [...days.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, value]) => ({
        day: new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
          new Date(`${date}T00:00:00+07:00`),
        ),
        date,
        spend: value.spend,
        sql: value.phones.size,
        cpsql: value.phones.size ? value.spend / value.phones.size : 0,
      }));
  } catch (error) {
    throw liveDataUnavailable(error);
  }
    },
    [`timeseries-${options.from || "all"}-${options.to || "all"}-${options.brand || "all"}-${options.owner || "all"}-${options.account || "all"}`],
    { tags: ["report"], revalidate: 3600 }
  );
  return fetchCached();
}

export async function getLiveLeads(options: { from?: string | null; to?: string | null }) {
  const fetchCached = unstable_cache(
    async () => {
      const client = createAdminClient();
      if (!client) return null;

      try {
        const leads = await fetchAll<LeadRow>((from, to) => {
          let query = client
            .from("fact_lead")
            .select("source_row_key,phone,phone_status,created_at,ad_id,lead_name,page_name,is_first_touch")
            .order("created_at", { ascending: false, nullsFirst: false })
            .range(from, to);
          if (options.from) query = query.gte("created_at", options.from);
          if (options.to) query = query.lte("created_at", options.to);
          return query;
        });
    const adIds = [...new Set(leads.map((lead) => lead.ad_id).filter(Boolean))] as string[];
    const dimensions = new Map<string, Pick<AdDimension, "ad_id" | "ad_name" | "campaign_name">>();
    for (let index = 0; index < adIds.length; index += 500) {
      const { data, error } = await client
        .from("dim_ad")
        .select("ad_id,ad_name,campaign_name")
        .in("ad_id", adIds.slice(index, index + 500));
      if (error) throw new Error(error.message);
      (data || []).forEach((row) => dimensions.set(row.ad_id, row));
    }
    const customers = await fetchCustomers(
      client,
      [...new Set(leads.map((lead) => lead.phone).filter(Boolean))] as string[],
    );
    const seenPhones = new Set<string>();
    return leads.map((lead) => {
      const dimension = lead.ad_id ? dimensions.get(lead.ad_id) : undefined;
      const customer = lead.phone ? customers.get(lead.phone) : undefined;
      const duplicate = Boolean(lead.phone && seenPhones.has(lead.phone));
      if (lead.phone) seenPhones.add(lead.phone);
      return {
        id: lead.source_row_key,
        phone: lead.phone || "",
        name: lead.lead_name || "—",
        date: lead.created_at
          ? new Intl.DateTimeFormat("vi-VN").format(new Date(`${lead.created_at}T00:00:00+07:00`))
          : "—",
        ad: dimension?.ad_name || "",
        campaign: dimension?.campaign_name || "",
        page: lead.page_name || "",
        rank: customer?.max_rank || 0,
        crm: customer?.in_crm || false,
        status:
          lead.phone_status === "invalid"
            ? "Lỗi"
            : lead.phone_status === "excluded"
              ? "Loại trừ"
              : duplicate
                ? "Trùng"
                : "Hợp lệ",
      };
    });
  } catch (error) {
    throw liveDataUnavailable(error);
  }
    },
    [`leads-${options.from || "all"}-${options.to || "all"}`],
    { tags: ["report"], revalidate: 3600 }
  );
  return fetchCached();
}

export async function getUntrackedFunnel(options: { 
  from?: string | null; 
  to?: string | null;
  brand?: string | null;
  owner?: string | null;
  account?: string | null;
}) {
  const fetchCached = unstable_cache(
    async () => {
      const client = createAdminClient();
      if (!client) return { sql: 0, rank1: 0, rank2: 0, rank3: 0, rank4: 0 };

      try {
        let query = client
          .from("dim_customer")
          .select("max_rank, first_seen_at")
          .is("first_ad_id", null);

        if (options.from && options.to) {
          query = query
            .or(`first_seen_at.gte.${options.from},and(first_seen_at.is.null,updated_at.gte.${options.from})`)
            .or(`first_seen_at.lte.${options.to},and(first_seen_at.is.null,updated_at.lte.${options.to})`);
        } else if (options.from) {
          query = query.or(`first_seen_at.gte.${options.from},and(first_seen_at.is.null,updated_at.gte.${options.from})`);
        } else if (options.to) {
          query = query.or(`first_seen_at.lte.${options.to},and(first_seen_at.is.null,updated_at.lte.${options.to})`);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const rows = data || [];
        const result = { sql: rows.length, rank1: 0, rank2: 0, rank3: 0, rank4: 0 };

        rows.forEach((r: any) => {
          if (r.max_rank >= 1) result.rank1++;
          if (r.max_rank >= 2) result.rank2++;
          if (r.max_rank >= 3) result.rank3++;
          if (r.max_rank >= 4) result.rank4++;
        });

        return result;
      } catch (error) {
        console.error("getUntrackedFunnel error:", error);
        return { sql: 0, rank1: 0, rank2: 0, rank3: 0, rank4: 0 };
      }
    },
    [`untracked-${options.from || "all"}-${options.to || "all"}`],
    { tags: ["report"], revalidate: 3600 }
  );
  return fetchCached();
}

export async function getLiveAdsData(options: {
  from?: string | null;
  to?: string | null;
  brand?: string | null;
  owner?: string | null;
  account?: string | null;
}) {
  const fetchCached = unstable_cache(
    async () => {
      const client = createAdminClient();
      if (!client) return null;

      try {
        let query = client
          .from("mv_ad_daily_enriched")
          .select("date,campaign_name,adset_name,ad_name,owner,brand,account_id,spend,messages,impressions,clicks,reach")
          .order("date", { ascending: false, nullsFirst: false });
          
        if (options.from) query = query.gte("date", options.from);
        if (options.to) query = query.lte("date", options.to);
        if (options.brand) query = query.eq("brand", options.brand);
        if (options.owner) query = query.eq("owner", options.owner);
        if (options.account) query = query.eq("account_id", options.account);

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
      } catch (error) {
        throw liveDataUnavailable(error);
      }
    },
    [`ads-data-${options.from || "all"}-${options.to || "all"}-${options.brand || "all"}-${options.owner || "all"}-${options.account || "all"}`],
    { tags: ["report"], revalidate: 3600 }
  );
  return fetchCached();
}

export async function getLiveCrmData(options: {
  from?: string | null;
  to?: string | null;
  brand?: string | null;
  owner?: string | null;
}) {
  const fetchCached = unstable_cache(
    async () => {
      const client = createAdminClient();
      if (!client) return null;

      try {
        let query = client
          .from("dim_customer")
          .select("phone,first_seen_at,max_rank,current_rank,center,sale_owner,updated_at,in_crm,dim_ad!first_ad_id(brand,owner,account_id)")
          .order("first_seen_at", { ascending: false, nullsFirst: true });

        if (options.from) query = query.gte("first_seen_at", options.from);
        if (options.to) query = query.lte("first_seen_at", options.to);
        
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        
        let rows = data || [];
        
        if (options.brand || options.owner) {
          rows = rows.filter((row: any) => {
            if (!row.dim_ad) return false;
            if (options.brand && row.dim_ad.brand !== options.brand) return false;
            if (options.owner && row.dim_ad.owner !== options.owner) return false;
            return true;
          });
        }
        
        return rows;
      } catch (error) {
        throw liveDataUnavailable(error);
      }
    },
    [`crm-data-${options.from || "all"}-${options.to || "all"}-${options.brand || "all"}-${options.owner || "all"}`],
    { tags: ["report"], revalidate: 3600 }
  );
  return fetchCached();
}
