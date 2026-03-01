import { relations } from "drizzle-orm";
import {
  medications,
  injections,
  recipes,
  userFavorites,
} from "./schema";

export const medicationsRelations = relations(medications, ({ many }) => ({
  injections: many(injections),
}));

export const injectionsRelations = relations(injections, ({ one }) => ({
  medication: one(medications, {
    fields: [injections.medicationId],
    references: [medications.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ many }) => ({
  favorites: many(userFavorites),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  recipe: one(recipes, {
    fields: [userFavorites.recipeId],
    references: [recipes.id],
  }),
}));
