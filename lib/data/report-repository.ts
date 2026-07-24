import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePerformance, median } from "@/lib/domain/metrics";
import { classifyMatrix } from "@/lib/domain/matrix";
import type { CalculatedPerformanceRow, PerformanceRow } from "@/lib/domain/types";
import { createAdminClient, liveDataUnavailable } from "@/lib/supabase/admin";

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
}) {
  const client = createAdminClient();
  if (!client) return null;

  try {
    const ads = await fetchAll<AdDailyRow>((from, to) => {
      let query = client
        .from("fact_ad_daily")
        .select(
          "date,ad_id,spend,messages,impressions,clicks,reach,frequency,dim_ad!inner(ad_id,account_id,campaign_name,adset_name,ad_name,owner,brand,objective,creative_key)",
        )
        .order("date", { ascending: true })
        .range(from, to);
      if (options.from) query = query.gte("date", options.from);
      if (options.to) query = query.lte("date", options.to);
      return query;
    });

    const leads = await fetchAll<LeadRow>((from, to) => {
      let query = client
        .from("fact_lead")
        .select("source_row_key,phone,phone_status,created_at,ad_id,lead_name,page_name,is_first_touch")
        .order("source_row_key", { ascending: true })
        .range(from, to);
      if (options.from) query = query.gte("created_at", options.from);
      if (options.to) query = query.lte("created_at", options.to);
      return query;
    });

    const dimensions = new Map<string, AdDimension>();
    ads.forEach((row) => {
      const dimension = oneDimension(row.dim_ad);
      if (dimension) dimensions.set(row.ad_id, dimension);
    });

    const groups = new Map<string, GroupAccumulator>();
    ads.forEach((row) => {
      const dimension = oneDimension(row.dim_ad);
      if (!dimension) return;
      const identity = levelIdentity(options.level, dimension);
      const existing = groups.get(identity.id) || {
        ...identity,
        owner: dimension.owner || "Chưa gán",
        brand: dimension.brand || "ucmas",
        objective: dimension.objective || "Tin nhắn",
        adIds: new Set<string>(),
        spend: 0,
        messages: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        leadRows: [],
      };
      existing.adIds.add(row.ad_id);
      existing.spend += asNumber(row.spend);
      existing.messages += asNumber(row.messages);
      existing.impressions += asNumber(row.impressions);
      existing.clicks += asNumber(row.clicks);
      existing.reach += asNumber(row.reach);
      groups.set(identity.id, existing);
    });

    const groupByAd = new Map<string, GroupAccumulator>();
    groups.forEach((group) => group.adIds.forEach((adId) => groupByAd.set(adId, group)));
    leads.forEach((lead) => {
      if (!lead.ad_id) return;
      groupByAd.get(lead.ad_id)?.leadRows.push(lead);
    });

    const phones = [
      ...new Set(
        leads
          .filter((lead) => lead.phone_status === "valid" && lead.phone)
          .map((lead) => lead.phone as string),
      ),
    ];
    const customers = await fetchCustomers(client, phones);

    const calculated = [...groups.values()].map((group) => {
      const validRows = group.leadRows.filter((lead) => lead.phone_status === "valid" && lead.phone);
      const uniquePhones = [...new Set(validRows.map((lead) => lead.phone as string))];
      const matched = uniquePhones.map((phone) => customers.get(phone)).filter(Boolean) as CustomerRow[];
      const totalLeadRows = group.leadRows.length;
      const raw: PerformanceRow = {
        id: group.id,
        name: group.name,
        owner: group.owner,
        brand: group.brand,
        objective: group.objective,
        status: "active",
        spend: group.spend,
        messages: group.messages,
        sql: uniquePhones.length,
        rank1: matched.filter((customer) => customer.max_rank >= 1).length,
        rank2: matched.filter((customer) => customer.max_rank >= 2).length,
        rank3: matched.filter((customer) => customer.max_rank >= 3).length,
        rank4: matched.filter((customer) => customer.max_rank >= 4).length,
        duplicateRate: validRows.length ? (validRows.length - uniquePhones.length) / validRows.length : 0,
        invalidRate: totalLeadRows
          ? group.leadRows.filter((lead) => lead.phone_status === "invalid").length / totalLeadRows
          : 0,
        matchRate: uniquePhones.length
          ? matched.filter((customer) => customer.in_crm).length / uniquePhones.length
          : 0,
        cpm: group.impressions ? (group.spend / group.impressions) * 1000 : undefined,
        ctr: group.impressions ? group.clicks / group.impressions : undefined,
        frequency: group.reach ? group.impressions / group.reach : undefined,
        zone: "unranked",
      };
      return calculatePerformance(raw);
    });

    const rankable = calculated.filter((row) => row.isRankable);
    const medianCpsql = median(rankable.map((row) => row.cpsql)) || 0;
    const medianEscape = median(rankable.map((row) => row.escapeRate)) || 0;
    return calculated.map((row) => {
      const zone = classifyMatrix(row.cpsql, row.escapeRate, medianCpsql, medianEscape, row.isRankable);
      const next = { ...row, zone };
      return { ...next, warning: warningFor(next) };
    });
  } catch (error) {
    throw liveDataUnavailable(error);
  }
}

export async function getLiveTimeseries(options: { from?: string | null; to?: string | null }) {
  const client = createAdminClient();
  if (!client) return null;

  try {
    const ads = await fetchAll<Omit<AdDailyRow, "dim_ad">>((from, to) => {
      let query = client
        .from("fact_ad_daily")
        .select("date,ad_id,spend,messages,impressions,clicks,reach,frequency")
        .order("date", { ascending: true })
        .range(from, to);
      if (options.from) query = query.gte("date", options.from);
      if (options.to) query = query.lte("date", options.to);
      return query;
    });
    const leads = await fetchAll<Pick<LeadRow, "source_row_key" | "created_at" | "phone" | "phone_status">>(
      (from, to) => {
        let query = client
          .from("fact_lead")
          .select("source_row_key,created_at,phone,phone_status")
          .order("source_row_key", { ascending: true })
          .range(from, to);
        if (options.from) query = query.gte("created_at", options.from);
        if (options.to) query = query.lte("created_at", options.to);
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
}

export async function getLiveLeads(options: { from?: string | null; to?: string | null }) {
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
}
