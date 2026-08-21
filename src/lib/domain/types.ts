export type Zone = "scale" | "trap" | "expensive" | "stop" | "unranked";
export type Direction = "up" | "down" | "neutral";
export type Quality = "good" | "bad" | "neutral";

export interface PerformanceRow {
  id: string;
  name: string;
  owner: string;
  brand: "ucmas" | "uckid";
  objective: string;
  status: "active" | "paused";
  spend: number;
  messages: number;
  sql: number;
  rank1: number;
  rank2: number;
  rank3: number;
  rank4: number;
  duplicateRate: number;
  invalidRate: number;
  matchRate: number;
  cpm?: number;
  ctr?: number;
  frequency?: number;
  zone: Zone;
  warning?: string;
  trend?: number;
}

export interface CalculatedPerformanceRow extends PerformanceRow {
  cpr: number | null;
  captureRate: number | null;
  cpsql: number | null;
  escapeRate: number | null;
  cpL2: number | null;
  stepRate2: number | null;
  isRankable: boolean;
}
