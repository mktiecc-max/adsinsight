import { env } from "@/lib/config/env";
import { NextResponse } from "next/server";

export function liveApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Nguồn dữ liệu thật hiện không khả dụng.";
  console.error("[AdsInsight live API]", message);
  return NextResponse.json(
    {
      error: message,
      meta: { mode: "live", status: "unavailable" },
    },
    { status: 503 },
  );
}
