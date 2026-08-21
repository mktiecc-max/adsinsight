import type { Quality } from "@/lib/domain/types";
import { formatPercent } from "@/lib/shared/format";
import { cn } from "@/lib/shared/utils";

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
