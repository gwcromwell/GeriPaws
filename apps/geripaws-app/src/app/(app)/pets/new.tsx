import { createPetSchema } from '@geripaws/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AvatarPicker } from '@/components/avatar-picker';
import { ChoiceChips } from '@/components/choice-chips';
import { DateOfBirthField } from '@/components/date-of-birth-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { createPet, updatePet, uploadPetPhoto } from '@/lib/pets';

export default function NewPetScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState<string | undefined>(undefined);
  const [sex, setSex] = useState<'male' | 'female' | undefined>(undefined);
  const [neutered, setNeutered] = useState<'yes' | 'no' | undefined>(undefined);
  const [photoLocalUri, setPhotoLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const result = createPetSchema.safeParse({
      name,
      breed: breed || undefined,
      dob,
      sex,
      neutered: neutered === undefined ? undefined : neutered === 'yes',
      weightUnit: 'lb',
      dayBoundaryHour: 0,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const pet = await createPet(result.data);
      if (photoLocalUri) {
        const photoUrl = await uploadPetPhoto(pet.id, photoLocalUri);
        await updatePet(pet.id, { photoUrl });
      }
      router.replace({ pathname: '/pets/[id]', params: { id: pet.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dog profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">Add a dog</ThemedText>

        <AvatarPicker uri={photoLocalUri} onPick={setPhotoLocalUri} />

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

        <DateOfBirthField value={dob} onChange={setDob} />

        <ChoiceChips
          label="Sex"
          helperText="Optional"
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
          value={sex}
          onChange={setSex}
        />

        <ChoiceChips
          label="Spayed / neutered"
          helperText="Optional"
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value={neutered}
          onChange={setNeutered}
        />

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleSubmit} disabled={isSubmitting}>
          <ThemedText themeColor="background" type="smallBold">
            {isSubmitting ? 'Creating…' : 'Create dog profile'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
});
