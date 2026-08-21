import { env } from "@/lib/config/env";
import { NextResponse } from "next/server";

export function liveApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Nguồn dữ liệu thật hiện không khả dụng.";
  console.error("[AdsInsight live API]", message);
  return NextResponse.json(
    {
      error: "Không thể đọc dữ liệu thật. Kiểm tra cấu hình server và quyền Supabase/Google Sheets.",
      detail: env.IS_DEV ? message : undefined,
      meta: { mode: "live", status: "unavailable" },
    },
    { status: 503 },
  );
}
