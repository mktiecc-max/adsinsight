import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { SyncService } from "@/lib/application/sync/sync-service";

export async function POST(request: Request) {
  try {
    let sourceCode;
    try {
      const body = await request.json();
      sourceCode = body?.sourceCode;
    } catch (e) {
      // ignore JSON parse error
    }
    
    const result = await SyncService.startSync(sourceCode);
    return NextResponse.json(result);
  } catch (error) {
    return liveApiError(error);
  }
}
