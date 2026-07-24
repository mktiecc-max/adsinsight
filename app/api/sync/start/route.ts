import { NextResponse } from "next/server";
import { demoSyncRuns } from "@/lib/demo-sync-store";

export async function POST(request: Request) {
  const body = await request.json();
  const running = [...demoSyncRuns.values()].find((run) => run.status === "running");
  if (running) return NextResponse.json({ error: "Đang có một phiên đồng bộ khác.", run: running }, { status: 409 });
  const id = crypto.randomUUID();
  const run = {
    id,
    source: body.source_id || "all",
    mode: body.mode === "dry_run" ? "dry_run" as const : "commit" as const,
    status: "running" as const,
    cursor: 0,
    total: body.source_id === "leads" ? 2418 : body.source_id === "crm_levels" ? 856 : 1240,
    errors: 0,
    started_at: new Date().toISOString(),
  };
  demoSyncRuns.set(id, run);
  return NextResponse.json({ data: run, meta: { mode: "demo" } }, { status: 201 });
}
