import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { weightEntries, injections, vitals, foodEntries } from "@glp1/db";
import { db } from "@glp1/db";

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

export function buildSiteDistribution(
  entries: { site: string }[]
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const e of entries) {
    dist[e.site] = (dist[e.site] ?? 0) + 1;
  }
  return dist;
}

export function buildFoodDailySummaries(
  entries: {
    date: Date | string;
    calories: number | null;
    protein: string | null;
    carbs: string | null;
    fat: string | null;
  }[]
): { date: string; calories: number; protein: number; carbs: number; fat: number }[] {
  const dayMap = new Map<
    string,
    { calories: number; protein: number; carbs: number; fat: number }
  >();

  for (const e of entries) {
    const d = typeof e.date === "string" ? new Date(e.date) : e.date;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const existing = dayMap.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
    existing.calories += e.calories ?? 0;
    existing.protein += e.protein !== null ? parseFloat(e.protein) : 0;
    existing.carbs += e.carbs !== null ? parseFloat(e.carbs) : 0;
    existing.fat += e.fat !== null ? parseFloat(e.fat) : 0;
    dayMap.set(key, existing);
  }

  return Array.from(dayMap.entries())
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildVitalsAverages(
  entries: { systolic: number; diastolic: number; heartRate: number }[]
): { systolic: number; diastolic: number; heartRate: number } | null {
  if (entries.length === 0) return null;
  const avg = (vals: number[]) =>
    Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
  return {
    systolic: avg(entries.map((e) => e.systolic)),
    diastolic: avg(entries.map((e) => e.diastolic)),
    heartRate: avg(entries.map((e) => e.heartRate)),
  };
}

// ---------------------------------------------------------------------------
// CSV builders (exported for unit testing)
// ---------------------------------------------------------------------------

export function buildWeightCSV(
  entries: { date: string; weight: string; unit: string }[]
): string {
  const header = "Date,Weight,Unit";
  const rows = entries.map((e) => `${e.date},${e.weight},${e.unit}`);
  return [header, ...rows].join("\n");
}

export function buildInjectionsCSV(
  entries: { date: Date | string; site: string; dose: string; notes?: string | null }[]
): string {
  const header = "Date,Site,Dose,Notes";
  const rows = entries.map((e) => {
    const d = typeof e.date === "string" ? e.date : e.date.toISOString().split("T")[0];
    const notes = e.notes ?? "";
    // Escape commas in notes
    const notesSafe = notes.includes(",") ? `"${notes}"` : notes;
    return `${d},${e.site},${e.dose},${notesSafe}`;
  });
  return [header, ...rows].join("\n");
}

export function buildVitalsCSV(
  entries: { date: Date | string; systolic: number; diastolic: number; heartRate: number }[]
): string {
  const header = "Date,Systolic,Diastolic,HeartRate";
  const rows = entries.map((e) => {
    const d = typeof e.date === "string" ? e.date : e.date.toISOString();
    return `${d},${e.systolic},${e.diastolic},${e.heartRate}`;
  });
  return [header, ...rows].join("\n");
}

export function buildFoodCSV(
  entries: {
    date: Date | string;
    mealType: string;
    items: unknown;
    calories: number | null;
    protein: string | null;
    carbs: string | null;
    fat: string | null;
  }[]
): string {
  const header = "Date,MealType,Items,Calories,Protein,Carbs,Fat";
  const rows = entries.map((e) => {
    const d = typeof e.date === "string" ? e.date : e.date.toISOString();
    const items = Array.isArray(e.items)
      ? (e.items as { name?: string }[]).map((i) => i.name ?? "").join("; ")
      : "";
    const itemsSafe = items.includes(",") ? `"${items}"` : items;
    return `${d},${e.mealType},${itemsSafe},${e.calories ?? 0},${e.protein ?? 0},${e.carbs ?? 0},${e.fat ?? 0}`;
  });
  return [header, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const reportRouter = createTRPCRouter({
  generateReport: protectedProcedure
    .input(
      z.object({
        from: z.string(),
        to: z.string(),
        sections: z.array(z.enum(["weight", "injections", "vitals", "food"])),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const { from, to, sections } = input;

      const result: {
        dateRange: { from: string; to: string };
        generatedAt: string;
        weight?: {
          entries: unknown[];
          startWeight: number | null;
          endWeight: number | null;
          totalChange: number | null;
        };
        injections?: {
          entries: unknown[];
          totalCount: number;
          siteDistribution: Record<string, number>;
        };
        vitals?: {
          entries: unknown[];
          averages: { systolic: number; diastolic: number; heartRate: number } | null;
        };
        food?: {
          dailySummaries: {
            date: string;
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
          }[];
        };
      } = {
        dateRange: { from, to },
        generatedAt: new Date().toISOString(),
      };

      await Promise.all([
        sections.includes("weight")
          ? (async () => {
              const rows = await db
                .select()
                .from(weightEntries)
                .where(
                  and(
                    eq(weightEntries.userId, userId),
                    gte(weightEntries.date, from),
                    lte(weightEntries.date, to)
                  )
                )
                .orderBy(weightEntries.date);

              const startWeight = rows.length > 0 ? parseFloat(rows[0].weight) : null;
              const endWeight = rows.length > 0 ? parseFloat(rows[rows.length - 1].weight) : null;
              const totalChange =
                startWeight !== null && endWeight !== null ? endWeight - startWeight : null;

              result.weight = { entries: rows, startWeight, endWeight, totalChange };
            })()
          : Promise.resolve(),

        sections.includes("injections")
          ? (async () => {
              const rows = await db
                .select()
                .from(injections)
                .where(
                  and(
                    eq(injections.userId, userId),
                    gte(injections.date, new Date(`${from}T00:00:00Z`)),
                    lte(injections.date, new Date(`${to}T23:59:59Z`))
                  )
                )
                .orderBy(injections.date);

              result.injections = {
                entries: rows,
                totalCount: rows.length,
                siteDistribution: buildSiteDistribution(rows),
              };
            })()
          : Promise.resolve(),

        sections.includes("vitals")
          ? (async () => {
              const rows = await db
                .select()
                .from(vitals)
                .where(
                  and(
                    eq(vitals.userId, userId),
                    gte(vitals.date, new Date(`${from}T00:00:00Z`)),
                    lte(vitals.date, new Date(`${to}T23:59:59Z`))
                  )
                )
                .orderBy(vitals.date);

              result.vitals = {
                entries: rows,
                averages: buildVitalsAverages(rows),
              };
            })()
          : Promise.resolve(),

        sections.includes("food")
          ? (async () => {
              const rows = await db
                .select()
                .from(foodEntries)
                .where(
                  and(
                    eq(foodEntries.userId, userId),
                    gte(foodEntries.date, new Date(`${from}T00:00:00Z`)),
                    lte(foodEntries.date, new Date(`${to}T23:59:59Z`))
                  )
                )
                .orderBy(foodEntries.date);

              result.food = {
                dailySummaries: buildFoodDailySummaries(rows),
              };
            })()
          : Promise.resolve(),
      ]);

      return result;
    }),

  exportCSV: protectedProcedure
    .input(
      z.object({
        type: z.enum(["weight", "injections", "vitals", "food"]),
        from: z.string(),
        to: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const { type, from, to } = input;

      if (type === "weight") {
        const rows = await db
          .select()
          .from(weightEntries)
          .where(
            and(
              eq(weightEntries.userId, userId),
              gte(weightEntries.date, from),
              lte(weightEntries.date, to)
            )
          )
          .orderBy(weightEntries.date);
        return buildWeightCSV(rows);
      }

      if (type === "injections") {
        const rows = await db
          .select()
          .from(injections)
          .where(
            and(
              eq(injections.userId, userId),
              gte(injections.date, new Date(`${from}T00:00:00Z`)),
              lte(injections.date, new Date(`${to}T23:59:59Z`))
            )
          )
          .orderBy(injections.date);
        return buildInjectionsCSV(rows);
      }

      if (type === "vitals") {
        const rows = await db
          .select()
          .from(vitals)
          .where(
            and(
              eq(vitals.userId, userId),
              gte(vitals.date, new Date(`${from}T00:00:00Z`)),
              lte(vitals.date, new Date(`${to}T23:59:59Z`))
            )
          )
          .orderBy(vitals.date);
        return buildVitalsCSV(rows);
      }

      // food
      const rows = await db
        .select()
        .from(foodEntries)
        .where(
          and(
            eq(foodEntries.userId, userId),
            gte(foodEntries.date, new Date(`${from}T00:00:00Z`)),
            lte(foodEntries.date, new Date(`${to}T23:59:59Z`))
          )
        )
        .orderBy(foodEntries.date);
      return buildFoodCSV(rows);
    }),
});
