// GeriPaws — send-reminders Edge Function
//
// Runs on a schedule (see supabase/migrations/00000000000004_notification_log.sql
// for the pg_cron job that invokes this hourly). For every active pet, checks for
// overdue medication doses, overdue walks/food (see habit_schedules,
// 00000000000020_habit_schedules.sql), low medication supply, and overdue
// Quality of Life check-ins, and emails the pet's owner/caregivers a summary
// via Resend.
//
// The schedule/refill math in schedule-lib.ts intentionally duplicates the pure
// logic in packages/shared/src/schedule.ts and qol.ts — Edge Functions can't
// import from the rest of the monorepo, only from within their own directory.
// See schedule-lib.test.ts for the tests guarding that duplication against drift.
//
// Required secret: RESEND_API_KEY (set via the Supabase dashboard or
// `supabase secrets set`). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// injected automatically by the platform — do not set those yourself.

import { createClient } from "npm:@supabase/supabase-js@2";
import { computeDosesPerDay, computeDueTimesForDay, getDayStart, isQolOverdue } from "./schedule-lib.ts";
import { filterIssuesForRecipient, type Issue, type IssueKind, type RecipientNotifyPrefs } from "./notification-filter.ts";

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
  if (!members || members.length === 0) return [];

  // profiles.email mirrors auth.users.email for exactly this reason — see
  // 00000000000014_profiles.sql — so this reads from a plain, batchable
  // table instead of one auth.admin.getUserById() call per member.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email")
    .in(
      "id",
      members.map((m) => m.user_id)
    );
  return (profiles ?? []).map((p) => p.email);
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

interface PushRecipient {
  tokens: string[];
  prefs: RecipientNotifyPrefs;
}

/**
 * One entry per owner/caregiver who has at least one registered device, each
 * carrying their own per-dog notification preferences (pet_members —
 * see 00000000000021_notification_preferences.sql) so the caller can filter
 * which overdue issues actually reach them (see notification-filter.ts).
 * Unlike the email digest (sent once per pet, unfiltered), push respects
 * each recipient's own toggles.
 */
