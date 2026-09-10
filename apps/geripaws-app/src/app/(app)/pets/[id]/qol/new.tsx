import type { QolScaleType } from '@geripaws/shared';
import { QOL_FULL_DIMENSIONS, QOL_QUICK_DIMENSIONS, createQolResponseSchema, qolScoresSchema } from '@geripaws/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ScoreSelector } from '@/components/score-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { createQolResponse, deleteQolResponse, fetchQolResponse, updateQolResponse } from '@/lib/qol';

import { useTheme } from '@/hooks/use-theme';

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function QolCheckInScreen() {
  const theme = useTheme();
  const { id, responseId } = useLocalSearchParams<{ id: string; responseId?: string }>();
  const router = useRouter();
  const isEditing = Boolean(responseId);

  const [isLoadingResponse, setIsLoadingResponse] = useState(isEditing);
  const [scale, setScale] = useState<QolScaleType>('full');
  const [values, setValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!responseId) return;
    let cancelled = false;
    setIsLoadingResponse(true);
    fetchQolResponse(responseId)
      .then((response) => {
        if (cancelled) return;
        setScale(response.scores.scale);
        const { scale: _scale, ...dims } = response.scores;
        setValues(dims as Record<string, number>);
        setNotes(response.notes ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load check-in'))
      .finally(() => {
        if (!cancelled) setIsLoadingResponse(false);
      });
    return () => {
      cancelled = true;
    };
  }, [responseId]);

  const dimensions = scale === 'full' ? QOL_FULL_DIMENSIONS : QOL_QUICK_DIMENSIONS;

  async function handleSubmit() {
    const rawScores = { scale, ...values };
    const scoresResult = qolScoresSchema.safeParse(rawScores);
    if (!scoresResult.success) {
      setError('Please answer every question before saving');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (isEditing && responseId) {
        await updateQolResponse(responseId, scoresResult.data, notes || undefined);
      } else {
        const result = createQolResponseSchema.safeParse({ petId: id, scores: scoresResult.data, notes: notes || undefined });
        if (!result.success) {
          setError(result.error.issues[0]?.message ?? 'Invalid input');
          setIsSubmitting(false);
          return;
        }
        await createQolResponse(result.data);
      }
      router.replace({ pathname: '/pets/[id]/qol', params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingResponse) {
    return (
      <ThemedView style={styles.flex}>
        <ThemedText style={styles.message}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: isEditing ? 'Edit check-in' : 'New check-in' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">{isEditing ? 'Edit check-in' : 'Quality of Life check-in'}</ThemedText>

        {!isEditing ? (
          <ChoiceChips
            label="Scale"
            helperText="Full is the established veterinary scale; Quick is faster for busy days"
            options={[
              { value: 'full', label: 'Full (7 questions)' },
              { value: 'quick', label: 'Quick (5 questions)' },
            ]}
            value={scale}
            onChange={(v) => v && setScale(v)}
          />
        ) : (
          <ThemedText themeColor="textSecondary" type="small">
            {scale === 'full' ? 'Full scale' : 'Quick scale'}
          </ThemedText>
        )}

        {dimensions.map(({ key, label }) => (
          <ScoreSelector
            key={key}
            label={label}
            value={values[key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
          />
        ))}

        <ThemedTextInput
          label="Highlights / lowlights"
          helperText="Optional — anything notable since the last check-in"
          placeholder="e.g. slower on walks this week, but eating well"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable accessibilityRole="button" style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleSubmit} disabled={isSubmitting}>
          <ThemedText themeColor="background" type="smallBold">
            {isSubmitting ? 'Saving…' : 'Save check-in'}
          </ThemedText>
        </Pressable>

        {isEditing && responseId ? (
          <Pressable accessibilityRole="button"
            style={styles.deleteButton}
            onPress={() =>
              confirm('Delete check-in', 'This cannot be undone.', async () => {
                await deleteQolResponse(responseId);
                router.replace({ pathname: '/pets/[id]/qol', params: { id } });
              })
            }>
            <ThemedText themeColor="error" type="smallBold">
              Delete check-in
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#D33A3A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
});
