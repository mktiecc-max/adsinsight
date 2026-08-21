import { createAdminClient } from "@/lib/infrastructure/supabase/admin";
import { fetchSheetData } from "@/lib/infrastructure/google-sheets";
import { parseCampaignName } from "@/lib/transform";

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

function deduplicate<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
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

        let validData = mappedData;
        if (source.code === "ads_daily") validData = validData.filter(r => r.ad_id && r.date);
        else if (source.code === "leads") validData = validData.filter(r => r.phone);
        else if (source.code === "crm_levels") validData = validData.filter(r => r.phone);

        if (validData.length === 0) {
          results.push({ code: source.code, status: "success", rows: 0, message: "Không có dữ liệu hợp lệ (thiếu ID)" });
          continue;
        }

        if (source.code === "ads_daily") {
          const chunkSize = 1000;
          for (let i = 0; i < validData.length; i += chunkSize) {
            const chunk = validData.slice(i, i + chunkSize);
            
            // 1. Upsert Dimensions
            let dimAds = chunk.map(r => {
              const campName = r.campaign_name || "Unknown";
              const parsed = parseCampaignName(campName);
              const brand = parsed.brand === "ucmas" || parsed.brand === "uckid" ? parsed.brand : "ucmas";
              
              return {
                ad_id: r.ad_id,
                campaign_name: campName,
                owner: r.owner || parsed.owner || "Unknown",
                brand: r.brand || brand,
                objective: r.objective || parsed.objective || "Unknown",
                account_id: r.account_id || "Unknown",
                adset_name: r.adset_name || "Unknown",
                ad_name: r.ad_name || "Unknown",
                creative_key: r.creative_key || "Unknown"
              };
            });
            dimAds = deduplicate(dimAds, r => String(r.ad_id));
            const { error: dimError } = await supabase.from("dim_ad").upsert(dimAds, { onConflict: "ad_id", ignoreDuplicates: false });
            if (dimError) throw new Error("Lỗi upsert dim_ad: " + dimError.message);

            // 2. Upsert Facts
            let factAds = chunk.map(r => ({
              ad_id: r.ad_id,
              date: r.date,
              spend: Number(r.spend) || 0,
              messages: Number(r.messages) || 0,
            }));
            factAds = deduplicate(factAds, r => `${r.ad_id}_${r.date}`);
            const { error: upsertError } = await supabase.from("fact_ad_daily").upsert(factAds, { onConflict: "ad_id,date", ignoreDuplicates: false });
            if (upsertError) throw new Error("Lỗi upsert fact_ad_daily: " + upsertError.message);
          }
        } else if (source.code === "leads") {
          const chunkSize = 1000;
          const runId = crypto.randomUUID();
          for (let i = 0; i < validData.length; i += chunkSize) {
            const chunk = validData.slice(i, i + chunkSize);
            const deduplicated = deduplicate(chunk, r => String(r.phone));
            const toInsert = deduplicated.map(r => ({
              run_id: runId,
              phone_raw: r.phone,
              lead_name: r.lead_name,
              created_at: r.created_at,
              ad_id: r.ad_id,
            }));
            const { error: insertError } = await supabase.from("stg_lead").insert(toInsert);
            if (insertError) throw new Error("Lỗi insert stg_lead: " + insertError.message);
          }
        } else if (source.code === "crm_levels") {
          const chunkSize = 1000;
          const runId = crypto.randomUUID();
          for (let i = 0; i < validData.length; i += chunkSize) {
            const chunk = validData.slice(i, i + chunkSize);
            const deduplicated = deduplicate(chunk, r => String(r.phone));
            const toInsert = deduplicated.map(r => ({
              run_id: runId,
              phone_raw: r.phone,
              level_ucmas_raw: r.level_ucmas_raw,
              level_uckid_raw: r.level_uckid_raw,
              center: r.center,
            }));
            const { error: insertError } = await supabase.from("stg_crm").insert(toInsert);
            if (insertError) throw new Error("Lỗi insert stg_crm: " + insertError.message);
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
