import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseLiveConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SECRET_KEY &&
      process.env.ADSINSIGHT_DATA_MODE !== "demo",
  );
}

export function createAdminClient() {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (process.env.ADSINSIGHT_DATA_MODE === "live" && (!url || !secret)) {
    throw new Error(
      "ADSINSIGHT_DATA_MODE=live nhưng thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SECRET_KEY.",
    );
  }
  if (!url || !secret || process.env.ADSINSIGHT_DATA_MODE === "demo") {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { "X-Client-Info": "ads-insight-server" },
    },
  });
  return cachedClient;
}

export function liveDataUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : "Không thể đọc nguồn dữ liệu.";
  return new Error(`Supabase live mode thất bại: ${message}`);
}
