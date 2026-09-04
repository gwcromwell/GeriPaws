import { createAilmentSchema } from '@geripaws/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { createAilment } from '@/lib/ailments';

export default function NewAilmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [name, setName] = useState('');
  const [diagnosedAt, setDiagnosedAt] = useState('');
  const [diagnosingVet, setDiagnosingVet] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const result = createAilmentSchema.safeParse({
      petId: id,
      name,
      diagnosedAt: diagnosedAt || undefined,
      diagnosingVet: diagnosingVet || undefined,
      notes: notes || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const ailment = await createAilment(result.data);
      router.replace({ pathname: '/pets/[id]/ailments/[ailmentId]', params: { id, ailmentId: ailment.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Add a condition</ThemedText>

      <ThemedTextInput
        label="Condition"
        helperText="What has your dog been diagnosed with?"
        placeholder="e.g. Canine epilepsy"
        value={name}
        onChangeText={setName}
      />
      <ThemedTextInput
        label="Date diagnosed"
        helperText="Optional — YYYY-MM-DD"
        placeholder="2026-01-15"
        value={diagnosedAt}
        onChangeText={setDiagnosedAt}
      />
      <ThemedTextInput
        label="Diagnosing vet"
        helperText="Optional"
        placeholder="e.g. Dr. Patel"
        value={diagnosingVet}
        onChangeText={setDiagnosingVet}
      />
      <ThemedTextInput
        label="Notes"
        helperText="Optional — anything else worth recording now"
        placeholder="Notes"
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        <ThemedText themeColor="background" type="smallBold">
          {isSubmitting ? 'Saving…' : 'Save condition'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
});
