// GeriPaws — get-shared-pet Edge Function
//
// Public, read-only endpoint behind a share link token (see
// supabase/migrations/00000000000009_pet_share_links.sql). Anyone with a
// valid, non-revoked, non-expired token gets a clinical snapshot — no
// GeriPaws account needed. The token itself is the only access control;
// this function uses the service role to bypass RLS once the token checks
// out. Called from the public /shared/[token] page using the app's own
// (non-secret) anon key, purely to satisfy the platform's default gateway
// auth check — the real access control is the token lookup below.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Exported so index.test.ts can call it directly without a live network round trip.
export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: CORS_HEADERS });
  }

  const { data: link } = await supabase.from("pet_share_links").select("*").eq("token", token).maybeSingle();
  if (!link || link.revoked || new Date(link.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: "This link is invalid or has expired." }), {
      status: 404,
      headers: CORS_HEADERS,
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  const [pet, ailments, medications, qolResponses, weightLogs] = await Promise.all([
    supabase.from("pets").select("name, breed, dob, sex, weight_unit").eq("id", link.pet_id).single(),
    supabase.from("ailments").select("*").eq("pet_id", link.pet_id).eq("status", "active"),
    supabase
      .from("medications")
      .select("*")
      .eq("pet_id", link.pet_id)
      .or(`active_until.is.null,active_until.gte.${today}`),
    supabase
      .from("qol_responses")
      .select("survey_date, total_score")
      .eq("pet_id", link.pet_id)
      .order("survey_date", { ascending: false })
      .limit(12),
    supabase
      .from("habit_logs")
      .select("occurred_at, details")
      .eq("pet_id", link.pet_id)
      .eq("type", "weight")
      .order("occurred_at", { ascending: false })
      .limit(12),
  ]);

  return new Response(
    JSON.stringify({
      pet: pet.data,
      ailments: ailments.data ?? [],
      medications: medications.data ?? [],
      qolResponses: qolResponses.data ?? [],
      weightLogs: weightLogs.data ?? [],
    }),
    { headers: CORS_HEADERS }
  );
}

// Guarded so importing this module for tests doesn't try to bind a listener
// (which needs --allow-net and would otherwise start a real server per test run).
if (import.meta.main) {
  Deno.serve(handleRequest);
}
