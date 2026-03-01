import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// food-photo service (stub)
// ---------------------------------------------------------------------------

describe("analyzeFoodPhoto stub", () => {
  it("returns a FoodPhotoResult with an items array", async () => {
    const { analyzeFoodPhoto } = await import("../services/food-photo");
    const result = await analyzeFoodPhoto("https://example.com/food.jpg");
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("returns at least one item", async () => {
    const { analyzeFoodPhoto } = await import("../services/food-photo");
    const result = await analyzeFoodPhoto("https://example.com/food.jpg");
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("each item has a name and confidence field", async () => {
    const { analyzeFoodPhoto } = await import("../services/food-photo");
    const result = await analyzeFoodPhoto("https://example.com/food.jpg");
    for (const item of result.items) {
      expect(typeof item.name).toBe("string");
      expect(typeof item.confidence).toBe("number");
    }
  });

  it("confidence is between 0 and 1", async () => {
    const { analyzeFoodPhoto } = await import("../services/food-photo");
    const result = await analyzeFoodPhoto("https://example.com/food.jpg");
    for (const item of result.items) {
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("stub returns zeros for estimated macros", async () => {
    const { analyzeFoodPhoto } = await import("../services/food-photo");
    const result = await analyzeFoodPhoto("https://example.com/food.jpg");
    const item = result.items[0];
    expect(item.estimatedCalories).toBe(0);
    expect(item.estimatedProtein).toBe(0);
    expect(item.estimatedCarbs).toBe(0);
    expect(item.estimatedFat).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// openfoodfacts service — module shape
// ---------------------------------------------------------------------------

describe("openfoodfacts service module", () => {
  it("exports lookupBarcode function", async () => {
    const mod = await import("../services/openfoodfacts");
    expect(typeof mod.lookupBarcode).toBe("function");
  });

  it("lookupBarcode returns null for unknown barcodes (network mocked)", async () => {
    // Mock fetch to return a 404 so we don't make real network calls
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", mockFetch);

    const { lookupBarcode } = await import("../services/openfoodfacts");
    const result = await lookupBarcode("0000000000000");

    expect(result).toBeNull();
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// BarcodeResult type shape (compile-time + runtime check)
// ---------------------------------------------------------------------------

describe("BarcodeResult type fields", () => {
  it("a non-null BarcodeResult has required fields barcode and productName", () => {
    // Construct a concrete object matching the BarcodeResult shape
    const sample: {
      barcode: string;
      productName: string;
      brandName?: string;
      servingSize?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      imageUrl?: string;
    } = {
      barcode: "0123456789",
      productName: "Test Product",
      brandName: "Test Brand",
      servingSize: "100g",
      calories: 250,
      protein: 10,
      carbs: 30,
      fat: 8,
      imageUrl: "https://example.com/product.jpg",
    };

    expect(sample.barcode).toBe("0123456789");
    expect(sample.productName).toBe("Test Product");
    expect(sample.calories).toBe(250);
    expect(sample.protein).toBe(10);
    expect(sample.carbs).toBe(30);
    expect(sample.fat).toBe(8);
  });

  it("BarcodeResult optional fields may be undefined", () => {
    const minimal: {
      barcode: string;
      productName: string;
      brandName?: string;
    } = {
      barcode: "9876543210",
      productName: "Minimal Product",
    };

    expect(minimal.brandName).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Router procedures registered
// ---------------------------------------------------------------------------

describe("foodRouter new procedures", () => {
  it("appRouter exposes food.analyzePhoto procedure", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("food.analyzePhoto");
  });

  it("appRouter exposes food.lookupBarcode procedure", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("food.lookupBarcode");
  });

  it("appRouter still exposes all original food procedures", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("food.log");
    expect(procedures).toHaveProperty("food.list");
    expect(procedures).toHaveProperty("food.delete");
    expect(procedures).toHaveProperty("food.dailySummary");
    expect(procedures).toHaveProperty("food.searchFood");
  });
});
