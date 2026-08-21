import type { CalculatedPerformanceRow } from "./types";
import { median } from "./metrics";

export interface DomainAlert {
  id: string;
  severity: "high" | "medium" | "low";
  type: string;
  object: string;
  evidence: Array<{ label: string; value: number | null; median: number | null; unit: "money" | "percent" }>;
  action: string;
  overspend: number;
}

export function detectAlerts(rows: CalculatedPerformanceRow[]): DomainAlert[] {
  const rankable = rows.filter((row) => row.isRankable);
  const medianCpsql = median(rankable.map((row) => row.cpsql));
  const medianEscape = median(rankable.map((row) => row.escapeRate));
  const medianCpr = median(rankable.map((row) => row.cpr));
  if (medianCpsql === null || medianEscape === null || medianCpr === null) return [];

  const alerts: DomainAlert[] = [];
  for (const row of rankable) {
    const overspend = Math.max(0, row.spend - row.sql * medianCpsql);
    if (row.cpsql !== null && row.escapeRate !== null && row.cpsql < medianCpsql && row.escapeRate < medianEscape * 0.5) {
      alerts.push({
        id: `quality-trap-${row.id}`,
        severity: "high",
        type: "Bẫy số rẻ",
        object: row.name,
        evidence: [
          { label: "CPSQL", value: row.cpsql, median: medianCpsql, unit: "money" },
          { label: "Thoát bậc 0", value: row.escapeRate, median: medianEscape, unit: "percent" },
        ],
        action: "Không tăng ngân sách. Soi lại creative, độ tuổi và tệp mục tiêu.",
        overspend,
      });
    }
    if (row.cpr !== null && row.trend && row.trend > 0.4) {
      alerts.push({
        id: `cpr-spike-${row.id}`,
        severity: "medium",
        type: "CPR leo thang",
        object: row.name,
        evidence: [{ label: "CPR", value: row.cpr, median: medianCpr, unit: "money" }],
        action: "Làm mới creative hoặc điều chỉnh tệp trong 3–5 ngày tới.",
        overspend,
      });
    }
  }
  return alerts.sort((a, b) => b.overspend - a.overspend);
}
