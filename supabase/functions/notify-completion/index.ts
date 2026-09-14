// GeriPaws — notify-completion Edge Function
//
// Fired by a Postgres trigger (see
// supabase/migrations/00000000000023_notify_completion_trigger.sql) whenever
// a habit is logged (walk/water/food) or a medication dose is recorded as
// given. Pushes the other owners/caregivers of that pet — excluding whoever
// just did it — so "Amanda gave Kenobi's Keppra" reaches the rest of the
// household immediately, instead of waiting for the hourly send-reminders
// digest. Gated per recipient by pet_members.notify_completed_by_others
// (00000000000021_notification_preferences.sql).
//
// Only ever called by that trigger (via pg_net, with the same non-secret
// anon-key Authorization header send-reminders' cron job uses) — never from
// a browser, so no CORS preflight to worry about and no --no-verify-jwt flag
// needed at deploy time (same as send-reminders).
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the platform — do not set those yourself.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface CompletionPayload {
  petId: string;
  actorUserId: string | null;
  kind: "walk" | "water" | "food" | "medication";
  referenceId: string;
  scheduledAt?: string | null;
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
  }
}

async function getRecipientTokens(petId: string, actorUserId: string | null): Promise<string[]> {
  let query = supabase
    .from("pet_members")
    .select("user_id")
    .eq("pet_id", petId)
    .in("role", ["owner", "caregiver"])
    .eq("notify_completed_by_others", true);
  if (actorUserId) query = query.neq("user_id", actorUserId);

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

  const [tokens, actorName] = await Promise.all([
    getRecipientTokens(payload.petId, payload.actorUserId),
    getActorName(payload.actorUserId),
  ]);

  if (tokens.length > 0) {
    const message = await buildMessage(payload, actorName);
    await sendPush(tokens, pet.name, message);
  }

  return new Response(JSON.stringify({ pushSent: tokens.length > 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
