// Run with: deno test supabase/functions/send-reminders/notification-filter.test.ts

import { assertEquals } from "jsr:@std/assert@1";
import { filterIssuesForRecipient, type Issue, type RecipientNotifyPrefs } from "./notification-filter.ts";

const ALL_ON: RecipientNotifyPrefs = {
  notify_medication_due: true,
  notify_walk_due: true,
  notify_food_due: true,
  notify_water_due: true,
};
const ALL_OFF: RecipientNotifyPrefs = {
  notify_medication_due: false,
  notify_walk_due: false,
  notify_food_due: false,
  notify_water_due: false,
};

const ISSUES: Issue[] = [
  { kind: "medication_overdue", message: "Keppra was due at 8:00 PM" },
  { kind: "walk_overdue", message: "A walk was due at 6:00 PM" },
  { kind: "food_overdue", message: "Dinner was due at 6:00 PM" },
  { kind: "water_overdue", message: "Water was due at 6:00 PM" },
  { kind: "refill_low", message: "Keppra is running low" },
  { kind: "qol_overdue", message: "A QOL check-in is overdue" },
];

Deno.test("filterIssuesForRecipient — all toggles on keeps every issue", () => {
  assertEquals(filterIssuesForRecipient(ISSUES, ALL_ON), ISSUES);
});

Deno.test("filterIssuesForRecipient — refill_low and qol_overdue are never gated", () => {
  const result = filterIssuesForRecipient(ISSUES, ALL_OFF);
  assertEquals(
    result.map((i) => i.kind),
    ["refill_low", "qol_overdue"]
  );
});

Deno.test("filterIssuesForRecipient — each toggle only suppresses its own kind", () => {
  const medOff = filterIssuesForRecipient(ISSUES, { ...ALL_ON, notify_medication_due: false });
  assertEquals(
    medOff.map((i) => i.kind),
    ["walk_overdue", "food_overdue", "water_overdue", "refill_low", "qol_overdue"]
  );

  const walkOff = filterIssuesForRecipient(ISSUES, { ...ALL_ON, notify_walk_due: false });
  assertEquals(
    walkOff.map((i) => i.kind),
    ["medication_overdue", "food_overdue", "water_overdue", "refill_low", "qol_overdue"]
  );

  const foodOff = filterIssuesForRecipient(ISSUES, { ...ALL_ON, notify_food_due: false });
  assertEquals(
    foodOff.map((i) => i.kind),
    ["medication_overdue", "walk_overdue", "water_overdue", "refill_low", "qol_overdue"]
  );

  const waterOff = filterIssuesForRecipient(ISSUES, { ...ALL_ON, notify_water_due: false });
  assertEquals(
    waterOff.map((i) => i.kind),
    ["medication_overdue", "walk_overdue", "food_overdue", "refill_low", "qol_overdue"]
  );
});

Deno.test("filterIssuesForRecipient — a recipient with everything off never gets an empty push sent", () => {
  const onlyGated: Issue[] = [
    { kind: "medication_overdue", message: "x" },
    { kind: "walk_overdue", message: "y" },
    { kind: "food_overdue", message: "z" },
    { kind: "water_overdue", message: "w" },
  ];
  assertEquals(filterIssuesForRecipient(onlyGated, ALL_OFF), []);
});
