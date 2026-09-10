import type { MedicationDose } from '@geripaws/shared';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { QuickTimeChips } from '@/components/quick-time-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';
import { deleteDose, updateDoseGivenAt, updateDoseSkipped } from '@/lib/medications';

type Props = {
  dose: MedicationDose;
  canEdit: boolean;
  /** Shown above the schedule/status lines — used where a list spans multiple medications. */
  title?: string;
  onPressTitle?: () => void;
  onChanged: () => void;
};

export function DoseRow({ dose, canEdit, title, onPressTitle, onChanged }: Props) {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Date>(() => new Date(dose.given_at ?? dose.scheduled_at));
  const [isSaving, setIsSaving] = useState(false);

  function startEdit() {
    setDraft(new Date(dose.given_at ?? Date.now()));
    setIsEditing(true);
  }

  async function saveGivenAt() {
    setIsSaving(true);
    try {
      await updateDoseGivenAt(dose.id, draft);
      setIsEditing(false);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkSkipped() {
    setIsSaving(true);
    try {
      await updateDoseSkipped(dose.id);
      setIsEditing(false);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    await deleteDose(dose.id);
    onChanged();
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.row}>
        <ThemedView style={styles.info}>
          {title ? (
            <Pressable accessibilityRole="button" onPress={onPressTitle} disabled={!onPressTitle}>
              <ThemedText type="smallBold">{title}</ThemedText>
            </Pressable>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            Scheduled {formatDateTime(dose.scheduled_at)}
          </ThemedText>
          <ThemedText type="small" themeColor={dose.skipped ? 'error' : 'textSecondary'}>
            {dose.skipped ? 'Skipped' : dose.given_at ? `Given ${formatDateTime(dose.given_at)}` : 'Given'}
          </ThemedText>
        </ThemedView>
        {canEdit && !isEditing ? (
          <ThemedView style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit dose scheduled ${formatDateTime(dose.scheduled_at)}`}
              onPress={startEdit}
              hitSlop={12}>
              <ThemedText type="link" themeColor="tint">
                Edit
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete dose scheduled ${formatDateTime(dose.scheduled_at)}`}
              onPress={handleDelete}
              hitSlop={12}>
              <ThemedText type="link" themeColor="error">
                Delete
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}
      </ThemedView>

      {isEditing ? (
        <ThemedView style={styles.editForm}>
          <ThemedText type="small" themeColor="textSecondary">
            When was it actually given?
          </ThemedText>
          <QuickTimeChips value={draft} onChange={setDraft} />
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(draft.toISOString())}
          </ThemedText>
          <ThemedView style={styles.editActions}>
            <Pressable accessibilityRole="button" onPress={() => setIsEditing(false)} hitSlop={12}>
              <ThemedText type="link" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
            {!dose.skipped ? (
              <Pressable accessibilityRole="button" onPress={handleMarkSkipped} disabled={isSaving} hitSlop={12}>
                <ThemedText type="link" themeColor="error">
                  Mark skipped instead
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" style={[styles.saveButton, { backgroundColor: theme.tint }]} onPress={saveGivenAt} disabled={isSaving}>
              <ThemedText themeColor="background" type="smallBold">
                {isSaving ? 'Saving…' : 'Save'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  info: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: 16 },
  editForm: { gap: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  saveButton: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
