import type { Pet, PetInvite, PetMember, PetRole } from '@geripaws/shared';
import { createInviteSchema } from '@geripaws/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useScreenLoad } from '@/hooks/use-screen-load';
import { confirmDestructive } from '@/lib/confirm';
import { displayNameFor, fetchProfilesForPet, type ProfileMap } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import {
  buildInviteUrl,
  fetchPendingInvites,
  fetchPet,
  fetchPetMembers,
  inviteMember,
  leavePet,
  removeMember,
  revokeInvite,
} from '@/lib/pets';

export default function SharingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [members, setMembers] = useState<PetMember[]>([]);
  const [invites, setInvites] = useState<PetInvite[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Exclude<PetRole, 'owner'>>('caregiver');
  const [isInviting, setIsInviting] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const loadSharing = useCallback(async () => {
    if (!id) return;
    const [petData, memberData, profileData, { data: userData }] = await Promise.all([
      fetchPet(id),
      fetchPetMembers(id),
      fetchProfilesForPet(id).catch(() => ({})),
      supabase.auth.getUser(),
    ]);
    setPet(petData);
    setMembers(memberData);
    setProfiles(profileData);
    setMyUserId(userData.user?.id ?? null);

    const myRole = memberData.find((m) => m.user_id === userData.user?.id)?.role;
    if (myRole === 'owner') {
      setInvites(await fetchPendingInvites(id));
    }
  }, [id]);

  const { error, setError, reload: load } = useScreenLoad(loadSharing, 'Failed to load dog');

  const myRole = members.find((m) => m.user_id === myUserId)?.role;
  const isOwner = myRole === 'owner';

  function handleLeave() {
    const message =
      isOwner && members.length > 1
        ? "You're this dog's owner — leaving hands ownership to whichever caregiver has been on it longest. Their access and its history won't be affected."
        : "You'll lose access to this dog. Its data and history stay intact for its other caregivers.";
    confirmDestructive(`Leave ${pet?.name ?? 'this dog'}?`, message, handleLeaveConfirmed, 'Leave');
  }

  async function handleLeaveConfirmed() {
    setIsLeaving(true);
    try {
      await leavePet(id);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave');
      setIsLeaving(false);
    }
  }

  async function handleInvite() {
    const result = createInviteSchema.safeParse({ petId: id, email: inviteEmail, role: inviteRole });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid invite');
      return;
    }
    setIsInviting(true);
    setError(null);
    setInfo(null);
    try {
      const { emailSent } = await inviteMember(result.data.petId, result.data.email, result.data.role);
      setInviteEmail('');
      await load();
      if (emailSent) {
        setInfo(`Invite sent to ${result.data.email}.`);
      } else {
        setError("Invite created, but the email couldn't be sent — copy its link below and share it directly.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  }

  async function handleCopyInviteLink(invite: PetInvite) {
    const url = buildInviteUrl(invite.token);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedInviteId(invite.id);
      setTimeout(() => setCopiedInviteId((current) => (current === invite.id ? null : current)), 2000);
    } else {
      await Share.share({ message: url });
    }
  }

  if (!pet) {
    return (
      <ThemedView style={styles.flex}>
        <ThemedView style={styles.container}>
          {error ? <ThemedText themeColor="error">{error}</ThemedText> : <ThemedText>Loading…</ThemedText>}
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {pet.name}
      </ThemedText>
      {pet.breed ? <ThemedText themeColor="textSecondary">{pet.breed}</ThemedText> : null}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Caregivers
      </ThemedText>
      {members.map((m) => {
        const name = displayNameFor(profiles, m.user_id, myUserId);
        return (
          <ThemedView key={m.user_id} style={styles.row}>
            <ThemedText>{name}</ThemedText>
            <ThemedText themeColor="textSecondary">{m.role}</ThemedText>
            {isOwner && m.role !== 'owner' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name} as a caregiver`}
                onPress={() =>
                  confirmDestructive(
                    `Remove ${name}?`,
                    `${name} will lose access to ${pet.name}. They can be invited again later.`,
                    () => removeMember(pet.id, m.user_id).then(load),
                    'Remove'
                  )
                }>
                <ThemedText themeColor="error" type="small">
                  Remove
                </ThemedText>
              </Pressable>
            ) : null}
            {m.user_id === myUserId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Leave ${pet.name}`}
                disabled={isLeaving}
                onPress={handleLeave}
                hitSlop={8}>
                <ThemedText themeColor="error" type="small">
                  {isLeaving ? 'Leaving…' : 'Leave'}
                </ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>
        );
      })}

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
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: inviteRole === role }}
                key={role}
                onPress={() => setInviteRole(role)}
                hitSlop={8}
                style={styles.roleOption}>
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
          <Button label={isInviting ? 'Sending…' : 'Send invite'} onPress={handleInvite} disabled={isInviting} style={styles.button} />

          {invites.length > 0 ? (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Pending invites
              </ThemedText>
              {invites.map((invite) => (
                <ThemedView key={invite.id} style={styles.row}>
                  <ThemedText>{invite.email}</ThemedText>
                  <ThemedText themeColor="textSecondary">{invite.role}</ThemedText>
                  <ThemedView style={styles.inviteActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Copy invite link for ${invite.email}`}
                      onPress={() => handleCopyInviteLink(invite)}
                      hitSlop={12}>
                      <ThemedText style={{ color: theme.tint }} type="small">
                        {copiedInviteId === invite.id ? 'Copied!' : 'Copy link'}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Revoke invite for ${invite.email}`}
                      onPress={() =>
                        confirmDestructive(
                          'Revoke invite?',
                          `The invite link sent to ${invite.email} will stop working.`,
                          () => revokeInvite(invite.id).then(load),
                          'Revoke'
                        )
                      }
                      hitSlop={12}>
                      <ThemedText themeColor="error" type="small">
                        Revoke
                      </ThemedText>
                    </Pressable>
                  </ThemedView>
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
      {info ? (
        <ThemedText themeColor="textSecondary" style={styles.message}>
          {info}
        </ThemedText>
      ) : null}
    </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // No flex: 1 here — this is a ScrollView's contentContainerStyle, and
  // flex: 1 on that fights content-based sizing and can silently break
  // scrolling instead of just filling available space the way it does on a
  // plain View.
  container: { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', padding: 16, gap: 8 },
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
  inviteActions: { flexDirection: 'row', gap: 16 },
  roleRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  roleOption: { paddingVertical: 4 },
  button: { marginTop: 12 },
  message: { textAlign: 'center', marginTop: 12 },
});
