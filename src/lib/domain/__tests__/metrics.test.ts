import { describe, expect, it } from "vitest";
import { calculatePerformance, median, sumPerformance } from "../metrics";
import type { PerformanceRow } from "../types";

describe("metrics", () => {
  describe("median", () => {
    it("returns null for empty array", () => {
      expect(median([])).toBeNull();
    });

    it("ignores null values", () => {
      expect(median([1, null, 3])).toBe(2);
    });

    it("calculates median for odd number of items", () => {
      expect(median([5, 1, 3])).toBe(3);
    });

    it("calculates median for even number of items", () => {
      expect(median([5, 1, 3, 7])).toBe(4);
    });
  });

  describe("calculatePerformance", () => {
    it("calculates rates correctly and marks rankable", () => {
      const row: any = {
        spend: 1000000,
        impressions: 10000,
        clicks: 500,
        messages: 50,
        sql: 10,
        rank1: 5,
        rank2: 2,
        frequency: null,
      };

      const result = calculatePerformance(row, { minMessages: 20, minSql: 5 });
      
      expect(result.cpr).toBe(20000); // 1M / 50
      expect(result.captureRate).toBe(0.2); // 10 / 50
      expect(result.cpsql).toBe(100000); // 1M / 10
      expect(result.escapeRate).toBe(0.5); // 5 / 10
      expect(result.cpL2).toBe(500000); // 1M / 2
      expect(result.stepRate2).toBe(0.4); // 2 / 5
      expect(result.isRankable).toBe(true);
    });

    it("marks as not rankable if thresholds not met", () => {
      const row: any = {
        spend: 100000,
        impressions: 1000,
        clicks: 50,
        messages: 10, // < 20
        sql: 2, // < 5
        rank1: 1,
        rank2: 0,
        frequency: null,
      };

      const result = calculatePerformance(row);
      expect(result.isRankable).toBe(false);
    });
  });

  describe("sumPerformance", () => {
    it("sums multiple rows and calculates aggregate rates", () => {
      const row1: any = { spend: 100000, messages: 10, sql: 2, rank1: 1, rank2: 0 };
      const row2: any = { spend: 300000, messages: 30, sql: 8, rank1: 4, rank2: 2 };
      
      const result = sumPerformance([row1, row2]);
      
      expect(result.spend).toBe(400000);
      expect(result.messages).toBe(40);
      expect(result.sql).toBe(10);
      expect(result.rank1).toBe(5);
      expect(result.rank2).toBe(2);
      
      expect(result.cpr).toBe(10000); // 400k / 40
      expect(result.captureRate).toBe(0.25); // 10 / 40
      expect(result.cpsql).toBe(40000); // 400k / 10
      expect(result.escapeRate).toBe(0.5); // 5 / 10
      expect(result.cpL2).toBe(200000); // 400k / 2
    });
  });
});
