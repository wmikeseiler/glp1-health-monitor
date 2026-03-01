import { describe, it, expect } from "vitest";
import { SEED_RECIPES } from "@glp1/shared";

// ---------------------------------------------------------------------------
// Router structure
// ---------------------------------------------------------------------------

describe("recipeRouter structure", () => {
  it("appRouter exposes a recipe namespace with all procedures", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("recipe.list");
    expect(procedures).toHaveProperty("recipe.getById");
    expect(procedures).toHaveProperty("recipe.search");
    expect(procedures).toHaveProperty("recipe.toggleFavorite");
    expect(procedures).toHaveProperty("recipe.favorites");
  });
});

// ---------------------------------------------------------------------------
// Seed data validation
// ---------------------------------------------------------------------------

describe("SEED_RECIPES data validity", () => {
  it("exports an array with at least 8 recipes", () => {
    expect(Array.isArray(SEED_RECIPES)).toBe(true);
    expect(SEED_RECIPES.length).toBeGreaterThanOrEqual(8);
  });

  it("every recipe has a non-empty title", () => {
    for (const recipe of SEED_RECIPES) {
      expect(typeof recipe.title).toBe("string");
      expect(recipe.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("every recipe has a non-empty description", () => {
    for (const recipe of SEED_RECIPES) {
      expect(typeof recipe.description).toBe("string");
      expect(recipe.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("every recipe has at least one ingredient with name and amount", () => {
    for (const recipe of SEED_RECIPES) {
      expect(Array.isArray(recipe.ingredients)).toBe(true);
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      for (const ingredient of recipe.ingredients) {
        expect(typeof ingredient.name).toBe("string");
        expect(ingredient.name.trim().length).toBeGreaterThan(0);
        expect(typeof ingredient.amount).toBe("string");
        expect(ingredient.amount.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every recipe has at least one instruction step", () => {
    for (const recipe of SEED_RECIPES) {
      expect(Array.isArray(recipe.instructions)).toBe(true);
      expect(recipe.instructions.length).toBeGreaterThan(0);
      for (const step of recipe.instructions) {
        expect(typeof step).toBe("string");
        expect(step.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every recipe has non-negative prepTime and cookTime", () => {
    for (const recipe of SEED_RECIPES) {
      expect(typeof recipe.prepTime).toBe("number");
      expect(recipe.prepTime).toBeGreaterThanOrEqual(0);
      expect(typeof recipe.cookTime).toBe("number");
      expect(recipe.cookTime).toBeGreaterThanOrEqual(0);
    }
  });

  it("every recipe has a positive servings count", () => {
    for (const recipe of SEED_RECIPES) {
      expect(typeof recipe.servings).toBe("number");
      expect(recipe.servings).toBeGreaterThan(0);
    }
  });

  it("every recipe has reasonable calorie values (10-2000 per serving)", () => {
    for (const recipe of SEED_RECIPES) {
      expect(typeof recipe.calories).toBe("number");
      expect(recipe.calories).toBeGreaterThan(10);
      expect(recipe.calories).toBeLessThanOrEqual(2000);
    }
  });

  it("every recipe has non-negative macros", () => {
    for (const recipe of SEED_RECIPES) {
      expect(recipe.protein).toBeGreaterThanOrEqual(0);
      expect(recipe.carbs).toBeGreaterThanOrEqual(0);
      expect(recipe.fat).toBeGreaterThanOrEqual(0);
    }
  });

  it("every recipe has at least one tag", () => {
    for (const recipe of SEED_RECIPES) {
      expect(Array.isArray(recipe.tags)).toBe(true);
      expect(recipe.tags.length).toBeGreaterThan(0);
    }
  });

  it("all tags are non-empty strings", () => {
    for (const recipe of SEED_RECIPES) {
      for (const tag of recipe.tags) {
        expect(typeof tag).toBe("string");
        expect(tag.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every recipe has a glp1FriendlyNotes string", () => {
    for (const recipe of SEED_RECIPES) {
      expect(typeof recipe.glp1FriendlyNotes).toBe("string");
      expect(recipe.glp1FriendlyNotes.trim().length).toBeGreaterThan(0);
    }
  });

  it("all recipe titles are unique", () => {
    const titles = SEED_RECIPES.map((r) => r.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it("recipes cover multiple meal categories", () => {
    const allTags = SEED_RECIPES.flatMap((r) => r.tags);
    expect(allTags).toContain("breakfast");
    expect(allTags).toContain("lunch");
    expect(allTags).toContain("dinner");
    expect(allTags).toContain("snack");
  });

  it("at least half the recipes are tagged high-protein", () => {
    const highProteinCount = SEED_RECIPES.filter((r) =>
      r.tags.includes("high-protein")
    ).length;
    expect(highProteinCount).toBeGreaterThanOrEqual(
      Math.floor(SEED_RECIPES.length / 2)
    );
  });

  it("each high-protein recipe actually has >= 14g protein", () => {
    const highProteinRecipes = SEED_RECIPES.filter((r) =>
      r.tags.includes("high-protein")
    );
    for (const recipe of highProteinRecipes) {
      expect(recipe.protein).toBeGreaterThanOrEqual(14);
    }
  });

  it("no-cook recipes have cookTime of 0", () => {
    const noCookRecipes = SEED_RECIPES.filter((r) =>
      r.tags.includes("no-cook")
    );
    for (const recipe of noCookRecipes) {
      expect(recipe.cookTime).toBe(0);
    }
  });

  it("quick recipes have prepTime <= 15 minutes", () => {
    const quickRecipes = SEED_RECIPES.filter((r) => r.tags.includes("quick"));
    for (const recipe of quickRecipes) {
      expect(recipe.prepTime).toBeLessThanOrEqual(15);
    }
  });
});

// ---------------------------------------------------------------------------
// Filter logic (pure unit tests — no DB)
// ---------------------------------------------------------------------------

describe("recipe filter logic", () => {
  type SeedRecipe = (typeof SEED_RECIPES)[number];

  function filterByTag(recipes: readonly SeedRecipe[], tag: string) {
    return recipes.filter((r) => r.tags.includes(tag));
  }

  function filterByMaxCalories(
    recipes: readonly SeedRecipe[],
    maxCalories: number
  ) {
    return recipes.filter((r) => r.calories <= maxCalories);
  }

  function filterByMaxPrepTime(
    recipes: readonly SeedRecipe[],
    maxPrepTime: number
  ) {
    return recipes.filter((r) => r.prepTime <= maxPrepTime);
  }

  function searchRecipes(recipes: readonly SeedRecipe[], query: string) {
    const lower = query.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(lower) ||
        r.description.toLowerCase().includes(lower)
    );
  }

  it("tag filter returns only recipes with that tag", () => {
    const results = filterByTag(SEED_RECIPES, "breakfast");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.tags).toContain("breakfast");
    }
  });

  it("tag filter returns empty for unknown tag", () => {
    const results = filterByTag(SEED_RECIPES, "deep-fried");
    expect(results.length).toBe(0);
  });

  it("maxCalories filter excludes recipes above the limit", () => {
    const results = filterByMaxCalories(SEED_RECIPES, 200);
    for (const r of results) {
      expect(r.calories).toBeLessThanOrEqual(200);
    }
  });

  it("maxCalories of 0 returns no recipes", () => {
    const results = filterByMaxCalories(SEED_RECIPES, 0);
    expect(results.length).toBe(0);
  });

  it("maxCalories of 9999 returns all recipes", () => {
    const results = filterByMaxCalories(SEED_RECIPES, 9999);
    expect(results.length).toBe(SEED_RECIPES.length);
  });

  it("maxPrepTime filter excludes recipes with longer prep", () => {
    const results = filterByMaxPrepTime(SEED_RECIPES, 5);
    for (const r of results) {
      expect(r.prepTime).toBeLessThanOrEqual(5);
    }
  });

  it("search finds recipes by title keyword", () => {
    const results = searchRecipes(SEED_RECIPES, "salmon");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const combined = (r.title + " " + r.description).toLowerCase();
      expect(combined).toContain("salmon");
    }
  });

  it("search finds recipes by description keyword", () => {
    const results = searchRecipes(SEED_RECIPES, "omega-3");
    expect(results.length).toBeGreaterThan(0);
  });

  it("search is case-insensitive", () => {
    const lower = searchRecipes(SEED_RECIPES, "chicken");
    const upper = searchRecipes(SEED_RECIPES, "CHICKEN");
    const mixed = searchRecipes(SEED_RECIPES, "ChIcKeN");
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
  });

  it("search for unknown term returns empty array", () => {
    const results = searchRecipes(SEED_RECIPES, "xyzzy_not_a_food_12345");
    expect(results.length).toBe(0);
  });
});
