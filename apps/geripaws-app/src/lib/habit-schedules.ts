import type { HabitSchedule, HabitScheduleRow, HabitScheduleType, Json } from '@geripaws/shared';

import { supabase } from './supabase';

export async function fetchHabitSchedules(petId: string): Promise<HabitScheduleRow[]> {
  const { data, error } = await supabase.from('habit_schedules').select('*').eq('pet_id', petId);
  if (error) throw error;
  return (data ?? []) as unknown as HabitScheduleRow[];
}

export async function upsertHabitSchedule(
  petId: string,
  type: HabitScheduleType,
  schedule: HabitSchedule
): Promise<HabitScheduleRow> {
  const { data, error } = await supabase
    .from('habit_schedules')
    .upsert(
      { pet_id: petId, type, schedule: schedule as unknown as Json, updated_at: new Date().toISOString() },
      { onConflict: 'pet_id,type' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as unknown as HabitScheduleRow;
}

export async function deleteHabitSchedule(petId: string, type: HabitScheduleType): Promise<void> {
  const { error } = await supabase.from('habit_schedules').delete().eq('pet_id', petId).eq('type', type);
  if (error) throw error;
}
