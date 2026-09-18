import type { Profile, UpdateProfileInput } from '@geripaws/shared';

import { supabase } from './supabase';

export type ProfileMap = Record<string, Profile>;

/** The signed-in caregiver's own profile row — used to show/edit the display
 * name shown to other caregivers instead of their email (see displayNameFor). */
export async function fetchMyProfile(): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateMyProfile(input: UpdateProfileInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const patch: { display_name?: string | null } = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName?.trim() || null;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userData.user.id);
  if (error) throw error;
}

/** Profiles for everyone who shares this pet — keyed by user id, for attributing an action to a name. */
export async function fetchProfilesForPet(petId: string): Promise<ProfileMap> {
  const { data: members, error: membersError } = await supabase.from('pet_members').select('user_id').eq('pet_id', petId);
  if (membersError) throw membersError;

  const ids = (members ?? []).map((m) => m.user_id as string);
  if (ids.length === 0) return {};

  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;

  const map: ProfileMap = {};
  for (const profile of (data ?? []) as Profile[]) map[profile.id] = profile;
  return map;
}

/** "You", a known caregiver's name, or a neutral fallback if their profile hasn't loaded/synced yet. */
export function displayNameFor(profiles: ProfileMap, userId: string | null | undefined, myUserId: string | null): string {
  if (!userId) return 'Someone';
  if (userId === myUserId) return 'You';
  const profile = profiles[userId];
  if (!profile) return 'A caregiver';
  return profile.display_name?.trim() || profile.email.split('@')[0];
}
