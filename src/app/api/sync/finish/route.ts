import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";

export async function POST(request: Request) {
  try {
    throw new Error("Chưa triển khai dữ liệu live cho sync_run");
  } catch (error) {
    return liveApiError(error);
  }
}
