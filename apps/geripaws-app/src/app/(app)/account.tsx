import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { deleteMyAccount, fetchAccountDeletionImpact, type AccountDeletionImpact } from '@/lib/account';
import { useAuth } from '@/lib/auth-context';

const CONFIRM_PHRASE = 'DELETE';

function joinNames(items: { name: string }[]): string {
  return items.map((i) => i.name).join(', ');
}

function confirmNative(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete permanently', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function AccountScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [impact, setImpact] = useState<AccountDeletionImpact | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setImpact(await fetchAccountDeletionImpact());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account details');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_PHRASE && !isDeleting && impact !== null;

  function handleDeletePress() {
    if (!impact) return;
    confirmNative(
      'Permanently delete your account?',
      'This cannot be undone. Your account, and any dog only you can see, will be gone for good.',
      handleDeleteConfirmed
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
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Account</ThemedText>
        {session?.user.email ? (
          <ThemedText themeColor="textSecondary" type="small">
            Signed in as {session.user.email}
          </ThemedText>
        ) : null}

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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Permanently delete my account"
                accessibilityState={{ disabled: !canDelete }}
                style={[styles.deleteButton, { backgroundColor: theme.error }, !canDelete && styles.deleteButtonDisabled]}
                disabled={!canDelete}
                onPress={handleDeletePress}>
                <ThemedText themeColor="background" type="smallBold">
                  {isDeleting ? 'Deleting…' : 'Permanently delete my account'}
                </ThemedText>
              </Pressable>
            </>
          ) : null}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 8 },
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
  deleteButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonDisabled: { opacity: 0.4 },
});
