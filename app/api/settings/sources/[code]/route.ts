import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";
import { saveLiveSource } from "@/lib/data/settings-repository";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const payload = await request.json();
  try {
    const live = await saveLiveSource(code, payload);
    return NextResponse.json({
      source:
        live || {
          ...payload,
          code,
          updatedAt: new Date().toISOString(),
        },
      meta: { mode: live ? "live" : "demo" },
    });
  } catch (error) {
    return liveApiError(error);
  }
}
