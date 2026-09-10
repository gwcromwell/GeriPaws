import type {
  Ailment,
  AilmentNote,
  AnswerVetQuestionInput,
  CreateAilmentInput,
  CreateAilmentNoteInput,
  CreateVetQuestionInput,
  UpdateAilmentInput,
  VetQuestion,
} from '@geripaws/shared';

import { deleteAttachmentsFor } from './attachments';
import { supabase } from './supabase';

export async function fetchAilments(petId: string): Promise<Ailment[]> {
  const { data, error } = await supabase
    .from('ailments')
    .select('*')
    .eq('pet_id', petId)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Ailment[];
}

export async function fetchAilment(id: string): Promise<Ailment> {
  const { data, error } = await supabase.from('ailments').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Ailment;
}

export async function createAilment(input: CreateAilmentInput): Promise<Ailment> {
  const { data, error } = await supabase
    .from('ailments')
    .insert({
      pet_id: input.petId,
      name: input.name,
      diagnosed_at: input.diagnosedAt ?? null,
      diagnosing_vet: input.diagnosingVet ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Ailment;
}

export async function updateAilment(id: string, input: UpdateAilmentInput): Promise<Ailment> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.status !== undefined) patch.status = input.status;
  if (input.diagnosedAt !== undefined) patch.diagnosed_at = input.diagnosedAt;
  if (input.diagnosingVet !== undefined) patch.diagnosing_vet = input.diagnosingVet;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabase.from('ailments').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Ailment;
}

export async function deleteAilment(id: string): Promise<void> {
  await deleteAttachmentsFor('ailment', id);
  const { error } = await supabase.from('ailments').delete().eq('id', id);
  if (error) throw error;
}

export type AilmentNoteWithAilment = AilmentNote & { ailment: { name: string } };

export async function fetchAllAilmentNotesForPet(petId: string, limit = 50): Promise<AilmentNoteWithAilment[]> {
  const { data, error } = await supabase
    .from('ailment_notes')
    .select('*, ailments(name)')
    .eq('pet_id', petId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { ailments, ...note } = row as AilmentNote & { ailments: { name: string } };
    return { ...note, ailment: ailments };
  });
}

export async function fetchAilmentNotes(ailmentId: string): Promise<AilmentNote[]> {
  const { data, error } = await supabase
    .from('ailment_notes')
    .select('*')
    .eq('ailment_id', ailmentId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AilmentNote[];
}

export async function createAilmentNote(petId: string, input: CreateAilmentNoteInput): Promise<AilmentNote> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const { data, error } = await supabase
    .from('ailment_notes')
    .insert({
      pet_id: petId,
      ailment_id: input.ailmentId,
      occurred_at: input.occurredAt,
      note: input.note,
      created_by: userData.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AilmentNote;
}

export async function fetchVetQuestions(ailmentId: string): Promise<VetQuestion[]> {
  const { data, error } = await supabase
    .from('vet_questions')
    .select('*')
    .eq('ailment_id', ailmentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VetQuestion[];
}

export async function createVetQuestion(petId: string, input: CreateVetQuestionInput): Promise<VetQuestion> {
  const { data, error } = await supabase
    .from('vet_questions')
    .insert({ pet_id: petId, ailment_id: input.ailmentId, question: input.question })
    .select()
    .single();
  if (error) throw error;
  return data as VetQuestion;
}

export async function markVetQuestionAsked(id: string): Promise<VetQuestion> {
  const { data, error } = await supabase
    .from('vet_questions')
    .update({ asked_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as VetQuestion;
}

export async function answerVetQuestion(id: string, input: AnswerVetQuestionInput): Promise<VetQuestion> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('vet_questions')
    .update({ status: 'answered', answer: input.answer, answered_at: now })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as VetQuestion;
}

export async function deleteVetQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('vet_questions').delete().eq('id', id);
  if (error) throw error;
}
