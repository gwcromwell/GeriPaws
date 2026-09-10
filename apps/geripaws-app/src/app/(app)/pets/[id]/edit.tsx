import type { Pet } from '@geripaws/shared';
import { updatePetSchema } from '@geripaws/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AvatarPicker } from '@/components/avatar-picker';
import { ChoiceChips } from '@/components/choice-chips';
import { DateOfBirthField } from '@/components/date-of-birth-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { fetchPet, updatePet, uploadPetPhoto } from '@/lib/pets';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [dob, setDob] = useState<string | undefined>(undefined);
  const [sex, setSex] = useState<'male' | 'female' | undefined>(undefined);
  const [neutered, setNeutered] = useState<'yes' | 'no' | undefined>(undefined);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPet(id).then((p) => {
      setPet(p);
      setName(p.name);
      setBreed(p.breed ?? '');
      setDob(p.dob ?? undefined);
      setSex(p.sex === 'male' || p.sex === 'female' ? p.sex : undefined);
      setNeutered(p.neutered === null ? undefined : p.neutered ? 'yes' : 'no');
      setPhotoUri(p.photo_url);
      setMicrochipNumber(p.microchip_number ?? '');
      setVetName(p.vet_name ?? '');
      setVetPhone(p.vet_phone ?? '');
      setAllergies(p.allergies ?? '');
      setInsuranceProvider(p.insurance_provider ?? '');
      setInsurancePolicyNumber(p.insurance_policy_number ?? '');
    });
  }, [id]);

  async function handleSubmit() {
    const result = updatePetSchema.safeParse({
      name,
      breed: breed || null,
      dob: dob ?? null,
      sex: sex ?? null,
      neutered: neutered === undefined ? null : neutered === 'yes',
      microchipNumber: microchipNumber || null,
      vetName: vetName || null,
      vetPhone: vetPhone || null,
      allergies: allergies || null,
      insuranceProvider: insuranceProvider || null,
      insurancePolicyNumber: insurancePolicyNumber || null,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      let photoUrl: string | null | undefined;
      if (photoChanged) {
        photoUrl = photoUri ? await uploadPetPhoto(id, photoUri) : null;
      }
      await updatePet(id, { ...result.data, ...(photoUrl !== undefined ? { photoUrl } : {}) });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update dog profile');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!pet) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <AvatarPicker
          uri={photoUri}
          onPick={(uri) => {
            setPhotoUri(uri);
            setPhotoChanged(true);
          }}
        />

        <ThemedTextInput label="Name" returnKeyType="next" value={name} onChangeText={setName} />
        <ThemedTextInput label="Breed" helperText="Optional" returnKeyType="next" value={breed} onChangeText={setBreed} />

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

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Additional details
        </ThemedText>

        <ThemedTextInput
          label="Microchip number"
          helperText="Optional"
          returnKeyType="next"
          value={microchipNumber}
          onChangeText={setMicrochipNumber}
        />

        <ThemedTextInput
          label="Primary vet"
          helperText="Clinic or vet's name — optional"
          returnKeyType="next"
          value={vetName}
          onChangeText={setVetName}
        />
        <ThemedTextInput
          label="Vet phone"
          helperText="Optional"
          keyboardType="phone-pad"
          returnKeyType="next"
          value={vetPhone}
          onChangeText={setVetPhone}
        />

        <ThemedTextInput
          label="Allergies / dietary restrictions"
          helperText="Optional — e.g. chicken, NSAIDs"
          multiline
          value={allergies}
          onChangeText={setAllergies}
        />

        <ThemedTextInput
          label="Insurance provider"
          helperText="Optional"
          returnKeyType="next"
          value={insuranceProvider}
          onChangeText={setInsuranceProvider}
        />
        <ThemedTextInput
          label="Policy number"
          helperText="Optional"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          value={insurancePolicyNumber}
          onChangeText={setInsurancePolicyNumber}
        />

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable accessibilityRole="button" style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleSubmit} disabled={isSubmitting}>
          <ThemedText themeColor="background" type="smallBold">
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },
  sectionTitle: { marginTop: 8 },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
});
