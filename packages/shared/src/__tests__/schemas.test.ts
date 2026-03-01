import { describe, it, expect } from "vitest";
import {
  injectionSiteSchema,
  mealTypeSchema,
  createWeightEntrySchema,
  createVitalsSchema,
  createInjectionSchema,
  createFoodEntrySchema,
  createMedicationSchema,
} from "../schemas";

describe("injectionSiteSchema", () => {
  it("accepts valid injection sites", () => {
    expect(injectionSiteSchema.parse("left_thigh")).toBe("left_thigh");
    expect(injectionSiteSchema.parse("right_abdomen")).toBe("right_abdomen");
    expect(injectionSiteSchema.parse("left_arm")).toBe("left_arm");
    expect(injectionSiteSchema.parse("right_arm")).toBe("right_arm");
  });

  it("rejects invalid injection sites", () => {
    expect(() => injectionSiteSchema.parse("forehead")).toThrow();
    expect(() => injectionSiteSchema.parse("")).toThrow();
  });
});

describe("mealTypeSchema", () => {
  it("accepts valid meal types", () => {
    expect(mealTypeSchema.parse("breakfast")).toBe("breakfast");
    expect(mealTypeSchema.parse("lunch")).toBe("lunch");
    expect(mealTypeSchema.parse("dinner")).toBe("dinner");
    expect(mealTypeSchema.parse("snack")).toBe("snack");
  });

  it("rejects invalid meal types", () => {
    expect(() => mealTypeSchema.parse("brunch")).toThrow();
  });
});

describe("createWeightEntrySchema", () => {
  it("validates a valid weight entry", () => {
    const result = createWeightEntrySchema.parse({
      weight: 185.5,
      unit: "lbs",
      date: "2026-02-28",
    });
    expect(result.weight).toBe(185.5);
    expect(result.unit).toBe("lbs");
  });

  it("accepts kg unit", () => {
    const result = createWeightEntrySchema.parse({
      weight: 84.1,
      unit: "kg",
      date: "2026-02-28",
    });
    expect(result.unit).toBe("kg");
  });

  it("rejects negative weight", () => {
    expect(() =>
      createWeightEntrySchema.parse({ weight: -5, unit: "lbs", date: "2026-02-28" })
    ).toThrow();
  });

  it("rejects zero weight", () => {
    expect(() =>
      createWeightEntrySchema.parse({ weight: 0, unit: "lbs", date: "2026-02-28" })
    ).toThrow();
  });

  it("defaults unit to lbs", () => {
    const result = createWeightEntrySchema.parse({
      weight: 185.5,
      date: "2026-02-28",
    });
    expect(result.unit).toBe("lbs");
  });
});

describe("createVitalsSchema", () => {
  it("validates valid vitals", () => {
    const result = createVitalsSchema.parse({
      systolic: 120,
      diastolic: 80,
      heartRate: 72,
    });
    expect(result.systolic).toBe(120);
    expect(result.diastolic).toBe(80);
    expect(result.heartRate).toBe(72);
  });

  it("rejects out-of-range systolic", () => {
    expect(() =>
      createVitalsSchema.parse({ systolic: 400, diastolic: 80, heartRate: 72 })
    ).toThrow();
  });

  it("rejects out-of-range diastolic", () => {
    expect(() =>
      createVitalsSchema.parse({ systolic: 120, diastolic: 250, heartRate: 72 })
    ).toThrow();
  });

  it("rejects out-of-range heartRate", () => {
    expect(() =>
      createVitalsSchema.parse({ systolic: 120, diastolic: 80, heartRate: 400 })
    ).toThrow();
  });
});

describe("createInjectionSchema", () => {
  it("validates a valid injection", () => {
    const result = createInjectionSchema.parse({
      medicationId: "123e4567-e89b-12d3-a456-426614174000",
      site: "left_thigh",
      dose: 0.5,
    });
    expect(result.site).toBe("left_thigh");
    expect(result.dose).toBe(0.5);
  });

  it("rejects non-uuid medicationId", () => {
    expect(() =>
      createInjectionSchema.parse({
        medicationId: "not-a-uuid",
        site: "left_thigh",
        dose: 0.5,
      })
    ).toThrow();
  });

  it("accepts optional notes", () => {
    const result = createInjectionSchema.parse({
      medicationId: "123e4567-e89b-12d3-a456-426614174000",
      site: "left_thigh",
      dose: 0.5,
      notes: "Slight bruising",
    });
    expect(result.notes).toBe("Slight bruising");
  });
});

describe("createMedicationSchema", () => {
  it("validates a valid medication", () => {
    const result = createMedicationSchema.parse({
      name: "Ozempic",
      currentDose: 0.5,
      doseUnit: "mg",
      scheduleDays: 7,
    });
    expect(result.name).toBe("Ozempic");
    expect(result.scheduleDays).toBe(7);
  });

  it("defaults scheduleDays to 7", () => {
    const result = createMedicationSchema.parse({
      name: "Ozempic",
      currentDose: 0.5,
      doseUnit: "mg",
    });
    expect(result.scheduleDays).toBe(7);
  });

  it("rejects empty name", () => {
    expect(() =>
      createMedicationSchema.parse({
        name: "",
        currentDose: 0.5,
        doseUnit: "mg",
      })
    ).toThrow();
  });
});

describe("createFoodEntrySchema", () => {
  it("validates a valid food entry", () => {
    const result = createFoodEntrySchema.parse({
      mealType: "lunch",
      items: [{ name: "Chicken breast", quantity: "6 oz" }],
      calories: 280,
      protein: 52,
      carbs: 0,
      fat: 6,
    });
    expect(result.mealType).toBe("lunch");
    expect(result.items).toHaveLength(1);
  });

  it("requires at least one food item", () => {
    expect(() =>
      createFoodEntrySchema.parse({
        mealType: "lunch",
        items: [],
      })
    ).toThrow();
  });

  it("accepts optional photoUrl", () => {
    const result = createFoodEntrySchema.parse({
      mealType: "dinner",
      items: [{ name: "Salad" }],
      photoUrl: "https://example.com/photo.jpg",
    });
    expect(result.photoUrl).toBe("https://example.com/photo.jpg");
  });
});
