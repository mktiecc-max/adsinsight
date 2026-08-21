import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      user: { name: "Minh Khang", initials: "MK" },
      sync: { last_run: "2026-07-24T09:14:00Z", total_rows: 1240 },
      period: { label: "Tháng 6/2026", range: "01/06/2026 – 30/06/2026", compare: "01/05–31/05" },
      alerts_count: 3
    }
  });
}
