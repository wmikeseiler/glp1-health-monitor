import { describe, it, expect } from "vitest";
import {
  createInjectionSchema,
  suggestNextSite,
  calculateNextInjectionDate,
} from "@glp1/shared";
import type { InjectionRecord } from "@glp1/shared";

describe("injectionRouter structure", () => {
  it("appRouter exposes an injection namespace", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("injection.list");
    expect(procedures).toHaveProperty("injection.create");
    expect(procedures).toHaveProperty("injection.delete");
    expect(procedures).toHaveProperty("injection.suggestNextSite");
    expect(procedures).toHaveProperty("injection.upcomingReminder");
  });
});

describe("createInjectionSchema validation", () => {
  const validInput = {
    medicationId: "550e8400-e29b-41d4-a716-446655440000",
    site: "left_thigh",
    dose: 0.5,
  };

  it("accepts a valid injection input", () => {
    const result = createInjectionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts all valid injection sites", () => {
    const sites = [
      "left_thigh",
      "right_thigh",
      "left_abdomen",
      "right_abdomen",
      "left_arm",
      "right_arm",
    ];
    for (const site of sites) {
      const result = createInjectionSchema.safeParse({ ...validInput, site });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional notes field", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      notes: "First dose of new pen",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("First dose of new pen");
    }
  });

  it("accepts optional date field as ISO datetime string", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      date: "2026-02-28T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing medicationId", () => {
    const { medicationId: _, ...noMedId } = validInput;
    const result = createInjectionSchema.safeParse(noMedId);
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid medicationId", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      medicationId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid site", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      site: "left_foot",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero dose", () => {
    const result = createInjectionSchema.safeParse({ ...validInput, dose: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative dose", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      dose: -0.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects dose above 100", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      dose: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes exceeding 500 characters", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      notes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects date that is not a valid ISO datetime string", () => {
    const result = createInjectionSchema.safeParse({
      ...validInput,
      date: "2026-02-28",
    });
    expect(result.success).toBe(false);
  });
});

describe("suggestNextSite algorithm integration", () => {
  it("returns left_thigh when history is empty", () => {
    expect(suggestNextSite([])).toBe("left_thigh");
  });

  it("returns right_thigh after a single left_thigh injection", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: new Date("2026-02-21T10:00:00Z") },
    ];
    expect(suggestNextSite(history)).toBe("right_thigh");
  });

  it("returns the first unused site in rotation order", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: new Date("2026-02-14T10:00:00Z") },
      { site: "right_thigh", date: new Date("2026-02-21T10:00:00Z") },
    ];
    expect(suggestNextSite(history)).toBe("left_abdomen");
  });

  it("returns least recently used site when all sites have been used", () => {
    const base = new Date("2026-01-01T12:00:00Z").getTime();
    const dayMs = 1000 * 60 * 60 * 24;
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: new Date(base) },       // oldest
      { site: "right_thigh", date: new Date(base + dayMs * 7) },
      { site: "left_abdomen", date: new Date(base + dayMs * 14) },
      { site: "right_abdomen", date: new Date(base + dayMs * 21) },
      { site: "left_arm", date: new Date(base + dayMs * 28) },
      { site: "right_arm", date: new Date(base + dayMs * 35) },
    ];
    expect(suggestNextSite(history)).toBe("left_thigh");
  });

  it("is deterministic with the same inputs", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: new Date("2026-02-21T10:00:00Z") },
    ];
    expect(suggestNextSite(history)).toBe(suggestNextSite(history));
  });
});

describe("calculateNextInjectionDate integration", () => {
  it("adds 7 days for weekly schedule", () => {
    const last = new Date("2026-02-21T10:00:00Z");
    const next = calculateNextInjectionDate(last, 7);
    expect(next.getTime()).toBe(new Date("2026-02-28T10:00:00Z").getTime());
  });

  it("adds 1 day for daily schedule", () => {
    const last = new Date("2026-02-27T10:00:00Z");
    const next = calculateNextInjectionDate(last, 1);
    expect(next.getTime()).toBe(new Date("2026-02-28T10:00:00Z").getTime());
  });

  it("accepts string dates", () => {
    const next = calculateNextInjectionDate("2026-02-21T10:00:00Z", 7);
    expect(next.getTime()).toBe(new Date("2026-02-28T10:00:00Z").getTime());
  });

  it("handles month boundaries correctly", () => {
    const last = new Date("2026-01-28T10:00:00Z");
    const next = calculateNextInjectionDate(last, 7);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1); // February (0-indexed)
    expect(next.getDate()).toBe(4);
  });
});
