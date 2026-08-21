import { createAdminClient } from "@/lib/infrastructure/supabase/admin";
import { fetchSheetData } from "@/lib/infrastructure/google-sheets";

function transformData(value: string, transform: string): any {
  if (!value) return null;
  const str = value.trim();
  switch (transform) {
    case "text_trim":
      return str;
    case "fix_mojibake":
      return str; // Simplified for now
    case "number_vn": {
      const num = Number(str.replace(/\./g, "").replace(/,/g, "."));
      return isNaN(num) ? 0 : num;
    }
    case "phone_vn": {
      let p = str.replace(/\D/g, "");
      if (p.startsWith("84")) p = "0" + p.slice(2);
      return p;
    }
    case "date_iso": {
      // Support DD/MM/YYYY and MM/DD/YYYY to YYYY-MM-DD
      const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        // Assume DD/MM/YYYY for VN context
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
      return str; // Hope it's already ISO or parseable
    }
    case "value_map":
      // Not handling dynamic value_map lookup yet, assume raw or basic map
      return str;
    case "none":
    default:
      return str;
  }
}

export class SyncService {
  static async startSync(sourceCode?: string) {
    const supabase = createAdminClient();
    if (!supabase) throw new Error("Chưa cấu hình Supabase Admin");

    let query = supabase.from("sync_source").select("*, fields:sync_field_map(*)").eq("enabled", true);
    if (sourceCode) {
      query = query.eq("code", sourceCode);
    }
    
    const { data: sources, error } = await query;
    if (error) throw new Error("Lỗi tải cấu hình nguồn: " + error.message);
    if (!sources || sources.length === 0) return { message: "Không có nguồn nào cần đồng bộ" };

    const results = [];

    for (const source of sources) {
      if (!source.spreadsheet_id || !source.sheet_tab) {
        results.push({ code: source.code, status: "error", message: "Chưa cấu hình Link/Tab" });
        continue;
      }

      try {
        const rows = await fetchSheetData(source.spreadsheet_id, source.sheet_tab, source.header_row || 1);
        
        const mappedData = rows.map(row => {
          const record: Record<string, any> = {};
          source.fields.forEach((field: any) => {
            if (field.sheet_column) {
              const rawValue = row[field.sheet_column];
              record[field.target_field] = transformData(rawValue, field.transform);
            }
          });
          return record;
        }).filter(record => Object.keys(record).length > 0);

        if (mappedData.length === 0) {
          results.push({ code: source.code, status: "success", rows: 0, message: "Sheet rỗng hoặc không match cột" });
          continue;
        }

        // Upsert into corresponding table
        let targetTable = "";
        let onConflict = "";
        
        if (source.code === "ads_daily") {
          targetTable = "fact_ad_daily";
          onConflict = "ad_id, date";
        } else if (source.code === "leads") {
          targetTable = "fact_lead";
          onConflict = "phone";
        } else if (source.code === "crm_levels") {
          targetTable = "dim_customer";
          onConflict = "phone";
        }

        if (targetTable) {
          // Chunk data into 1000 rows to avoid Supabase limits
          const chunkSize = 1000;
          for (let i = 0; i < mappedData.length; i += chunkSize) {
            const chunk = mappedData.slice(i, i + chunkSize);
            // Ignore constraints on missing fields just upsert what we have mapped
            const { error: upsertError } = await supabase
              .from(targetTable)
              .upsert(chunk, { onConflict, ignoreDuplicates: false });
              
            if (upsertError) throw new Error("Lỗi upsert: " + upsertError.message);
          }
        }

        // Write success to sync_run
        await supabase.from("sync_run").insert({
          source_id: source.id,
          status: "completed",
          rows_processed: mappedData.length,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        results.push({ code: source.code, status: "success", rows: mappedData.length });
      } catch (err) {
        // Write error to sync_run
        await supabase.from("sync_run").insert({
          source_id: source.id,
          status: "failed",
          error_details: err instanceof Error ? err.message : "Unknown error",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
        
        results.push({ code: source.code, status: "error", message: err instanceof Error ? err.message : String(err) });
      }
    }

    return { results };
  }
}
