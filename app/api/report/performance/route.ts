import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { getLivePerformance, type ReportLevel } from "@/lib/infrastructure/repositories/report-repository";

const allowedLevels = new Set(["ad", "adset", "campaign", "creative", "owner", "brand"]);
const allowedSorts = new Set([
  "cpsql:asc",
  "cpsql:desc",
  "spend:asc",
  "spend:desc",
  "sql:asc",
  "sql:desc",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = (url.searchParams.get("level") || "campaign") as ReportLevel;
  const sort = url.searchParams.get("sort") || "cpsql:asc";
  const brand = url.searchParams.getAll("brand");
  const owner = url.searchParams.getAll("owner");
  const includeUnrankable = url.searchParams.get("include_unrankable") === "true";

  if (!allowedLevels.has(level) || !allowedSorts.has(sort)) {
    return NextResponse.json({ error: "Tham số level hoặc sort không hợp lệ." }, { status: 400 });
  }

  try {
    const liveRows = await getLivePerformance({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      level,
    });
    const sourceRows = liveRows || [];
    const [sortKey, direction] = sort.split(":") as ["cpsql" | "spend" | "sql", "asc" | "desc"];
    const filtered = sourceRows
    .filter((row: any) => includeUnrankable || row.isRankable)
    .filter((row: any) => !brand.length || brand.includes(row.brand))
    .filter((row: any) => !owner.length || owner.includes(row.owner))
    .sort((a: any, b: any) => {
      const left = a[sortKey] ?? Number.POSITIVE_INFINITY;
      const right = b[sortKey] ?? Number.POSITIVE_INFINITY;
      return direction === "asc" ? left - right : right - left;
    });

    return NextResponse.json({
      data: filtered,
      meta: {
        level,
        sort,
        page: 1,
        page_size: 50,
        total: filtered.length,
        source: "live",
      },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
