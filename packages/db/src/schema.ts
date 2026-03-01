import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  integer,
  decimal,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// --- Enums ---

export const injectionSiteEnum = pgEnum("injection_site", [
  "left_thigh",
  "right_thigh",
  "left_abdomen",
  "right_abdomen",
  "left_arm",
  "right_arm",
]);

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const weightUnitEnum = pgEnum("weight_unit", ["lbs", "kg"]);

// --- Tables ---

export const medications = pgTable("medications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  currentDose: decimal("current_dose", { precision: 6, scale: 2 }).notNull(),
  doseUnit: text("dose_unit").notNull().default("mg"),
  scheduleDays: integer("schedule_days").notNull().default(7),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const injections = pgTable("injections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  medicationId: uuid("medication_id")
    .notNull()
    .references(() => medications.id, { onDelete: "cascade" }),
  site: injectionSiteEnum("site").notNull(),
  dose: decimal("dose", { precision: 6, scale: 2 }).notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weightEntries = pgTable("weight_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  date: date("date").notNull(),
  weight: decimal("weight", { precision: 6, scale: 2 }).notNull(),
  unit: weightUnitEnum("unit").notNull().default("lbs"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vitals = pgTable("vitals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  systolic: integer("systolic").notNull(),
  diastolic: integer("diastolic").notNull(),
  heartRate: integer("heart_rate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const foodEntries = pgTable("food_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  mealType: mealTypeEnum("meal_type").notNull(),
  items: jsonb("items").notNull().$type<{ name: string; quantity?: string; calories?: number; protein?: number; carbs?: number; fat?: number }[]>(),
  calories: integer("calories"),
  protein: decimal("protein", { precision: 6, scale: 1 }),
  carbs: decimal("carbs", { precision: 6, scale: 1 }),
  fat: decimal("fat", { precision: 6, scale: 1 }),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: jsonb("ingredients").notNull().$type<{ name: string; amount: string; unit?: string }[]>(),
  instructions: jsonb("instructions").notNull().$type<string[]>(),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  servings: integer("servings"),
  calories: integer("calories"),
  protein: decimal("protein", { precision: 6, scale: 1 }),
  carbs: decimal("carbs", { precision: 6, scale: 1 }),
  fat: decimal("fat", { precision: 6, scale: 1 }),
  tags: text("tags").array(),
  glp1FriendlyNotes: text("glp1_friendly_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userFavorites = pgTable("user_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
