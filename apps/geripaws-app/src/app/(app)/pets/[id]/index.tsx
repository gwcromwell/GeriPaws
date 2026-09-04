import type { HabitLog, HabitType, Pet, PetRole } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchLatestByType } from '@/lib/habits';
import { formatRelativeTime, isOverdue } from '@/lib/format';
import { fetchMyRole, fetchPet } from '@/lib/pets';

const TILES: { type: Extract<HabitType, 'walk' | 'water' | 'food'>; label: string }[] = [
  { type: 'walk', label: 'Walk' },
  { type: 'water', label: 'Water' },
  { type: 'food', label: 'Food' },
];

export default function TodayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [role, setRole] = useState<PetRole | null>(null);
  const [latest, setLatest] = useState<Record<HabitType, HabitLog | null>>({
    walk: null,
    water: null,
    food: null,
    incident: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [petData, roleData, latestData] = await Promise.all([
        fetchPet(id),
        fetchMyRole(id),
        fetchLatestByType(id),
      ]);
      setPet(petData);
      setRole(roleData);
      setLatest(latestData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dog');
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

  if (!pet) {
    return (
      <ThemedView style={styles.container}>
        {error ? <ThemedText themeColor="error">{error}</ThemedText> : <ThemedText>Loading…</ThemedText>}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title" style={styles.title}>
          {pet.name}
        </ThemedText>
        <Link href={{ pathname: '/pets/[id]/sharing', params: { id: pet.id } }}>
          <ThemedText type="link" themeColor="tint">
            Sharing
          </ThemedText>
        </Link>
      </ThemedView>

      {role === 'viewer' ? (
        <ThemedText themeColor="textSecondary" type="small">
          You have view-only access to {pet.name}.
        </ThemedText>
      ) : null}

      {TILES.map(({ type, label }) => {
        const log = latest[type];
        const overdue = log ? isOverdue(log.occurred_at, type) : false;
        return (
          <Pressable
            key={type}
            disabled={!canLog}
            onPress={() => router.push({ pathname: '/pets/[id]/log/[type]', params: { id: pet.id, type } })}
            style={[styles.tile, overdue && styles.tileOverdue]}>
            <ThemedText type="subtitle">{label}</ThemedText>
            <ThemedText themeColor={overdue ? 'error' : 'textSecondary'}>
              {log ? `${overdue ? 'Overdue — ' : ''}${formatRelativeTime(log.occurred_at)}` : 'Not logged yet'}
            </ThemedText>
          </Pressable>
        );
      })}

      {canLog ? (
        <Pressable
          style={styles.incidentButton}
          onPress={() => router.push({ pathname: '/pets/[id]/log/[type]', params: { id: pet.id, type: 'incident' } })}>
          <ThemedText themeColor="error" type="smallBold">
            Log an accident / incident
          </ThemedText>
        </Pressable>
      ) : null}

      <Link href={{ pathname: '/pets/[id]/history', params: { id: pet.id } }} style={styles.historyLink}>
        <ThemedText type="link" themeColor="tint">
          View history
        </ThemedText>
      </Link>

      {error ? (
        <ThemedText themeColor="error" style={styles.message}>
          {error}
        </ThemedText>
      ) : null}
      {isLoading ? (
        <ThemedText themeColor="textSecondary" type="small" style={styles.message}>
          Refreshing…
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28 },
  tile: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  tileOverdue: {
    borderColor: '#D33A3A',
  },
  incidentButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D33A3A',
    alignItems: 'center',
    marginTop: 4,
  },
  historyLink: { alignSelf: 'center', marginTop: 12 },
  message: { textAlign: 'center', marginTop: 12 },
});
