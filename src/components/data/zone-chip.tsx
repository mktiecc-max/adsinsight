import { zoneMeta } from "@/lib/domain/matrix";
import type { Zone } from "@/lib/domain/types";
import { cn } from "@/lib/shared/utils";

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
