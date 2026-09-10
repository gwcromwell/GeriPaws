import type { CreateQolResponseInput, Json, QolResponse, QolScores, QolSettings, QolSettingsInput } from '@geripaws/shared';
import { computeQolTotal } from '@geripaws/shared';

import { supabase } from './supabase';

export async function fetchQolSettings(petId: string): Promise<QolSettings | null> {
  const { data, error } = await supabase.from('qol_settings').select('*').eq('pet_id', petId).maybeSingle();
  if (error) throw error;
  return (data as QolSettings | null) ?? null;
}

export async function upsertQolSettings(petId: string, input: QolSettingsInput): Promise<QolSettings> {
  const { data, error } = await supabase
    .from('qol_settings')
    .upsert({
      pet_id: petId,
      enabled: input.enabled,
      cadence: input.cadence,
      show_on_today: input.showOnToday,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as QolSettings;
}

export async function fetchQolResponses(petId: string, limit = 50): Promise<QolResponse[]> {
  const { data, error } = await supabase
    .from('qol_responses')
    .select('*')
    .eq('pet_id', petId)
    .order('survey_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as QolResponse[];
}

export async function fetchQolResponse(id: string): Promise<QolResponse> {
  const { data, error } = await supabase.from('qol_responses').select('*').eq('id', id).single();
  if (error) throw error;
  return data as unknown as QolResponse;
}

export async function createQolResponse(input: CreateQolResponseInput): Promise<QolResponse> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const now = new Date();
  const { data, error } = await supabase
    .from('qol_responses')
    .insert({
      pet_id: input.petId,
      survey_date: now.toISOString().slice(0, 10),
      occurred_at: now.toISOString(),
      answered_by: userData.user.id,
      scores: input.scores,
      total_score: computeQolTotal(input.scores),
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as QolResponse;
}

export async function updateQolResponse(id: string, scores: QolScores, notes?: string): Promise<QolResponse> {
  const { data, error } = await supabase
    .from('qol_responses')
    .update({ scores: scores as unknown as Json, total_score: computeQolTotal(scores), notes: notes ?? null })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as QolResponse;
}

export async function deleteQolResponse(id: string): Promise<void> {
  const { error } = await supabase.from('qol_responses').delete().eq('id', id);
  if (error) throw error;
}
