import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { getLivePerformance } from "@/lib/infrastructure/repositories/report-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const live = await getLivePerformance({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      level: "campaign",
    });
    if (!live || live.length === 0) {
      return NextResponse.json({
        data: { steps: [], capture_by_owner: [], level_distribution: [], health: [] },
        meta: { source: "live" },
      });
    }

    const totals = live.reduce(
      (sum, row) => ({
        messages: sum.messages + row.messages,
        sql: sum.sql + row.sql,
        rank1: sum.rank1 + row.rank1,
        rank2: sum.rank2 + row.rank2,
        rank3: sum.rank3 + row.rank3,
        rank4: sum.rank4 + row.rank4,
      }),
      { messages: 0, sql: 0, rank1: 0, rank2: 0, rank3: 0, rank4: 0 },
    );
    const rate = (value: number, previous: number) => (previous ? value / previous : 0);
    const owners = new Map<string, { sql: number; messages: number }>();
    live.forEach((row) => {
      const current = owners.get(row.owner) || { sql: 0, messages: 0 };
      current.sql += row.sql;
      current.messages += row.messages;
      owners.set(row.owner, current);
    });
    const brands = (["ucmas", "uckid"] as const).map((brand) => {
      const rows = live.filter((row) => row.brand === brand);
      const totalSql = rows.reduce((sum, row) => sum + row.sql, 0);
      const asPercent = (value: number) => (totalSql ? (value / totalSql) * 100 : 0);
      const rank1 = rows.reduce((sum, row) => sum + row.rank1, 0);
      const rank2 = rows.reduce((sum, row) => sum + row.rank2, 0);
      const rank3 = rows.reduce((sum, row) => sum + row.rank3, 0);
      const rank4 = rows.reduce((sum, row) => sum + row.rank4, 0);
      return {
        brand: brand.toUpperCase(),
        rank0: asPercent(Math.max(0, totalSql - rank1)),
        rank1: asPercent(Math.max(0, rank1 - rank2)),
        rank2: asPercent(Math.max(0, rank2 - rank3)),
        rank3: asPercent(Math.max(0, rank3 - rank4)),
        rank4: asPercent(rank4),
      };
    });
    return NextResponse.json({
      data: {
        steps: [
          { label: "Tin nhắn", value: totals.messages, rate: 1, owner: "Meta / người chạy ads" },
          { label: "SĐT (SQL)", value: totals.sql, rate: rate(totals.sql, totals.messages), owner: "Đội chat" },
          { label: "Bậc 1+", value: totals.rank1, rate: rate(totals.rank1, totals.sql), owner: "Đội tư vấn" },
          { label: "Bậc 2+", value: totals.rank2, rate: rate(totals.rank2, totals.rank1), owner: "Đội tư vấn" },
          { label: "Bậc 3+", value: totals.rank3, rate: rate(totals.rank3, totals.rank2), owner: "Đội tư vấn" },
          { label: "Bậc 4", value: totals.rank4, rate: rate(totals.rank4, totals.rank3), owner: "Đội tư vấn" },
        ],
        capture_by_owner: [...owners].map(([name, value]) => ({
          name,
          value: rate(value.sql, value.messages),
        })),
        level_distribution: brands,
        health: [
          {
            label: "Lead có gắn quảng cáo",
            value: totals.sql ? live.reduce((sum, row) => sum + row.sql, 0) / totals.sql : 0,
            tone: "blue",
          },
          {
            label: "Lead khớp được CRM",
            value: totals.sql
              ? live.reduce((sum, row) => sum + row.matchRate * row.sql, 0) / totals.sql
              : 0,
            tone: "amber",
          },
          {
            label: "SĐT lỗi định dạng",
            value: live.reduce((sum, row) => sum + row.invalidRate, 0) / Math.max(live.length, 1),
            tone: "green",
          },
          {
            label: "SĐT trùng",
            value: live.reduce((sum, row) => sum + row.duplicateRate, 0) / Math.max(live.length, 1),
            tone: "green",
          },
        ],
      },
      meta: { mode: "live" },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
