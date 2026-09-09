import { describe, expect, it } from "vitest";
import { computeQolDueStatus, computeQolTotal, computeQolTrend, QOL_FULL_MAX } from "./qol";
import type { QolFullScores, QolQuickScores } from "./types";

describe("computeQolTotal", () => {
  it("sums the 7 full-scale dimensions directly (max 70)", () => {
    const scores: QolFullScores = {
      scale: "full",
      hurt: 10,
      hunger: 10,
      hydration: 10,
      hygiene: 10,
      happiness: 10,
      mobility: 10,
      moreGoodDaysThanBad: 10,
    };
    expect(computeQolTotal(scores)).toBe(70);
    expect(computeQolTotal(scores)).toBe(QOL_FULL_MAX);
  });

  it("normalizes the 5 quick-scale dimensions onto the same 0-70 scale", () => {
    const scores: QolQuickScores = { scale: "quick", comfort: 10, appetite: 10, happiness: 10, mobility: 10, overall: 10 };
    // raw max is 50 -> (50/50)*70 = 70, same ceiling as the full scale.
    expect(computeQolTotal(scores)).toBe(70);

    const half: QolQuickScores = { scale: "quick", comfort: 5, appetite: 5, happiness: 5, mobility: 5, overall: 5 };
    expect(computeQolTotal(half)).toBe(35);
  });
});

describe("computeQolTrend", () => {
  it("is 'none' with no previous score", () => {
    expect(computeQolTrend(50, null)).toEqual({ direction: "none", delta: 0 });
  });

  it("is 'same' for a sub-threshold change", () => {
    expect(computeQolTrend(50, 49.6)).toEqual({ direction: "same", delta: expect.closeTo(0.4, 5) });
  });

  it("is 'up' or 'down' once the change reaches the 0.5 threshold", () => {
    expect(computeQolTrend(50.5, 50)).toEqual({ direction: "up", delta: 0.5 });
    expect(computeQolTrend(49.5, 50)).toEqual({ direction: "down", delta: -0.5 });
  });
});

describe("computeQolDueStatus", () => {
  it("is 'never' with no prior check-in", () => {
    expect(computeQolDueStatus(null, "weekly").status).toBe("never");
  });

  it("is 'not-due' before the cadence interval has elapsed", () => {
    const now = new Date("2026-01-08T00:00:00Z");
    expect(computeQolDueStatus("2026-01-05T00:00:00Z", "weekly", now).status).toBe("not-due");
  });

  it("is 'due' once the cadence interval has elapsed but not the extra day", () => {
    const now = new Date("2026-01-12T00:00:00Z"); // exactly 7 days after last
    expect(computeQolDueStatus("2026-01-05T00:00:00Z", "weekly", now).status).toBe("due");
  });

  it("is 'overdue' one full day past the due date", () => {
    const now = new Date("2026-01-13T00:00:00Z"); // 8 days after last
    expect(computeQolDueStatus("2026-01-05T00:00:00Z", "weekly", now).status).toBe("overdue");
  });

  it("respects daily and monthly cadences too", () => {
    // daily: due 1 day after last, overdue 1 day after that.
    expect(computeQolDueStatus("2026-01-05T00:00:00Z", "daily", new Date("2026-01-06T12:00:00Z")).status).toBe("due");
    expect(computeQolDueStatus("2026-01-05T00:00:00Z", "daily", new Date("2026-01-07T00:00:00Z")).status).toBe(
      "overdue"
    );
    expect(computeQolDueStatus("2026-01-05T00:00:00Z", "monthly", new Date("2026-01-20T00:00:00Z")).status).toBe(
      "not-due"
    );
  });
});
