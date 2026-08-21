import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";

export async function GET() {
  try {
    return NextResponse.json({
      data: [],
      demo_history: [],
      meta: { source: "live" },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
