import { describe, expect, it } from "vitest";
import { computeDosesPerDay, computeDueTimesForDay, computeRefillProjection, getDayStart } from "./schedule";
import type { MedicationSchedule } from "./types";

const TZ = "America/New_York";

describe("computeDueTimesForDay", () => {
  it("times_per_day: returns one Date per configured time, on the given day", () => {
    const schedule: MedicationSchedule = { kind: "times_per_day", times: ["08:00", "20:00"] };
    const dayStart = new Date("2026-01-15T05:00:00Z"); // midnight EST Jan 15
    const times = computeDueTimesForDay(schedule, dayStart, TZ);
    expect(times.map((t) => t.toISOString())).toEqual(["2026-01-15T13:00:00.000Z", "2026-01-16T01:00:00.000Z"]);
  });

  it("specific_days: returns times when the day matches, empty when it doesn't", () => {
    // Jan 15, 2026 is a Thursday (4).
    const schedule: MedicationSchedule = { kind: "specific_days", daysOfWeek: [4], times: ["09:00"] };
    const dayStart = new Date("2026-01-15T05:00:00Z");
    expect(computeDueTimesForDay(schedule, dayStart, TZ)).toHaveLength(1);

    const wrongDaySchedule: MedicationSchedule = { kind: "specific_days", daysOfWeek: [1], times: ["09:00"] };
    expect(computeDueTimesForDay(wrongDaySchedule, dayStart, TZ)).toEqual([]);
  });

  it("interval_hours: fills the day from startTime at the given cadence", () => {
    const schedule: MedicationSchedule = { kind: "interval_hours", intervalHours: 8, startTime: "06:00" };
    const dayStart = new Date("2026-01-15T05:00:00Z"); // midnight EST Jan 15
    const times = computeDueTimesForDay(schedule, dayStart, TZ);
    expect(times.map((t) => t.toISOString())).toEqual([
      "2026-01-15T11:00:00.000Z", // 6am
      "2026-01-15T19:00:00.000Z", // 2pm
      "2026-01-16T03:00:00.000Z", // 10pm
    ]);
    // Every entry must fall within [dayStart, dayStart + 24h).
    const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
    for (const t of times) {
      expect(t.getTime()).toBeGreaterThanOrEqual(dayStart.getTime());
      expect(t.getTime()).toBeLessThan(dayEnd.getTime());
    }
  });

  it("as_needed: never produces due times", () => {
    const schedule: MedicationSchedule = { kind: "as_needed" };
    expect(computeDueTimesForDay(schedule, new Date(), TZ)).toEqual([]);
  });
});

describe("getDayStart", () => {
  it("returns today's boundary when `now` is at or after it", () => {
    // day_boundary_hour 6, now is 9am EST Jan 15 -> boundary is 6am EST Jan 15.
    const now = new Date("2026-01-15T14:00:00Z");
    const start = getDayStart(now, 6, TZ);
    expect(start.toISOString()).toBe("2026-01-15T11:00:00.000Z");
  });

  it("rolls back to yesterday's boundary when `now` is before today's boundary", () => {
    // day_boundary_hour 6, now is 3am EST Jan 15 -> boundary is 6am EST Jan 14 (yesterday).
    const now = new Date("2026-01-15T08:00:00Z");
    const start = getDayStart(now, 6, TZ);
    expect(start.toISOString()).toBe("2026-01-14T11:00:00.000Z");
  });

  it("defaults to midnight when day_boundary_hour is 0", () => {
    const now = new Date("2026-01-15T18:00:00Z");
    const start = getDayStart(now, 0, TZ);
    expect(start.toISOString()).toBe("2026-01-15T05:00:00.000Z");
  });
});

describe("computeDosesPerDay", () => {
  it("times_per_day: number of times", () => {
    expect(computeDosesPerDay({ kind: "times_per_day", times: ["08:00", "14:00", "20:00"] })).toBe(3);
  });

  it("interval_hours: 24 / interval", () => {
    expect(computeDosesPerDay({ kind: "interval_hours", intervalHours: 8, startTime: "06:00" })).toBe(3);
  });

  it("specific_days: averaged across a week", () => {
    // 2 times/day, 2 days/week -> 4 doses/week -> 4/7 per day.
    expect(computeDosesPerDay({ kind: "specific_days", daysOfWeek: [1, 4], times: ["08:00", "20:00"] })).toBeCloseTo(
      4 / 7
    );
  });

  it("as_needed: null (no rate to compute a run-out date from)", () => {
    expect(computeDosesPerDay({ kind: "as_needed" })).toBeNull();
  });
});

describe("computeRefillProjection", () => {
  const now = new Date("2026-01-15T00:00:00Z");

  it("returns nulls for an as-needed schedule (no burn rate)", () => {
    const projection = computeRefillProjection(
      { countOnHand: 30, unitPerDose: 1, lowStockThreshold: 7 },
      { kind: "as_needed" },
      now
    );
    expect(projection).toEqual({ dosesPerDay: null, daysRemaining: null, runOutDate: null, isLowStock: false });
  });

  it("computes days remaining and run-out date from a fixed schedule", () => {
    const schedule: MedicationSchedule = { kind: "times_per_day", times: ["08:00", "20:00"] }; // 2/day
    const projection = computeRefillProjection({ countOnHand: 20, unitPerDose: 1, lowStockThreshold: 7 }, schedule, now);
    expect(projection.dosesPerDay).toBe(2);
    expect(projection.daysRemaining).toBe(10);
    expect(projection.runOutDate?.toISOString()).toBe("2026-01-25T00:00:00.000Z");
    expect(projection.isLowStock).toBe(false);
  });

  it("flags low stock exactly at the threshold boundary", () => {
    const schedule: MedicationSchedule = { kind: "times_per_day", times: ["08:00"] }; // 1/day
    const atThreshold = computeRefillProjection({ countOnHand: 7, unitPerDose: 1, lowStockThreshold: 7 }, schedule, now);
    expect(atThreshold.daysRemaining).toBe(7);
    expect(atThreshold.isLowStock).toBe(true);

    const justAbove = computeRefillProjection({ countOnHand: 8, unitPerDose: 1, lowStockThreshold: 7 }, schedule, now);
    expect(justAbove.isLowStock).toBe(false);
  });
});
