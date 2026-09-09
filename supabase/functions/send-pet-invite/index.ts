// GeriPaws — send-pet-invite Edge Function
//
// Called by the client (see inviteMember() in apps/geripaws-app/src/lib/pets.ts)
// right after a pet_invites row is created. Emails the invitee a link to accept
// the invite, via Resend — same provider/sender as send-reminders.
//
// Unlike get-shared-pet, this function DOES verify the caller's JWT (it's the
// default) — it's only ever called by an already-signed-in owner inviting
// someone else, and it double-checks that the invite actually belongs to the
// calling user before sending anything.
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

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing Authorization header", { status: 401 });

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return new Response("Not signed in", { status: 401 });

  let inviteId: string | undefined;
  try {
    ({ inviteId } = await req.json());
  } catch {
    // fall through to the missing-inviteId check below
  }
  if (!inviteId) return new Response("Missing inviteId", { status: 400 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: invite, error: inviteError } = await admin
    .from("pet_invites")
    .select("*, pets(name)")
    .eq("id", inviteId)
    .single();
  if (inviteError || !invite) return new Response("Invite not found", { status: 404 });
  if (invite.invited_by !== userData.user.id) return new Response("Forbidden", { status: 403 });

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
    return new Response(`Resend error: ${text}`, { status: 502 });
  }

  return new Response(JSON.stringify({ sent: true }), { headers: { "Content-Type": "application/json" } });
});
