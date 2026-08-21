import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { inspectSpreadsheet } from "@/lib/infrastructure/google-sheets";

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
    throw new Error("Thiếu biến môi trường Google Sheets trên Vercel");
  } catch (error) {
    return liveApiError(error);
  }
}
