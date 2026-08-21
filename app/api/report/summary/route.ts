import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { getLivePerformance } from "@/lib/infrastructure/repositories/report-repository";
import { sumPerformance } from "@/lib/domain/metrics";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const liveRows = await getLivePerformance({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      level: "campaign",
    });
    const rows = liveRows || [];
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
        compared_period: null,
      },
      meta: { source: "live", updated_at: new Date().toISOString() },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