async function getPushRecipients(petId: string): Promise<PushRecipient[]> {
  const { data: members } = await supabase
    .from("pet_members")
    .select("user_id, notify_medication_due, notify_walk_due, notify_food_due, notify_water_due")
    .eq("pet_id", petId)
    .in("role", ["owner", "caregiver"]);
  if (!members || members.length === 0) return [];

  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .in(
      "user_id",
      members.map((m) => m.user_id)
    );

  const tokensByUser = new Map<string, string[]>();
  for (const row of tokenRows ?? []) {
    const tokens = tokensByUser.get(row.user_id) ?? [];
    tokens.push(row.token);
    tokensByUser.set(row.user_id, tokens);
  }

  const recipients: PushRecipient[] = [];
  for (const member of members) {
    const tokens = tokensByUser.get(member.user_id) ?? [];
    if (tokens.length === 0) continue;
    recipients.push({
      tokens,
      prefs: {
        notify_medication_due: member.notify_medication_due,
        notify_walk_due: member.notify_walk_due,
        notify_food_due: member.notify_food_due,
        notify_water_due: member.notify_water_due,
      },
    });
  }
  return recipients;
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
    const graceMs = (pet.due_grace_minutes ?? 10) * 60_000;
    const issues: Issue[] = [];

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
        if (now.getTime() - scheduledAt.getTime() <= graceMs) continue;

        const given = (dosesToday ?? []).some(
          (d) => d.medication_id === med.id && new Date(d.scheduled_at).getTime() === scheduledAt.getTime()
        );
        if (given) continue;

        const refKey = `${med.id}:${scheduledAt.toISOString()}`;
        if (await alreadyNotifiedToday(pet.id, "medication_overdue", refKey)) continue;

        issues.push({
          kind: "medication_overdue",
          message: `${med.name} (${med.dosage} ${med.unit}) was due at ${scheduledAt.toLocaleTimeString("en-US", {
            timeZone,
            hour: "numeric",
            minute: "2-digit",
          })} and hasn't been logged as given or skipped.`,
        });
        await recordNotified(pet.id, "medication_overdue", refKey);
      }
    }

    const { data: habitSchedules } = await supabase.from("habit_schedules").select("*").eq("pet_id", pet.id);

    if (habitSchedules && habitSchedules.length > 0) {
      const { data: habitLogsToday } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("pet_id", pet.id)
        .in("type", ["walk", "food", "water"])
        .gte("occurred_at", dayStart.toISOString());

      const HABIT_ISSUE_KIND: Record<string, IssueKind> = {
        walk: "walk_overdue",
        food: "food_overdue",
        water: "water_overdue",
      };
      const HABIT_LABEL: Record<string, string> = { walk: "walk", food: "meal", water: "water refill" };

      for (const habitSchedule of habitSchedules) {
        const kind = HABIT_ISSUE_KIND[habitSchedule.type];
        const label = HABIT_LABEL[habitSchedule.type];
        if (!kind || !label) continue;

        for (const scheduledAt of computeDueTimesForDay(habitSchedule.schedule, dayStart, timeZone)) {
          if (now.getTime() - scheduledAt.getTime() <= graceMs) continue;

          // Walks/food aren't discrete slots like medication doses — any log
          // of that type from the grace window before this due time onward
          // counts as satisfying it (not just at-or-after — a caregiver who
          // logs a little early shouldn't have that ignored and then see an
          // overdue reminder anyway; mirrors habit-due-status.ts on the app
          // side, which this must stay in sync with).
          const logged = (habitLogsToday ?? []).some(
            (log) =>
              log.type === habitSchedule.type && new Date(log.occurred_at).getTime() >= scheduledAt.getTime() - graceMs
          );
          if (logged) continue;

          const refKey = `${habitSchedule.type}:${scheduledAt.toISOString()}`;
          if (await alreadyNotifiedToday(pet.id, kind, refKey)) continue;

          issues.push({
            kind,
            message: `A ${label} was due at ${scheduledAt.toLocaleTimeString("en-US", {
              timeZone,
              hour: "numeric",
              minute: "2-digit",
            })} and hasn't been logged.`,
          });
          await recordNotified(pet.id, kind, refKey);
        }
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

      issues.push({
        kind: "refill_low",
        message: `${refill.medications?.name ?? med.name} is running low — about ${Math.max(0, Math.round(daysRemaining))} day(s) of supply left.`,
      });
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
          issues.push({ kind: "qol_overdue", message: "A Quality of Life check-in is overdue." });
          await recordNotified(pet.id, "qol_overdue", "qol");
        }
      }
    }

    if (issues.length === 0) continue;

    const [emails, pushRecipients] = await Promise.all([getRecipientEmails(pet.id), getPushRecipients(pet.id)]);

    if (emails.length > 0) {
      const html = `
        <h2>GeriPaws reminder for ${pet.name}</h2>
        <ul>${issues.map((issue) => `<li>${issue.message}</li>`).join("")}</ul>
        <p>Open GeriPaws to take care of these.</p>
      `;
      await sendEmail(emails, `GeriPaws reminder: ${pet.name}`, html);
      emailsSent++;
    }

    for (const recipient of pushRecipients) {
      const filtered = filterIssuesForRecipient(issues, recipient.prefs);
      if (filtered.length === 0) continue;

      const summary = filtered.length === 1 ? filtered[0].message : `${filtered.length} things need attention.`;
      await sendPush(recipient.tokens, `GeriPaws reminder: ${pet.name}`, summary);
      pushSent++;
    }
  }

  return new Response(JSON.stringify({ petsChecked: pets.length, emailsSent, pushSent }), {
    headers: { "Content-Type": "application/json" },
  });
});
