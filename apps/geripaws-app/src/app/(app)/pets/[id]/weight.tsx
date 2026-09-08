import type { HabitLog, PetRole, WeightDetails } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrendChart } from '@/components/trend-chart';
import { fetchHabitLogs } from '@/lib/habits';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { fetchMyRole } from '@/lib/pets';

export default function WeightScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [logData, roleData] = await Promise.all([fetchHabitLogs(id, 50, 'weight'), fetchMyRole(id)]);
      setLogs(logData);
      setRole(roleData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weight history');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const canLog = role === 'owner' || role === 'caregiver';
  const latest = logs[0];
  const previous = logs[1];
  const latestDetails = latest?.details as WeightDetails | undefined;
  const previousDetails = previous?.details as WeightDetails | undefined;
  const delta =
    latestDetails && previousDetails && latestDetails.unit === previousDetails.unit
      ? latestDetails.value - previousDetails.value
      : null;

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">Weight</ThemedText>

        {latest && latestDetails ? (
          <ThemedView style={styles.latestCard}>
            <ThemedText type="title" style={styles.value}>
              {latestDetails.value} {latestDetails.unit}
            </ThemedText>
            {delta !== null && Math.abs(delta) >= 0.1 ? (
              <ThemedText type="small" themeColor={delta > 0 ? 'tint' : 'error'}>
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)} {latestDetails.unit} since last weigh-in
              </ThemedText>
            ) : null}
            <ThemedText themeColor="textSecondary" type="small">
              {formatRelativeTime(latest.occurred_at)}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedText themeColor="textSecondary" type="small">
            No weight logged yet.
          </ThemedText>
        )}

        {logs.length > 1 ? (
          <TrendChart points={[...logs].reverse().map((l) => ({ id: l.id, date: l.occurred_at, value: (l.details as WeightDetails).value }))} />
        ) : null}

        {canLog ? (
          <Pressable
            style={styles.button}
            onPress={() => router.push({ pathname: '/pets/[id]/log/[type]', params: { id, type: 'weight' } })}>
            <ThemedText themeColor="background" type="smallBold">
              Log weight
            </ThemedText>
          </Pressable>
        ) : null}

        {logs.length > 0 ? (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              History
            </ThemedText>
            {logs.map((log) => {
              const details = log.details as WeightDetails;
              return (
                <Pressable
                  key={log.id}
                  style={styles.row}
                  disabled={!canLog}
                  onPress={() =>
                    router.push({ pathname: '/pets/[id]/log/[type]', params: { id, type: 'weight', logId: log.id } })
                  }>
                  <ThemedText type="smallBold">
                    {details.value} {details.unit}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {formatDateTime(log.occurred_at)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </>
        ) : null}

        <Link href={{ pathname: '/pets/[id]/history', params: { id, tab: 'weight' } }} style={styles.historyLink}>
          <ThemedText type="link" themeColor="tint">
            Manage in History
          </ThemedText>
        </Link>

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 8 },
  latestCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
    marginTop: 4,
  },
  value: { fontSize: 36 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: { marginTop: 16, marginBottom: 4 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  historyLink: { alignSelf: 'center', marginTop: 16 },
  message: { textAlign: 'center', marginTop: 12 },
});
