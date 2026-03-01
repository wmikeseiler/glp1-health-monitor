import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calculateNextInjectionDate,
  getDaysUntilNextInjection,
  isInjectionOverdue,
  formatReminderMessage,
} from "../reminder-utils";

describe("calculateNextInjectionDate", () => {
  it("adds correct days to a Date object", () => {
    const last = new Date(2026, 1, 21); // Feb 21, 2026 local time
    const next = calculateNextInjectionDate(last, 7);
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(1); // 0-indexed, February
    expect(next.getDate()).toBe(28);
  });

  it("works with string dates", () => {
    const last = new Date(2026, 1, 21); // Feb 21, 2026 local time
    const asString = last.toISOString();
    const nextFromDate = calculateNextInjectionDate(last, 7);
    const nextFromString = calculateNextInjectionDate(asString, 7);
    // Both should produce a date exactly 7 days later
    expect(nextFromString.getTime()).toBe(nextFromDate.getTime());
  });
});

describe("getDaysUntilNextInjection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns positive for future injection", () => {
    vi.setSystemTime(new Date(2026, 1, 28)); // Feb 28, 2026
    // last injection was yesterday (Feb 27) → next is in 6 days (7-day schedule)
    const days = getDaysUntilNextInjection(new Date(2026, 1, 27), 7);
    expect(days).toBe(6);
  });

  it("returns negative for overdue injection", () => {
    vi.setSystemTime(new Date(2026, 2, 7)); // Mar 7, 2026
    // last injection was Feb 21, next was Feb 28 → 7 days overdue
    const days = getDaysUntilNextInjection(new Date(2026, 1, 21), 7);
    expect(days).toBe(-7);
  });

  it("returns 0 when injection is due today", () => {
    vi.setSystemTime(new Date(2026, 1, 28)); // Feb 28, 2026
    // last injection was 7 days ago → next is today
    const days = getDaysUntilNextInjection(new Date(2026, 1, 21), 7);
    expect(days).toBe(0);
  });
});

describe("isInjectionOverdue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for future injection", () => {
    vi.setSystemTime(new Date(2026, 1, 28)); // Feb 28, 2026
    expect(isInjectionOverdue(new Date(2026, 1, 27), 7)).toBe(false);
  });

  it("returns true for past-due injection", () => {
    vi.setSystemTime(new Date(2026, 2, 7)); // Mar 7, 2026
    expect(isInjectionOverdue(new Date(2026, 1, 21), 7)).toBe(true);
  });
});

describe("formatReminderMessage", () => {
  it("formats message for future injection", () => {
    expect(formatReminderMessage("Ozempic", 3)).toBe(
      "Your next Ozempic injection is in 3 days"
    );
  });

  it("formats singular day for future injection", () => {
    expect(formatReminderMessage("Ozempic", 1)).toBe(
      "Your next Ozempic injection is in 1 day"
    );
  });

  it("formats message for today", () => {
    expect(formatReminderMessage("Ozempic", 0)).toBe(
      "Your Ozempic injection is due today!"
    );
  });

  it("formats message for overdue injection", () => {
    expect(formatReminderMessage("Ozempic", -2)).toBe(
      "Your Ozempic injection is 2 days overdue"
    );
  });

  it("formats singular day for overdue injection", () => {
    expect(formatReminderMessage("Mounjaro", -1)).toBe(
      "Your Mounjaro injection is 1 day overdue"
    );
  });
});
