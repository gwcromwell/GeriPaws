import { describe, expect, it } from "vitest";
import {
  createInviteSchema,
  createPetSchema,
  habitLogInputSchema,
  medicationScheduleSchema,
  qolScoresSchema,
  updatePetSchema,
} from "./schemas";

describe("createPetSchema", () => {
  it("accepts a minimal valid pet (just a name)", () => {
    const result = createPetSchema.safeParse({ name: "Bramble" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weightUnit).toBe("lb"); // default applied
      expect(result.data.dayBoundaryHour).toBe(0); // default applied
    }
  });

  it("rejects an empty name", () => {
    expect(createPetSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a malformed date of birth", () => {
    expect(createPetSchema.safeParse({ name: "Bramble", dob: "not-a-date" }).success).toBe(false);
  });

  it("accepts a fully populated pet", () => {
    const result = createPetSchema.safeParse({
      name: "Bramble",
      breed: "Lab mix",
      dob: "2013-04-01",
      sex: "male",
      neutered: true,
      weightUnit: "kg",
      dayBoundaryHour: 6,
    });
    expect(result.success).toBe(true);
  });
});

describe("updatePetSchema", () => {
  it("allows every field to be explicitly cleared with null", () => {
    const result = updatePetSchema.safeParse({
      breed: null,
      dob: null,
      sex: null,
      neutered: null,
      photoUrl: null,
      microchipNumber: null,
      vetName: null,
      vetPhone: null,
      allergies: null,
      insuranceProvider: null,
      insurancePolicyNumber: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-URL photoUrl", () => {
    expect(updatePetSchema.safeParse({ photoUrl: "not-a-url" }).success).toBe(false);
  });

  it("rejects clearing the name to empty (still required if present)", () => {
    expect(updatePetSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("createInviteSchema", () => {
  it("lowercases and trims the email", () => {
    const result = createInviteSchema.safeParse({
      petId: "5b1a6f2e-6c1a-4b7a-9c1a-0f2e6c1a4b7a",
      email: "  Amanda.Carter@Example.COM  ",
      role: "caregiver",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("amanda.carter@example.com");
  });

  it("rejects inviting someone as 'owner'", () => {
    const result = createInviteSchema.safeParse({
      petId: "5b1a6f2e-6c1a-4b7a-9c1a-0f2e6c1a4b7a",
      email: "a@example.com",
      role: "owner",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID petId", () => {
    expect(createInviteSchema.safeParse({ petId: "not-a-uuid", email: "a@example.com", role: "viewer" }).success).toBe(
      false
    );
  });
});

describe("habitLogInputSchema (discriminated union)", () => {
  const petId = "5b1a6f2e-6c1a-4b7a-9c1a-0f2e6c1a4b7a";
  const occurredAt = "2026-01-15T08:00:00-05:00";

  it("accepts a walk log with walk-shaped details", () => {
    const result = habitLogInputSchema.safeParse({
      type: "walk",
      petId,
      occurredAt,
      details: { durationMin: 20, elimination: "both" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a walk log with an invalid elimination value", () => {
    const result = habitLogInputSchema.safeParse({
      type: "walk",
      petId,
      occurredAt,
      details: { elimination: "not-a-real-option" },
    });
    expect(result.success).toBe(false);
  });

  it("requires an offset on occurredAt (a bare local time is ambiguous across timezones)", () => {
    const result = habitLogInputSchema.safeParse({
      type: "water",
      petId,
      occurredAt: "2026-01-15T08:00:00",
      details: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects an incident log missing its required category", () => {
    const result = habitLogInputSchema.safeParse({
      type: "incident",
      petId,
      occurredAt,
      details: { severity: "mild" },
    });
    expect(result.success).toBe(false);
  });
});

describe("medicationScheduleSchema", () => {
  it("accepts each schedule kind", () => {
    expect(medicationScheduleSchema.safeParse({ kind: "times_per_day", times: ["08:00", "20:00"] }).success).toBe(
      true
    );
    expect(
      medicationScheduleSchema.safeParse({ kind: "interval_hours", intervalHours: 8, startTime: "06:00" }).success
    ).toBe(true);
    expect(
      medicationScheduleSchema.safeParse({ kind: "specific_days", daysOfWeek: [1, 3, 5], times: ["09:00"] }).success
    ).toBe(true);
    expect(medicationScheduleSchema.safeParse({ kind: "as_needed" }).success).toBe(true);
  });

  it("rejects a malformed time string", () => {
    expect(medicationScheduleSchema.safeParse({ kind: "times_per_day", times: ["8am"] }).success).toBe(false);
    expect(medicationScheduleSchema.safeParse({ kind: "times_per_day", times: ["24:00"] }).success).toBe(false);
  });

  it("rejects an out-of-range day of week", () => {
    expect(
      medicationScheduleSchema.safeParse({ kind: "specific_days", daysOfWeek: [7], times: ["09:00"] }).success
    ).toBe(false);
  });

  it("rejects times_per_day with no times", () => {
    expect(medicationScheduleSchema.safeParse({ kind: "times_per_day", times: [] }).success).toBe(false);
  });
});

describe("qolScoresSchema", () => {
  it("accepts dimension values at the 0 and 10 boundaries", () => {
    expect(
      qolScoresSchema.safeParse({
        scale: "quick",
        comfort: 0,
        appetite: 10,
        happiness: 0,
        mobility: 10,
        overall: 5,
      }).success
    ).toBe(true);
  });

  it("rejects a dimension value outside 0-10", () => {
    expect(
      qolScoresSchema.safeParse({
        scale: "quick",
        comfort: 11,
        appetite: 5,
        happiness: 5,
        mobility: 5,
        overall: 5,
      }).success
    ).toBe(false);
  });

  it("rejects mixing full-scale and quick-scale fields", () => {
    expect(
      qolScoresSchema.safeParse({
        scale: "full",
        hurt: 5,
        hunger: 5,
        hydration: 5,
        hygiene: 5,
        happiness: 5,
        mobility: 5,
        // missing moreGoodDaysThanBad
      }).success
    ).toBe(false);
  });
});
