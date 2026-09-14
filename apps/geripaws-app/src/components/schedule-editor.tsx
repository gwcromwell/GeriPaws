import type { MedicationScheduleInput } from '@geripaws/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';

import { useTheme } from '@/hooks/use-theme';
import { parseTimeInput } from '@/lib/time-input';

export const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

/** The editor's own working state — a superset of every schedule kind's fields,
 * regardless of which is currently selected, so switching kinds doesn't lose
 * what was typed into the others. */
export interface ScheduleEditorValue {
  kind: MedicationScheduleInput['kind'];
  times: string[];
  intervalHours: string;
  startTime: string;
  daysOfWeek: number[];
}

export const DEFAULT_SCHEDULE_EDITOR_VALUE: ScheduleEditorValue = {
  kind: 'times_per_day',
  times: [''],
  intervalHours: '',
  startTime: '',
  daysOfWeek: [],
};

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

/** Validates and converts the editor's working state into a schedule. The
 * result's `kind` is never "as_needed" unless the editor's own value is —
 * callers that pass `allowAsNeeded={false}` to ScheduleEditor can safely
 * narrow the result to a schedule shape without "as_needed" (e.g. a habit
 * schedule), since the UI never lets the user select it in that mode. */
export function buildScheduleFromEditor(value: ScheduleEditorValue): {
  schedule: MedicationScheduleInput | null;
  error: string | null;
} {
  switch (value.kind) {
    case 'times_per_day': {
      const { values, error } = normalizeTimes(value.times);
      if (error) return { schedule: null, error };
      if (values.length === 0) return { schedule: null, error: 'Add at least one time' };
      return { schedule: { kind: 'times_per_day', times: values }, error: null };
    }
    case 'specific_days': {
      const { values, error } = normalizeTimes(value.times);
      if (error) return { schedule: null, error };
      if (values.length === 0) return { schedule: null, error: 'Add at least one time' };
      if (value.daysOfWeek.length === 0) return { schedule: null, error: 'Pick at least one day' };
      return { schedule: { kind: 'specific_days', daysOfWeek: value.daysOfWeek, times: values }, error: null };
    }
    case 'interval_hours': {
      const parsedStart = parseTimeInput(value.startTime);
      if (!parsedStart) {
        return { schedule: null, error: `"${value.startTime}" isn't a time I recognize — try 06:00, 6:00 AM, or 0600` };
      }
      return {
        schedule: { kind: 'interval_hours', intervalHours: Number(value.intervalHours), startTime: parsedStart },
        error: null,
      };
    }
    case 'as_needed':
    default:
      return { schedule: { kind: 'as_needed' }, error: null };
  }
}

interface ScheduleEditorProps {
  value: ScheduleEditorValue;
  onChange: (value: ScheduleEditorValue) => void;
  /** Whether "As needed" (PRN, no schedule) is a selectable option — true for
   * medications, false for habit schedules (a walk or a meal is always
   * expected once scheduled). Defaults to true. */
  allowAsNeeded?: boolean;
}

export function ScheduleEditor({ value, onChange, allowAsNeeded = true }: ScheduleEditorProps) {
  const theme = useTheme();

  function toggleDay(day: number) {
    const daysOfWeek = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter((d) => d !== day)
      : [...value.daysOfWeek, day].sort();
    onChange({ ...value, daysOfWeek });
  }

  function updateTime(index: number, text: string) {
    onChange({ ...value, times: value.times.map((t, i) => (i === index ? text : t)) });
  }

  function addTime() {
    if (value.times.length >= 6) return;
    onChange({ ...value, times: [...value.times, ''] });
  }

  function removeTime(index: number) {
    onChange({ ...value, times: value.times.filter((_, i) => i !== index) });
  }

  const kindOptions = [
    { value: 'times_per_day' as const, label: 'Fixed times/day' },
    { value: 'interval_hours' as const, label: 'Every N hours' },
    { value: 'specific_days' as const, label: 'Specific days' },
    ...(allowAsNeeded ? [{ value: 'as_needed' as const, label: 'As needed' }] : []),
  ];

  return (
    <>
      <ChoiceChips
        label="Schedule"
        options={kindOptions}
        value={value.kind}
        onChange={(v) => v && onChange({ ...value, kind: v })}
      />

      {value.kind === 'times_per_day' || value.kind === 'specific_days' ? (
        <>
          {value.kind === 'specific_days' ? (
            <View style={styles.container0}>
              <ThemedText type="smallBold">Days</ThemedText>
              <View style={styles.dayRow}>
                {WEEKDAYS.map((day) => {
                  const isSelected = value.daysOfWeek.includes(day.value);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={day.value}
                      onPress={() => toggleDay(day.value)}
                      hitSlop={8}
                      style={[styles.dayChip, isSelected && styles.dayChipSelected, isSelected && { backgroundColor: theme.tint, borderColor: theme.tint }]}>
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
          {value.times.map((t, index) => (
            <View key={index} style={styles.timeRow}>
              <View style={styles.timeInputFlex}>
                <ThemedTextInput placeholder="08:00" value={t} onChangeText={(v) => updateTime(index, v)} />
              </View>
              {value.times.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove time ${t || index + 1}`}
                  onPress={() => removeTime(index)}
                  hitSlop={12}>
                  <ThemedText themeColor="error" type="small">
                    Remove
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ))}
          {value.times.length < 6 ? <Button variant="secondary" label="+ Add another time" onPress={addTime} /> : null}
        </>
      ) : null}

      {value.kind === 'interval_hours' ? (
        <>
          <ThemedTextInput
            label="Every how many hours"
            placeholder="e.g. 8"
            keyboardType="number-pad"
            value={value.intervalHours}
            onChangeText={(v) => onChange({ ...value, intervalHours: v })}
          />
          <ThemedTextInput
            label="Starting at"
            helperText="e.g. 06:00, 6:00 AM, or 0600"
            placeholder="06:00"
            value={value.startTime}
            onChangeText={(v) => onChange({ ...value, startTime: v })}
          />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container0: { gap: 6 },
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
});
