import { z } from "zod";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { weightEntries } from "@glp1/db";
import { createWeightEntrySchema } from "@glp1/shared";
import { db } from "@glp1/db";

export const weightRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(weightEntries.userId, ctx.userId)];
      if (input.from) {
        conditions.push(gte(weightEntries.date, input.from));
      }
      if (input.to) {
        conditions.push(lte(weightEntries.date, input.to));
      }
      return db
        .select()
        .from(weightEntries)
        .where(and(...conditions))
        .orderBy(desc(weightEntries.date));
    }),

  create: protectedProcedure
    .input(createWeightEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const [entry] = await db
        .insert(weightEntries)
        .values({
          userId: ctx.userId,
          weight: String(input.weight),
          unit: input.unit,
          date: input.date,
        })
        .returning();
      return entry;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(weightEntries).where(eq(weightEntries.id, input.id));
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const entries = await db
      .select()
      .from(weightEntries)
      .where(eq(weightEntries.userId, ctx.userId))
      .orderBy(desc(weightEntries.date));

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

    return {
      currentWeight,
      startWeight,
      totalLost,
      ratePerWeek,
      entryCount: entries.length,
    };
  }),
});
