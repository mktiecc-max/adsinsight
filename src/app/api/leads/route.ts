import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { getLiveLeads } from "@/lib/infrastructure/repositories/report-repository";
import { normalizePhone } from "@/lib/shared/format";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();
  const phone = normalizePhone(query);
  try {
    const live = await getLiveLeads({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    const data = (live || []).filter((lead) => {
      if (!query) return true;
      if (phone && lead.phone.includes(phone)) return true;
      return `${lead.name} ${lead.ad} ${lead.campaign} ${lead.page}`.toLowerCase().includes(query);
    });
    return NextResponse.json({ data, meta: { total: data.length, source: "live" } });
  } catch (error) {
    return liveApiError(error);
  }
}
