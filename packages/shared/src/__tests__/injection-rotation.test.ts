import { describe, it, expect } from "vitest";
import {
  suggestNextSite,
  getInjectionHistory,
  ROTATION_ORDER,
} from "../injection-rotation";
import type { InjectionRecord } from "../injection-rotation";

// Helper to build a date N days ago from a fixed reference point so tests
// are deterministic and don't rely on the real clock.
const BASE_DATE = new Date("2026-01-15T12:00:00Z");
function daysAgo(n: number): Date {
  return new Date(BASE_DATE.getTime() - n * 24 * 60 * 60 * 1000);
}

describe("ROTATION_ORDER", () => {
  it("contains all 6 injection sites in the expected order", () => {
    expect(ROTATION_ORDER).toEqual([
      "left_thigh",
      "right_thigh",
      "left_abdomen",
      "right_abdomen",
      "left_arm",
      "right_arm",
    ]);
  });
});

describe("getInjectionHistory", () => {
  it("returns an empty map for empty history", () => {
    expect(getInjectionHistory([])).toEqual(new Map());
  });

  it("maps each site to its most recent date", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(10) },
      { site: "left_thigh", date: daysAgo(3) }, // more recent
      { site: "right_thigh", date: daysAgo(7) },
    ];
    const map = getInjectionHistory(history);
    expect(map.get("left_thigh")).toEqual(daysAgo(3));
    expect(map.get("right_thigh")).toEqual(daysAgo(7));
    expect(map.has("left_abdomen")).toBe(false);
  });

  it("handles string dates", () => {
    const history: InjectionRecord[] = [
      { site: "left_arm", date: "2026-01-10T08:00:00Z" },
      { site: "left_arm", date: "2026-01-12T08:00:00Z" },
    ];
    const map = getInjectionHistory(history);
    expect(map.get("left_arm")).toEqual(new Date("2026-01-12T08:00:00Z"));
  });
});

describe("suggestNextSite", () => {
  it("returns left_thigh when there is no history", () => {
    expect(suggestNextSite([])).toBe("left_thigh");
  });

  it("returns left_thigh for an explicitly empty array", () => {
    const history: InjectionRecord[] = [];
    expect(suggestNextSite(history)).toBe("left_thigh");
  });

  it("returns right_thigh after a single injection at left_thigh", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(7) },
    ];
    expect(suggestNextSite(history)).toBe("right_thigh");
  });

  it("returns left_abdomen when left_thigh and right_thigh have been used", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(14) },
      { site: "right_thigh", date: daysAgo(7) },
    ];
    expect(suggestNextSite(history)).toBe("left_abdomen");
  });

  it("returns first unused site in rotation order when some sites are unused", () => {
    // left_thigh and right_thigh used; left_abdomen is next unused
    const history: InjectionRecord[] = [
      { site: "right_arm", date: daysAgo(21) },
      { site: "left_thigh", date: daysAgo(14) },
      { site: "right_thigh", date: daysAgo(7) },
    ];
    // left_abdomen is first in ROTATION_ORDER that hasn't been used
    expect(suggestNextSite(history)).toBe("left_abdomen");
  });

  it("suggests left_thigh again after all 6 sites used once in rotation order", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(35) },
      { site: "right_thigh", date: daysAgo(28) },
      { site: "left_abdomen", date: daysAgo(21) },
      { site: "right_abdomen", date: daysAgo(14) },
      { site: "left_arm", date: daysAgo(7) },
      { site: "right_arm", date: daysAgo(1) },
    ];
    // left_thigh is the least recently used
    expect(suggestNextSite(history)).toBe("left_thigh");
  });

  it("returns the least-recently-used site when all 6 have been used", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(30) },  // oldest
      { site: "right_thigh", date: daysAgo(25) },
      { site: "left_abdomen", date: daysAgo(5) },  // most recent
      { site: "right_abdomen", date: daysAgo(20) },
      { site: "left_arm", date: daysAgo(15) },
      { site: "right_arm", date: daysAgo(10) },
    ];
    expect(suggestNextSite(history)).toBe("left_thigh");
  });

  it("most recent was left_abdomen, all used — suggests oldest site", () => {
    const history: InjectionRecord[] = [
      { site: "right_arm", date: daysAgo(25) },     // oldest
      { site: "left_arm", date: daysAgo(20) },
      { site: "right_abdomen", date: daysAgo(15) },
      { site: "left_thigh", date: daysAgo(10) },
      { site: "right_thigh", date: daysAgo(5) },
      { site: "left_abdomen", date: daysAgo(1) },   // most recent
    ];
    expect(suggestNextSite(history)).toBe("right_arm");
  });

  it("handles multiple injections at the same site correctly", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(20) },
      { site: "left_thigh", date: daysAgo(13) },
      { site: "left_thigh", date: daysAgo(6) },
    ];
    // right_thigh is the first unused site in rotation order
    expect(suggestNextSite(history)).toBe("right_thigh");
  });

  it("only uses the most recent record per site when determining LRU", () => {
    // left_thigh used many times but most recently 3 days ago
    // right_thigh used once but 30 days ago — so right_thigh is LRU
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(30) },
      { site: "left_thigh", date: daysAgo(10) },
      { site: "left_thigh", date: daysAgo(3) },
      { site: "right_thigh", date: daysAgo(28) },
      { site: "left_abdomen", date: daysAgo(25) },
      { site: "right_abdomen", date: daysAgo(20) },
      { site: "left_arm", date: daysAgo(15) },
      { site: "right_arm", date: daysAgo(8) },
    ];
    // right_thigh last used 28 days ago — oldest among all sites
    expect(suggestNextSite(history)).toBe("right_thigh");
  });

  it("is deterministic: same inputs always yield same output", () => {
    const history: InjectionRecord[] = [
      { site: "left_thigh", date: daysAgo(6) },
      { site: "right_thigh", date: daysAgo(5) },
    ];
    const result1 = suggestNextSite(history);
    const result2 = suggestNextSite(history);
    expect(result1).toBe(result2);
    expect(result1).toBe("left_abdomen");
  });
});
