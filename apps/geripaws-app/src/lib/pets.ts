import type { Pet, PetInvite, PetMember, PetRole } from "@geripaws/shared";

import { supabase } from "./supabase";

export type PetWithRole = Pet & { role: PetRole };

export async function fetchMyPets(): Promise<PetWithRole[]> {
  const { data, error } = await supabase
    .from("pet_members")
    .select("role, pets(*)")
    .order("joined_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((row): row is typeof row & { pets: Pet } => row.pets !== null)
    .map((row) => ({ ...(row.pets as Pet), role: row.role as PetRole }));
}

export async function createPet(input: {
  name: string;
  breed?: string;
  dob?: string;
  sex?: string;
  weightUnit: "lb" | "kg";
  dayBoundaryHour: number;
}): Promise<Pet> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in");

  const { data, error } = await supabase
    .from("pets")
    .insert({
      name: input.name,
      breed: input.breed ?? null,
      dob: input.dob ?? null,
      sex: input.sex ?? null,
      weight_unit: input.weightUnit,
      day_boundary_hour: input.dayBoundaryHour,
      created_by: userData.user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Pet;
}

export async function fetchPet(petId: string): Promise<Pet> {
  const { data, error } = await supabase.from("pets").select("*").eq("id", petId).single();
  if (error) throw error;
  return data as Pet;
}

export async function fetchMyRole(petId: string): Promise<PetRole | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in");

  const { data, error } = await supabase
    .from("pet_members")
    .select("role")
    .eq("pet_id", petId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as PetRole | undefined) ?? null;
}

export async function fetchPetMembers(petId: string): Promise<PetMember[]> {
  const { data, error } = await supabase
    .from("pet_members")
    .select("*")
    .eq("pet_id", petId)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PetMember[];
}

export async function fetchPendingInvites(petId: string): Promise<PetInvite[]> {
  const { data, error } = await supabase
    .from("pet_invites")
    .select("*")
    .eq("pet_id", petId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PetInvite[];
}

export async function inviteMember(petId: string, email: string, role: Exclude<PetRole, "owner">) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in");

  const { error } = await supabase.from("pet_invites").insert({
    pet_id: petId,
    email,
    role,
    invited_by: userData.user.id,
  });
  if (error) throw error;
}

export async function revokeInvite(inviteId: string) {
  const { error } = await supabase.from("pet_invites").update({ status: "revoked" }).eq("id", inviteId);
  if (error) throw error;
}

export async function removeMember(petId: string, userId: string) {
  const { error } = await supabase.from("pet_members").delete().eq("pet_id", petId).eq("user_id", userId);
  if (error) throw error;
}

export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_pet_invite", { invite_token: token });
  if (error) throw error;
  return data as string;
}
