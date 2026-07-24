import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";
import { inspectSpreadsheet } from "@/lib/google-sheets";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const live = await inspectSpreadsheet(body.spreadsheet_id || body.link || "", body.range || body.sheet_tab);
    if (live) {
      return NextResponse.json({
        data: {
          ...live,
          preview: live.sample.map((row) =>
            Object.fromEntries(live.headers.map((header, index) => [header, row[index] ?? ""])),
          ),
        },
        meta: { mode: "live" },
      });
    }
  } catch (error) {
    return liveApiError(error);
  }
  return NextResponse.json({
    data: {
      spreadsheet_id: body.spreadsheet_id || "demo",
      headers: ["ad_id", "campaign_name", "date_start", "spend", "Kết quả"],
      preview: Array.from({ length: 5 }, (_, index) => ({
        ad_id: `${1000000000000 + index}`,
        campaign_name: `haicm/ucmas/mess/mẫu ${index + 1}`,
        date_start: `2026-06-${String(index + 1).padStart(2, "0")}`,
        spend: `${(index + 1) * 125}.000`,
        "Kết quả": 12 + index,
      })),
    },
    meta: { mode: "demo" },
  });
}
