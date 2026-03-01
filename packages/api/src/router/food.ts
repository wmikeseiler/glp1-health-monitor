import { z } from "zod";
import { eq, and, gte, lt, asc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { foodEntries } from "@glp1/db";
import { createFoodEntrySchema } from "@glp1/shared";
import { db } from "@glp1/db";
import { searchUSDAFoods } from "../services/usda";
import { analyzeFoodPhoto } from "../services/food-photo";
import { lookupBarcode } from "../services/openfoodfacts";

export const foodRouter = createTRPCRouter({
  log: protectedProcedure
    .input(createFoodEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const totalCalories =
        input.calories ??
        input.items.reduce((sum, item) => sum + (item.calories ?? 0), 0);
      const totalProtein =
        input.protein ??
        input.items.reduce((sum, item) => sum + (item.protein ?? 0), 0);
      const totalCarbs =
        input.carbs ??
        input.items.reduce((sum, item) => sum + (item.carbs ?? 0), 0);
      const totalFat =
        input.fat ??
        input.items.reduce((sum, item) => sum + (item.fat ?? 0), 0);

      const values: {
        userId: string;
        mealType: "breakfast" | "lunch" | "dinner" | "snack";
        items: { name: string; quantity?: string; calories?: number; protein?: number; carbs?: number; fat?: number }[];
        calories: number;
        protein: string;
        carbs: string;
        fat: string;
        photoUrl?: string;
        date?: Date;
      } = {
        userId: ctx.userId,
        mealType: input.mealType,
        items: input.items,
        calories: totalCalories,
        protein: String(totalProtein),
        carbs: String(totalCarbs),
        fat: String(totalFat),
      };

      if (input.photoUrl !== undefined) {
        values.photoUrl = input.photoUrl;
      }
      if (input.date !== undefined) {
        values.date = new Date(input.date);
      }

      const [entry] = await db.insert(foodEntries).values(values).returning();
      return entry;
    }),

  list: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const startOfDay = new Date(`${input.date}T00:00:00Z`);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

      return db
        .select()
        .from(foodEntries)
        .where(
          and(
            eq(foodEntries.userId, ctx.userId),
            gte(foodEntries.date, startOfDay),
            lt(foodEntries.date, startOfNextDay)
          )
        )
        .orderBy(asc(foodEntries.date));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(foodEntries).where(eq(foodEntries.id, input.id));
    }),

  dailySummary: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const startOfDay = new Date(`${input.date}T00:00:00Z`);
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

      const entries = await db
        .select()
        .from(foodEntries)
        .where(
          and(
            eq(foodEntries.userId, ctx.userId),
            gte(foodEntries.date, startOfDay),
            lt(foodEntries.date, startOfNextDay)
          )
        );

      const totalCalories = entries.reduce(
        (sum, e) => sum + (e.calories ?? 0),
        0
      );
      const totalProtein = entries.reduce(
        (sum, e) => sum + (e.protein !== null ? parseFloat(e.protein) : 0),
        0
      );
      const totalCarbs = entries.reduce(
        (sum, e) => sum + (e.carbs !== null ? parseFloat(e.carbs) : 0),
        0
      );
      const totalFat = entries.reduce(
        (sum, e) => sum + (e.fat !== null ? parseFloat(e.fat) : 0),
        0
      );

      return {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        mealCount: entries.length,
      };
    }),

  searchFood: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return searchUSDAFoods(input.query, process.env.USDA_API_KEY ?? "");
    }),

  analyzePhoto: protectedProcedure
    .input(z.object({ photoUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      return analyzeFoodPhoto(input.photoUrl);
    }),

  lookupBarcode: protectedProcedure
    .input(z.object({ barcode: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      return lookupBarcode(input.barcode);
    }),
});
