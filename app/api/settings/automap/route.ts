import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const headers: string[] = body.headers || [];
  const candidates = ["ad_id", "campaign_name", "date_start", "spend", "Kết quả"];
  return NextResponse.json({
    data: candidates.map((target) => ({
      target_field: target,
      sheet_column: headers.find((header) => header.toLowerCase() === target.toLowerCase()) || target,
      confidence: 1,
    })),
  });
}
