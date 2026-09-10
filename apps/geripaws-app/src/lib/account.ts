import { deleteAllAttachmentStorageForPet } from './attachments';
import { supabase } from './supabase';

export interface AccountDeletionImpact {
  /** Pets only this account can see — deleting the account destroys these
   * entirely, including every photo, medication, and history entry. */
  toDelete: { id: string; name: string }[];
  /** Pets this account owns but that other caregivers also use — ownership
   * transfers automatically to another caregiver; nothing is destroyed. */
  toTransfer: { id: string; name: string }[];
}

/** Figures out exactly what deleting the signed-in account would do, so the
 * confirmation screen can say so plainly instead of a generic "are you
 * sure?" — this is a destructive, irreversible action. */
export async function fetchAccountDeletionImpact(): Promise<AccountDeletionImpact> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');
  const myId = userData.user.id;

  const { data: owned, error: ownedError } = await supabase
    .from('pet_members')
    .select('pet_id, pets(name)')
    .eq('user_id', myId)
    .eq('role', 'owner');
  if (ownedError) throw ownedError;

  // Supabase's client infers a to-one embed (pet_members.pet_id -> pets) as an
  // array purely from the select() string, without schema codegen to know the
  // real cardinality — PostgREST actually returns a single object here, same
  // as the equivalent embed in fetchAllAilmentNotesForPet.
  const ownedPets = (owned ?? []) as unknown as { pet_id: string; pets: { name: string } | null }[];
  if (ownedPets.length === 0) return { toDelete: [], toTransfer: [] };

  const petIds = ownedPets.map((p) => p.pet_id);
  const { data: allMembers, error: membersError } = await supabase
    .from('pet_members')
    .select('pet_id')
    .in('pet_id', petIds);
  if (membersError) throw membersError;

  const memberCounts = new Map<string, number>();
  (allMembers ?? []).forEach((m) => memberCounts.set(m.pet_id, (memberCounts.get(m.pet_id) ?? 0) + 1));

  const impact: AccountDeletionImpact = { toDelete: [], toTransfer: [] };
  for (const pet of ownedPets) {
    const entry = { id: pet.pet_id, name: pet.pets?.name ?? 'Unnamed dog' };
    if ((memberCounts.get(pet.pet_id) ?? 1) <= 1) {
      impact.toDelete.push(entry);
    } else {
      impact.toTransfer.push(entry);
    }
  }
  return impact;
}

/** Permanently deletes the signed-in caregiver's account. Cleans up Storage
 * for every pet that's about to be destroyed first (a database cascade can't
 * reach into Storage — same reason deleteAttachmentsFor exists), then calls
 * delete_my_account(), which transfers or deletes owned pets as appropriate
 * and finally removes the auth user itself. Irreversible. */
export async function deleteMyAccount(impact: AccountDeletionImpact): Promise<void> {
  for (const pet of impact.toDelete) {
    await deleteAllAttachmentStorageForPet(pet.id);

    const { data: files, error: listError } = await supabase.storage.from('pet-photos').list(pet.id);
    if (listError) throw listError;
    if (files && files.length > 0) {
      const { error: removeError } = await supabase.storage.from('pet-photos').remove(files.map((f) => `${pet.id}/${f.name}`));
      if (removeError) throw removeError;
    }
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;

  await supabase.auth.signOut();
}
