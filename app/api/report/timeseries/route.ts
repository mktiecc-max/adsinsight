import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";
import { getLiveTimeseries } from "@/lib/data/report-repository";
import { trendData } from "@/lib/mock-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const live = await getLiveTimeseries({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    return NextResponse.json({ data: live || trendData, meta: { mode: live ? "live" : "demo" } });
  } catch (error) {
    return liveApiError(error);
  }
}
