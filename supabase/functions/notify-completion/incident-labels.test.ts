// Run with: deno test supabase/functions/notify-completion/incident-labels.test.ts

import { assertEquals } from "jsr:@std/assert@1";
import { describeIncident } from "./incident-labels.ts";

Deno.test("describeIncident — known categories get a human phrasing", () => {
  assertEquals(describeIncident("seizure"), "a seizure");
  assertEquals(describeIncident("urine"), "a urine accident");
  assertEquals(describeIncident("fall"), "a fall");
});

Deno.test("describeIncident — missing or unknown categories fall back to a generic phrase", () => {
  assertEquals(describeIncident(null), "an incident");
  assertEquals(describeIncident(undefined), "an incident");
  assertEquals(describeIncident("not-a-real-category"), "an incident");
});
