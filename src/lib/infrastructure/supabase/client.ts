import { env } from "@/lib/config/env";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
