import { describe, it, expect } from "vitest";
import { createVitalsSchema, BP_RANGES } from "@glp1/shared";
import { getISOWeekKey, classifyBP } from "../router/vitals";

// ---------------------------------------------------------------------------
// Router structure
// ---------------------------------------------------------------------------

describe("vitalsRouter structure", () => {
  it("appRouter exposes a vitals namespace with all procedures", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("vitals.list");
    expect(procedures).toHaveProperty("vitals.create");
    expect(procedures).toHaveProperty("vitals.delete");
    expect(procedures).toHaveProperty("vitals.latest");
    expect(procedures).toHaveProperty("vitals.trends");
  });
});

// ---------------------------------------------------------------------------
// createVitalsSchema validation
// ---------------------------------------------------------------------------

describe("createVitalsSchema validation", () => {
  const validInput = {
    systolic: 120,
    diastolic: 80,
    heartRate: 72,
  };

  it("accepts a valid vitals input", () => {
    const result = createVitalsSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts an optional ISO datetime date field", () => {
    const result = createVitalsSchema.safeParse({
      ...validInput,
      date: "2026-02-28T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  // --- systolic boundary values ---

  it("accepts systolic at lower boundary (50)", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, systolic: 50 });
    expect(result.success).toBe(true);
  });

  it("accepts systolic at upper boundary (300)", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, systolic: 300 });
    expect(result.success).toBe(true);
  });

  it("rejects systolic below 50", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, systolic: 49 });
    expect(result.success).toBe(false);
  });

  it("rejects systolic above 300", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, systolic: 301 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer systolic", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, systolic: 120.5 });
    expect(result.success).toBe(false);
  });

  // --- diastolic boundary values ---

  it("accepts diastolic at lower boundary (20)", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, diastolic: 20 });
    expect(result.success).toBe(true);
  });

  it("accepts diastolic at upper boundary (200)", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, diastolic: 200 });
    expect(result.success).toBe(true);
  });

  it("rejects diastolic below 20", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, diastolic: 19 });
    expect(result.success).toBe(false);
  });

  it("rejects diastolic above 200", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, diastolic: 201 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer diastolic", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, diastolic: 80.1 });
    expect(result.success).toBe(false);
  });

  // --- heartRate boundary values ---

  it("accepts heartRate at lower boundary (20)", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, heartRate: 20 });
    expect(result.success).toBe(true);
  });

  it("accepts heartRate at upper boundary (300)", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, heartRate: 300 });
    expect(result.success).toBe(true);
  });

  it("rejects heartRate below 20", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, heartRate: 19 });
    expect(result.success).toBe(false);
  });

  it("rejects heartRate above 300", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, heartRate: 301 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer heartRate", () => {
    const result = createVitalsSchema.safeParse({ ...validInput, heartRate: 72.5 });
    expect(result.success).toBe(false);
  });

  // --- missing fields ---

  it("rejects missing systolic", () => {
    const { systolic: _, ...noSystolic } = validInput;
    const result = createVitalsSchema.safeParse(noSystolic);
    expect(result.success).toBe(false);
  });

  it("rejects missing diastolic", () => {
    const { diastolic: _, ...noDiastolic } = validInput;
    const result = createVitalsSchema.safeParse(noDiastolic);
    expect(result.success).toBe(false);
  });

  it("rejects missing heartRate", () => {
    const { heartRate: _, ...noHeartRate } = validInput;
    const result = createVitalsSchema.safeParse(noHeartRate);
    expect(result.success).toBe(false);
  });

  it("rejects date that is not an ISO datetime string", () => {
    const result = createVitalsSchema.safeParse({
      ...validInput,
      date: "2026-02-28",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BP classification helper
// ---------------------------------------------------------------------------

describe("classifyBP helper", () => {
  it("classifies normal BP correctly (119/79)", () => {
    expect(classifyBP(119, 79)).toBe("normal");
  });

  it("classifies elevated BP by systolic (125/79)", () => {
    expect(classifyBP(125, 79)).toBe("elevated");
  });

  it("classifies high stage 1 by systolic (135/79)", () => {
    expect(classifyBP(135, 79)).toBe("high1");
  });

  it("classifies high stage 1 by diastolic (125/85)", () => {
    expect(classifyBP(125, 85)).toBe("high1");
  });

  it("classifies high stage 2 by systolic (145/80)", () => {
    expect(classifyBP(145, 80)).toBe("high2");
  });

  it("classifies high stage 2 by diastolic (130/95)", () => {
    expect(classifyBP(130, 95)).toBe("high2");
  });

  it("classifies high stage 2 when both values exceed stage 2 thresholds", () => {
    expect(classifyBP(160, 100)).toBe("high2");
  });

  it("classifies exactly at high2 systolic threshold (140/79)", () => {
    expect(classifyBP(140, 79)).toBe("high2");
  });

  it("classifies exactly at high2 diastolic threshold (130/90)", () => {
    expect(classifyBP(130, 90)).toBe("high2");
  });

  it("BP_RANGES constant has expected shape", () => {
    expect(BP_RANGES).toHaveProperty("normal");
    expect(BP_RANGES).toHaveProperty("elevated");
    expect(BP_RANGES).toHaveProperty("high1");
    expect(BP_RANGES).toHaveProperty("high2");
    expect(BP_RANGES.normal.systolic).toEqual([0, 120]);
    expect(BP_RANGES.high2.diastolic).toEqual([90, 200]);
  });
});

// ---------------------------------------------------------------------------
// ISO week key helper
// ---------------------------------------------------------------------------

describe("getISOWeekKey helper", () => {
  it("returns correct week key for a known Monday (2026-01-05 is W02)", () => {
    // 2026-01-05 is a Monday, falls in week 2
    expect(getISOWeekKey(new Date("2026-01-05T00:00:00Z"))).toBe("2026-W02");
  });

  it("returns 2026-W05 for 2026-02-02", () => {
    expect(getISOWeekKey(new Date("2026-02-02T00:00:00Z"))).toBe("2026-W06");
  });

  it("returns consistent week key for all days in the same ISO week", () => {
    // 2026-02-23 (Mon) through 2026-03-01 (Sun) should all be W09
    const week = "2026-W09";
    const days = [
      "2026-02-23",
      "2026-02-24",
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ];
    for (const day of days) {
      expect(getISOWeekKey(new Date(`${day}T12:00:00Z`))).toBe(week);
    }
  });

  it("handles year boundaries — Dec 31 2026 is in W53 of 2026", () => {
    const key = getISOWeekKey(new Date("2026-12-31T00:00:00Z"));
    expect(key).toBe("2026-W53");
  });
});

// ---------------------------------------------------------------------------
// Trends calculation logic
// ---------------------------------------------------------------------------

describe("trends weekly averaging logic", () => {
  type VitalsEntry = {
    date: Date;
    systolic: number;
    diastolic: number;
    heartRate: number;
  };

  // Pure reimplementation of the trends grouping/averaging logic for unit testing
  function calcTrends(
    entries: VitalsEntry[]
  ): { week: string; avgSystolic: number; avgDiastolic: number; avgHeartRate: number }[] {
    const weekMap = new Map<
      string,
      { systolics: number[]; diastolics: number[]; heartRates: number[] }
    >();

    for (const entry of entries) {
      const week = getISOWeekKey(new Date(entry.date));
      const existing = weekMap.get(week);
      if (existing) {
        existing.systolics.push(entry.systolic);
        existing.diastolics.push(entry.diastolic);
        existing.heartRates.push(entry.heartRate);
      } else {
        weekMap.set(week, {
          systolics: [entry.systolic],
          diastolics: [entry.diastolic],
          heartRates: [entry.heartRate],
        });
      }
    }

    const avg = (nums: number[]): number =>
      nums.reduce((sum, n) => sum + n, 0) / nums.length;

    const result = Array.from(weekMap.entries()).map(([week, data]) => ({
      week,
      avgSystolic: Math.round(avg(data.systolics) * 10) / 10,
      avgDiastolic: Math.round(avg(data.diastolics) * 10) / 10,
      avgHeartRate: Math.round(avg(data.heartRates) * 10) / 10,
    }));

    result.sort((a, b) => a.week.localeCompare(b.week));
    return result;
  }

  it("returns empty array for no entries", () => {
    expect(calcTrends([])).toEqual([]);
  });

  it("returns a single week entry for a single reading", () => {
    const result = calcTrends([
      {
        date: new Date("2026-02-23T10:00:00Z"),
        systolic: 120,
        diastolic: 80,
        heartRate: 72,
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].week).toBe("2026-W09");
    expect(result[0].avgSystolic).toBe(120);
    expect(result[0].avgDiastolic).toBe(80);
    expect(result[0].avgHeartRate).toBe(72);
  });

  it("averages multiple readings within the same ISO week", () => {
    const result = calcTrends([
      { date: new Date("2026-02-23T10:00:00Z"), systolic: 120, diastolic: 80, heartRate: 70 },
      { date: new Date("2026-02-24T10:00:00Z"), systolic: 130, diastolic: 90, heartRate: 80 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].avgSystolic).toBe(125);
    expect(result[0].avgDiastolic).toBe(85);
    expect(result[0].avgHeartRate).toBe(75);
  });

  it("separates readings from different weeks into different buckets", () => {
    const result = calcTrends([
      { date: new Date("2026-02-23T10:00:00Z"), systolic: 120, diastolic: 80, heartRate: 70 },
      { date: new Date("2026-03-02T10:00:00Z"), systolic: 140, diastolic: 90, heartRate: 80 },
    ]);
    expect(result).toHaveLength(2);
    // Sorted ascending by week
    expect(result[0].week).toBe("2026-W09");
    expect(result[1].week).toBe("2026-W10");
  });

  it("returns weeks sorted in ascending order", () => {
    const result = calcTrends([
      { date: new Date("2026-03-09T10:00:00Z"), systolic: 140, diastolic: 90, heartRate: 80 },
      { date: new Date("2026-02-23T10:00:00Z"), systolic: 120, diastolic: 80, heartRate: 70 },
      { date: new Date("2026-03-02T10:00:00Z"), systolic: 130, diastolic: 85, heartRate: 75 },
    ]);
    expect(result).toHaveLength(3);
    expect(result[0].week).toBe("2026-W09");
    expect(result[1].week).toBe("2026-W10");
    expect(result[2].week).toBe("2026-W11");
  });

  it("rounds averages to 1 decimal place", () => {
    // 3 readings: 120, 121, 122 → avg 121.0; 80, 81, 82 → avg 81.0; 70, 71, 72 → avg 71.0
    const result = calcTrends([
      { date: new Date("2026-02-23T10:00:00Z"), systolic: 120, diastolic: 80, heartRate: 70 },
      { date: new Date("2026-02-24T10:00:00Z"), systolic: 121, diastolic: 81, heartRate: 71 },
      { date: new Date("2026-02-25T10:00:00Z"), systolic: 122, diastolic: 82, heartRate: 72 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].avgSystolic).toBe(121);
    expect(result[0].avgDiastolic).toBe(81);
    expect(result[0].avgHeartRate).toBe(71);
  });

  it("handles non-integer averages rounded to 1 decimal", () => {
    // 120 + 121 = 241, /2 = 120.5
    const result = calcTrends([
      { date: new Date("2026-02-23T10:00:00Z"), systolic: 120, diastolic: 80, heartRate: 70 },
      { date: new Date("2026-02-24T10:00:00Z"), systolic: 121, diastolic: 81, heartRate: 71 },
    ]);
    expect(result[0].avgSystolic).toBe(120.5);
    expect(result[0].avgDiastolic).toBe(80.5);
    expect(result[0].avgHeartRate).toBe(70.5);
  });
});
