import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import type { TestAccount } from './accounts';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY must be set (see apps/geripaws-app/.env.example) to run e2e tests — they talk to the same live project as `pnpm web`.'
  );
}

/** A plain Node Supabase client, separate from the browser session the
 * Playwright page drives — used only to seed fixture state via RPCs that
 * don't have (or don't need) a UI path, e.g. accepting an invite directly
 * while the accept-invite *screen* is what's actually under test elsewhere. */
export function createTestSupabaseClient() {
  return createClient(url!, anonKey!, { auth: { persistSession: false } });
}

/** Accepts a pending invite via the accept_pet_invite RPC directly, bypassing
 * the accept-invite screen entirely. Used to seed a second caregiver on a
 * pet for tests (e.g. "remove caregiver") that don't depend on the new
 * preview_pet_invite-backed confirmation UI — see accept-invite.spec.ts's
 * header comment for why the UI path itself can't be used for this yet. */
export async function acceptInviteViaRpc(account: TestAccount, token: string): Promise<void> {
  const client = createTestSupabaseClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (signInError) throw signInError;

  const { error } = await client.rpc('accept_pet_invite', { invite_token: token });
  if (error) throw error;
}
