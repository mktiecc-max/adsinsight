import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    throw new Error("Chưa triển khai dữ liệu live cho sync_run");
  } catch (error) {
    return liveApiError(error);
  }
}
