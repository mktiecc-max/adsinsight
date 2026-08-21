import { calculatePerformance } from "@/lib/domain/metrics";
import type { PerformanceRow } from "@/lib/domain/types";

export const performanceRows: ReturnType<typeof calculatePerformance>[] = [];
export const kpis: any[] = [];
export const funnelSteps: any[] = [];
export const trendData: any[] = [];
export const ownerCapture: any[] = [];
export const brandLevels: any[] = [];
export const dataHealth: any[] = [];
export const leads: any[] = [];
export const syncSources: any[] = [];
export const syncHistory: any[] = [];
export const levelMap: any[] = [];

export const alerts = [] as unknown as Array<{
  id: string;
  severity: "high" | "medium" | "low";
  label: string;
  object: string;
  overspend: number;
  evidence: Array<{ label: string; value: string; reference: string; quality: "good" | "bad" | "neutral" }>;
  action: string;
}>;

export const sourceSettings: Record<string, {
  title: string;
  description: string;
  link: string;
  tab: string;
  fields: Array<{ target: string; required: boolean; column: string; transform: string; valid: boolean }>;
}> = {
  ads: { title: "", description: "", link: "", tab: "", fields: [] },
  leads: { title: "", description: "", link: "", tab: "", fields: [] },
  crm: { title: "", description: "", link: "", tab: "", fields: [] },
};
