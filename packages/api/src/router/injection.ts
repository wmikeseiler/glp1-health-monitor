import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { injections, medications } from "@glp1/db";
import {
  createInjectionSchema,
  suggestNextSite,
  calculateNextInjectionDate,
  INJECTION_SITE_LABELS,
} from "@glp1/shared";
import type { InjectionSite } from "@glp1/shared";
import { db } from "@glp1/db";

export const injectionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        medicationId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(injections.userId, ctx.userId)];
      if (input.medicationId) {
        conditions.push(eq(injections.medicationId, input.medicationId));
      }
      return db
        .select()
        .from(injections)
        .where(and(...conditions))
        .orderBy(desc(injections.date));
    }),

  create: protectedProcedure
    .input(createInjectionSchema)
    .mutation(async ({ ctx, input }) => {
      const values: {
        userId: string;
        medicationId: string;
        site: InjectionSite;
        dose: string;
        notes?: string;
        date?: Date;
      } = {
        userId: ctx.userId,
        medicationId: input.medicationId,
        site: input.site,
        dose: String(input.dose),
      };
      if (input.notes !== undefined) {
        values.notes = input.notes;
      }
      if (input.date !== undefined) {
        values.date = new Date(input.date);
      }
      const [injection] = await db
        .insert(injections)
        .values(values)
        .returning();
      return injection;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(injections).where(eq(injections.id, input.id));
    }),

  suggestNextSite: protectedProcedure.query(async ({ ctx }) => {
    const recent = await db
      .select({ site: injections.site, date: injections.date })
      .from(injections)
      .where(eq(injections.userId, ctx.userId))
      .orderBy(desc(injections.date))
      .limit(12);

    const history = recent.map((r) => ({ site: r.site as InjectionSite, date: r.date }));
    const site = suggestNextSite(history);
    return {
      site,
      siteLabel: INJECTION_SITE_LABELS[site] ?? site,
    };
  }),

  upcomingReminder: protectedProcedure
    .input(z.object({ medicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [lastInjection] = await db
        .select({ date: injections.date })
        .from(injections)
        .where(
          and(
            eq(injections.userId, ctx.userId),
            eq(injections.medicationId, input.medicationId)
          )
        )
        .orderBy(desc(injections.date))
        .limit(1);

      if (!lastInjection) {
        return null;
      }

      const [medication] = await db
        .select({ scheduleDays: medications.scheduleDays })
        .from(medications)
        .where(eq(medications.id, input.medicationId))
        .limit(1);

      const scheduleDays = medication?.scheduleDays ?? 7;
      const lastInjectionDate = lastInjection.date;
      const nextInjectionDate = calculateNextInjectionDate(lastInjectionDate, scheduleDays);
      const daysUntil = Math.ceil(
        (nextInjectionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        lastInjectionDate,
        nextInjectionDate,
        daysUntil,
      };
    }),
});
