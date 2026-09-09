// GeriPaws — send-reminders Edge Function
//
// Runs on a schedule (see supabase/migrations/00000000000004_notification_log.sql
// for the pg_cron job that invokes this hourly). For every active pet, checks for
// overdue medication doses, low medication supply, and overdue Quality of Life
// check-ins, and emails the pet's owner/caregivers a summary via Resend.
//
// The schedule/refill math in schedule-lib.ts intentionally duplicates the pure
// logic in packages/shared/src/schedule.ts and qol.ts — Edge Functions can't
// import from the rest of the monorepo, only from within their own directory.
// See index.test.ts for the tests guarding that duplication against drift.
//
// Required secret: RESEND_API_KEY (set via the Supabase dashboard or
// `supabase secrets set`). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by the platform — do not set those yourself.

import { createClient } from "npm:@supabase/supabase-js@2";
import { computeDosesPerDay, computeDueTimesForDay, getDayStart, isQolOverdue } from "./schedule-lib.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "GeriPaws <reminders@obi1.nyc>";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Dedup — at most one email per pet/kind/reference per calendar day
// ---------------------------------------------------------------------------

async function alreadyNotifiedToday(petId: string, kind: string, referenceId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("notification_log")
    .select("id")
    .eq("pet_id", petId)
    .eq("kind", kind)
    .eq("reference_id", referenceId)
    .eq("notif_date", today)
    .maybeSingle();
  return Boolean(data);
}

async function recordNotified(petId: string, kind: string, referenceId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("notification_log").insert({ pet_id: petId, kind, reference_id: referenceId, notif_date: today });
}

async function getRecipientEmails(petId: string): Promise<string[]> {
  const { data: members } = await supabase
    .from("pet_members")
    .select("user_id")
    .eq("pet_id", petId)
    .in("role", ["owner", "caregiver"]);
  if (!members) return [];

  const emails: string[] = [];
  for (const member of members) {
    const { data } = await supabase.auth.admin.getUserById(member.user_id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
}

async function sendEmail(to: string[], subject: string, html: string): Promise<void> {
  if (to.length === 0) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
}

/**
 * Push notifications are Phase 4 work-in-progress: this queries whatever
 * tokens exist and sends to them, but no tokens will exist until the app has
 * a real EAS project ID and has been built/installed on a device with Apple
 * push credentials configured (see README). Harmless no-op until then.
 */
async function getPushTokens(petId: string): Promise<string[]> {
  const { data: members } = await supabase
    .from("pet_members")
    .select("user_id")
    .eq("pet_id", petId)
    .in("role", ["owner", "caregiver"]);
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

Deno.serve(async () => {
  const now = new Date();
  const { data: pets, error: petsError } = await supabase.from("pets").select("*").eq("status", "active");
  if (petsError) return new Response(petsError.message, { status: 500 });
  if (!pets) return new Response(JSON.stringify({ petsChecked: 0, emailsSent: 0, pushSent: 0 }), { status: 200 });

  let emailsSent = 0;
  let pushSent = 0;

  for (const pet of pets) {
    const timeZone = pet.timezone || "UTC";
    const dayStart = getDayStart(now, pet.day_boundary_hour ?? 0, timeZone);
    const issues: string[] = [];

    const { data: medications } = await supabase.from("medications").select("*").eq("pet_id", pet.id);
    const { data: dosesToday } = await supabase
      .from("medication_doses")
      .select("*")
      .eq("pet_id", pet.id)
      .gte("scheduled_at", dayStart.toISOString());

    for (const med of medications ?? []) {
      if (med.schedule.kind === "as_needed") continue;
      if (new Date(med.active_from) > now) continue;
      if (med.active_until && new Date(med.active_until) < now) continue;

      for (const scheduledAt of computeDueTimesForDay(med.schedule, dayStart, timeZone)) {
        if (scheduledAt >= now) continue;

        const given = (dosesToday ?? []).some(
          (d) => d.medication_id === med.id && new Date(d.scheduled_at).getTime() === scheduledAt.getTime()
        );
        if (given) continue;

        const refKey = `${med.id}:${scheduledAt.toISOString()}`;
        if (await alreadyNotifiedToday(pet.id, "medication_overdue", refKey)) continue;

        issues.push(
          `${med.name} (${med.dosage} ${med.unit}) was due at ${scheduledAt.toLocaleTimeString("en-US", {
            timeZone,
            hour: "numeric",
            minute: "2-digit",
          })} and hasn't been logged as given or skipped.`
        );
        await recordNotified(pet.id, "medication_overdue", refKey);
      }
    }

    const { data: refills } = await supabase
      .from("medication_refills")
      .select("*, medications(name, unit)")
      .eq("pet_id", pet.id);

    for (const refill of refills ?? []) {
      const med = medications?.find((m) => m.id === refill.medication_id);
      if (!med) continue;
      const dosesPerDay = computeDosesPerDay(med.schedule);
      if (!dosesPerDay) continue;

      const daysRemaining = refill.count_on_hand / (refill.unit_per_dose * dosesPerDay);
      if (daysRemaining > refill.low_stock_threshold) continue;
      if (await alreadyNotifiedToday(pet.id, "refill_low", refill.medication_id)) continue;

      issues.push(
        `${refill.medications?.name ?? med.name} is running low — about ${Math.max(0, Math.round(daysRemaining))} day(s) of supply left.`
      );
      await recordNotified(pet.id, "refill_low", refill.medication_id);
    }

    const { data: qolSettings } = await supabase
      .from("qol_settings")
      .select("*")
      .eq("pet_id", pet.id)
      .maybeSingle();

    if (qolSettings?.enabled) {
      const { data: lastResponse } = await supabase
        .from("qol_responses")
        .select("survey_date")
        .eq("pet_id", pet.id)
        .order("survey_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (isQolOverdue(lastResponse?.survey_date ?? null, qolSettings.cadence, now)) {
        if (!(await alreadyNotifiedToday(pet.id, "qol_overdue", "qol"))) {
          issues.push("A Quality of Life check-in is overdue.");
          await recordNotified(pet.id, "qol_overdue", "qol");
        }
      }
    }

    if (issues.length === 0) continue;

    const [emails, pushTokens] = await Promise.all([getRecipientEmails(pet.id), getPushTokens(pet.id)]);

    if (emails.length > 0) {
      const html = `
        <h2>GeriPaws reminder for ${pet.name}</h2>
        <ul>${issues.map((issue) => `<li>${issue}</li>`).join("")}</ul>
        <p>Open GeriPaws to take care of these.</p>
      `;
      await sendEmail(emails, `GeriPaws reminder: ${pet.name}`, html);
      emailsSent++;
    }

    if (pushTokens.length > 0) {
      const summary = issues.length === 1 ? issues[0] : `${issues.length} things need attention.`;
      await sendPush(pushTokens, `GeriPaws reminder: ${pet.name}`, summary);
      pushSent++;
    }
  }

  return new Response(JSON.stringify({ petsChecked: pets.length, emailsSent, pushSent }), {
    headers: { "Content-Type": "application/json" },
  });
});
