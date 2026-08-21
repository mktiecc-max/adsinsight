import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";

export async function GET() {
  try {
    // TODO: Replace with real repository logic in Phase 2
    return NextResponse.json({
      data: [],
      status: "sufficient",
      meta: { source: "live" },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
