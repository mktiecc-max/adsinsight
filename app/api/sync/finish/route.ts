import { NextResponse } from "next/server";
import { demoSyncRuns } from "@/lib/demo-sync-store";

export async function POST(request: Request) {
  const { run_id } = await request.json();
  const run = demoSyncRuns.get(run_id);
  if (!run) return NextResponse.json({ error: "Không tìm thấy phiên đồng bộ." }, { status: 404 });
  if (run.cursor < run.total) return NextResponse.json({ error: "Phiên chưa xử lý hết dữ liệu." }, { status: 409 });
  run.status = "success";
  demoSyncRuns.set(run.id, run);
  return NextResponse.json({
    data: run,
    summary: { leads_new: 87, level_changes: 34, rows_error: run.errors, match_rate: 0.126 },
    meta: { mode: "demo" },
  });
}
