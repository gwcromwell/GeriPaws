import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatAge, formatTimeOfDay, isOverdue, formatRelativeTime, summarizeHabitLog, summarizeSchedule } from "./format";
import type { HabitLog } from "@geripaws/shared";

const NOW = new Date("2026-01-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

describe("formatRelativeTime", () => {
  it("says 'just now' for under a minute", () => {
    expect(formatRelativeTime(isoMinutesAgo(0))).toBe("just now");
  });

  it("shows minutes under an hour", () => {
    expect(formatRelativeTime(isoMinutesAgo(30))).toBe("30m ago");
  });

  it("shows hours under a day", () => {
    expect(formatRelativeTime(isoMinutesAgo(180))).toBe("3h ago");
  });

  it("shows days at 24h and beyond", () => {
    expect(formatRelativeTime(isoMinutesAgo(60 * 25))).toBe("1d ago");
  });
});

describe("isOverdue", () => {
  it("incidents and weight entries are never overdue", () => {
    expect(isOverdue(isoMinutesAgo(60 * 1000), "incident")).toBe(false);
    expect(isOverdue(isoMinutesAgo(60 * 1000), "weight")).toBe(false);
  });

  it("walk is overdue at 8h, not before", () => {
    expect(isOverdue(isoMinutesAgo(60 * 8 - 1), "walk")).toBe(false);
    expect(isOverdue(isoMinutesAgo(60 * 8), "walk")).toBe(true);
  });

  it("water is overdue at 6h", () => {
    expect(isOverdue(isoMinutesAgo(60 * 6 - 1), "water")).toBe(false);
    expect(isOverdue(isoMinutesAgo(60 * 6), "water")).toBe(true);
  });

  it("food is overdue at 8h", () => {
    expect(isOverdue(isoMinutesAgo(60 * 8 - 1), "food")).toBe(false);
    expect(isOverdue(isoMinutesAgo(60 * 8), "food")).toBe(true);
  });
});

describe("formatTimeOfDay", () => {
  it("formats midnight and noon correctly", () => {
    expect(formatTimeOfDay("00:00")).toBe("12:00 AM");
    expect(formatTimeOfDay("12:00")).toBe("12:00 PM");
  });

  it("formats an afternoon time", () => {
    expect(formatTimeOfDay("13:05")).toBe("1:05 PM");
  });

  it("formats a late evening time", () => {
    expect(formatTimeOfDay("23:59")).toBe("11:59 PM");
  });
});

describe("summarizeSchedule", () => {
  it("times_per_day lists each time", () => {
    expect(summarizeSchedule({ kind: "times_per_day", times: ["08:00", "20:00"] })).toBe("8:00 AM, 8:00 PM");
  });

  it("interval_hours describes the cadence", () => {
    expect(summarizeSchedule({ kind: "interval_hours", intervalHours: 8, startTime: "06:00" })).toBe(
      "Every 8h from 6:00 AM"
    );
  });

  it("specific_days lists sorted days and times", () => {
    expect(summarizeSchedule({ kind: "specific_days", daysOfWeek: [3, 1], times: ["09:00"] })).toBe(
      "Mon, Wed at 9:00 AM"
    );
  });

  it("as_needed reads plainly", () => {
    expect(summarizeSchedule({ kind: "as_needed" })).toBe("As needed");
  });
});

describe("formatAge", () => {
  it("returns null when there's no birthdate", () => {
    expect(formatAge(null)).toBeNull();
  });

  it("shows months for a pet under a year old", () => {
    const sixMonthsAgo = new Date(NOW.getTime() - 6 * 30.4375 * 86_400_000).toISOString();
    expect(formatAge(sixMonthsAgo)).toMatch(/^\d+ mo$/);
  });

  it("shows years for a pet a year or older", () => {
    const twoYearsAgo = new Date(NOW.getTime() - 2 * 365.25 * 86_400_000).toISOString();
    expect(formatAge(twoYearsAgo)).toBe("2.0 yrs");
  });
});

describe("summarizeHabitLog", () => {
  function log(type: HabitLog["type"], details: HabitLog["details"]): HabitLog {
    return {
      id: "1",
      pet_id: "1",
      type,
      occurred_at: NOW.toISOString(),
      created_at: NOW.toISOString(),
      logged_by: "1",
      details,
      photo_url: null,
    };
  }

  it("describes a walk with elimination and duration", () => {
    expect(summarizeHabitLog(log("walk", { durationMin: 20, elimination: "both" }))).toBe("20 min · Pee & poop");
  });

  it("describes an incident with category and severity", () => {
    expect(summarizeHabitLog(log("incident", { category: "vomit", severity: "moderate" }))).toBe("vomit · Moderate");
  });

  it("falls back to 'No details' when nothing was recorded", () => {
    expect(summarizeHabitLog(log("water", {}))).toBe("No details");
  });
});
