import type {
  AppetiteLevel,
  EliminationResult,
  FoodDetails,
  HabitType,
  IncidentCategory,
  IncidentDetails,
  IncidentSeverity,
  StoolQuality,
  WalkDetails,
  WaterDetails,
  WeightDetails,
} from '@geripaws/shared';
import { habitLogInputSchema } from '@geripaws/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { OccurredAtField } from '@/components/occurred-at-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { createHabitLog, fetchHabitLog, updateHabitLog } from '@/lib/habits';

import { useTheme } from '@/hooks/use-theme';
const TITLES: Record<HabitType, string> = {
  walk: 'Log a walk',
  water: 'Log water',
  food: 'Log food',
  incident: 'Log an accident / incident',
  weight: 'Log weight',
};

const EDIT_TITLES: Record<HabitType, string> = {
  walk: 'Edit walk',
  water: 'Edit water',
  food: 'Edit food',
  incident: 'Edit incident',
  weight: 'Edit weight',
};

export default function LogHabitScreen() {
  const { id, type, logId } = useLocalSearchParams<{ id: string; type: HabitType; logId?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const isEditing = Boolean(logId);

  const [occurredAt, setOccurredAt] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLog, setIsLoadingLog] = useState(isEditing);

  // walk fields
  const [durationMin, setDurationMin] = useState('');
  const [elimination, setElimination] = useState<EliminationResult>();
  const [stoolQuality, setStoolQuality] = useState<StoolQuality>();
  const [diaperNeeded, setDiaperNeeded] = useState<'yes' | 'no'>();
  const [diaperChanged, setDiaperChanged] = useState<'yes' | 'no'>();

  // water / food fields
  const [amount, setAmount] = useState('');
  const [appetite, setAppetite] = useState<AppetiteLevel>();

  // incident fields
  const [category, setCategory] = useState<IncidentCategory>();
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>();
  const [incidentDurationMin, setIncidentDurationMin] = useState('');

  // weight fields
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');

  useEffect(() => {
    if (!logId) return;
    let cancelled = false;
    setIsLoadingLog(true);
    fetchHabitLog(logId)
      .then((log) => {
        if (cancelled) return;
        setOccurredAt(new Date(log.occurred_at));
        setNotes(log.details.notes ?? '');

        if (log.type === 'walk') {
          const details = log.details as WalkDetails;
          setDurationMin(details.durationMin ? String(details.durationMin) : '');
          setElimination(details.elimination);
          setStoolQuality(details.stoolQuality);
          setDiaperNeeded(details.diaperNeeded ? 'yes' : 'no');
          setDiaperChanged(details.diaperChanged ? 'yes' : 'no');
        } else if (log.type === 'water') {
          const details = log.details as WaterDetails;
          setAmount(details.amount ?? '');
        } else if (log.type === 'food') {
          const details = log.details as FoodDetails;
          setAmount(details.amount ?? '');
          setAppetite(details.appetite);
        } else if (log.type === 'incident') {
          const details = log.details as IncidentDetails;
          setCategory(details.category);
          setLocation(details.location ?? '');
          setSeverity(details.severity);
          setIncidentDurationMin(details.durationMin ? String(details.durationMin) : '');
        } else if (log.type === 'weight') {
          const details = log.details as WeightDetails;
          setWeightValue(String(details.value));
          setWeightUnit(details.unit);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load entry'))
      .finally(() => {
        if (!cancelled) setIsLoadingLog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logId]);

  function buildDetails() {
    switch (type) {
      case 'walk':
        return {
          durationMin: durationMin ? Number(durationMin) : undefined,
          elimination,
          stoolQuality,
          diaperNeeded: diaperNeeded === 'yes',
          diaperChanged: diaperChanged === 'yes',
          notes: notes || undefined,
        };
      case 'water':
        return { amount: amount || undefined, notes: notes || undefined };
      case 'food':
        return { amount: amount || undefined, appetite, notes: notes || undefined };
      case 'incident':
        return {
          category,
          location: location || undefined,
          severity,
          durationMin: incidentDurationMin ? Number(incidentDurationMin) : undefined,
          notes: notes || undefined,
        };
      case 'weight':
        return {
          value: weightValue ? Number(weightValue) : undefined,
          unit: weightUnit,
          notes: notes || undefined,
        };
      default:
        return {};
    }
  }

  async function handleSubmit() {
    const result = habitLogInputSchema.safeParse({
      type,
      petId: id,
      occurredAt: occurredAt.toISOString(),
      details: buildDetails(),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (isEditing && logId) {
        await updateHabitLog(logId, { occurredAt: result.data.occurredAt, details: result.data.details });
      } else {
        await createHabitLog(result.data);
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingLog) {
    return (
      <ThemedView style={styles.flex}>
        <ThemedText style={styles.message}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: isEditing ? EDIT_TITLES[type] : TITLES[type] }} />
      <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="subtitle">{isEditing ? EDIT_TITLES[type] : (TITLES[type] ?? 'Log entry')}</ThemedText>

      <OccurredAtField value={occurredAt} onChange={setOccurredAt} />

      {type === 'walk' ? (
        <>
          <ThemedTextInput
            label="Duration (minutes)"
            helperText="Optional"
            placeholder="e.g. 20"
            keyboardType="number-pad"
            value={durationMin}
            onChangeText={setDurationMin}
          />
          <ChoiceChips
            label="What happened?"
            options={[
              { value: 'pee', label: 'Pee' },
              { value: 'poop', label: 'Poop' },
              { value: 'both', label: 'Both' },
              { value: 'none', label: 'Nothing' },
            ]}
            value={elimination}
            onChange={setElimination}
          />
          <ChoiceChips
            label="Stool quality"
            helperText="Optional — helps spot digestive changes over time"
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'soft', label: 'Soft' },
              { value: 'diarrhea', label: 'Diarrhea' },
              { value: 'hard', label: 'Hard' },
              { value: 'bloody', label: 'Bloody' },
            ]}
            value={stoolQuality}
            onChange={setStoolQuality}
          />
          <ChoiceChips
            label="Diaper needed?"
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
            value={diaperNeeded}
            onChange={setDiaperNeeded}
          />
          <ChoiceChips
            label="Diaper changed?"
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
            value={diaperChanged}
            onChange={setDiaperChanged}
          />
        </>
      ) : null}

      {type === 'water' ? (
        <ThemedTextInput
          label="Amount"
          helperText="Optional — e.g. 1 cup, half bowl"
          placeholder="e.g. 1 cup"
          value={amount}
          onChangeText={setAmount}
        />
      ) : null}

      {type === 'food' ? (
        <>
          <ThemedTextInput
            label="Amount"
            helperText="Optional — e.g. 1 cup, half portion"
            placeholder="e.g. 1 cup"
            value={amount}
            onChangeText={setAmount}
          />
          <ChoiceChips
            label="Appetite"
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'reduced', label: 'Reduced' },
              { value: 'refused', label: 'Refused' },
              { value: 'increased', label: 'Increased' },
            ]}
            value={appetite}
            onChange={setAppetite}
          />
        </>
      ) : null}

      {type === 'incident' ? (
        <>
          <ChoiceChips
            label="Type"
            options={[
              { value: 'urine', label: 'Urine' },
              { value: 'stool', label: 'Stool' },
              { value: 'vomit', label: 'Vomit' },
              { value: 'fall', label: 'Fall' },
              { value: 'seizure', label: 'Seizure' },
              { value: 'disorientation', label: 'Disorientation' },
              { value: 'other', label: 'Other' },
            ]}
            value={category}
            onChange={setCategory}
          />
          <ThemedTextInput
            label="Location"
            helperText="Optional — e.g. living room, back yard"
            placeholder="e.g. living room"
            value={location}
            onChangeText={setLocation}
          />
          <ChoiceChips
            label="Severity"
            helperText="Optional"
            options={[
              { value: 'mild', label: 'Mild' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'severe', label: 'Severe' },
            ]}
            value={severity}
            onChange={setSeverity}
          />
          <ThemedTextInput
            label="Duration (minutes)"
            helperText="Especially important for seizures"
            placeholder="e.g. 2"
            keyboardType="number-pad"
            value={incidentDurationMin}
            onChangeText={setIncidentDurationMin}
          />
        </>
      ) : null}

      {type === 'weight' ? (
        <>
          <ThemedTextInput
            label="Weight"
            placeholder="e.g. 42.5"
            keyboardType="decimal-pad"
            value={weightValue}
            onChangeText={setWeightValue}
          />
          <ChoiceChips
            label="Unit"
            options={[
              { value: 'lb', label: 'lb' },
              { value: 'kg', label: 'kg' },
            ]}
            value={weightUnit}
            onChange={(v) => v && setWeightUnit(v)}
          />
        </>
      ) : null}

      <ThemedText type="smallBold">Notes</ThemedText>
      <TextInput
        style={[
          styles.notesInput,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
        ]}
        placeholder="Anything else worth remembering"
        placeholderTextColor={theme.textSecondary}
        multiline
        numberOfLines={3}
        value={notes}
        onChangeText={setNotes}
      />

      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleSubmit} disabled={isSubmitting}>
        <ThemedText themeColor="background" type="smallBold">
          {isSubmitting ? 'Saving…' : 'Save'}
        </ThemedText>
      </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
});
