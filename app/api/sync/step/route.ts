import { NextResponse } from "next/server";
import { demoSyncRuns } from "@/lib/demo-sync-store";

export async function POST(request: Request) {
  const { run_id } = await request.json();
  const run = demoSyncRuns.get(run_id);
  if (!run) return NextResponse.json({ error: "Không tìm thấy phiên đồng bộ." }, { status: 404 });
  if (run.status !== "running") return NextResponse.json({ data: run });
  run.cursor = Math.min(run.total, run.cursor + 500);
  run.errors = Math.floor((run.cursor / run.total) * 12);
  demoSyncRuns.set(run.id, run);
  return NextResponse.json({
    data: {
      ...run,
      done: run.cursor >= run.total,
      progress: run.cursor / run.total,
      rows_ok: run.cursor - run.errors,
      rows_error: run.errors,
    },
  });
}
