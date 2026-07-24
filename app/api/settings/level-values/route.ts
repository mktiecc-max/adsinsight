import { NextResponse } from "next/server";
import { levelMap } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ data: levelMap, meta: { mode: "demo" } });
}
