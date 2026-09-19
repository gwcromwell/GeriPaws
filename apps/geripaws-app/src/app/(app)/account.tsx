import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useScreenLoad } from '@/hooks/use-screen-load';
import { useTheme } from '@/hooks/use-theme';
import { deleteMyAccount, fetchAccountDeletionImpact, type AccountDeletionImpact } from '@/lib/account';
import { useAuth } from '@/lib/auth-context';
import { confirmAction, confirmDestructive } from '@/lib/confirm';
import { fetchMyProfile, updateMyProfile } from '@/lib/profiles';
import { MaxContentWidth } from '@/constants/theme';

const CONFIRM_PHRASE = 'DELETE';

function joinNames(items: { name: string }[]): string {
  return items.map((i) => i.name).join(', ');
}

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [impact, setImpact] = useState<AccountDeletionImpact | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const load = useCallback(async () => {
    const [impactData, profile] = await Promise.all([fetchAccountDeletionImpact(), fetchMyProfile()]);
    setImpact(impactData);
    setDisplayName(profile.display_name ?? '');
  }, []);

  const { error, setError } = useScreenLoad(load, 'Failed to load account details');

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_PHRASE && !isDeleting && impact !== null;

  async function handleSaveName() {
    setIsSavingName(true);
    setNameSaved(false);
    setError(null);
    try {
      await updateMyProfile({ displayName });
      setNameSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
    } finally {
      setIsSavingName(false);
    }
  }

  function handleSignOutPress() {
    confirmAction('Sign out?', "You'll need to sign back in to see your dogs.", () => signOut(), 'Sign out');
  }

  function handleDeletePress() {
    if (!impact) return;
    confirmDestructive(
      'Permanently delete your account?',
      'This cannot be undone. Your account, and any dog only you can see, will be gone for good.',
      handleDeleteConfirmed,
      'Delete permanently'
    );
  }

  async function handleDeleteConfirmed() {
    if (!impact) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteMyAccount(impact);
      // Signing out clears the session, which flips the root layout's
      // Stack.Protected guard and returns to sign-in automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={8}
          style={styles.backLink}>
          <ThemedText type="link" themeColor="tint">
            ‹ Back
          </ThemedText>
        </Pressable>
        <ThemedText type="subtitle">Account</ThemedText>
        {session?.user.email ? (
          <ThemedText themeColor="textSecondary" type="small">
            Signed in as {session.user.email}
          </ThemedText>
        ) : null}

        <ThemedView style={styles.nameSection}>
          <ThemedTextInput
            label="Display name"
            helperText={
              nameSaved
                ? 'Saved.'
                : "Shown to other caregivers instead of your email — e.g. \"John gave Rascal's Gabapentin\". Leave blank to fall back to your email."
            }
            placeholder="e.g. John"
            autoCapitalize="words"
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              setNameSaved(false);
            }}
          />
          <Button
            variant="secondary"
            label={isSavingName ? 'Saving…' : 'Save name'}
            onPress={handleSaveName}
            disabled={isSavingName}
            style={styles.saveNameButton}
          />
        </ThemedView>

        <Button
          variant="secondary"
          label="Sign out"
          accessibilityLabel="Sign out"
          onPress={handleSignOutPress}
          style={styles.signOutButton}
        />

        <ThemedView style={[styles.dangerZone, { borderColor: theme.error }]}>
          <ThemedText type="smallBold" themeColor="error" style={styles.dangerTitle}>
            ⚠ Danger zone
          </ThemedText>
          <ThemedText type="smallBold">Delete your account</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This permanently deletes your GeriPaws account. It cannot be undone.
          </ThemedText>

          {impact === null && !error ? (
            <ThemedText type="small" themeColor="textSecondary">
              Checking what this affects…
            </ThemedText>
          ) : null}

          {impact && impact.toDelete.length > 0 ? (
            <ThemedView style={[styles.warningBox, { borderColor: theme.error, backgroundColor: theme.error + '14' }]}>
              <ThemedText type="smallBold" themeColor="error">
                These dogs will be permanently deleted:
              </ThemedText>
              <ThemedText type="small" themeColor="error">
                {joinNames(impact.toDelete)}
              </ThemedText>
              <ThemedText type="small" themeColor="error">
                Every photo, video, medication, and history entry for {impact.toDelete.length === 1 ? 'this dog' : 'these dogs'}{' '}
                will be destroyed along with your account. This cannot be undone.
              </ThemedText>
            </ThemedView>
          ) : null}

          {impact && impact.toTransfer.length > 0 ? (
            <ThemedView style={[styles.warningBox, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Ownership will transfer automatically:</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                You&apos;re the only owner of {joinNames(impact.toTransfer)}, which other caregivers also use. Ownership will
                pass to another caregiver so their access and history aren&apos;t affected.
              </ThemedText>
            </ThemedView>
          ) : null}

          {impact ? (
            <>
              <ThemedText type="small" style={styles.confirmPrompt}>
                Type <ThemedText type="smallBold">{CONFIRM_PHRASE}</ThemedText> below to confirm.
              </ThemedText>
              <TextInput
                accessibilityLabel={`Type ${CONFIRM_PHRASE} to confirm account deletion`}
                style={[
                  styles.confirmInput,
                  { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.error },
                ]}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={CONFIRM_PHRASE}
                placeholderTextColor={theme.textSecondary}
                value={confirmText}
                onChangeText={setConfirmText}
                editable={!isDeleting}
              />

              {error ? (
                <ThemedText themeColor="error" type="small">
                  {error}
                </ThemedText>
              ) : null}

              <Button
                variant="danger"
                label={isDeleting ? 'Deleting…' : 'Permanently delete my account'}
                accessibilityLabel="Permanently delete my account"
                disabled={!canDelete}
                onPress={handleDeletePress}
                style={styles.deleteButton}
              />
            </>
          ) : null}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', padding: 16, gap: 8 },
  backLink: { alignSelf: 'flex-start', marginBottom: 4 },
  nameSection: { marginTop: 16, gap: 8 },
  saveNameButton: { alignSelf: 'flex-start' },
  signOutButton: { marginTop: 16 },
  dangerZone: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 24,
  },
  dangerTitle: { marginBottom: 4 },
  warningBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  confirmPrompt: { marginTop: 12 },
  confirmInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  deleteButton: { marginTop: 8 },
});
