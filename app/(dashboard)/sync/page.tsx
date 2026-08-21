import { SyncClient } from "./_components/sync.client";

export default async function SyncPage() {
  const syncHistory: any[] = [];
  const syncSources: any[] = [];
  
  return <SyncClient initialHistory={syncHistory} initialSources={syncSources} />;
}
