import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";
import { getLivePerformance } from "@/lib/data/report-repository";
import { detectAlerts } from "@/lib/domain/alerts";
import { formatPercent, formatVnd } from "@/lib/format";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const live = await getLivePerformance({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      level: "campaign",
    });
    const detected = live
      ? detectAlerts(live).map((alert) => ({
          id: alert.id,
          severity: alert.severity,
          label: alert.type,
          object: alert.object,
          overspend: alert.overspend,
          evidence: alert.evidence.map((item) => ({
            label: item.label,
            value: item.unit === "money" ? formatVnd(item.value) : formatPercent(item.value),
            reference: `trung vị ${item.unit === "money" ? formatVnd(item.median) : formatPercent(item.median)}`,
            quality:
              item.value === null || item.median === null
                ? "neutral"
                : item.label === "CPSQL"
                  ? item.value <= item.median
                    ? "good"
                    : "bad"
                  : item.value >= item.median
                    ? "good"
                    : "bad",
          })),
          action: alert.action,
        }))
      : [];
    return NextResponse.json({
      data: detected,
      disabled_rules: [
        { rule: "Bão hòa tệp", missing: live?.some((row: any) => row.frequency) ? [] : ["frequency"] },
        { rule: "Creative mòn", missing: live ? [] : ["impressions", "clicks", "frequency"] },
        { rule: "Đấu giá đắt lên", missing: live ? [] : ["impressions", "clicks"] },
      ],
      meta: { source: "live" },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
