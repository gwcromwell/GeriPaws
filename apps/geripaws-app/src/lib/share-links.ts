import { supabase } from './supabase';

export interface PetShareLink {
  id: string;
  pet_id: string;
  token: string;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  revoked: boolean;
}

export async function fetchShareLinks(petId: string): Promise<PetShareLink[]> {
  const { data, error } = await supabase
    .from('pet_share_links')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PetShareLink[];
}

export async function createShareLink(petId: string, expiresInDays = 30): Promise<PetShareLink> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not signed in');

  const { data, error } = await supabase
    .from('pet_share_links')
    .insert({
      pet_id: petId,
      created_by: userData.user.id,
      expires_at: new Date(Date.now() + expiresInDays * 86_400_000).toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as PetShareLink;
}

export async function revokeShareLink(id: string): Promise<void> {
  const { error } = await supabase.from('pet_share_links').update({ revoked: true }).eq('id', id);
  if (error) throw error;
}
