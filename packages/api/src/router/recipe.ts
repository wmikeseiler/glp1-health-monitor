import { z } from "zod";
import { eq, and, lte, asc, ilike, or, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { recipes, userFavorites } from "@glp1/db";
import { db } from "@glp1/db";

export const recipeRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        tag: z.string().optional(),
        maxCalories: z.number().int().positive().optional(),
        maxPrepTime: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.tag) {
        conditions.push(sql`${recipes.tags} @> ARRAY[${input.tag}]::text[]`);
      }
      if (input.maxCalories !== undefined) {
        conditions.push(lte(recipes.calories, input.maxCalories));
      }
      if (input.maxPrepTime !== undefined) {
        conditions.push(lte(recipes.prepTime, input.maxPrepTime));
      }

      const query = db.select().from(recipes).orderBy(asc(recipes.title));

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }
      return query;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, input.id));
      return recipe ?? null;
    }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const searchTerm = `%${input.query}%`;
      return db
        .select()
        .from(recipes)
        .where(
          or(
            ilike(recipes.title, searchTerm),
            ilike(recipes.description, searchTerm)
          )
        )
        .orderBy(asc(recipes.title));
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ recipeId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(userFavorites)
        .where(
          and(
            eq(userFavorites.userId, ctx.userId),
            eq(userFavorites.recipeId, input.recipeId)
          )
        );

      if (existing) {
        await db.delete(userFavorites).where(eq(userFavorites.id, existing.id));
        return { isFavorite: false };
      }

      await db.insert(userFavorites).values({
        userId: ctx.userId,
        recipeId: input.recipeId,
      });
      return { isFavorite: true };
    }),

  favorites: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({ recipe: recipes })
      .from(userFavorites)
      .innerJoin(recipes, eq(userFavorites.recipeId, recipes.id))
      .where(eq(userFavorites.userId, ctx.userId))
      .orderBy(asc(recipes.title))
      .then((rows) => rows.map((r) => r.recipe));
  }),
});
