import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ level: string; id: string }> },
) {
  const { level, id } = await params;
  try {
    // TODO: Implement getLiveDetail in Phase 2
    return NextResponse.json({ error: "Chưa triển khai dữ liệu live cho detail" }, { status: 503 });
  } catch (error) {
    return liveApiError(error);
  }
}
