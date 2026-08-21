import { Info } from "lucide-react";
import { zoneMeta } from "@/lib/domain/matrix";
import type { Quality, Zone } from "@/lib/domain/types";
import { formatCount, formatPercent, formatVnd } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

export function MetricValue({
  value,
  kind = "count",
  full = false,
  className,
}: {
  value: number | null;
  kind?: "money" | "count" | "percent";
  full?: boolean;
  className?: string;
}) {
  const formatted =
    kind === "money"
      ? formatVnd(value, !full)
      : kind === "percent"
        ? formatPercent(value)
        : formatCount(value);
  return <span className={cn("num", className)}>{formatted}</span>;
}

export function Delta({
  value,
  quality,
}: {
  value: number;
  quality: Quality;
}) {
  const arrow = value >= 0 ? "▲" : "▼";
  return (
    <span
      className={cn(
        "delta num",
        quality === "good" && "metric-positive",
        quality === "bad" && "metric-negative",
        quality === "neutral" && "metric-neutral",
      )}
    >
      {arrow} {formatPercent(Math.abs(value))}
    </span>
  );
}

export function ZoneChip({
  zone,
  compact = false,
}: {
  zone: Zone;
  compact?: boolean;
}) {
  const meta = zoneMeta[zone];
  return (
    <span className={cn("zone-chip", meta.className)} title={meta.action}>
      <span className="zone-dot" />
      {compact ? null : meta.label}
    </span>
  );
}

export function SampleWarning({
  messages,
  sql,
}: {
  messages: number;
  sql: number;
}) {
  return (
    <span
      className="sample-warning"
      title={`Chỉ ${messages} tin nhắn / ${sql} SĐT — chưa đủ để so sánh`}
    >
      <Info size={12} />
    </span>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-header">
      <div className="card-title">
        {title}
        {subtitle ? <span className="card-subtitle"> · {subtitle}</span> : null}
      </div>
      {action}
    </div>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  return (
    <span className={cn("rank-badge", `rank-${Math.min(4, Math.max(0, rank))}`)}>
      Bậc {rank}
    </span>
  );
}
