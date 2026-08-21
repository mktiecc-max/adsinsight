import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { getLiveTimeseries } from "@/lib/infrastructure/repositories/report-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const live = await getLiveTimeseries({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    return NextResponse.json({ data: live || [], meta: { source: "live" } });
  } catch (error) {
    return liveApiError(error);
  }
}
