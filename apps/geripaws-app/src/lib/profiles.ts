import type { Profile } from '@geripaws/shared';

import { supabase } from './supabase';

export type ProfileMap = Record<string, Profile>;

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
