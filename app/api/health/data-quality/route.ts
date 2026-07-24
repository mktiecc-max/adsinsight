import { NextResponse } from "next/server";
import { dataHealth } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({
    data: dataHealth,
    status: dataHealth[1].value < 0.1 ? "critical" : "sufficient",
    meta: { mode: "demo" },
  });
}
