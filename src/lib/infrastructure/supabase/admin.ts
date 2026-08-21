import { env } from "@/lib/config/env";
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseLiveConfigured() {
  return Boolean(
    env.SUPABASE_URL &&
      env.SUPABASE_SERVICE_KEY &&
      env.IS_LIVE,
  );
}

export function createAdminClient() {
  if (cachedClient !== undefined) return cachedClient;

  const url = env.SUPABASE_URL;
  const secret = env.SUPABASE_SERVICE_KEY;
  if (!url || !secret) {
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
