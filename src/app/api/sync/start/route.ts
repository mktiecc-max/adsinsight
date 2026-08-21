import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { SyncService } from "@/lib/application/sync/sync-service";

export async function POST(request: Request) {
  try {
    const result = await SyncService.startSync();
    return NextResponse.json(result);
  } catch (error) {
    return liveApiError(error);
  }
}
