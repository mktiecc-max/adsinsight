import { createClient } from "@/lib/infrastructure/supabase/server";
import { SyncClient } from "./_components/sync.client";

export default async function SyncPage() {
  const supabase = await createClient();
  if (!supabase) return null;

  const [historyResult, sourcesResult] = await Promise.all([
    supabase
      .from("sync_run")
      .select("*, source:sync_source(display_name)")
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("sync_source")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const syncHistory = historyResult.data || [];
  const syncSources = sourcesResult.data || [];
  
  return <SyncClient initialHistory={syncHistory} initialSources={syncSources} />;
}
