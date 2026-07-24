import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/api-response";
import { getLiveLeads } from "@/lib/data/report-repository";
import { normalizePhone } from "@/lib/format";
import { leads } from "@/lib/mock-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();
  const phone = normalizePhone(query);
  try {
    const live = await getLiveLeads({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    const data = (live || leads).filter((lead) => {
      if (!query) return true;
      if (phone && lead.phone.includes(phone)) return true;
      return `${lead.name} ${lead.ad} ${lead.campaign} ${lead.page}`.toLowerCase().includes(query);
    });
    return NextResponse.json({ data, meta: { total: data.length, mode: live ? "live" : "demo" } });
  } catch (error) {
    return liveApiError(error);
  }
}
