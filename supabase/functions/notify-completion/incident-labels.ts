// Human-readable phrasing for each incident category, used to build the
// "John logged a seizure" push message. Pulled into its own pure function
// so it's unit-testable without spinning up the Edge Function — see
// incident-labels.test.ts.

const INCIDENT_LABELS: Record<string, string> = {
  urine: "a urine accident",
  stool: "a stool accident",
  vomit: "vomiting",
  fall: "a fall",
  seizure: "a seizure",
  disorientation: "disorientation",
  other: "an incident",
};

export function describeIncident(category: string | null | undefined): string {
  if (!category) return "an incident";
  return INCIDENT_LABELS[category] ?? "an incident";
}
