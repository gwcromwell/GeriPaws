// GeriPaws — notify-completion Edge Function
//
// Fired by a Postgres trigger (see
// supabase/migrations/00000000000023_notify_completion_trigger.sql and
// 00000000000025_notify_incident_completion.sql) whenever a habit is logged
// (walk/water/food/incident) or a medication dose is recorded as given.
// Pushes the other owners/caregivers of that pet — excluding whoever just
// did it — so "Amanda gave Kenobi's Keppra" or "Amanda logged a seizure"
// reaches the rest of the household immediately, instead of waiting for the
// hourly send-reminders digest.
//
// Gated per recipient: walk/water/food/medication by
// pet_members.notify_completed_by_others (00000000000021), incidents by
// pet_members.notify_incident_categories (00000000000024) — incidents vary
// too much in urgency for one blanket toggle (a seizure vs. a urine
// accident), so they get their own per-category opt-in/out.
//
// Only ever called by that trigger (via pg_net, with the same non-secret
// anon-key Authorization header send-reminders' cron job uses) — never from
// a browser, so no CORS preflight to worry about and no --no-verify-jwt flag
// needed at deploy time (same as send-reminders).
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the platform — do not set those yourself.

import { createClient } from "npm:@supabase/supabase-js@2";
import { describeIncident } from "./incident-labels.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface CompletionPayload {
  petId: string;
  actorUserId: string | null;
  kind: "walk" | "water" | "food" | "medication" | "incident";
  referenceId: string;
  scheduledAt?: string | null;
  incidentCategory?: string | null;
}

async function getActorName(userId: string | null): Promise<string> {
  if (!userId) return "Someone";
  const { data } = await supabase.from("profiles").select("display_name, email").eq("id", userId).maybeSingle();
  return data?.display_name || data?.email || "Someone";
}

async function buildMessage(payload: CompletionPayload, actorName: string): Promise<string> {
  switch (payload.kind) {
    case "walk":
      return `${actorName} logged a walk`;
    case "water":
      return `${actorName} logged water`;
    case "food":
      return `${actorName} logged food`;
    case "medication": {
      const { data: medication } = await supabase
        .from("medications")
        .select("name")
        .eq("id", payload.referenceId)
        .maybeSingle();
      const name = medication?.name ?? "a medication";
      if (payload.scheduledAt) {
        const time = new Date(payload.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return `${actorName} gave the ${time} ${name}`;
      }
      return `${actorName} gave ${name}`;
    }
    case "incident":
      return `${actorName} logged ${describeIncident(payload.incidentCategory)}`;
  }
}

async function getRecipientTokens(payload: CompletionPayload): Promise<string[]> {
  let query = supabase
    .from("pet_members")
    .select("user_id")
    .eq("pet_id", payload.petId)
    .in("role", ["owner", "caregiver"]);

  query =
    payload.kind === "incident"
      ? query.contains("notify_incident_categories", [payload.incidentCategory ?? "other"])
      : query.eq("notify_completed_by_others", true);

  if (payload.actorUserId) query = query.neq("user_id", payload.actorUserId);

  const { data: members } = await query;
  if (!members) return [];

  const tokens: string[] = [];
  for (const member of members) {
    const { data } = await supabase.from("push_tokens").select("token").eq("user_id", member.user_id);
    for (const row of data ?? []) tokens.push(row.token);
  }
  return tokens;
}

async function sendPush(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: "default" }))),
  });
}

Deno.serve(async (req) => {
  let payload: CompletionPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  if (!payload.petId || !payload.kind || !payload.referenceId) {
    return new Response("Missing petId, kind, or referenceId", { status: 400 });
  }

  const { data: pet } = await supabase.from("pets").select("name").eq("id", payload.petId).maybeSingle();
  if (!pet) return new Response("Pet not found", { status: 404 });

  const [tokens, actorName] = await Promise.all([getRecipientTokens(payload), getActorName(payload.actorUserId)]);

  if (tokens.length > 0) {
    const message = await buildMessage(payload, actorName);
    await sendPush(tokens, pet.name, message);
  }

  return new Response(JSON.stringify({ pushSent: tokens.length > 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
