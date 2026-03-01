import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { medications } from "@glp1/db";
import { createMedicationSchema } from "@glp1/shared";
import { db } from "@glp1/db";

export const medicationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(medications)
      .where(eq(medications.userId, ctx.userId));
  }),

  create: protectedProcedure
    .input(createMedicationSchema)
    .mutation(async ({ ctx, input }) => {
      const [medication] = await db
        .insert(medications)
        .values({
          userId: ctx.userId,
          name: input.name,
          currentDose: String(input.currentDose),
          doseUnit: input.doseUnit,
          scheduleDays: input.scheduleDays,
        })
        .returning();
      return medication;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        currentDose: z.number().positive().max(100).optional(),
        doseUnit: z.string().optional(),
        scheduleDays: z.number().int().positive().max(90).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const values: Record<string, unknown> = {};
      if (updates.name !== undefined) values.name = updates.name;
      if (updates.currentDose !== undefined) values.currentDose = String(updates.currentDose);
      if (updates.doseUnit !== undefined) values.doseUnit = updates.doseUnit;
      if (updates.scheduleDays !== undefined) values.scheduleDays = updates.scheduleDays;
      values.updatedAt = new Date();

      const [medication] = await db
        .update(medications)
        .set(values)
        .where(eq(medications.id, id))
        .returning();
      return medication;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(medications).where(eq(medications.id, input.id));
    }),
});
