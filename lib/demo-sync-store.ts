export type DemoSyncRun = {
  id: string;
  source: string;
  mode: "dry_run" | "commit";
  status: "running" | "success" | "cancelled";
  cursor: number;
  total: number;
  errors: number;
  started_at: string;
};

const globalStore = globalThis as typeof globalThis & {
  __adsInsightSyncRuns?: Map<string, DemoSyncRun>;
};

export const demoSyncRuns =
  globalStore.__adsInsightSyncRuns ?? (globalStore.__adsInsightSyncRuns = new Map());
