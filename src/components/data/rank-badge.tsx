import { cn } from "@/lib/shared/utils";

export function RankBadge({ rank }: { rank: number }) {
  return (
    <span className={cn("rank-badge", `rank-${Math.min(4, Math.max(0, rank))}`)}>
      Bậc {rank}
    </span>
  );
}
