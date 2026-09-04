import { createMedicationSchema, refillSetupSchema, type MedicationScheduleInput } from '@geripaws/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import {
  createMedication,
  deleteRefill,
  fetchMedication,
  fetchRefill,
  updateMedication,
  upsertRefill,
} from '@/lib/medications';
import { parseTimeInput } from '@/lib/time-input';

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

type ScheduleKind = MedicationScheduleInput['kind'];

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

  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('times_per_day');
  const [times, setTimes] = useState<string[]>(['']);
  const [intervalHours, setIntervalHours] = useState('');
  const [startTime, setStartTime] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

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

        setScheduleKind(med.schedule.kind);
        if (med.schedule.kind === 'times_per_day' || med.schedule.kind === 'specific_days') {
          setTimes(med.schedule.times.length > 0 ? med.schedule.times : ['']);
        }
        if (med.schedule.kind === 'specific_days') setDaysOfWeek(med.schedule.daysOfWeek);
        if (med.schedule.kind === 'interval_hours') {
          setIntervalHours(String(med.schedule.intervalHours));
          setStartTime(med.schedule.startTime);
        }

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

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function updateTime(index: number, value: string) {
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addTime() {
    setTimes((prev) => (prev.length < 6 ? [...prev, ''] : prev));
  }

  function removeTime(index: number) {
    setTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function normalizeTimes(raw: string[]): { values: string[]; error: string | null } {
    const values: string[] = [];
    for (const t of raw) {
      const trimmed = t.trim();
      if (!trimmed) continue;
      const parsed = parseTimeInput(trimmed);
      if (!parsed) return { values: [], error: `"${trimmed}" isn't a time I recognize — try 08:00, 8:00 AM, or 0800` };
      values.push(parsed);
    }
    return { values, error: null };
  }

  function buildSchedule(): { schedule: MedicationScheduleInput | null; error: string | null } {
    switch (scheduleKind) {
      case 'times_per_day': {
        const { values, error } = normalizeTimes(times);
        if (error) return { schedule: null, error };
        if (values.length === 0) return { schedule: null, error: 'Add at least one time' };
        return { schedule: { kind: 'times_per_day', times: values }, error: null };
      }
      case 'specific_days': {
        const { values, error } = normalizeTimes(times);
        if (error) return { schedule: null, error };
        if (values.length === 0) return { schedule: null, error: 'Add at least one time' };
        if (daysOfWeek.length === 0) return { schedule: null, error: 'Pick at least one day' };
        return { schedule: { kind: 'specific_days', daysOfWeek, times: values }, error: null };
      }
      case 'interval_hours': {
        const parsedStart = parseTimeInput(startTime);
        if (!parsedStart) {
          return { schedule: null, error: `"${startTime}" isn't a time I recognize — try 06:00, 6:00 AM, or 0600` };
        }
        return {
          schedule: { kind: 'interval_hours', intervalHours: Number(intervalHours), startTime: parsedStart },
          error: null,
        };
      }
      case 'as_needed':
      default:
        return { schedule: { kind: 'as_needed' }, error: null };
    }
  }

  async function handleSubmit() {
    const { schedule, error: scheduleError } = buildSchedule();
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

        <ThemedTextInput label="Name" placeholder="e.g. Keppra" value={name} onChangeText={setName} />
        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <ThemedTextInput label="Dose" placeholder="e.g. 250" value={dosage} onChangeText={setDosage} />
          </View>
          <View style={styles.flexHalf}>
            <ThemedTextInput label="Unit" placeholder="e.g. mg" value={unit} onChangeText={setUnit} />
          </View>
        </View>
        <ThemedTextInput
          label="Route"
          helperText="Optional — e.g. oral, injectable"
          placeholder="e.g. oral"
          value={route}
          onChangeText={setRoute}
        />

        <ChoiceChips
          label="Schedule"
          options={[
            { value: 'times_per_day', label: 'Fixed times/day' },
            { value: 'interval_hours', label: 'Every N hours' },
            { value: 'specific_days', label: 'Specific days' },
            { value: 'as_needed', label: 'As needed' },
          ]}
          value={scheduleKind}
          onChange={(v) => v && setScheduleKind(v)}
        />

        {scheduleKind === 'times_per_day' || scheduleKind === 'specific_days' ? (
          <>
            {scheduleKind === 'specific_days' ? (
              <View style={styles.container0}>
                <ThemedText type="smallBold">Days</ThemedText>
                <View style={styles.dayRow}>
                  {WEEKDAYS.map((day) => {
                    const isSelected = daysOfWeek.includes(day.value);
                    return (
                      <Pressable
                        key={day.value}
                        onPress={() => toggleDay(day.value)}
                        style={[styles.dayChip, isSelected && styles.dayChipSelected]}>
                        <ThemedText type="small" themeColor={isSelected ? 'background' : 'text'}>
                          {day.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <ThemedText type="smallBold">Times</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              e.g. 08:00, 8:00 AM, or 0800
            </ThemedText>
            {times.map((t, index) => (
              <View key={index} style={styles.timeRow}>
                <View style={styles.timeInputFlex}>
                  <ThemedTextInput placeholder="08:00" value={t} onChangeText={(v) => updateTime(index, v)} />
                </View>
                {times.length > 1 ? (
                  <Pressable onPress={() => removeTime(index)} hitSlop={8}>
                    <ThemedText themeColor="error" type="small">
                      Remove
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {times.length < 6 ? (
              <Pressable onPress={addTime} style={styles.secondaryButton}>
                <ThemedText themeColor="tint" type="smallBold">
                  + Add another time
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {scheduleKind === 'interval_hours' ? (
          <>
            <ThemedTextInput
              label="Every how many hours"
              placeholder="e.g. 8"
              keyboardType="number-pad"
              value={intervalHours}
              onChangeText={setIntervalHours}
            />
            <ThemedTextInput
              label="Starting at"
              helperText="e.g. 06:00, 6:00 AM, or 0600"
              placeholder="06:00"
              value={startTime}
              onChangeText={setStartTime}
            />
          </>
        ) : null}

        <ThemedTextInput
          label="Stop date"
          helperText="Optional — for a short course like antibiotics. Leave blank for ongoing medications."
          placeholder="2026-02-01"
          value={activeUntil}
          onChangeText={setActiveUntil}
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
              value={countOnHand}
              onChangeText={setCountOnHand}
            />
            <ThemedTextInput
              label="Units per dose"
              helperText="Usually 1"
              value={unitPerDose}
              onChangeText={setUnitPerDose}
              keyboardType="decimal-pad"
            />
            <ThemedTextInput
              label="Low-supply warning"
              helperText="Days of supply remaining that should trigger a warning"
              value={lowStockThreshold}
              onChangeText={setLowStockThreshold}
              keyboardType="number-pad"
            />
          </>
        ) : null}

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
          <ThemedText themeColor="background" type="smallBold">
            {isSubmitting ? 'Saving…' : 'Save medication'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 16 },
  container0: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  flexHalf: { flex: 1 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  dayChipSelected: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeInputFlex: { flex: 1 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
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
