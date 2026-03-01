import type { z } from "zod";
import type {
  createMedicationSchema,
  createInjectionSchema,
  createWeightEntrySchema,
  createVitalsSchema,
  createFoodEntrySchema,
  injectionSiteSchema,
  mealTypeSchema,
} from "./schemas";

export type InjectionSite = z.infer<typeof injectionSiteSchema>;
export type MealType = z.infer<typeof mealTypeSchema>;

export type CreateMedication = z.infer<typeof createMedicationSchema>;
export type CreateInjection = z.infer<typeof createInjectionSchema>;
export type CreateWeightEntry = z.infer<typeof createWeightEntrySchema>;
export type CreateVitals = z.infer<typeof createVitalsSchema>;
export type CreateFoodEntry = z.infer<typeof createFoodEntrySchema>;
