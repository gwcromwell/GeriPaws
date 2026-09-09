// Regression coverage for the same class of bug fixed in send-pet-invite:
// a browser-invoked Edge Function with no CORS handling fails silently at
// the preflight stage. This one already had it right — this just locks it in.
//
// Requires dummy SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars (the module
// constructs a client at import time) — no real network call happens for
// either case below. Run with:
//   SUPABASE_URL=https://example.supabase.co SUPABASE_SERVICE_ROLE_KEY=test-key \
//     deno test --allow-env supabase/functions/get-shared-pet/index.test.ts

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { handleRequest } from "./index.ts";

const URL = "https://example.supabase.co/functions/v1/get-shared-pet";

Deno.test("responds to the CORS preflight (OPTIONS) with an Allow-Origin header", async () => {
  const response = await handleRequest(new Request(URL, { method: "OPTIONS" }));
  assertEquals(response.status, 200);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
});

Deno.test("still carries CORS headers on an early-exit error response", async () => {
  // No ?token= query param — the first check, and returns before touching Supabase.
  const response = await handleRequest(new Request(URL, { method: "GET" }));
  assertEquals(response.status, 400);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
});
