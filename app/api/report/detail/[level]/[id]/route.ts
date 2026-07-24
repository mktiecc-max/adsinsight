import { NextResponse } from "next/server";
import { performanceRows, leads, trendData } from "@/lib/mock-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ level: string; id: string }> },
) {
  const { level, id } = await params;
  const row = performanceRows.find((item) => item.id === id);
  if (!row) return NextResponse.json({ error: "Không tìm thấy đối tượng." }, { status: 404 });
  return NextResponse.json({
    data: {
      object: row,
      timeseries: trendData.slice(-14),
      leads: leads.slice(0, 20),
      diagnostic: {
        cp_l2: row.cpL2,
        cpr: row.cpr,
        capture_factor: row.captureRate ? 1 / row.captureRate : null,
        step_factor: row.stepRate2 ? 1 / row.stepRate2 : null,
      },
    },
    meta: { level, mode: "demo" },
  });
}
