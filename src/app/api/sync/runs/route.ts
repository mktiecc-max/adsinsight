import { NextResponse } from "next/server";
import { liveApiError } from "@/lib/shared/api-response";
import { createAdminClient } from "@/lib/infrastructure/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ data: [] });

    const { data, error } = await supabase
      .from("sync_run")
      .select("*, source:sync_source(display_name)")
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return liveApiError(error);
  }
}
