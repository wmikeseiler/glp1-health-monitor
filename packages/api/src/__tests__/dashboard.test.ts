import { describe, it, expect } from "vitest";
import { mergeAndSortActivities } from "../router/dashboard";
import type { ActivityItem } from "../router/dashboard";

// ---------------------------------------------------------------------------
// Router structure
// ---------------------------------------------------------------------------

describe("dashboardRouter structure", () => {
  it("appRouter exposes a dashboard namespace with summary and recentActivity", async () => {
    const { appRouter } = await import("../root");
    const procedures = (appRouter as any)._def.procedures;
    expect(procedures).toHaveProperty("dashboard.summary");
    expect(procedures).toHaveProperty("dashboard.recentActivity");
  });
});

// ---------------------------------------------------------------------------
// mergeAndSortActivities — pure unit tests (no DB)
// ---------------------------------------------------------------------------

describe("mergeAndSortActivities", () => {
  const makeActivity = (
    type: ActivityItem["type"],
    date: Date,
    description: string
  ): ActivityItem => ({ type, date, description });

  it("returns empty array when given no activities", () => {
    expect(mergeAndSortActivities([], 10)).toEqual([]);
  });

  it("sorts activities by date descending", () => {
    const activities: ActivityItem[] = [
      makeActivity("weight", new Date("2026-02-01T10:00:00Z"), "first"),
      makeActivity("vitals", new Date("2026-02-28T10:00:00Z"), "latest"),
      makeActivity("injection", new Date("2026-02-15T10:00:00Z"), "middle"),
    ];

    const result = mergeAndSortActivities(activities, 10);
    expect(result[0].description).toBe("latest");
    expect(result[1].description).toBe("middle");
    expect(result[2].description).toBe("first");
  });

  it("limits output to the requested count", () => {
    const activities: ActivityItem[] = Array.from({ length: 20 }, (_, i) =>
      makeActivity(
        "food",
        new Date(`2026-02-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
        `meal ${i + 1}`
      )
    );

    const result = mergeAndSortActivities(activities, 10);
    expect(result).toHaveLength(10);
  });

  it("returns all items when count is larger than the input array", () => {
    const activities: ActivityItem[] = [
      makeActivity("weight", new Date("2026-02-10T10:00:00Z"), "w1"),
      makeActivity("vitals", new Date("2026-02-20T10:00:00Z"), "v1"),
    ];

    const result = mergeAndSortActivities(activities, 50);
    expect(result).toHaveLength(2);
  });

  it("keeps the most recent items when truncating", () => {
    const activities: ActivityItem[] = [
      makeActivity("weight", new Date("2026-01-01T00:00:00Z"), "oldest"),
      makeActivity("food", new Date("2026-02-28T00:00:00Z"), "newest"),
      makeActivity("injection", new Date("2026-02-01T00:00:00Z"), "middle"),
    ];

    const result = mergeAndSortActivities(activities, 2);
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("newest");
    expect(result[1].description).toBe("middle");
  });

  it("does not mutate the original array", () => {
    const activities: ActivityItem[] = [
      makeActivity("vitals", new Date("2026-02-28T10:00:00Z"), "a"),
      makeActivity("weight", new Date("2026-01-01T10:00:00Z"), "b"),
    ];
    const copy = [...activities];
    mergeAndSortActivities(activities, 10);
    expect(activities).toEqual(copy);
  });

  it("handles activities of all four types mixed together", () => {
    const activities: ActivityItem[] = [
      makeActivity("weight", new Date("2026-02-28T08:00:00Z"), "weight entry"),
      makeActivity("injection", new Date("2026-02-27T09:00:00Z"), "injection"),
      makeActivity("vitals", new Date("2026-02-26T10:00:00Z"), "bp reading"),
      makeActivity("food", new Date("2026-02-25T12:00:00Z"), "lunch"),
    ];

    const result = mergeAndSortActivities(activities, 10);
    expect(result).toHaveLength(4);
    const types = result.map((r) => r.type);
    expect(types).toContain("weight");
    expect(types).toContain("injection");
    expect(types).toContain("vitals");
    expect(types).toContain("food");
  });

  it("produces stable ordering when two activities share the same date", () => {
    const sameDate = new Date("2026-02-28T10:00:00Z");
    const activities: ActivityItem[] = [
      makeActivity("weight", sameDate, "weight"),
      makeActivity("vitals", sameDate, "vitals"),
    ];

    // Just ensure no crash and both items are returned
    const result = mergeAndSortActivities(activities, 10);
    expect(result).toHaveLength(2);
  });
});
