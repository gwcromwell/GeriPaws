import type { HabitType } from '@geripaws/shared';
import type { TimelineEntry } from '@/lib/timeline';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDateTime, summarizeHabitLog } from '@/lib/format';

const HABIT_LABEL: Record<HabitType, string> = {
  walk: 'Walk',
  water: 'Water',
  food: 'Food',
  incident: 'Incident',
  weight: 'Weight',
};

type Props = {
  entry: TimelineEntry;
  onPress?: () => void;
};

export function TimelineRow({ entry, onPress }: Props) {
  let title: string;
  let subtitle: string;

  switch (entry.kind) {
    case 'habit':
      title = HABIT_LABEL[entry.log.type];
      subtitle = summarizeHabitLog(entry.log);
      break;
    case 'dose':
      title = `${entry.dose.medication?.name ?? 'Medication'}`;
      subtitle = entry.dose.skipped ? 'Skipped' : 'Given';
      break;
    case 'qol':
      title = 'Quality of Life check-in';
      subtitle = `${Math.round(entry.response.total_score)} / 70${entry.response.notes ? ` · ${entry.response.notes}` : ''}`;
      break;
    case 'ailment_note':
      title = `Note — ${entry.note.ailment?.name ?? 'Condition'}`;
      subtitle = entry.note.note;
      break;
  }

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <ThemedView style={styles.info}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDateTime(entry.occurredAt)}
        </ThemedText>
        <ThemedText type="small">{subtitle}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  info: { gap: 2 },
});
