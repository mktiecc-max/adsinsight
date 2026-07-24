import "server-only";

import { createAdminClient, liveDataUnavailable } from "@/lib/supabase/admin";

const SOURCE_CODES = new Set(["ads_daily", "leads", "crm_levels"]);

function normalizeCode(code: string) {
  if (code === "ads") return "ads_daily";
  if (code === "crm") return "crm_levels";
  return code;
}

export async function getLiveSources() {
  const client = createAdminClient();
  if (!client) return null;

  try {
    const { data: sources, error: sourceError } = await client
      .from("sync_source")
      .select("*")
      .order("display_name");
    if (sourceError) throw new Error(sourceError.message);

    const ids = (sources || []).map((source) => source.id);
    const { data: fields, error: fieldError } = ids.length
      ? await client
          .from("sync_field_map")
          .select("*")
          .in("source_id", ids)
          .order("sort_order")
      : { data: [], error: null };
    if (fieldError) throw new Error(fieldError.message);

    return (sources || []).map((source) => ({
      ...source,
      fields: (fields || []).filter((field) => field.source_id === source.id),
    }));
  } catch (error) {
    throw liveDataUnavailable(error);
  }
}

export async function saveLiveSource(codeValue: string, payload: Record<string, unknown>) {
  const client = createAdminClient();
  if (!client) return null;

  const code = normalizeCode(codeValue);
  if (!SOURCE_CODES.has(code)) throw new Error("Mã nguồn dữ liệu không hợp lệ.");

  try {
    const sourcePayload = {
      code,
      display_name: String(payload.display_name || payload.title || code),
      spreadsheet_id: payload.spreadsheet_id ? String(payload.spreadsheet_id) : null,
      sheet_tab: payload.sheet_tab ? String(payload.sheet_tab) : payload.tab ? String(payload.tab) : null,
      header_row: Number(payload.header_row || 1),
      enabled: payload.enabled !== false,
      incremental_mode: String(payload.incremental_mode || "full"),
      lookback_days: Number(payload.lookback_days || 7),
      updated_at: new Date().toISOString(),
    };
    const { data: source, error: sourceError } = await client
      .from("sync_source")
      .upsert(sourcePayload, { onConflict: "code" })
      .select()
      .single();
    if (sourceError) throw new Error(sourceError.message);

    const fields = Array.isArray(payload.fields) ? payload.fields : [];
    if (fields.length) {
      const rows = fields.map((field, index) => {
        const item = field as Record<string, unknown>;
        return {
          source_id: source.id,
          target_field: String(item.target_field || item.target || ""),
          sheet_column: item.sheet_column ? String(item.sheet_column) : item.column ? String(item.column) : null,
          transform: String(item.transform || "none"),
          is_required: Boolean(item.is_required ?? item.required),
          sort_order: Number(item.sort_order ?? index),
        };
      });
      const { error: fieldError } = await client
        .from("sync_field_map")
        .upsert(rows, { onConflict: "source_id,target_field" });
      if (fieldError) throw new Error(fieldError.message);
    }

    return { ...source, fields };
  } catch (error) {
    throw liveDataUnavailable(error);
  }
}
