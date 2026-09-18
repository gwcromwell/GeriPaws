// Per-recipient push filtering for send-reminders. Each caregiver can toggle
// (per dog, on pet_members — see 00000000000021_notification_preferences.sql)
// whether they want a push for overdue medications/walks/food. The email
// digest stays unfiltered (existing behavior, sent once per pet to every
// owner/caregiver) — only the push notification is gated per recipient.
//
// Pulled out of index.ts's Deno.serve handler so this branching logic is
// unit-testable without a Supabase client or network access.

export type IssueKind =
  | "medication_overdue"
  | "refill_low"
  | "qol_overdue"
  | "walk_overdue"
  | "food_overdue"
  | "water_overdue";

export interface Issue {
  kind: IssueKind;
  message: string;
}

export interface RecipientNotifyPrefs {
  notify_medication_due: boolean;
  notify_walk_due: boolean;
  notify_food_due: boolean;
  notify_water_due: boolean;
}

// refill_low and qol_overdue have no dedicated toggle (none was requested) —
// they always reach every recipient, same as before this feature existed.
const GATED_KIND_TO_PREF: Partial<Record<IssueKind, keyof RecipientNotifyPrefs>> = {
  medication_overdue: "notify_medication_due",
  walk_overdue: "notify_walk_due",
  food_overdue: "notify_food_due",
  water_overdue: "notify_water_due",
};

export function filterIssuesForRecipient(issues: Issue[], prefs: RecipientNotifyPrefs): Issue[] {
  return issues.filter((issue) => {
    const prefKey = GATED_KIND_TO_PREF[issue.kind];
    return prefKey === undefined || prefs[prefKey];
  });
}
