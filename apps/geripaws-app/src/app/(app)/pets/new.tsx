import { createPetSchema } from '@geripaws/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { createPet } from '@/lib/pets';

export default function NewPetScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const result = createPetSchema.safeParse({ name, breed: breed || undefined, weightUnit: 'lb', dayBoundaryHour: 0 });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const pet = await createPet(result.data);
      router.replace({ pathname: '/pets/[id]', params: { id: pet.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dog profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Add a dog</ThemedText>

      <ThemedTextInput
        label="Name"
        helperText="What do you call your dog?"
        placeholder="e.g. Biscuit"
        value={name}
        onChangeText={setName}
      />
      <ThemedTextInput
        label="Breed"
        helperText="Optional"
        placeholder="e.g. Beagle, Mixed"
        value={breed}
        onChangeText={setBreed}
      />

      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        <ThemedText themeColor="background" type="smallBold">
          {isSubmitting ? 'Creating…' : 'Create dog profile'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
});
