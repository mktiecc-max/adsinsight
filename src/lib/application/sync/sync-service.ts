import { createAdminClient } from "@/lib/infrastructure/supabase/admin";
import { fetchSheetData } from "@/lib/infrastructure/google-sheets";
import { parseCampaignName } from "@/lib/transform";

/** Validate & normalise a Vietnamese mobile phone to 9 digits (no leading 0).
 *  Returns null when the number cannot be normalised to a valid format. */
function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  // Strip country code 84
  if (digits.startsWith("84") && digits.length >= 11) digits = digits.slice(2);
  // Strip leading 0
  if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);
  // Take last 9 digits if too long
  if (digits.length > 9) digits = digits.slice(-9);
  // Must be exactly 9 digits starting with 3,5,7,8,9
  if (/^[35789]\d{8}$/.test(digits)) return digits;
  return null;
}

function transformData(value: string, transform: string): any {
  if (!value) return null;
  const str = value.trim();
  switch (transform) {
    case "text_trim":
      return str;
    case "fix_mojibake":
      return str;
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
      const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
      return str;
    }
    case "value_map":
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

      const runId = crypto.randomUUID();
      const startedAt = new Date().toISOString();

      try {
        const rows = await fetchSheetData(source.spreadsheet_id, source.sheet_tab, source.header_row || 1);

        let mappedData = rows.map(row => {
          const record: Record<string, any> = {
            __sheet_row: row.__sheet_row
          };
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

        let totalUpserted = 0;

        // ──────────────────────────────────────────────
        // ADS DAILY
        // ──────────────────────────────────────────────
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
            totalUpserted += factAds.length;
          }

          try {
            await supabase.rpc('refresh_mv_ad_daily_enriched');
          } catch (e) {
            console.warn("Could not refresh MV, ensure RPC exists", e);
          }

        // ──────────────────────────────────────────────
        // LEADS
        // ──────────────────────────────────────────────
        } else if (source.code === "leads") {
          const chunkSize = 500;
          for (let i = 0; i < validData.length; i += chunkSize) {
            const chunk = validData.slice(i, i + chunkSize);

            // Build insert-ready rows, normalising phone first
            const rows = chunk.map(r => {
              const phone9 = normalisePhone(r.phone);
              return {
                source_row_key: String(r.__sheet_row || crypto.randomUUID()),
                phone: phone9,
                phone_raw: String(r.phone || ""),
                phone_status: phone9 ? "valid" as const : "invalid" as const,
                lead_name: r.lead_name || "",
                created_at: r.created_at || null,
                ad_id: r.ad_id || null,
                page_name: "",
                is_first_touch: true,
                run_id: runId,
              };
            });

            // Deduplicate by source_row_key (PK)
            const deduped = deduplicate(rows, r => r.source_row_key);

            // Ensure referenced ad_ids exist in dim_ad
            const uniqueAdIds = Array.from(new Set(deduped.map(r => r.ad_id).filter(Boolean)));
            if (uniqueAdIds.length > 0) {
              const dummyDimAds = uniqueAdIds.map(id => ({
                ad_id: id,
                campaign_name: "Unknown",
                owner: "Unknown",
                brand: "Unknown",
                objective: "Unknown",
                account_id: "Unknown",
                adset_name: "Unknown",
                ad_name: "Unknown",
                creative_key: "Unknown"
              }));
              await supabase.from("dim_ad").upsert(dummyDimAds, { onConflict: "ad_id", ignoreDuplicates: true });
            }

            // Upsert — duplicates on source_row_key are silently skipped
            const { error: insertError } = await supabase
              .from("fact_lead")
              .upsert(deduped, { onConflict: "source_row_key", ignoreDuplicates: true });
            if (insertError) throw new Error("Lỗi insert fact_lead: " + insertError.message);
            totalUpserted += deduped.length;
          }

        // ──────────────────────────────────────────────
        // CRM LEVELS
        // ──────────────────────────────────────────────
        } else if (source.code === "crm_levels") {
          const chunkSize = 500;
          for (let i = 0; i < validData.length; i += chunkSize) {
            const chunk = validData.slice(i, i + chunkSize);

            const rows = chunk.map(r => {
              const phone9 = normalisePhone(r.phone);
              if (!phone9) return null; // dim_customer.phone is NOT NULL with CHECK

              const uckid = r.level_uckid_raw || "";
              const ucmas = r.level_ucmas_raw || "";
              let max_rank = 0;
              if (uckid.includes("L0") || ucmas.includes("L0") || ucmas.includes("KG")) max_rank = 1;
              if (uckid.includes("L1") || ucmas.includes("L1") || ucmas.includes("L2") || ucmas.includes("L3")) max_rank = 2;
              if (uckid.includes("L2") || uckid.includes("L3") || ucmas.includes("L4") || ucmas.includes("L5") || ucmas.includes("L6") || ucmas.includes("L7")) max_rank = 3;
              if (uckid.includes("L4") || uckid.includes("L5") || uckid.includes("L6") || ucmas.includes("L8") || ucmas.includes("L9") || ucmas.includes("L10")) max_rank = 4;

              return {
                phone: phone9,
                max_rank,
                current_rank: max_rank,
                in_crm: true,
                crm_row_count: 1,
                center: r.center || "",
                updated_at: new Date().toISOString()
              };
            }).filter(Boolean) as any[];

            // Deduplicate by phone (PK)
            const deduped = deduplicate(rows, r => r.phone);

            if (deduped.length > 0) {
              const { error: insertError } = await supabase
                .from("dim_customer")
                .upsert(deduped, { onConflict: "phone", ignoreDuplicates: true });
              if (insertError) throw new Error("Lỗi insert dim_customer: " + insertError.message);
              totalUpserted += deduped.length;
            }
          }
        }

        // Write success to sync_run (matching actual DB schema)
        await supabase.from("sync_run").insert({
          id: runId,
          source_id: source.id,
          mode: "commit",
          status: "success",
          rows_read: validData.length,
          rows_upserted: totalUpserted,
          rows_skipped: validData.length - totalUpserted,
          rows_error: 0,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
        });

        // Update sync_source metadata
        await supabase.from("sync_source").update({
          last_sync_at: new Date().toISOString(),
          last_status: "success",
          last_row_count: totalUpserted,
        }).eq("id", source.id);

        results.push({ code: source.code, status: "success", rows: totalUpserted });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        // Write error to sync_run (wrapped in try/catch so logging never crashes the response)
        try {
          await supabase.from("sync_run").insert({
            id: runId,
            source_id: source.id,
            mode: "commit",
            status: "failed",
            error_detail: { message: errMsg },
            started_at: startedAt,
            finished_at: new Date().toISOString(),
          });
        } catch { /* ignore */ }

        try {
          await supabase.from("sync_source").update({
            last_sync_at: new Date().toISOString(),
            last_status: "failed",
          }).eq("id", source.id);
        } catch { /* ignore */ }

        results.push({ code: source.code, status: "error", message: errMsg });
      }
    }

    return { results };
  }
}
