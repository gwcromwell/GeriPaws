import { describe, expect, it } from "vitest";
import { getTzOffsetMinutes, getZonedDateParts, getZonedDayOfWeek, zonedTimeToUtc } from "./tz";

describe("getTzOffsetMinutes", () => {
  it("is always 0 for UTC", () => {
    expect(getTzOffsetMinutes("UTC", new Date("2026-01-15T12:00:00Z"))).toBe(0);
    expect(getTzOffsetMinutes("UTC", new Date("2026-07-15T12:00:00Z"))).toBe(0);
  });

  it("reflects standard time (EST, UTC-5) in winter", () => {
    expect(getTzOffsetMinutes("America/New_York", new Date("2026-01-15T12:00:00Z"))).toBe(-300);
  });

  it("reflects daylight time (EDT, UTC-4) in summer", () => {
    expect(getTzOffsetMinutes("America/New_York", new Date("2026-07-15T12:00:00Z"))).toBe(-240);
  });
});

describe("getZonedDateParts", () => {
  it("rolls the calendar day back for a timezone west of UTC late at night UTC", () => {
    // 2026-01-15T02:00:00Z is still 2026-01-14 in New York (UTC-5).
    expect(getZonedDateParts(new Date("2026-01-15T02:00:00Z"), "America/New_York")).toEqual({
      year: 2026,
      month: 0,
      day: 14,
    });
  });

  it("keeps the same calendar day in UTC", () => {
    expect(getZonedDateParts(new Date("2026-01-15T02:00:00Z"), "UTC")).toEqual({ year: 2026, month: 0, day: 15 });
  });
});

describe("getZonedDayOfWeek", () => {
  it("returns the weekday for the given instant in the given zone", () => {
    // 2026-01-15 is a Thursday.
    expect(getZonedDayOfWeek(new Date("2026-01-15T18:00:00Z"), "UTC")).toBe(4);
  });

  it("can disagree with UTC's day when the zone crosses midnight differently", () => {
    // 2026-01-15T02:00:00Z is Wednesday the 14th in New York.
    expect(getZonedDayOfWeek(new Date("2026-01-15T02:00:00Z"), "America/New_York")).toBe(3);
  });
});

describe("zonedTimeToUtc", () => {
  it("converts a standard-time wall clock to the correct UTC instant", () => {
    // 8:00am EST (UTC-5) on Jan 15, 2026 is 13:00 UTC.
    const result = zonedTimeToUtc(2026, 0, 15, 8, 0, "America/New_York");
    expect(result.toISOString()).toBe("2026-01-15T13:00:00.000Z");
  });

  it("converts a daylight-time wall clock to the correct UTC instant", () => {
    // 8:00am EDT (UTC-4) on Jul 15, 2026 is 12:00 UTC.
    const result = zonedTimeToUtc(2026, 6, 15, 8, 0, "America/New_York");
    expect(result.toISOString()).toBe("2026-07-15T12:00:00.000Z");
  });

  it("self-corrects across the spring-forward DST transition", () => {
    // US DST began 2026-03-08 at 2am local (clocks jump to 3am EDT). By 8am
    // that day the zone is already in EDT (UTC-4), not EST (UTC-5) — a naive
    // single-pass offset lookup using the *pre-transition* offset would land
    // an hour off.
    const result = zonedTimeToUtc(2026, 2, 8, 8, 0, "America/New_York");
    expect(result.toISOString()).toBe("2026-03-08T12:00:00.000Z");
  });

  it("round-trips through getZonedDateParts for an arbitrary instant", () => {
    const original = new Date("2026-05-20T09:30:00Z");
    const { year, month, day } = getZonedDateParts(original, "America/Los_Angeles");
    // Same wall-clock hour/minute as the offset that produced these parts —
    // converting back should reproduce the same instant.
    const offsetMinutes = getTzOffsetMinutes("America/Los_Angeles", original);
    const localMinutesSinceMidnight = ((original.getUTCHours() * 60 + original.getUTCMinutes() + offsetMinutes) + 1440) % 1440;
    const hour = Math.floor(localMinutesSinceMidnight / 60);
    const minute = localMinutesSinceMidnight % 60;
    const roundTripped = zonedTimeToUtc(year, month, day, hour, minute, "America/Los_Angeles");
    expect(roundTripped.getTime()).toBe(original.getTime());
  });
});
