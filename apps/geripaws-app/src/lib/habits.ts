import type { HabitLog, HabitLogInput, HabitType } from '@geripaws/shared';

import { deleteAttachmentsFor } from './attachments';
import { supabase } from './supabase';

const TILE_TYPES: HabitType[] = ['walk', 'water', 'food', 'weight'];

/** One query instead of one-per-type: fetch a recent window of logs across all
 * tile types (ordered newest-first) and take the first occurrence of each
 * type client-side. 200 rows comfortably covers "the latest of 4 types" even
 * for a heavily-logged dog — this was previously 4 separate round trips. */
export async function fetchLatestByType(petId: string): Promise<Record<HabitType, HabitLog | null>> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('pet_id', petId)
    .in('type', TILE_TYPES)
    .order('occurred_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const latest: Record<HabitType, HabitLog | null> = {
    walk: null,
    water: null,
    food: null,
    incident: null,
    weight: null,
  };

  for (const log of (data ?? []) as HabitLog[]) {
    if (latest[log.type] === null) latest[log.type] = log;
  }

  return latest;
}

export async function fetchHabitLogs(petId: string, limit = 50, type?: HabitType): Promise<HabitLog[]> {
  let query = supabase.from('habit_logs').select('*').eq('pet_id', petId);
  if (type) query = query.eq('type', type);
  const { data, error } = await query.order('occurred_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as HabitLog[];
}

export async function fetchHabitLog(id: string): Promise<HabitLog> {
  const { data, error } = await supabase.from('habit_logs').select('*').eq('id', id).single();
  if (error) throw error;
  return data as HabitLog;
}

export async function createHabitLog(input: HabitLogInput): Promise<HabitLog> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const { data, error } = await supabase
    .from('habit_logs')
    .insert({
      pet_id: input.petId,
      type: input.type,
      occurred_at: input.occurredAt,
      logged_by: userData.user.id,
      details: input.details,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HabitLog;
}

export async function updateHabitLog(id: string, input: Pick<HabitLogInput, 'occurredAt' | 'details'>): Promise<HabitLog> {
  const { data, error } = await supabase
    .from('habit_logs')
    .update({ occurred_at: input.occurredAt, details: input.details })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as HabitLog;
}

export async function deleteHabitLog(id: string): Promise<void> {
  await deleteAttachmentsFor('habit_log', id);
  const { error } = await supabase.from('habit_logs').delete().eq('id', id);
  if (error) throw error;
}
