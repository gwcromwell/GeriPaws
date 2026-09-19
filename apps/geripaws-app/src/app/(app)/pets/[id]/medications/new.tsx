import { createMedicationSchema, refillSetupSchema } from '@geripaws/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import {
  buildScheduleFromEditor,
  DEFAULT_SCHEDULE_EDITOR_VALUE,
  ScheduleEditor,
  type ScheduleEditorValue,
} from '@/components/schedule-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';
import {
  createMedication,
  deleteRefill,
  fetchMedication,
  fetchRefill,
  updateMedication,
  upsertRefill,
} from '@/lib/medications';

export default function NewMedicationScreen() {
  const { id, ailmentId, medicationId } = useLocalSearchParams<{
    id: string;
    ailmentId?: string;
    medicationId?: string;
  }>();
  const router = useRouter();
  const isEditing = Boolean(medicationId);

  const [isLoadingMed, setIsLoadingMed] = useState(isEditing);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('');
  const [route, setRoute] = useState('');
  const [activeUntil, setActiveUntil] = useState('');

  const [scheduleValue, setScheduleValue] = useState<ScheduleEditorValue>(DEFAULT_SCHEDULE_EDITOR_VALUE);

  const [trackRefill, setTrackRefill] = useState(false);
  const [countOnHand, setCountOnHand] = useState('');
  const [unitPerDose, setUnitPerDose] = useState('1');
  const [lowStockThreshold, setLowStockThreshold] = useState('7');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!medicationId) return;
    let cancelled = false;
    setIsLoadingMed(true);
    Promise.all([fetchMedication(medicationId), fetchRefill(medicationId)])
      .then(([med, refill]) => {
        if (cancelled) return;
        setName(med.name);
        setDosage(med.dosage);
        setUnit(med.unit);
        setRoute(med.route ?? '');
        setActiveUntil(med.active_until ?? '');

        setScheduleValue({
          kind: med.schedule.kind,
          times:
            med.schedule.kind === 'times_per_day' || med.schedule.kind === 'specific_days'
              ? med.schedule.times.length > 0
                ? med.schedule.times
                : ['']
              : [''],
          daysOfWeek: med.schedule.kind === 'specific_days' ? med.schedule.daysOfWeek : [],
          intervalHours: med.schedule.kind === 'interval_hours' ? String(med.schedule.intervalHours) : '',
          startTime: med.schedule.kind === 'interval_hours' ? med.schedule.startTime : '',
        });

        if (refill) {
          setTrackRefill(true);
          setCountOnHand(String(refill.count_on_hand));
          setUnitPerDose(String(refill.unit_per_dose));
          setLowStockThreshold(String(refill.low_stock_threshold));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load medication'))
      .finally(() => {
        if (!cancelled) setIsLoadingMed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [medicationId]);

  async function handleSubmit() {
    const { schedule, error: scheduleError } = buildScheduleFromEditor(scheduleValue);
    if (scheduleError || !schedule) {
      setError(scheduleError ?? 'Invalid schedule');
      return;
    }

    const result = createMedicationSchema.safeParse({
      petId: id,
      ailmentId: ailmentId || undefined,
      name,
      dosage,
      unit,
      route: route || undefined,
      schedule,
      activeUntil: activeUntil || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    let refillInput = null;
    if (trackRefill) {
      const refillResult = refillSetupSchema.safeParse({
        countOnHand: Number(countOnHand),
        unitPerDose: Number(unitPerDose),
        lowStockThreshold: Number(lowStockThreshold),
      });
      if (!refillResult.success) {
        setError(refillResult.error.issues[0]?.message ?? 'Invalid refill count');
        return;
      }
      refillInput = refillResult.data;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      let savedId: string;
      if (isEditing && medicationId) {
        await updateMedication(medicationId, {
          name: result.data.name,
          dosage: result.data.dosage,
          unit: result.data.unit,
          route: result.data.route,
          schedule: result.data.schedule,
          activeUntil: result.data.activeUntil,
        });
        savedId = medicationId;
        if (refillInput) {
          await upsertRefill(medicationId, id, refillInput);
        } else {
          await deleteRefill(medicationId);
        }
      } else {
        const medication = await createMedication(result.data);
        savedId = medication.id;
        if (refillInput) {
          await upsertRefill(medication.id, id, refillInput);
        }
      }

      if (ailmentId) {
        router.replace({ pathname: '/pets/[id]/ailments/[ailmentId]', params: { id, ailmentId } });
      } else {
        router.replace({ pathname: '/pets/[id]/medications/[medicationId]', params: { id, medicationId: savedId } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingMed) {
    return (
      <ThemedView style={styles.flex}>
        <ThemedText style={styles.message}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: isEditing ? 'Edit medication' : 'Add medication' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">{isEditing ? 'Edit medication' : 'Add a medication'}</ThemedText>
        {!ailmentId && !isEditing ? (
          <ThemedText themeColor="textSecondary" type="small">
            Not tied to a diagnosed condition — this will show up under General / Wellness.
          </ThemedText>
        ) : null}

        <ThemedTextInput label="Name" placeholder="e.g. Gabapentin" returnKeyType="next" value={name} onChangeText={setName} />
        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <ThemedTextInput label="Dose" placeholder="e.g. 250" returnKeyType="next" value={dosage} onChangeText={setDosage} />
          </View>
          <View style={styles.flexHalf}>
            <ThemedTextInput label="Unit" placeholder="e.g. mg" returnKeyType="next" value={unit} onChangeText={setUnit} />
          </View>
        </View>
        <ThemedTextInput
          label="Route"
          helperText="Optional — e.g. oral, injectable"
          placeholder="e.g. oral"
          returnKeyType="next"
          value={route}
          onChangeText={setRoute}
        />

        <ScheduleEditor value={scheduleValue} onChange={setScheduleValue} />

        <DateField
          label="Stop date"
          helperText="Optional — for a short course like antibiotics. Leave blank for ongoing medications."
          value={activeUntil || undefined}
          onChange={(v) => setActiveUntil(v ?? '')}
        />

        <ChoiceChips
          label="Track refills?"
          helperText="Enter what's on hand now to get low-supply warnings"
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value={trackRefill ? 'yes' : 'no'}
          onChange={(v) => setTrackRefill(v === 'yes')}
        />

        {trackRefill ? (
          <>
            <ThemedTextInput
              label="Count on hand"
              helperText="Number of doses currently in the bottle"
              placeholder="e.g. 60"
              keyboardType="decimal-pad"
              returnKeyType="next"
              value={countOnHand}
              onChangeText={setCountOnHand}
            />
            <ThemedTextInput
              label="Units per dose"
              helperText="Usually 1"
              value={unitPerDose}
              onChangeText={setUnitPerDose}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            <ThemedTextInput
              label="Low-supply warning"
              helperText="Days of supply remaining that should trigger a warning"
              value={lowStockThreshold}
              onChangeText={setLowStockThreshold}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          </>
        ) : null}

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Button label={isSubmitting ? 'Saving…' : 'Save medication'} onPress={handleSubmit} disabled={isSubmitting} style={styles.button} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', padding: 24, gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  flexHalf: { flex: 1 },
  button: { marginTop: 8 },
  message: { textAlign: 'center' },
});
