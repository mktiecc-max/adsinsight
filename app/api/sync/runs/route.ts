import { NextResponse } from "next/server";
import { demoSyncRuns } from "@/lib/demo-sync-store";
import { syncHistory } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    data: [...demoSyncRuns.values()].reverse().slice(0, 20),
    demo_history: syncHistory,
    meta: { mode: "demo" },
  });
}
