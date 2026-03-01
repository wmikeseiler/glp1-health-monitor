import { z } from "zod";

// --- Enums ---

export const INJECTION_SITES = [
  "left_thigh",
  "right_thigh",
  "left_abdomen",
  "right_abdomen",
  "left_arm",
  "right_arm",
] as const;

export const injectionSiteSchema = z.enum(INJECTION_SITES);

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealTypeSchema = z.enum(MEAL_TYPES);

export const WEIGHT_UNITS = ["lbs", "kg"] as const;
export const weightUnitSchema = z.enum(WEIGHT_UNITS);

// --- Create Schemas ---

export const createMedicationSchema = z.object({
  name: z.string().min(1).max(100),
  currentDose: z.number().positive().max(100),
  doseUnit: z.string().default("mg"),
  scheduleDays: z.number().int().positive().max(90).default(7),
});

export const createInjectionSchema = z.object({
  medicationId: z.string().uuid(),
  site: injectionSiteSchema,
  dose: z.number().positive().max(100),
  notes: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
});

export const createWeightEntrySchema = z.object({
  weight: z.number().positive().max(1500),
  unit: weightUnitSchema.default("lbs"),
  date: z.string().min(1),
});

export const createVitalsSchema = z.object({
  systolic: z.number().int().min(50).max(300),
  diastolic: z.number().int().min(20).max(200),
  heartRate: z.number().int().min(20).max(300),
  date: z.string().datetime().optional(),
});

export const foodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
});

export const createFoodEntrySchema = z.object({
  mealType: mealTypeSchema,
  items: z.array(foodItemSchema).min(1),
  calories: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  photoUrl: z.string().url().optional(),
  date: z.string().datetime().optional(),
});
