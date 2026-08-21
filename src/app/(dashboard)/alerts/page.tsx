import { getLivePerformance } from "@/lib/infrastructure/repositories/report-repository";
import { detectAlerts } from "@/lib/domain/alerts";
import { formatPercent, formatVnd } from "@/lib/shared/format";
import { AlertsClient } from "./_components/alerts.client";

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : null;
  const to = typeof params.to === "string" ? params.to : null;

  const live = await getLivePerformance({ from, to, level: "campaign" });
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

  return <AlertsClient initialAlerts={detected} />;
}
