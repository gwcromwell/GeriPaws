import type { HabitLog, HabitLogInput, HabitType } from '@geripaws/shared';

import { deleteAttachmentsFor } from './attachments';
import { supabase } from './supabase';

const TILE_TYPES: HabitType[] = ['walk', 'water', 'food', 'weight'];

export async function fetchLatestByType(petId: string): Promise<Record<HabitType, HabitLog | null>> {
  const results = await Promise.all(
    TILE_TYPES.map((type) =>
      supabase
        .from('habit_logs')
        .select('*')
        .eq('pet_id', petId)
        .eq('type', type)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
  );

  const latest: Record<HabitType, HabitLog | null> = {
    walk: null,
    water: null,
    food: null,
    incident: null,
    weight: null,
  };

  results.forEach((result, index) => {
    if (result.error) throw result.error;
    latest[TILE_TYPES[index]] = (result.data as HabitLog | null) ?? null;
  });

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
