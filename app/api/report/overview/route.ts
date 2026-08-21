import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { getLivePerformance, getLiveTimeseries } from "@/lib/infrastructure/repositories/report-repository";
import { sumPerformance } from "@/lib/domain/metrics";
import type { ReportLevel } from "@/lib/infrastructure/repositories/report-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const level = (url.searchParams.get("level") as ReportLevel) || "campaign";

    // Run in parallel
    const [performanceRows, timeseriesData] = await Promise.all([
      getLivePerformance({ from, to, level }),
      getLiveTimeseries({ from, to }),
    ]);

    const rows = performanceRows || [];
    const totals = sumPerformance(rows);
    const liveKpis = [
      { key: "spend", label: "Chi tiêu", value: totals.spend, delta: 0, quality: "neutral", kind: "money" },
      { key: "messages", label: "Tin nhắn", value: totals.messages, delta: 0, quality: "neutral", kind: "count" },
      { key: "cpr", label: "CPR", value: totals.cpr || 0, delta: 0, quality: "neutral", kind: "money" },
      { key: "sql", label: "SQL", value: totals.sql, delta: 0, quality: "neutral", kind: "count" },
      { key: "capture", label: "Tỷ lệ lấy số", value: totals.captureRate || 0, delta: 0, quality: "neutral", kind: "percent" },
      { key: "cpsql", label: "CPSQL", value: totals.cpsql || 0, delta: 0, quality: "neutral", kind: "money" },
    ];

    return NextResponse.json({
      data: {
        kpis: liveKpis,
        totals,
        performance: rows,
        timeseries: timeseriesData || [],
        compared_period: null,
      },
      meta: { source: "live", updated_at: new Date().toISOString() },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
