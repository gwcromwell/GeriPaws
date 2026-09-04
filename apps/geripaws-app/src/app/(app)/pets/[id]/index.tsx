import type { Pet, PetInvite, PetMember, PetRole } from '@geripaws/shared';
import { createInviteSchema } from '@geripaws/shared';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import {
  fetchPendingInvites,
  fetchPet,
  fetchPetMembers,
  inviteMember,
  removeMember,
  revokeInvite,
} from '@/lib/pets';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [members, setMembers] = useState<PetMember[]>([]);
  const [invites, setInvites] = useState<PetInvite[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<PetRole, 'owner'>>('caregiver');
  const [isInviting, setIsInviting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [petData, memberData, { data: userData }] = await Promise.all([
        fetchPet(id),
        fetchPetMembers(id),
        supabase.auth.getUser(),
      ]);
      setPet(petData);
      setMembers(memberData);
      setMyUserId(userData.user?.id ?? null);

      const myRole = memberData.find((m) => m.user_id === userData.user?.id)?.role;
      if (myRole === 'owner') {
        setInvites(await fetchPendingInvites(id));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dog');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const myRole = members.find((m) => m.user_id === myUserId)?.role;
  const isOwner = myRole === 'owner';

  async function handleInvite() {
    const result = createInviteSchema.safeParse({ petId: id, email: inviteEmail, role: inviteRole });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid invite');
      return;
    }
    setIsInviting(true);
    try {
      await inviteMember(result.data.petId, result.data.email, result.data.role);
      setInviteEmail('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  }

  if (!pet) {
    return (
      <ThemedView style={styles.container}>
        {error ? <ThemedText themeColor="error">{error}</ThemedText> : <ThemedText>Loading…</ThemedText>}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {pet.name}
      </ThemedText>
      {pet.breed ? <ThemedText themeColor="textSecondary">{pet.breed}</ThemedText> : null}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Caregivers
      </ThemedText>
      {members.map((m) => (
        <ThemedView key={m.user_id} style={styles.row}>
          <ThemedText>{m.user_id === myUserId ? 'You' : m.user_id}</ThemedText>
          <ThemedText themeColor="textSecondary">{m.role}</ThemedText>
          {isOwner && m.role !== 'owner' ? (
            <Pressable onPress={() => removeMember(pet.id, m.user_id).then(load)}>
              <ThemedText themeColor="error" type="small">
                Remove
              </ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      ))}

      {isOwner ? (
        <>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Invite someone
          </ThemedText>
          <ThemedTextInput
            label="Email address"
            helperText="They'll get an invite to join as a caregiver or viewer"
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={inviteEmail}
            onChangeText={setInviteEmail}
          />
          <ThemedText type="smallBold">Role</ThemedText>
          <ThemedView style={styles.roleRow}>
            {(['caregiver', 'viewer'] as const).map((role) => (
              <Pressable key={role} onPress={() => setInviteRole(role)} style={styles.roleOption}>
                <ThemedText themeColor={inviteRole === role ? 'tint' : 'textSecondary'}>
                  {inviteRole === role ? '● ' : '○ '}
                  {role}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            Caregiver can log habits and manage medications. Viewer can only see the dog's information.
          </ThemedText>
          <Pressable style={styles.button} onPress={handleInvite} disabled={isInviting}>
            <ThemedText themeColor="background" type="smallBold">
              {isInviting ? 'Sending…' : 'Send invite'}
            </ThemedText>
          </Pressable>

          {invites.length > 0 ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Pending invites
              </ThemedText>
              {invites.map((invite) => (
                <ThemedView key={invite.id} style={styles.row}>
                  <ThemedText>{invite.email}</ThemedText>
                  <ThemedText themeColor="textSecondary">{invite.role}</ThemedText>
                  <Pressable onPress={() => revokeInvite(invite.id).then(load)}>
                    <ThemedText themeColor="error" type="small">
                      Revoke
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 28 },
  sectionTitle: { marginTop: 20, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  roleRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  roleOption: { paddingVertical: 4 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  message: { textAlign: 'center', marginTop: 12 },
});
