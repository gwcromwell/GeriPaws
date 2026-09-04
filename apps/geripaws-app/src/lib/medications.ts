import type {
  CreateMedicationInput,
  Medication,
  MedicationDose,
  MedicationRefill,
  RefillSetupInput,
  UpdateMedicationInput,
} from '@geripaws/shared';

import { supabase } from './supabase';

export async function fetchMedications(petId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Medication[];
}

export async function fetchMedication(id: string): Promise<Medication> {
  const { data, error } = await supabase.from('medications').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Medication;
}

export async function createMedication(input: CreateMedicationInput): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert({
      pet_id: input.petId,
      ailment_id: input.ailmentId ?? null,
      name: input.name,
      dosage: input.dosage,
      unit: input.unit,
      route: input.route ?? null,
      schedule: input.schedule,
      active_from: input.activeFrom ?? new Date().toISOString().slice(0, 10),
      active_until: input.activeUntil ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Medication;
}

export async function updateMedication(id: string, input: UpdateMedicationInput): Promise<Medication> {
  const patch: Record<string, unknown> = {};
  if (input.ailmentId !== undefined) patch.ailment_id = input.ailmentId;
  if (input.name !== undefined) patch.name = input.name;
  if (input.dosage !== undefined) patch.dosage = input.dosage;
  if (input.unit !== undefined) patch.unit = input.unit;
  if (input.route !== undefined) patch.route = input.route;
  if (input.schedule !== undefined) patch.schedule = input.schedule;
  if (input.activeFrom !== undefined) patch.active_from = input.activeFrom;
  if (input.activeUntil !== undefined) patch.active_until = input.activeUntil;

  const { data, error } = await supabase.from('medications').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as Medication;
}

export async function deleteMedication(id: string): Promise<void> {
  const { error } = await supabase.from('medications').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRefill(medicationId: string): Promise<MedicationRefill | null> {
  const { data, error } = await supabase
    .from('medication_refills')
    .select('*')
    .eq('medication_id', medicationId)
    .maybeSingle();
  if (error) throw error;
  return (data as MedicationRefill | null) ?? null;
}

export async function upsertRefill(medicationId: string, petId: string, input: RefillSetupInput): Promise<MedicationRefill> {
  const { data, error } = await supabase
    .from('medication_refills')
    .upsert({
      medication_id: medicationId,
      pet_id: petId,
      count_on_hand: input.countOnHand,
      unit_per_dose: input.unitPerDose,
      low_stock_threshold: input.lowStockThreshold,
      last_updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as MedicationRefill;
}

export async function deleteRefill(medicationId: string): Promise<void> {
  const { error } = await supabase.from('medication_refills').delete().eq('medication_id', medicationId);
  if (error) throw error;
}

export async function fetchDosesForMedication(medicationId: string, limit = 30): Promise<MedicationDose[]> {
  const { data, error } = await supabase
    .from('medication_doses')
    .select('*')
    .eq('medication_id', medicationId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MedicationDose[];
}

export async function fetchDosesSince(petId: string, since: Date): Promise<MedicationDose[]> {
  const { data, error } = await supabase
    .from('medication_doses')
    .select('*')
    .eq('pet_id', petId)
    .gte('scheduled_at', since.toISOString());
  if (error) throw error;
  return (data ?? []) as MedicationDose[];
}

export type MedicationDoseWithMedication = MedicationDose & {
  medication: Pick<Medication, 'name' | 'dosage' | 'unit'>;
};

export async function fetchAllDosesForPet(petId: string, limit = 50): Promise<MedicationDoseWithMedication[]> {
  const { data, error } = await supabase
    .from('medication_doses')
    .select('*, medications(name, dosage, unit)')
    .eq('pet_id', petId)
    .order('scheduled_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { medications, ...dose } = row as MedicationDose & {
      medications: Pick<Medication, 'name' | 'dosage' | 'unit'>;
    };
    return { ...dose, medication: medications };
  });
}

export async function deleteDose(id: string): Promise<void> {
  const { error } = await supabase.from('medication_doses').delete().eq('id', id);
  if (error) throw error;
}

async function decrementRefill(medicationId: string): Promise<void> {
  const refill = await fetchRefill(medicationId);
  if (!refill) return;
  await supabase
    .from('medication_refills')
    .update({
      count_on_hand: Math.max(0, refill.count_on_hand - refill.unit_per_dose),
      last_updated_at: new Date().toISOString(),
    })
    .eq('medication_id', medicationId);
}

export async function markDoseGiven(
  petId: string,
  medicationId: string,
  scheduledAt: Date,
  givenAt: Date = new Date(),
  notes?: string
): Promise<MedicationDose> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const { data, error } = await supabase
    .from('medication_doses')
    .insert({
      pet_id: petId,
      medication_id: medicationId,
      scheduled_at: scheduledAt.toISOString(),
      given_at: givenAt.toISOString(),
      given_by: userData.user.id,
      skipped: false,
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await decrementRefill(medicationId);
  return data as MedicationDose;
}

export async function markDoseSkipped(
  petId: string,
  medicationId: string,
  scheduledAt: Date,
  notes?: string
): Promise<MedicationDose> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const { data, error } = await supabase
    .from('medication_doses')
    .insert({
      pet_id: petId,
      medication_id: medicationId,
      scheduled_at: scheduledAt.toISOString(),
      given_at: null,
      given_by: userData.user.id,
      skipped: true,
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MedicationDose;
}
