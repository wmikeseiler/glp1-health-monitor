import { describe, it, expect } from "vitest";
import { createWeightEntrySchema } from "@glp1/shared";

describe("weightRouter structure", () => {
  it("appRouter exposes a weight namespace", async () => {
    const { appRouter } = await import("../root");
    // tRPC routers expose _def.procedures
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("weight.list");
    expect(procedures).toHaveProperty("weight.create");
    expect(procedures).toHaveProperty("weight.delete");
    expect(procedures).toHaveProperty("weight.stats");
  });
});

describe("createWeightEntrySchema validation", () => {
  it("accepts valid weight entry", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: 220.5,
      unit: "lbs",
      date: "2026-02-28",
    });
    expect(result.success).toBe(true);
  });

  it("accepts kg unit", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: 100,
      unit: "kg",
      date: "2026-02-28",
    });
    expect(result.success).toBe(true);
  });

  it("defaults unit to lbs when omitted", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: 180,
      date: "2026-02-28",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("lbs");
    }
  });

  it("rejects zero weight", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: 0,
      unit: "lbs",
      date: "2026-02-28",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative weight", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: -10,
      unit: "lbs",
      date: "2026-02-28",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weight above 1500", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: 1501,
      unit: "lbs",
      date: "2026-02-28",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty date string", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: 180,
      unit: "lbs",
      date: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid unit", () => {
    const result = createWeightEntrySchema.safeParse({
      weight: 180,
      unit: "stone",
      date: "2026-02-28",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing weight field", () => {
    const result = createWeightEntrySchema.safeParse({
      unit: "lbs",
      date: "2026-02-28",
    });
    expect(result.success).toBe(false);
  });
});

describe("stats calculation logic", () => {
  // Pure calculation logic extracted from the router for unit testing
  function calcStats(
    entries: { weight: string; date: string }[]
  ): {
    currentWeight: number | null;
    startWeight: number | null;
    totalLost: number | null;
    ratePerWeek: number | null;
    entryCount: number;
  } {
    if (entries.length === 0) {
      return {
        currentWeight: null,
        startWeight: null,
        totalLost: null,
        ratePerWeek: null,
        entryCount: 0,
      };
    }

    const currentWeight = parseFloat(entries[0].weight);
    const startWeight = parseFloat(entries[entries.length - 1].weight);
    const totalLost = startWeight - currentWeight;

    let ratePerWeek: number | null = null;
    if (entries.length > 1) {
      const newestDate = new Date(entries[0].date);
      const oldestDate = new Date(entries[entries.length - 1].date);
      const msPerWeek = 1000 * 60 * 60 * 24 * 7;
      const weeks = (newestDate.getTime() - oldestDate.getTime()) / msPerWeek;
      ratePerWeek = weeks > 0 ? totalLost / weeks : null;
    }

    return { currentWeight, startWeight, totalLost, ratePerWeek, entryCount: entries.length };
  }

  it("returns all nulls and zero count for empty entries", () => {
    const result = calcStats([]);
    expect(result).toEqual({
      currentWeight: null,
      startWeight: null,
      totalLost: null,
      ratePerWeek: null,
      entryCount: 0,
    });
  });

  it("returns correct values for a single entry with null ratePerWeek", () => {
    const result = calcStats([{ weight: "220.00", date: "2026-02-28" }]);
    expect(result.currentWeight).toBe(220);
    expect(result.startWeight).toBe(220);
    expect(result.totalLost).toBe(0);
    expect(result.ratePerWeek).toBeNull();
    expect(result.entryCount).toBe(1);
  });

  it("calculates weight loss correctly (entries ordered newest first)", () => {
    // 220 start, 210 current = 10 lbs lost
    const entries = [
      { weight: "210.00", date: "2026-02-28" },
      { weight: "220.00", date: "2026-01-01" },
    ];
    const result = calcStats(entries);
    expect(result.currentWeight).toBe(210);
    expect(result.startWeight).toBe(220);
    expect(result.totalLost).toBe(10);
    expect(result.entryCount).toBe(2);
  });

  it("calculates ratePerWeek over exactly 4 weeks", () => {
    // 20 lbs lost over 28 days = exactly 4 weeks = 5 lbs/week
    const entries = [
      { weight: "180.00", date: "2026-02-25" },
      { weight: "200.00", date: "2026-01-28" },
    ];
    const result = calcStats(entries);
    expect(result.totalLost).toBe(20);
    expect(result.ratePerWeek).toBeCloseTo(5, 5);
  });

  it("handles weight gain (negative totalLost)", () => {
    const entries = [
      { weight: "225.00", date: "2026-02-28" },
      { weight: "220.00", date: "2026-01-01" },
    ];
    const result = calcStats(entries);
    expect(result.totalLost).toBe(-5);
    expect(result.ratePerWeek).toBeLessThan(0);
  });

  it("returns ratePerWeek null when same date for two entries", () => {
    const entries = [
      { weight: "210.00", date: "2026-02-28" },
      { weight: "220.00", date: "2026-02-28" },
    ];
    const result = calcStats(entries);
    expect(result.ratePerWeek).toBeNull();
  });
});
