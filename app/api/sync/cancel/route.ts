import { NextResponse } from "next/server";
import { demoSyncRuns } from "@/lib/demo-sync-store";

export async function POST(request: Request) {
  const { run_id } = await request.json();
  const run = demoSyncRuns.get(run_id);
  if (!run) return NextResponse.json({ error: "Không tìm thấy phiên đồng bộ." }, { status: 404 });
  run.status = "cancelled";
  demoSyncRuns.set(run.id, run);
  return NextResponse.json({ data: run });
}
