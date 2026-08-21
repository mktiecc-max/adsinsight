import { calculatePerformance } from "@/lib/domain/metrics";
import type { PerformanceRow } from "@/lib/domain/types";

export const performanceRows: ReturnType<typeof calculatePerformance>[] = [];

export const kpis: any[] = [];
export const funnelSteps: any[] = [];
export const trendData: any[] = [];
export const ownerCapture: any[] = [];
export const brandLevels: any[] = [];
export const dataHealth: any[] = [];
export const alerts: any[] = [];
export const leads: any[] = [];

export const syncSources: any[] = [];
export const syncHistory: any[] = [];

export const sourceSettings: any = {
  ads: { fields: [] },
  leads: { fields: [] },
  crm: { fields: [] },
};

export const levelMap: any[] = [];
