import { describe, expect, it } from "vitest";
import { computeTodayDueDoses } from "./medication-schedule";
import type { Medication, MedicationDose } from "@geripaws/shared";

const PET = { day_boundary_hour: 0, timezone: "America/New_York" };
const NOW = new Date("2026-01-15T18:00:00Z"); // 1pm EST

function medication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "med-1",
    pet_id: "pet-1",
    ailment_id: null,
    name: "Gabapentin",
    dosage: "100",
    unit: "mg",
    route: null,
    schedule: { kind: "times_per_day", times: ["08:00", "20:00"] },
    active_from: "2020-01-01",
    active_until: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

function dose(overrides: Partial<MedicationDose> = {}): MedicationDose {
  return {
    id: "dose-1",
    pet_id: "pet-1",
    medication_id: "med-1",
    scheduled_at: "2026-01-15T13:00:00+00:00",
    given_at: null,
    created_at: NOW.toISOString(),
    given_by: null,
    skipped: false,
    notes: null,
    ...overrides,
  };
}

describe("computeTodayDueDoses", () => {
  it("excludes as-needed medications entirely", () => {
    const med = medication({ schedule: { kind: "as_needed" } });
    expect(computeTodayDueDoses(PET, [med], [], NOW)).toEqual([]);
  });

  it("excludes a medication that hasn't started yet", () => {
    const med = medication({ active_from: "2099-01-01" });
    expect(computeTodayDueDoses(PET, [med], [], NOW)).toEqual([]);
  });

  it("excludes a medication whose course has ended", () => {
    const med = medication({ active_until: "2020-01-02" });
    expect(computeTodayDueDoses(PET, [med], [], NOW)).toEqual([]);
  });

  it("still includes a medication on its last active day", () => {
    // active_until is end-of-day inclusive, not the literal midnight timestamp.
    const med = medication({ active_from: "2026-01-01", active_until: "2026-01-15" });
    expect(computeTodayDueDoses(PET, [med], [], NOW)).not.toEqual([]);
  });

  it("marks a past dose with no logged record as overdue", () => {
    // 8am EST (13:00Z) is in the past relative to NOW (13:00 EST / 18:00Z).
    const med = medication();
    const [due] = computeTodayDueDoses(PET, [med], [], NOW);
    expect(due.status).toBe("overdue");
  });

  it("marks a future dose as due (not overdue)", () => {
    const med = medication();
    const [, evening] = computeTodayDueDoses(PET, [med], [], NOW);
    expect(evening.status).toBe("due");
  });

  it("matches an existing dose by instant, not by raw string equality", () => {
    // Postgres returns timestamptz as "...+00:00"; toISOString() produces "...Z".
    // These must still be recognized as the same scheduled instant.
    const med = medication();
    const givenDose = dose({ scheduled_at: "2026-01-15T13:00:00+00:00", given_at: "2026-01-15T13:05:00+00:00" });
    const [morning] = computeTodayDueDoses(PET, [med], [givenDose], NOW);
    expect(morning.status).toBe("given");
    expect(morning.dose).toBe(givenDose);
  });

  it("marks a skipped dose as skipped even if it's in the past", () => {
    const med = medication();
    const skippedDose = dose({ scheduled_at: "2026-01-15T13:00:00+00:00", skipped: true });
    const [morning] = computeTodayDueDoses(PET, [med], [skippedDose], NOW);
    expect(morning.status).toBe("skipped");
  });

  it("sorts results chronologically across multiple medications", () => {
    const evening = medication({ id: "med-evening", schedule: { kind: "times_per_day", times: ["21:00"] } });
    const morning = medication({ id: "med-morning", schedule: { kind: "times_per_day", times: ["07:00"] } });
    const results = computeTodayDueDoses(PET, [evening, morning], [], NOW);
    expect(results.map((r) => r.medication.id)).toEqual(["med-morning", "med-evening"]);
  });
});
