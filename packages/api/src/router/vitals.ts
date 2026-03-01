import { z } from "zod";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { vitals } from "@glp1/db";
import { createVitalsSchema } from "@glp1/shared";
import { db } from "@glp1/db";

/**
 * Compute an ISO week key in YYYY-Www format for a given Date.
 * Uses the ISO 8601 definition: week 1 is the week containing the first Thursday.
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Find the Monday of this ISO week
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
  const mondayOffset = (dayOfWeek + 6) % 7; // 0 for Monday, 6 for Sunday
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - mondayOffset);
  // Find Thursday of the same week (determines the ISO year)
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();
  // Find week 1 Monday: Monday of the week containing Jan 4
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7; // Monday=0
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  // Week number = floor((monday - week1Monday) / 7 days) + 1
  const weekNumber =
    Math.floor((monday.getTime() - week1Monday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${isoYear}-W${String(weekNumber).padStart(2, "0")}`;
}

/**
 * Classify a BP reading into one of the four AHA categories.
 */
export function classifyBP(
  systolic: number,
  diastolic: number
): "normal" | "elevated" | "high1" | "high2" {
  if (systolic >= 140 || diastolic >= 90) return "high2";
  if (systolic >= 130 || diastolic >= 80) return "high1";
  if (systolic >= 120) return "elevated";
  return "normal";
}

export const vitalsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(vitals.userId, ctx.userId)];
      if (input.from) {
        conditions.push(gte(vitals.date, new Date(input.from)));
      }
      if (input.to) {
        conditions.push(lte(vitals.date, new Date(input.to)));
      }
      return db
        .select()
        .from(vitals)
        .where(and(...conditions))
        .orderBy(desc(vitals.date));
    }),

  create: protectedProcedure
    .input(createVitalsSchema)
    .mutation(async ({ ctx, input }) => {
      const values: {
        userId: string;
        systolic: number;
        diastolic: number;
        heartRate: number;
        date?: Date;
      } = {
        userId: ctx.userId,
        systolic: input.systolic,
        diastolic: input.diastolic,
        heartRate: input.heartRate,
      };
      if (input.date !== undefined) {
        values.date = new Date(input.date);
      }
      const [entry] = await db.insert(vitals).values(values).returning();
      return entry;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(vitals).where(eq(vitals.id, input.id));
    }),

  latest: protectedProcedure.query(async ({ ctx }) => {
    const [entry] = await db
      .select()
      .from(vitals)
      .where(eq(vitals.userId, ctx.userId))
      .orderBy(desc(vitals.date))
      .limit(1);
    return entry ?? null;
  }),

  trends: protectedProcedure.query(async ({ ctx }) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const entries = await db
      .select()
      .from(vitals)
      .where(and(eq(vitals.userId, ctx.userId), gte(vitals.date, ninetyDaysAgo)))
      .orderBy(desc(vitals.date));

    // Group entries by ISO week
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

    // Sort ascending by week string (YYYY-Www sorts lexicographically correctly)
    result.sort((a, b) => a.week.localeCompare(b.week));

    return result;
  }),
});
