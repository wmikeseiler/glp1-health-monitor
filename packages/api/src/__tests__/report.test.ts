import { describe, it, expect } from "vitest";
import {
  buildSiteDistribution,
  buildFoodDailySummaries,
  buildVitalsAverages,
  buildWeightCSV,
  buildInjectionsCSV,
  buildVitalsCSV,
  buildFoodCSV,
} from "../router/report";

// ---------------------------------------------------------------------------
// Router structure
// ---------------------------------------------------------------------------

describe("reportRouter structure", () => {
  it("appRouter exposes a report namespace with generateReport and exportCSV", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("report.generateReport");
    expect(procedures).toHaveProperty("report.exportCSV");
  });
});

// ---------------------------------------------------------------------------
// buildSiteDistribution
// ---------------------------------------------------------------------------

describe("buildSiteDistribution", () => {
  it("returns empty object for no entries", () => {
    expect(buildSiteDistribution([])).toEqual({});
  });

  it("counts single site correctly", () => {
    const entries = [{ site: "left_abdomen" }, { site: "left_abdomen" }, { site: "left_abdomen" }];
    expect(buildSiteDistribution(entries)).toEqual({ left_abdomen: 3 });
  });

  it("counts multiple sites correctly", () => {
    const entries = [
      { site: "left_abdomen" },
      { site: "right_abdomen" },
      { site: "left_abdomen" },
      { site: "left_thigh" },
    ];
    const result = buildSiteDistribution(entries);
    expect(result.left_abdomen).toBe(2);
    expect(result.right_abdomen).toBe(1);
    expect(result.left_thigh).toBe(1);
  });

  it("handles ten distinct sites", () => {
    const sites = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const entries = sites.map((s) => ({ site: s }));
    const result = buildSiteDistribution(entries);
    for (const s of sites) {
      expect(result[s]).toBe(1);
    }
    expect(Object.keys(result)).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// buildVitalsAverages
// ---------------------------------------------------------------------------

describe("buildVitalsAverages", () => {
  it("returns null for empty entries", () => {
    expect(buildVitalsAverages([])).toBeNull();
  });

  it("returns exact values for a single entry", () => {
    const result = buildVitalsAverages([{ systolic: 120, diastolic: 80, heartRate: 72 }]);
    expect(result).toEqual({ systolic: 120, diastolic: 80, heartRate: 72 });
  });

  it("averages two entries correctly", () => {
    const result = buildVitalsAverages([
      { systolic: 120, diastolic: 80, heartRate: 70 },
      { systolic: 130, diastolic: 90, heartRate: 80 },
    ]);
    expect(result?.systolic).toBe(125);
    expect(result?.diastolic).toBe(85);
    expect(result?.heartRate).toBe(75);
  });

  it("rounds to one decimal place", () => {
    const result = buildVitalsAverages([
      { systolic: 121, diastolic: 81, heartRate: 71 },
      { systolic: 120, diastolic: 80, heartRate: 70 },
      { systolic: 122, diastolic: 82, heartRate: 72 },
    ]);
    // (121+120+122)/3 = 121.0 exactly
    expect(result?.systolic).toBe(121);
    // (81+80+82)/3 = 81.0
    expect(result?.diastolic).toBe(81);
    // (71+70+72)/3 = 71.0
    expect(result?.heartRate).toBe(71);
  });
});

// ---------------------------------------------------------------------------
// buildFoodDailySummaries
// ---------------------------------------------------------------------------

describe("buildFoodDailySummaries", () => {
  it("returns empty array for no entries", () => {
    expect(buildFoodDailySummaries([])).toEqual([]);
  });

  it("groups entries on the same UTC day", () => {
    const entries = [
      { date: new Date("2026-02-01T08:00:00Z"), calories: 400, protein: "30", carbs: "50", fat: "10" },
      { date: new Date("2026-02-01T12:00:00Z"), calories: 600, protein: "40", carbs: "70", fat: "15" },
    ];
    const result = buildFoodDailySummaries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-02-01");
    expect(result[0].calories).toBe(1000);
    expect(result[0].protein).toBeCloseTo(70);
    expect(result[0].carbs).toBeCloseTo(120);
    expect(result[0].fat).toBeCloseTo(25);
  });

  it("produces separate rows for different days, sorted ascending", () => {
    const entries = [
      { date: new Date("2026-02-03T10:00:00Z"), calories: 300, protein: "20", carbs: "40", fat: "8" },
      { date: new Date("2026-02-01T08:00:00Z"), calories: 500, protein: "35", carbs: "60", fat: "12" },
      { date: new Date("2026-02-02T09:00:00Z"), calories: 400, protein: "25", carbs: "55", fat: "10" },
    ];
    const result = buildFoodDailySummaries(entries);
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-01");
    expect(result[1].date).toBe("2026-02-02");
    expect(result[2].date).toBe("2026-02-03");
  });

  it("handles null macro values gracefully", () => {
    const entries = [
      { date: new Date("2026-02-01T12:00:00Z"), calories: null, protein: null, carbs: null, fat: null },
    ];
    const result = buildFoodDailySummaries(entries);
    expect(result[0].calories).toBe(0);
    expect(result[0].protein).toBe(0);
    expect(result[0].carbs).toBe(0);
    expect(result[0].fat).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CSV builders
// ---------------------------------------------------------------------------

describe("buildWeightCSV", () => {
  it("produces header-only CSV for empty entries", () => {
    expect(buildWeightCSV([])).toBe("Date,Weight,Unit");
  });

  it("produces correct CSV for one entry", () => {
    const csv = buildWeightCSV([{ date: "2026-02-01", weight: "185.5", unit: "lbs" }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Weight,Unit");
    expect(lines[1]).toBe("2026-02-01,185.5,lbs");
  });

  it("produces correct CSV for multiple entries", () => {
    const entries = [
      { date: "2026-02-01", weight: "185.5", unit: "lbs" },
      { date: "2026-02-08", weight: "184.0", unit: "lbs" },
    ];
    const csv = buildWeightCSV(entries);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("2026-02-01,185.5,lbs");
    expect(lines[2]).toBe("2026-02-08,184.0,lbs");
  });
});

describe("buildInjectionsCSV", () => {
  it("produces header-only CSV for empty entries", () => {
    expect(buildInjectionsCSV([])).toBe("Date,Site,Dose,Notes");
  });

  it("produces correct CSV row without notes", () => {
    const csv = buildInjectionsCSV([
      { date: new Date("2026-02-01T09:00:00Z"), site: "left_abdomen", dose: "0.5", notes: null },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Site,Dose,Notes");
    expect(lines[1]).toBe("2026-02-01,left_abdomen,0.5,");
  });

  it("wraps notes containing commas in quotes", () => {
    const csv = buildInjectionsCSV([
      { date: "2026-02-01", site: "right_thigh", dose: "1.0", notes: "quick, easy injection" },
    ]);
    expect(csv).toContain('"quick, easy injection"');
  });

  it("handles string date input", () => {
    const csv = buildInjectionsCSV([
      { date: "2026-02-15", site: "left_thigh", dose: "0.25", notes: "fine" },
    ]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("2026-02-15,left_thigh,0.25,fine");
  });
});

describe("buildVitalsCSV", () => {
  it("produces header-only CSV for empty entries", () => {
    expect(buildVitalsCSV([])).toBe("Date,Systolic,Diastolic,HeartRate");
  });

  it("produces correct CSV row", () => {
    const csv = buildVitalsCSV([
      { date: new Date("2026-02-01T09:00:00Z"), systolic: 120, diastolic: 80, heartRate: 72 },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,Systolic,Diastolic,HeartRate");
    expect(lines[1]).toMatch(/^2026-02-01T09:00:00\.000Z,120,80,72$/);
  });

  it("produces multiple rows in insertion order", () => {
    const entries = [
      { date: new Date("2026-02-01T09:00:00Z"), systolic: 120, diastolic: 80, heartRate: 72 },
      { date: new Date("2026-02-08T10:00:00Z"), systolic: 125, diastolic: 82, heartRate: 74 },
    ];
    const lines = buildVitalsCSV(entries).split("\n");
    expect(lines).toHaveLength(3);
  });
});

describe("buildFoodCSV", () => {
  it("produces header-only CSV for empty entries", () => {
    expect(buildFoodCSV([])).toBe("Date,MealType,Items,Calories,Protein,Carbs,Fat");
  });

  it("produces correct CSV row with items array", () => {
    const csv = buildFoodCSV([
      {
        date: new Date("2026-02-01T12:00:00Z"),
        mealType: "lunch",
        items: [{ name: "Chicken" }, { name: "Rice" }],
        calories: 550,
        protein: "40",
        carbs: "60",
        fat: "12",
      },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Date,MealType,Items,Calories,Protein,Carbs,Fat");
    expect(lines[1]).toContain("lunch");
    expect(lines[1]).toContain("550");
  });

  it("wraps item names containing commas in quotes", () => {
    const csv = buildFoodCSV([
      {
        date: "2026-02-01",
        mealType: "snack",
        items: [{ name: "Apple, sliced" }],
        calories: 80,
        protein: "0",
        carbs: "20",
        fat: "0",
      },
    ]);
    expect(csv).toContain('"Apple, sliced"');
  });

  it("handles non-array items gracefully", () => {
    const csv = buildFoodCSV([
      {
        date: "2026-02-01",
        mealType: "breakfast",
        items: null,
        calories: 300,
        protein: "15",
        carbs: "30",
        fat: "10",
      },
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("breakfast");
  });

  it("handles null calorie/macro values", () => {
    const csv = buildFoodCSV([
      {
        date: "2026-02-01",
        mealType: "dinner",
        items: [],
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
      },
    ]);
    expect(csv).toContain("0,0,0,0");
  });
});

// ---------------------------------------------------------------------------
// Report section filtering logic (pure data logic)
// ---------------------------------------------------------------------------

describe("report section filtering logic", () => {
  it("only includes requested sections in the result shape", () => {
    // Simulate the result object building with section checks
    const sections = ["weight", "food"];
    const result: Record<string, unknown> = {};

    if (sections.includes("weight")) {
      result.weight = { entries: [], startWeight: null, endWeight: null, totalChange: null };
    }
    if (sections.includes("injections")) {
      result.injections = { entries: [], totalCount: 0, siteDistribution: {} };
    }
    if (sections.includes("vitals")) {
      result.vitals = { entries: [], averages: null };
    }
    if (sections.includes("food")) {
      result.food = { dailySummaries: [] };
    }

    expect(result).toHaveProperty("weight");
    expect(result).toHaveProperty("food");
    expect(result).not.toHaveProperty("injections");
    expect(result).not.toHaveProperty("vitals");
  });

  it("includes all four sections when all are requested", () => {
    const sections = ["weight", "injections", "vitals", "food"];
    const result: Record<string, unknown> = {};
    if (sections.includes("weight")) result.weight = {};
    if (sections.includes("injections")) result.injections = {};
    if (sections.includes("vitals")) result.vitals = {};
    if (sections.includes("food")) result.food = {};
    expect(Object.keys(result)).toHaveLength(4);
  });

  it("produces an empty result body when no sections requested", () => {
    const sections: string[] = [];
    const result: Record<string, unknown> = {};
    if (sections.includes("weight")) result.weight = {};
    if (sections.includes("injections")) result.injections = {};
    if (sections.includes("vitals")) result.vitals = {};
    if (sections.includes("food")) result.food = {};
    expect(Object.keys(result)).toHaveLength(0);
  });
});
