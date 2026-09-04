import type { HabitLog, HabitType, PetRole } from '@geripaws/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { TabBar } from '@/components/tab-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteHabitLog, fetchHabitLogs } from '@/lib/habits';
import { formatDateTime, summarizeHabitLog } from '@/lib/format';
import { fetchMyRole } from '@/lib/pets';

const TYPE_LABEL: Record<HabitLog['type'], string> = {
  walk: 'Walk',
  water: 'Water',
  food: 'Food',
  incident: 'Incident',
};

type Tab = 'all' | HabitType;

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'walk', label: 'Walk' },
  { value: 'water', label: 'Water' },
  { value: 'food', label: 'Food' },
  { value: 'incident', label: 'Incidents' },
];

export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [logData, roleData] = await Promise.all([
        fetchHabitLogs(id, 50, tab === 'all' ? undefined : tab),
        fetchMyRole(id),
      ]);
      setLogs(logData);
      setRole(roleData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [id, tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const canEdit = role === 'owner' || role === 'caregiver';

  return (
    <ThemedView style={styles.container}>
      <TabBar tabs={TABS} value={tab} onChange={setTab} />
      <ThemedView style={styles.body}>
      {error ? <ThemedText themeColor="error">{error}</ThemedText> : null}
      {canEdit && logs.length > 0 ? (
        <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
          Tap an entry to edit it
        </ThemedText>
      ) : null}
      <FlatList
        data={logs}
        keyExtractor={(log) => log.id}
        refreshing={isLoading}
        onRefresh={load}
        contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <ThemedText themeColor="textSecondary" style={styles.message}>
              {tab === 'all' ? 'Nothing logged yet.' : `No ${TYPE_LABEL[tab].toLowerCase()} entries yet.`}
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            disabled={!canEdit}
            onPress={() =>
              router.push({ pathname: '/pets/[id]/log/[type]', params: { id, type: item.type, logId: item.id } })
            }>
            <ThemedView style={styles.rowMain}>
              {tab === 'all' ? <ThemedText type="smallBold">{TYPE_LABEL[item.type]}</ThemedText> : null}
              <ThemedText themeColor="textSecondary" type="small">
                {formatDateTime(item.occurred_at)}
              </ThemedText>
              <ThemedText type="small">{summarizeHabitLog(item)}</ThemedText>
            </ThemedView>
            {canEdit ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  deleteHabitLog(item.id).then(load);
                }}
                hitSlop={8}>
                <ThemedText themeColor="error" type="small">
                  Delete
                </ThemedText>
              </Pressable>
            ) : null}
          </Pressable>
        )}
      />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, padding: 16 },
  list: { gap: 4 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  message: { textAlign: 'center' },
  hint: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  rowMain: { flex: 1, gap: 2 },
});
