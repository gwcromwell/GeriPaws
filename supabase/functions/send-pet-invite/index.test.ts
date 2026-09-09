// Regression tests for a real bug: this function had no CORS handling, so
// every call from the web build (the only way most caregivers use GeriPaws)
// failed at the browser's CORS-preflight stage before ever reaching this
// code — inviteMember() would report "email couldn't be sent" near-instantly,
// which is exactly what was reported. These two cases return before any
// Supabase/Resend network call, so they need no live credentials to test.
//
// Run with: deno test --allow-env supabase/functions/send-pet-invite/index.test.ts

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { handleRequest } from "./index.ts";

const URL = "https://example.supabase.co/functions/v1/send-pet-invite";

Deno.test("responds to the CORS preflight (OPTIONS) with an Allow-Origin header", async () => {
  const response = await handleRequest(new Request(URL, { method: "OPTIONS" }));
  assertEquals(response.status, 200);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
});

Deno.test("still carries CORS headers on an early-exit error response", async () => {
  // No Authorization header — the very first check in the handler, and
  // exactly the shape of response a real invocation gets when auth is
  // missing/expired. If this lacks CORS headers, the browser suppresses the
  // body entirely and the client just sees a generic network failure.
  const response = await handleRequest(new Request(URL, { method: "POST", body: "{}" }));
  assertEquals(response.status, 401);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
});
