import type { HabitSchedule } from '@geripaws/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import {
  buildScheduleFromEditor,
  DEFAULT_SCHEDULE_EDITOR_VALUE,
  ScheduleEditor,
  type ScheduleEditorValue,
} from '@/components/schedule-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScreenLoad } from '@/hooks/use-screen-load';
import { deleteHabitSchedule, fetchHabitSchedules, upsertHabitSchedule } from '@/lib/habit-schedules';
import { fetchMyRole, fetchPet, updatePet } from '@/lib/pets';
import { MaxContentWidth } from '@/constants/theme';

const DUE_GRACE_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '5', label: '5 min' },
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
];

function scheduleToEditorValue(schedule: HabitSchedule): ScheduleEditorValue {
  return {
    kind: schedule.kind,
    times: schedule.kind === 'times_per_day' || schedule.kind === 'specific_days' ? schedule.times : [''],
    daysOfWeek: schedule.kind === 'specific_days' ? schedule.daysOfWeek : [],
    intervalHours: schedule.kind === 'interval_hours' ? String(schedule.intervalHours) : '',
    startTime: schedule.kind === 'interval_hours' ? schedule.startTime : '',
  };
}

export default function HabitScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [walkEnabled, setWalkEnabled] = useState(false);
  const [walkValue, setWalkValue] = useState<ScheduleEditorValue>(DEFAULT_SCHEDULE_EDITOR_VALUE);
  const [foodEnabled, setFoodEnabled] = useState(false);
  const [foodValue, setFoodValue] = useState<ScheduleEditorValue>(DEFAULT_SCHEDULE_EDITOR_VALUE);
  const [waterEnabled, setWaterEnabled] = useState(false);
  const [waterValue, setWaterValue] = useState<ScheduleEditorValue>(DEFAULT_SCHEDULE_EDITOR_VALUE);
  const [dueGraceMinutes, setDueGraceMinutes] = useState('10');
  const [isOwner, setIsOwner] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [rows, pet, role] = await Promise.all([fetchHabitSchedules(id), fetchPet(id), fetchMyRole(id)]);
    const walk = rows.find((r) => r.type === 'walk');
    const food = rows.find((r) => r.type === 'food');
    const water = rows.find((r) => r.type === 'water');
    setWalkEnabled(Boolean(walk));
    if (walk) setWalkValue(scheduleToEditorValue(walk.schedule));
    setFoodEnabled(Boolean(food));
    if (food) setFoodValue(scheduleToEditorValue(food.schedule));
    setWaterEnabled(Boolean(water));
    if (water) setWaterValue(scheduleToEditorValue(water.schedule));
    setDueGraceMinutes(String(pet.due_grace_minutes));
    // Editing walk/food/water schedules only needs caregiver access (see
    // habit_schedules_write's RLS policy), but due_grace_minutes lives on the
    // pets row itself, which only an owner can update (pets_update's RLS) —
    // so that one section is owner-only, same as other pet-level settings.
    setIsOwner(role === 'owner');
  }, [id]);

  const { error, setError } = useScreenLoad(load, 'Failed to load schedule');

  async function handleSave() {
    setError(null);

    let walkSchedule: HabitSchedule | null = null;
    if (walkEnabled) {
      const { schedule, error: scheduleError } = buildScheduleFromEditor(walkValue);
      if (scheduleError || !schedule || schedule.kind === 'as_needed') {
        setError(scheduleError ?? 'Invalid walk schedule');
        return;
      }
      walkSchedule = schedule;
    }

    let foodSchedule: HabitSchedule | null = null;
    if (foodEnabled) {
      const { schedule, error: scheduleError } = buildScheduleFromEditor(foodValue);
      if (scheduleError || !schedule || schedule.kind === 'as_needed') {
        setError(scheduleError ?? 'Invalid food schedule');
        return;
      }
      foodSchedule = schedule;
    }

    let waterSchedule: HabitSchedule | null = null;
    if (waterEnabled) {
      const { schedule, error: scheduleError } = buildScheduleFromEditor(waterValue);
      if (scheduleError || !schedule || schedule.kind === 'as_needed') {
        setError(scheduleError ?? 'Invalid water schedule');
        return;
      }
      waterSchedule = schedule;
    }

    setIsSubmitting(true);
    try {
      await Promise.all([
        walkSchedule ? upsertHabitSchedule(id, 'walk', walkSchedule) : deleteHabitSchedule(id, 'walk'),
        foodSchedule ? upsertHabitSchedule(id, 'food', foodSchedule) : deleteHabitSchedule(id, 'food'),
        waterSchedule ? upsertHabitSchedule(id, 'water', waterSchedule) : deleteHabitSchedule(id, 'water'),
        isOwner ? updatePet(id, { dueGraceMinutes: Number(dueGraceMinutes) }) : Promise.resolve(),
      ]);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">Walk, food & water schedule</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Set expected times so overdue reminders know what to check for — different dogs can have
          different schedules. A type with no schedule set never shows a due/overdue alert.
        </ThemedText>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Walks
        </ThemedText>
        <ChoiceChips
          label="Schedule walks?"
          options={[
            { value: 'on', label: 'Yes' },
            { value: 'off', label: 'No schedule' },
          ]}
          value={walkEnabled ? 'on' : 'off'}
          onChange={(v) => setWalkEnabled(v === 'on')}
        />
        {walkEnabled ? <ScheduleEditor value={walkValue} onChange={setWalkValue} allowAsNeeded={false} /> : null}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Food
        </ThemedText>
        <ChoiceChips
          label="Schedule meals?"
          options={[
            { value: 'on', label: 'Yes' },
            { value: 'off', label: 'No schedule' },
          ]}
          value={foodEnabled ? 'on' : 'off'}
          onChange={(v) => setFoodEnabled(v === 'on')}
        />
        {foodEnabled ? <ScheduleEditor value={foodValue} onChange={setFoodValue} allowAsNeeded={false} /> : null}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Water
        </ThemedText>
        <ChoiceChips
          label="Schedule water refills?"
          options={[
            { value: 'on', label: 'Yes' },
            { value: 'off', label: 'No schedule' },
          ]}
          value={waterEnabled ? 'on' : 'off'}
          onChange={(v) => setWaterEnabled(v === 'on')}
        />
        {waterEnabled ? <ScheduleEditor value={waterValue} onChange={setWaterValue} allowAsNeeded={false} /> : null}

        {isOwner ? (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Due buffer
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
              How long past a due time before it turns from a &ldquo;due now&rdquo; nudge into
              &ldquo;overdue&rdquo; — gives whoever&apos;s around a moment to log it first. Owner-only.
            </ThemedText>
            <ChoiceChips
              label="Buffer before overdue"
              options={DUE_GRACE_OPTIONS}
              value={dueGraceMinutes}
              onChange={(v) => v && setDueGraceMinutes(v)}
            />
          </>
        ) : null}

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Button label={isSubmitting ? 'Saving…' : 'Save'} onPress={handleSave} disabled={isSubmitting} style={styles.button} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', padding: 24, gap: 12 },
  sectionTitle: { marginTop: 20, marginBottom: 2 },
  hint: { marginBottom: 4 },
  button: { marginTop: 16 },
  message: { textAlign: 'center' },
});
