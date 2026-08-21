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
