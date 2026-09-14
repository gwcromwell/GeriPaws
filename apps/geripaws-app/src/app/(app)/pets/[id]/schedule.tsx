import type { HabitSchedule } from '@geripaws/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { deleteHabitSchedule, fetchHabitSchedules, upsertHabitSchedule } from '@/lib/habit-schedules';

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

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const rows = await fetchHabitSchedules(id);
      const walk = rows.find((r) => r.type === 'walk');
      const food = rows.find((r) => r.type === 'food');
      setWalkEnabled(Boolean(walk));
      if (walk) setWalkValue(scheduleToEditorValue(walk.schedule));
      setFoodEnabled(Boolean(food));
      if (food) setFoodValue(scheduleToEditorValue(food.schedule));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

    setIsSubmitting(true);
    try {
      await Promise.all([
        walkSchedule ? upsertHabitSchedule(id, 'walk', walkSchedule) : deleteHabitSchedule(id, 'walk'),
        foodSchedule ? upsertHabitSchedule(id, 'food', foodSchedule) : deleteHabitSchedule(id, 'food'),
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
        <ThemedText type="subtitle">Walk & food schedule</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Set expected times so overdue reminders know what to check for — different dogs can have
          different schedules.
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
  container: { padding: 24, gap: 12 },
  sectionTitle: { marginTop: 20, marginBottom: 2 },
  button: { marginTop: 16 },
  message: { textAlign: 'center' },
});
