// Unit tests for the pure schedule/timezone helpers send-reminders depends on.
//
// These duplicate logic that also lives in packages/shared/src/schedule.ts
// and tz.ts — Edge Functions can't import across function directories, so the
// two copies can silently drift. This file exists to catch that drift, not
// just bugs within this copy. It imports schedule-lib.ts directly (not
// index.ts) so it never has to construct the real Supabase client, which
// throws immediately if SUPABASE_URL/SERVICE_ROLE_KEY aren't set — as they
// never are in a test run.
//
// Run with: deno test supabase/functions/send-reminders/schedule-lib.test.ts

import { assertEquals } from "jsr:@std/assert@1";
import {
  applyTimeToDay,
  computeDosesPerDay,
  computeDueTimesForDay,
  getDayStart,
  getTzOffsetMinutes,
  getZonedDateParts,
  getZonedDayOfWeek,
  isQolOverdue,
  zonedTimeToUtc,
} from "./schedule-lib.ts";

const TZ = "America/New_York";

Deno.test("getTzOffsetMinutes — standard vs daylight time", () => {
  assertEquals(getTzOffsetMinutes(TZ, new Date("2026-01-15T12:00:00Z")), -300);
  assertEquals(getTzOffsetMinutes(TZ, new Date("2026-07-15T12:00:00Z")), -240);
});

Deno.test("getZonedDateParts — rolls the calendar day back west of UTC", () => {
  assertEquals(getZonedDateParts(new Date("2026-01-15T02:00:00Z"), TZ), { year: 2026, month: 0, day: 14 });
});

Deno.test("getZonedDayOfWeek — matches the expected weekday", () => {
  // 2026-01-15 is a Thursday.
  assertEquals(getZonedDayOfWeek(new Date("2026-01-15T18:00:00Z"), "UTC"), 4);
});

Deno.test("zonedTimeToUtc — converts standard and daylight wall clocks correctly", () => {
  assertEquals(zonedTimeToUtc(2026, 0, 15, 8, 0, TZ).toISOString(), "2026-01-15T13:00:00.000Z");
  assertEquals(zonedTimeToUtc(2026, 6, 15, 8, 0, TZ).toISOString(), "2026-07-15T12:00:00.000Z");
});

Deno.test("zonedTimeToUtc — self-corrects across the spring-forward transition", () => {
  assertEquals(zonedTimeToUtc(2026, 2, 8, 8, 0, TZ).toISOString(), "2026-03-08T12:00:00.000Z");
});

Deno.test("applyTimeToDay — places an HH:MM time on dayStart's own calendar day", () => {
  const dayStart = new Date("2026-01-15T05:00:00Z"); // midnight EST Jan 15
  assertEquals(applyTimeToDay(dayStart, "08:00", TZ).toISOString(), "2026-01-15T13:00:00.000Z");
});

Deno.test("computeDueTimesForDay — times_per_day", () => {
  const dayStart = new Date("2026-01-15T05:00:00Z");
  const times = computeDueTimesForDay({ kind: "times_per_day", times: ["08:00", "20:00"] }, dayStart, TZ);
  assertEquals(
    times.map((t: Date) => t.toISOString()),
    ["2026-01-15T13:00:00.000Z", "2026-01-16T01:00:00.000Z"]
  );
});

Deno.test("computeDueTimesForDay — specific_days matches only the configured weekday", () => {
  const dayStart = new Date("2026-01-15T05:00:00Z"); // Thursday
  assertEquals(
    computeDueTimesForDay({ kind: "specific_days", daysOfWeek: [4], times: ["09:00"] }, dayStart, TZ).length,
    1
  );
  assertEquals(
    computeDueTimesForDay({ kind: "specific_days", daysOfWeek: [1], times: ["09:00"] }, dayStart, TZ).length,
    0
  );
});

Deno.test("computeDueTimesForDay — interval_hours fills the day and stays within bounds", () => {
  const dayStart = new Date("2026-01-15T05:00:00Z");
  const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
  const times = computeDueTimesForDay({ kind: "interval_hours", intervalHours: 8, startTime: "06:00" }, dayStart, TZ);
  assertEquals(times.length, 3);
  for (const t of times) {
    if (t.getTime() < dayStart.getTime() || t.getTime() >= dayEnd.getTime()) {
      throw new Error(`${t.toISOString()} fell outside [${dayStart.toISOString()}, ${dayEnd.toISOString()})`);
    }
  }
});

Deno.test("computeDueTimesForDay — as_needed and unknown kinds produce nothing", () => {
  assertEquals(computeDueTimesForDay({ kind: "as_needed" }, new Date(), TZ), []);
});

Deno.test("computeDosesPerDay — every schedule kind", () => {
  assertEquals(computeDosesPerDay({ kind: "times_per_day", times: ["08:00", "20:00"] }), 2);
  assertEquals(computeDosesPerDay({ kind: "interval_hours", intervalHours: 8 }), 3);
  assertEquals(computeDosesPerDay({ kind: "specific_days", daysOfWeek: [1, 4], times: ["08:00", "20:00"] }), 4 / 7);
  assertEquals(computeDosesPerDay({ kind: "as_needed" }), null);
});

Deno.test("getDayStart — rolls back to yesterday's boundary before it's reached", () => {
  assertEquals(getDayStart(new Date("2026-01-15T08:00:00Z"), 6, TZ).toISOString(), "2026-01-14T11:00:00.000Z");
  assertEquals(getDayStart(new Date("2026-01-15T14:00:00Z"), 6, TZ).toISOString(), "2026-01-15T11:00:00.000Z");
});

Deno.test("isQolOverdue — respects cadence and the one-day grace period", () => {
  assertEquals(isQolOverdue(null, "weekly", new Date()), false);
  assertEquals(isQolOverdue("2026-01-05T00:00:00Z", "weekly", new Date("2026-01-08T00:00:00Z")), false);
  assertEquals(isQolOverdue("2026-01-05T00:00:00Z", "weekly", new Date("2026-01-12T00:00:00Z")), false); // due, not yet overdue
  assertEquals(isQolOverdue("2026-01-05T00:00:00Z", "weekly", new Date("2026-01-13T00:00:00Z")), true);
});
