import type { CalculatedPerformanceRow, PerformanceRow } from "./types";

export const DEFAULT_THRESHOLDS = {
  minMessages: 20,
  minSql: 5,
} as const;

function safeDivide(a: number, b: number) {
  return b > 0 ? a / b : null;
}

export function calculatePerformance(
  row: PerformanceRow,
  thresholds = DEFAULT_THRESHOLDS,
): CalculatedPerformanceRow {
  const isRankable = row.messages >= thresholds.minMessages && row.sql >= thresholds.minSql;
  return {
    ...row,
    cpr: safeDivide(row.spend, row.messages),
    captureRate: safeDivide(row.sql, row.messages),
    cpsql: safeDivide(row.spend, row.sql),
    escapeRate: safeDivide(row.rank1, row.sql),
    cpL2: safeDivide(row.spend, row.rank2),
    stepRate2: safeDivide(row.rank2, row.rank1),
    isRankable,
  };
}

export function median(values: Array<number | null>) {
  const sorted = values
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function sumPerformance(rows: CalculatedPerformanceRow[]) {
  const spend = rows.reduce((sum, row) => sum + row.spend, 0);
  const messages = rows.reduce((sum, row) => sum + row.messages, 0);
  const sql = rows.reduce((sum, row) => sum + row.sql, 0);
  const rank1 = rows.reduce((sum, row) => sum + row.rank1, 0);
  const rank2 = rows.reduce((sum, row) => sum + row.rank2, 0);
  return {
    spend,
    messages,
    sql,
    rank1,
    rank2,
    cpr: safeDivide(spend, messages),
    captureRate: safeDivide(sql, messages),
    cpsql: safeDivide(spend, sql),
    escapeRate: safeDivide(rank1, sql),
    cpL2: safeDivide(spend, rank2),
  };
}
