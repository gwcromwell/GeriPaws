import type { Ailment, AilmentStatus, Medication, PetRole } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchAilments } from '@/lib/ailments';
import { summarizeSchedule } from '@/lib/format';
import { fetchMedications } from '@/lib/medications';
import { fetchMyRole } from '@/lib/pets';

const STATUS_LABEL: Record<AilmentStatus, string> = {
  active: 'Active',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

const STATUS_ORDER: AilmentStatus[] = ['active', 'monitoring', 'resolved'];

export default function AilmentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [ailments, setAilments] = useState<Ailment[]>([]);
  const [generalMeds, setGeneralMeds] = useState<Medication[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [ailmentData, medData, roleData] = await Promise.all([
        fetchAilments(id),
        fetchMedications(id),
        fetchMyRole(id),
      ]);
      setAilments(ailmentData);
      setGeneralMeds(medData.filter((m) => m.ailment_id === null));
      setRole(roleData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const canEdit = role === 'owner' || role === 'caregiver';

  return (
    <ThemedView style={styles.container}>
      {error ? <ThemedText themeColor="error">{error}</ThemedText> : null}

      {STATUS_ORDER.map((status) => {
        const items = ailments.filter((a) => a.status === status);
        if (items.length === 0) return null;
        return (
          <ThemedView key={status} style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {STATUS_LABEL[status]}
            </ThemedText>
            {items.map((ailment) => (
              <Pressable
                key={ailment.id}
                style={styles.row}
                onPress={() =>
                  router.push({ pathname: '/pets/[id]/ailments/[ailmentId]', params: { id, ailmentId: ailment.id } })
                }>
                <ThemedText type="smallBold">{ailment.name}</ThemedText>
                {ailment.diagnosing_vet ? (
                  <ThemedText themeColor="textSecondary" type="small">
                    Dx by {ailment.diagnosing_vet}
                  </ThemedText>
                ) : null}
              </Pressable>
            ))}
          </ThemedView>
        );
      })}

      {ailments.length === 0 && !isLoading ? (
        <ThemedText themeColor="textSecondary" style={styles.message}>
          No conditions recorded yet.
        </ThemedText>
      ) : null}

      {canEdit ? (
        <Link href={{ pathname: '/pets/[id]/ailments/new', params: { id } }} asChild>
          <Pressable style={styles.addButton}>
            <ThemedText themeColor="background" type="smallBold">
              + Add a condition
            </ThemedText>
          </Pressable>
        </Link>
      ) : null}

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          General / Wellness
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
          Supplements or medications not tied to a diagnosed condition
        </ThemedText>
        {generalMeds.map((med) => (
          <Pressable
            key={med.id}
            style={styles.row}
            onPress={() =>
              router.push({ pathname: '/pets/[id]/medications/[medicationId]', params: { id, medicationId: med.id } })
            }>
            <ThemedText type="smallBold">
              {med.name} — {med.dosage} {med.unit}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {summarizeSchedule(med.schedule)}
            </ThemedText>
          </Pressable>
        ))}
        {generalMeds.length === 0 ? (
          <ThemedText themeColor="textSecondary" type="small">
            None yet.
          </ThemedText>
        ) : null}
        {canEdit ? (
          <Link href={{ pathname: '/pets/[id]/medications/new', params: { id } }} asChild>
            <Pressable style={styles.secondaryButton}>
              <ThemedText themeColor="tint" type="smallBold">
                + Add general medication
              </ThemedText>
            </Pressable>
          </Link>
        ) : null}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  section: { gap: 4, marginTop: 16 },
  sectionTitle: { marginBottom: 2 },
  hint: { marginBottom: 4 },
  message: { textAlign: 'center', marginTop: 24 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  addButton: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});
