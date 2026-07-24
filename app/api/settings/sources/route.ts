import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";
import { getLiveSources, saveLiveSource } from "@/lib/data/settings-repository";
import { sourceSettings } from "@/lib/mock-data";

export async function GET() {
  try {
    const live = await getLiveSources();
    return NextResponse.json({ data: live || sourceSettings, meta: { mode: live ? "live" : "demo" } });
  } catch (error) {
    return liveApiError(error);
  }
}

export async function PUT(request: Request) {
  const payload = await request.json();
  try {
    const live = await saveLiveSource(String(payload.code || ""), payload);
    return NextResponse.json({
      data: live || payload,
      saved: true,
      meta: { mode: live ? "live" : "demo" },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
