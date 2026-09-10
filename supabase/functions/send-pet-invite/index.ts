// GeriPaws — send-pet-invite Edge Function
//
// Called by the client (see inviteMember() in apps/geripaws-app/src/lib/pets.ts)
// right after a pet_invites row is created. Emails the invitee a link to accept
// the invite, via Resend — same provider/sender as send-reminders.
//
// This function checks the caller's session itself (see handleRequest below)
// — it's only ever called by an already-signed-in owner inviting someone
// else, and it double-checks that the invite actually belongs to the calling
// user before sending anything.
//
// MUST still be deployed with --no-verify-jwt, despite doing its own auth
// check: `npx supabase functions deploy send-pet-invite --no-verify-jwt`.
// Without that flag, the Supabase gateway's own (separate) JWT check runs on
// every request INCLUDING the browser's CORS preflight OPTIONS, which never
// carries an Authorization header — so the gateway 401s before this file's
// OPTIONS handling below ever runs, and every web invite fails with "the
// email couldn't be sent" no matter what this code does. See README.md.
//
// Required secret: RESEND_API_KEY (same one send-reminders uses). SUPABASE_URL,
// SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = "GeriPaws <reminders@obi1.nyc>";
const APP_URL = "https://gwcromwell.github.io/GeriPaws";

const ROLE_LABEL: Record<string, string> = {
  caregiver: "a caregiver — they can log habits and manage medications",
  viewer: "a viewer — they can see the dog's information",
};

// The web build calls this from the browser (apps/geripaws-app/src/lib/pets.ts,
// inviteMember()). A cross-origin POST with a JSON body and an Authorization
// header isn't a CORS "simple request", so the browser sends an OPTIONS
// preflight first — without a response to that (and these headers on every
// response), the preflight fails and the browser never even sends the real
// request. That's exactly what "the email quickly failed" looked like: this
// function was never reached at all, on web.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Exported (rather than an inline Deno.serve callback) so index.test.ts can
// call it directly — specifically to guard the CORS regression above without
// needing a live Supabase/Resend round trip.
export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing Authorization header", { status: 401, headers: CORS_HEADERS });

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return new Response("Not signed in", { status: 401, headers: CORS_HEADERS });

  let inviteId: string | undefined;
  try {
    ({ inviteId } = await req.json());
  } catch {
    // fall through to the missing-inviteId check below
  }
  if (!inviteId) return new Response("Missing inviteId", { status: 400, headers: CORS_HEADERS });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: invite, error: inviteError } = await admin
    .from("pet_invites")
    .select("*, pets(name)")
    .eq("id", inviteId)
    .single();
  if (inviteError || !invite) return new Response("Invite not found", { status: 404, headers: CORS_HEADERS });
  if (invite.invited_by !== userData.user.id) return new Response("Forbidden", { status: 403, headers: CORS_HEADERS });

  const acceptUrl = `${APP_URL}/accept-invite?token=${invite.token}`;
  const petName = invite.pets?.name ?? "a dog";
  const roleDescription = ROLE_LABEL[invite.role] ?? invite.role;

  const html = `
    <h2>You've been invited to help care for ${petName} on GeriPaws</h2>
    <p>You've been invited as ${roleDescription}.</p>
    <p><a href="${acceptUrl}">Accept the invite</a> to get started — this link expires in 14 days.</p>
    <p style="color:#888;font-size:13px;">If the link doesn't work, copy and paste this into your browser:<br>${acceptUrl}</p>
  `;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [invite.email],
      subject: `You've been invited to GeriPaws for ${petName}`,
      html,
    }),
  });

  if (!resendResponse.ok) {
    const text = await resendResponse.text();
    return new Response(`Resend error: ${text}`, { status: 502, headers: CORS_HEADERS });
  }

  return new Response(JSON.stringify({ sent: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Guarded so importing this module for tests doesn't try to bind a listener
// (which needs --allow-net and would otherwise start a real server per test run).
if (import.meta.main) {
  Deno.serve(handleRequest);
}
