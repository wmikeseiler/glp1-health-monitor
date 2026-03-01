import { describe, it, expect } from "vitest";
import { createFoodEntrySchema, foodItemSchema, MEAL_TYPES } from "@glp1/shared";

// ---------------------------------------------------------------------------
// Router structure
// ---------------------------------------------------------------------------

describe("foodRouter structure", () => {
  it("appRouter exposes a food namespace with all procedures", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("food.log");
    expect(procedures).toHaveProperty("food.list");
    expect(procedures).toHaveProperty("food.delete");
    expect(procedures).toHaveProperty("food.dailySummary");
    expect(procedures).toHaveProperty("food.searchFood");
  });
});

// ---------------------------------------------------------------------------
// createFoodEntrySchema validation
// ---------------------------------------------------------------------------

describe("createFoodEntrySchema validation", () => {
  const validInput = {
    mealType: "breakfast",
    items: [{ name: "Oatmeal", calories: 150, protein: 5, carbs: 27, fat: 3 }],
  };

  it("accepts valid food entry input", () => {
    const result = createFoodEntrySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with all optional fields", () => {
    const result = createFoodEntrySchema.safeParse({
      mealType: "lunch",
      items: [{ name: "Chicken breast", quantity: "4 oz", calories: 185, protein: 35, carbs: 0, fat: 4 }],
      calories: 185,
      protein: 35,
      carbs: 0,
      fat: 4,
      photoUrl: "https://example.com/photo.jpg",
      date: "2026-02-28T12:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid meal types", () => {
    for (const mealType of MEAL_TYPES) {
      const result = createFoodEntrySchema.safeParse({ ...validInput, mealType });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty items array", () => {
    const result = createFoodEntrySchema.safeParse({
      ...validInput,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects item with missing name", () => {
    const result = createFoodEntrySchema.safeParse({
      ...validInput,
      items: [{ calories: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects item with empty name string", () => {
    const result = createFoodEntrySchema.safeParse({
      ...validInput,
      items: [{ name: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid meal type", () => {
    const result = createFoodEntrySchema.safeParse({
      ...validInput,
      mealType: "brunch",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative calories", () => {
    const result = createFoodEntrySchema.safeParse({
      ...validInput,
      calories: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid photoUrl", () => {
    const result = createFoodEntrySchema.safeParse({
      ...validInput,
      photoUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts items with only a name (all macros optional)", () => {
    const result = createFoodEntrySchema.safeParse({
      mealType: "snack",
      items: [{ name: "Apple" }],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// foodItemSchema validation
// ---------------------------------------------------------------------------

describe("foodItemSchema validation", () => {
  it("accepts item with only a name", () => {
    const result = foodItemSchema.safeParse({ name: "Apple" });
    expect(result.success).toBe(true);
  });

  it("accepts item with all fields", () => {
    const result = foodItemSchema.safeParse({
      name: "Salmon",
      quantity: "6 oz",
      calories: 240,
      protein: 34,
      carbs: 0,
      fat: 11,
    });
    expect(result.success).toBe(true);
  });

  it("rejects item with empty name", () => {
    const result = foodItemSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects item missing name entirely", () => {
    const result = foodItemSchema.safeParse({ calories: 100 });
    expect(result.success).toBe(false);
  });

  it("accepts optional quantity string", () => {
    const result = foodItemSchema.safeParse({ name: "Rice", quantity: "1 cup" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe("1 cup");
    }
  });
});

// ---------------------------------------------------------------------------
// Total calculation logic
// ---------------------------------------------------------------------------

describe("food entry total calculation logic", () => {
  // Pure reimplementation of the calculation logic from the router
  function calcTotals(
    items: { calories?: number; protein?: number; carbs?: number; fat?: number }[],
    overrides: { calories?: number; protein?: number; carbs?: number; fat?: number } = {}
  ) {
    const totalCalories =
      overrides.calories ?? items.reduce((sum, item) => sum + (item.calories ?? 0), 0);
    const totalProtein =
      overrides.protein ?? items.reduce((sum, item) => sum + (item.protein ?? 0), 0);
    const totalCarbs =
      overrides.carbs ?? items.reduce((sum, item) => sum + (item.carbs ?? 0), 0);
    const totalFat =
      overrides.fat ?? items.reduce((sum, item) => sum + (item.fat ?? 0), 0);
    return { totalCalories, totalProtein, totalCarbs, totalFat };
  }

  it("sums calories from all items", () => {
    const items = [
      { calories: 150, protein: 5, carbs: 27, fat: 3 },
      { calories: 200, protein: 10, carbs: 30, fat: 5 },
    ];
    const result = calcTotals(items);
    expect(result.totalCalories).toBe(350);
    expect(result.totalProtein).toBe(15);
    expect(result.totalCarbs).toBe(57);
    expect(result.totalFat).toBe(8);
  });

  it("treats missing macros as zero in sum", () => {
    const items = [{ name: "Apple" }, { calories: 100 }];
    const result = calcTotals(items);
    expect(result.totalCalories).toBe(100);
    expect(result.totalProtein).toBe(0);
    expect(result.totalCarbs).toBe(0);
    expect(result.totalFat).toBe(0);
  });

  it("uses override values when provided instead of summing items", () => {
    const items = [{ calories: 100, protein: 5, carbs: 10, fat: 2 }];
    const result = calcTotals(items, { calories: 999, protein: 88, carbs: 77, fat: 66 });
    expect(result.totalCalories).toBe(999);
    expect(result.totalProtein).toBe(88);
    expect(result.totalCarbs).toBe(77);
    expect(result.totalFat).toBe(66);
  });

  it("uses item sum for non-overridden fields and override for provided ones", () => {
    const items = [{ calories: 150, protein: 10, carbs: 20, fat: 5 }];
    const result = calcTotals(items, { calories: 200 });
    expect(result.totalCalories).toBe(200);
    expect(result.totalProtein).toBe(10);
    expect(result.totalCarbs).toBe(20);
    expect(result.totalFat).toBe(5);
  });

  it("sums correctly across three items", () => {
    const items = [
      { calories: 300, protein: 20, carbs: 40, fat: 8 },
      { calories: 150, protein: 15, carbs: 10, fat: 4 },
      { calories: 50, protein: 2, carbs: 8, fat: 1 },
    ];
    const result = calcTotals(items);
    expect(result.totalCalories).toBe(500);
    expect(result.totalProtein).toBe(37);
    expect(result.totalCarbs).toBe(58);
    expect(result.totalFat).toBe(13);
  });

  it("returns zeros for a single item with no macro data", () => {
    const items = [{ name: "Mystery food" }];
    const result = calcTotals(items);
    expect(result.totalCalories).toBe(0);
    expect(result.totalProtein).toBe(0);
    expect(result.totalCarbs).toBe(0);
    expect(result.totalFat).toBe(0);
  });
});
