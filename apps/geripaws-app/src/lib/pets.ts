import type { Database, MemberPreferencesInput, Pet, PetInvite, PetMember, PetRole, UpdatePetInput } from "@geripaws/shared";

import { supabase } from "./supabase";

export type PetWithRole = Pet & { role: PetRole };

type PetUpdate = Database["public"]["Tables"]["pets"]["Update"];
type PetMemberUpdate = Database["public"]["Tables"]["pet_members"]["Update"];

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
  neutered?: boolean;
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
      neutered: input.neutered ?? null,
      weight_unit: input.weightUnit,
      day_boundary_hour: input.dayBoundaryHour,
      // Medication schedule times ("08:00") are only meaningful relative to a
      // timezone — capture the creating device's zone so both the app and any
      // server-side job interpret them the same way, regardless of where they run.
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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

export async function updatePet(petId: string, input: UpdatePetInput): Promise<Pet> {
  const patch: PetUpdate = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.breed !== undefined) patch.breed = input.breed;
  if (input.dob !== undefined) patch.dob = input.dob;
  if (input.sex !== undefined) patch.sex = input.sex;
  if (input.neutered !== undefined) patch.neutered = input.neutered;
  if (input.photoUrl !== undefined) patch.photo_url = input.photoUrl;
  if (input.weightUnit !== undefined) patch.weight_unit = input.weightUnit;
  if (input.microchipNumber !== undefined) patch.microchip_number = input.microchipNumber;
  if (input.vetName !== undefined) patch.vet_name = input.vetName;
  if (input.vetPhone !== undefined) patch.vet_phone = input.vetPhone;
  if (input.allergies !== undefined) patch.allergies = input.allergies;
  if (input.insuranceProvider !== undefined) patch.insurance_provider = input.insuranceProvider;
  if (input.insurancePolicyNumber !== undefined) patch.insurance_policy_number = input.insurancePolicyNumber;

  const { data, error } = await supabase.from("pets").update(patch).eq("id", petId).select().single();
  if (error) throw error;
  return data as Pet;
}

/** Uploads a locally-picked photo (a file:// URI on native, a blob: URI on web) to the
 * `pet-photos` bucket and returns its public URL. Does not update the pet record itself —
 * callers should follow up with `updatePet(petId, { photoUrl })`. */
export async function uploadPetPhoto(petId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const extMatch = /\.(\w+)(\?.*)?$/.exec(localUri);
  const ext = extMatch?.[1]?.toLowerCase() ?? "jpg";
  const path = `${petId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("pet-photos")
    .upload(path, arrayBuffer, { contentType: response.headers.get("content-type") ?? `image/${ext}`, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
  return data.publicUrl;
}

/** `auth.getUser()` is a real network round trip (it re-verifies the JWT
 * server-side), not a local read — callers that already know the current
 * user id (e.g. a screen that fetched it once for several purposes) can pass
 * it directly to skip the extra round trip. */
export async function fetchMyRole(petId: string, userId?: string): Promise<PetRole | null> {
  let uid = userId;
  if (!uid) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("Not signed in");
    uid = userData.user.id;
  }

  const { data, error } = await supabase
    .from("pet_members")
    .select("role")
    .eq("pet_id", petId)
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as PetRole | undefined) ?? null;
}

/** The signed-in caregiver's own pet_members row — role plus their personal
 * display preferences. See fetchMyRole for the optional userId param. */
export async function fetchMyPreferences(petId: string, userId?: string): Promise<PetMember | null> {
  let uid = userId;
  if (!uid) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw userError ?? new Error("Not signed in");
    uid = userData.user.id;
  }

  const { data, error } = await supabase
    .from("pet_members")
    .select("*")
    .eq("pet_id", petId)
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as PetMember | null) ?? null;
}

export async function updateMyPreferences(petId: string, input: MemberPreferencesInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in");

  const patch: PetMemberUpdate = {};
  if (input.showWalkTile !== undefined) patch.show_walk_tile = input.showWalkTile;
  if (input.showWaterTile !== undefined) patch.show_water_tile = input.showWaterTile;
  if (input.showFoodTile !== undefined) patch.show_food_tile = input.showFoodTile;
  if (input.showWeightTile !== undefined) patch.show_weight_tile = input.showWeightTile;
  if (input.hideGivenDoses !== undefined) patch.hide_given_doses = input.hideGivenDoses;

  const { error } = await supabase
    .from("pet_members")
    .update(patch)
    .eq("pet_id", petId)
    .eq("user_id", userData.user.id);
  if (error) throw error;
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

/** Creates the invite row, then asks the send-pet-invite Edge Function to email it.
 * The row is created either way — `emailSent: false` means the invite exists and can
 * still be accepted, but the caller should offer the invitee its link some other way. */
export async function inviteMember(
  petId: string,
  email: string,
  role: Exclude<PetRole, "owner">
): Promise<{ invite: PetInvite; emailSent: boolean }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not signed in");

  const { data, error } = await supabase
    .from("pet_invites")
    .insert({
      pet_id: petId,
      email,
      role,
      invited_by: userData.user.id,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: sendError } = await supabase.functions.invoke("send-pet-invite", {
    body: { inviteId: data.id },
  });

  return { invite: data as PetInvite, emailSent: !sendError };
}

/** The link an invitee needs to accept a pending invite — usable as a manual
 * fallback (e.g. texting it) if the invite email didn't arrive. Deployed web
 * lives under a /GeriPaws subpath (GitHub Pages project site), so only a
 * localhost dev server can safely use its own origin as-is. */
export function buildInviteUrl(token: string): string {
  if (typeof window !== "undefined" && window.location?.hostname === "localhost") {
    return `${window.location.origin}/accept-invite?token=${token}`;
  }
  return `https://gwcromwell.github.io/GeriPaws/accept-invite?token=${token}`;
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
