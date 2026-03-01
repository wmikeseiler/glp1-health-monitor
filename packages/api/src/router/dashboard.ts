import { eq, desc, and, gte, lt, count } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  medications,
  injections,
  weightEntries,
  vitals,
  foodEntries,
} from "@glp1/db";
import { db } from "@glp1/db";
import { calculateNextInjectionDate } from "@glp1/shared";
import { classifyBP } from "./vitals";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function startOfTomorrowUTC(): Date {
  const today = startOfTodayUTC();
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);
  return tomorrow;
}

// ---------------------------------------------------------------------------
// Types for recentActivity
// ---------------------------------------------------------------------------

export type ActivityType = "weight" | "injection" | "vitals" | "food";

export interface ActivityItem {
  type: ActivityType;
  date: Date;
  description: string;
}

// ---------------------------------------------------------------------------
// Pure merge + sort helper (exported for unit testing)
// ---------------------------------------------------------------------------

export function mergeAndSortActivities(
  activities: ActivityItem[],
  limit: number
): ActivityItem[] {
  return [...activities]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const dashboardRouter = createTRPCRouter({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const todayStart = startOfTodayUTC();
    const tomorrowStart = startOfTomorrowUTC();

    // ---- Weight ----
    const weightRows = await db
      .select()
      .from(weightEntries)
      .where(eq(weightEntries.userId, userId))
      .orderBy(desc(weightEntries.date));

    let weightCurrent: number | null = null;
    let weightTotalLost: number | null = null;
    if (weightRows.length > 0) {
      weightCurrent = parseFloat(weightRows[0].weight);
      const startWeight = parseFloat(weightRows[weightRows.length - 1].weight);
      weightTotalLost = startWeight - weightCurrent;
    }

    // ---- Medications count ----
    const [medCountRow] = await db
      .select({ value: count() })
      .from(medications)
      .where(eq(medications.userId, userId));
    const medicationCount = medCountRow?.value ?? 0;

    // ---- Injections ----
    const [lastInjection] = await db
      .select({
        id: injections.id,
        date: injections.date,
        medicationId: injections.medicationId,
      })
      .from(injections)
      .where(eq(injections.userId, userId))
      .orderBy(desc(injections.date))
      .limit(1);

    const [injectionCountRow] = await db
      .select({ value: count() })
      .from(injections)
      .where(eq(injections.userId, userId));
    const totalInjections = injectionCountRow?.value ?? 0;

    let lastInjectionDate: Date | null = null;
    let nextDueDate: Date | null = null;

    if (lastInjection) {
      lastInjectionDate = lastInjection.date;

      const [med] = await db
        .select({ scheduleDays: medications.scheduleDays })
        .from(medications)
        .where(eq(medications.id, lastInjection.medicationId))
        .limit(1);

      const scheduleDays = med?.scheduleDays ?? 7;
      nextDueDate = calculateNextInjectionDate(lastInjectionDate, scheduleDays);
    }

    // ---- Vitals ----
    const [latestVitals] = await db
      .select()
      .from(vitals)
      .where(eq(vitals.userId, userId))
      .orderBy(desc(vitals.date))
      .limit(1);

    let bpCategory: string | null = null;
    if (latestVitals) {
      bpCategory = classifyBP(latestVitals.systolic, latestVitals.diastolic);
    }

    // ---- Food (today) ----
    const todayFoodRows = await db
      .select({ calories: foodEntries.calories })
      .from(foodEntries)
      .where(
        and(
          eq(foodEntries.userId, userId),
          gte(foodEntries.date, todayStart),
          lt(foodEntries.date, tomorrowStart)
        )
      );

    const todayCalories = todayFoodRows.reduce(
      (sum, e) => sum + (e.calories ?? 0),
      0
    );
    const todayMeals = todayFoodRows.length;

    return {
      weight: {
        current: weightCurrent,
        totalLost: weightTotalLost,
        entryCount: weightRows.length,
      },
      injections: {
        totalCount: Number(totalInjections),
        lastInjectionDate,
        nextDueDate,
      },
      vitals: {
        latestSystolic: latestVitals?.systolic ?? null,
        latestDiastolic: latestVitals?.diastolic ?? null,
        latestHeartRate: latestVitals?.heartRate ?? null,
        bpCategory,
      },
      food: {
        todayCalories,
        todayMeals,
      },
      medications: {
        count: Number(medicationCount),
      },
    };
  }),

  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const LIMIT = 10;

    // Fetch recent rows from each table in parallel
    const [recentWeight, recentInjections, recentVitals, recentFood] =
      await Promise.all([
        db
          .select({ date: weightEntries.date, weight: weightEntries.weight, unit: weightEntries.unit })
          .from(weightEntries)
          .where(eq(weightEntries.userId, userId))
          .orderBy(desc(weightEntries.date))
          .limit(LIMIT),

        db
          .select({ date: injections.date, dose: injections.dose, site: injections.site })
          .from(injections)
          .where(eq(injections.userId, userId))
          .orderBy(desc(injections.date))
          .limit(LIMIT),

        db
          .select({
            date: vitals.date,
            systolic: vitals.systolic,
            diastolic: vitals.diastolic,
            heartRate: vitals.heartRate,
          })
          .from(vitals)
          .where(eq(vitals.userId, userId))
          .orderBy(desc(vitals.date))
          .limit(LIMIT),

        db
          .select({ date: foodEntries.date, mealType: foodEntries.mealType, calories: foodEntries.calories })
          .from(foodEntries)
          .where(eq(foodEntries.userId, userId))
          .orderBy(desc(foodEntries.date))
          .limit(LIMIT),
      ]);

    const activities: ActivityItem[] = [
      ...recentWeight.map((e) => ({
        type: "weight" as ActivityType,
        date: new Date(e.date),
        description: `Logged weight: ${parseFloat(e.weight)} ${e.unit}`,
      })),
      ...recentInjections.map((e) => ({
        type: "injection" as ActivityType,
        date: new Date(e.date),
        description: `Injection at ${e.site.replace(/_/g, " ")}: ${parseFloat(e.dose)} mg`,
      })),
      ...recentVitals.map((e) => ({
        type: "vitals" as ActivityType,
        date: new Date(e.date),
        description: `Vitals: ${e.systolic}/${e.diastolic} mmHg, HR ${e.heartRate} bpm`,
      })),
      ...recentFood.map((e) => ({
        type: "food" as ActivityType,
        date: new Date(e.date),
        description: `${e.mealType.charAt(0).toUpperCase() + e.mealType.slice(1)}: ${e.calories ?? 0} kcal`,
      })),
    ];

    return mergeAndSortActivities(activities, LIMIT);
  }),
});
