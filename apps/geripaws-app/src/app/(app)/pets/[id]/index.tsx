import type { HabitLog, HabitType, Medication, Pet, PetRole } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { QuickTimeChips } from '@/components/quick-time-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchLatestByType } from '@/lib/habits';
import { formatDateTime, formatRelativeTime, formatTimeOfDay, isOverdue } from '@/lib/format';
import { computeTodayDueDoses, getDayStart, type DueDose } from '@/lib/medication-schedule';
import { fetchDosesSince, fetchMedications, markDoseGiven, markDoseSkipped } from '@/lib/medications';
import { fetchMyRole, fetchPet } from '@/lib/pets';

function doseKey(due: DueDose): string {
  return `${due.medication.id}-${due.scheduledAt.toISOString()}`;
}

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
  const [dueDoses, setDueDoses] = useState<DueDose[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [givingKey, setGivingKey] = useState<string | null>(null);
  const [givenAtDraft, setGivenAtDraft] = useState<Date>(new Date());
  const [isSavingDose, setIsSavingDose] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const petData = await fetchPet(id);
      const dayStart = getDayStart(new Date(), petData.day_boundary_hour, petData.timezone);

      const [roleData, latestData, medications, dosesToday] = await Promise.all([
        fetchMyRole(id),
        fetchLatestByType(id),
        fetchMedications(id),
        fetchDosesSince(id, dayStart),
      ]);

      setPet(petData);
      setRole(roleData);
      setLatest(latestData);
      setDueDoses(computeTodayDueDoses(petData, medications, dosesToday));
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

  function startGivingDose(due: DueDose) {
    setGivingKey(doseKey(due));
    setGivenAtDraft(new Date());
  }

  async function confirmGiveDose(medication: Medication, scheduledAt: Date) {
    setIsSavingDose(true);
    try {
      await markDoseGiven(id, medication.id, scheduledAt, givenAtDraft);
      setGivingKey(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record dose');
    } finally {
      setIsSavingDose(false);
    }
  }

  async function handleSkipDose(medication: Medication, scheduledAt: Date) {
    try {
      await markDoseSkipped(id, medication.id, scheduledAt);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record dose');
    }
  }

  if (!pet) {
    return (
      <ThemedView style={styles.container}>
        {error ? <ThemedText themeColor="error">{error}</ThemedText> : <ThemedText>Loading…</ThemedText>}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.headerRow}>
        <ThemedText type="title" style={styles.title}>
          {pet.name}
        </ThemedText>
        <ThemedView style={styles.headerLinks}>
          <Link href={{ pathname: '/pets/[id]/ailments', params: { id: pet.id } }}>
            <ThemedText type="link" themeColor="tint">
              Ailments
            </ThemedText>
          </Link>
          <Link href={{ pathname: '/pets/[id]/qol', params: { id: pet.id } }}>
            <ThemedText type="link" themeColor="tint">
              QOL
            </ThemedText>
          </Link>
          <Link href={{ pathname: '/pets/[id]/sharing', params: { id: pet.id } }}>
            <ThemedText type="link" themeColor="tint">
              Sharing
            </ThemedText>
          </Link>
        </ThemedView>
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

      {dueDoses.length > 0 ? (
        <>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Medications
          </ThemedText>
          {dueDoses.map((due) => {
            const key = doseKey(due);
            const isGiving = givingKey === key;
            return (
              <ThemedView
                key={key}
                style={[styles.doseRow, due.status === 'overdue' && styles.doseRowOverdue]}>
                <ThemedView style={styles.doseRowTop}>
                  <ThemedView style={styles.doseInfo}>
                    <ThemedText type="smallBold">
                      {due.medication.name} — {due.medication.dosage} {due.medication.unit}
                    </ThemedText>
                    <ThemedText type="small" themeColor={due.status === 'overdue' ? 'error' : 'textSecondary'}>
                      {formatTimeOfDay(
                        `${String(due.scheduledAt.getHours()).padStart(2, '0')}:${String(due.scheduledAt.getMinutes()).padStart(2, '0')}`
                      )}
                      {due.status === 'given'
                        ? ' · Given'
                        : due.status === 'skipped'
                          ? ' · Skipped'
                          : due.status === 'overdue'
                            ? ' · Overdue'
                            : ''}
                    </ThemedText>
                  </ThemedView>
                  {canLog && due.status !== 'given' && due.status !== 'skipped' && !isGiving ? (
                    <ThemedView style={styles.doseActions}>
                      <Pressable onPress={() => startGivingDose(due)} hitSlop={8}>
                        <ThemedText type="link" themeColor="tint">
                          Give
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => handleSkipDose(due.medication, due.scheduledAt)} hitSlop={8}>
                        <ThemedText type="link" themeColor="textSecondary">
                          Skip
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  ) : null}
                </ThemedView>

                {isGiving ? (
                  <ThemedView style={styles.giveForm}>
                    <ThemedText type="small" themeColor="textSecondary">
                      When was it given?
                    </ThemedText>
                    <QuickTimeChips value={givenAtDraft} onChange={setGivenAtDraft} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDateTime(givenAtDraft.toISOString())}
                    </ThemedText>
                    <ThemedView style={styles.giveFormActions}>
                      <Pressable onPress={() => setGivingKey(null)} hitSlop={8}>
                        <ThemedText type="link" themeColor="textSecondary">
                          Cancel
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.confirmButton}
                        disabled={isSavingDose}
                        onPress={() => confirmGiveDose(due.medication, due.scheduledAt)}>
                        <ThemedText themeColor="background" type="smallBold">
                          {isSavingDose ? 'Saving…' : 'Confirm'}
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  </ThemedView>
                ) : null}
              </ThemedView>
            );
          })}
        </>
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLinks: { flexDirection: 'row', gap: 16 },
  title: { fontSize: 28 },
  sectionTitle: { marginTop: 8 },
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
  doseRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  doseRowOverdue: { borderColor: '#D33A3A' },
  doseRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  doseInfo: { flex: 1, gap: 2 },
  doseActions: { flexDirection: 'row', gap: 16 },
  giveForm: { gap: 8, marginTop: 4 },
  giveFormActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  confirmButton: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  historyLink: { alignSelf: 'center', marginTop: 12 },
  message: { textAlign: 'center', marginTop: 12 },
});
