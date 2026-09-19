import type { Ailment, AilmentStatus, Medication, PetRole } from '@geripaws/shared';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScreenLoad } from '@/hooks/use-screen-load';
import { useTheme } from '@/hooks/use-theme';
import { fetchAilments } from '@/lib/ailments';
import { summarizeSchedule } from '@/lib/format';
import { fetchMedications } from '@/lib/medications';
import { fetchMyRole } from '@/lib/pets';
import { MaxContentWidth } from '@/constants/theme';

const STATUS_LABEL: Record<AilmentStatus, string> = {
  active: 'Active',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

const STATUS_ORDER: AilmentStatus[] = ['active', 'monitoring', 'resolved'];

export default function AilmentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tokens = useTheme();
  const [ailments, setAilments] = useState<Ailment[]>([]);
  const [generalMeds, setGeneralMeds] = useState<Medication[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [ailmentData, medData, roleData] = await Promise.all([
      fetchAilments(id),
      fetchMedications(id),
      fetchMyRole(id),
    ]);
    setAilments(ailmentData);
    setGeneralMeds(medData.filter((m) => m.ailment_id === null));
    setRole(roleData);
  }, [id]);

  const { isLoading, error } = useScreenLoad(load, 'Failed to load');

  const canEdit = role === 'owner' || role === 'caregiver';

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
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
              <Pressable accessibilityRole="button"
                key={ailment.id}
                style={[styles.chip, { backgroundColor: tokens.panel, borderColor: tokens.border }]}
                onPress={() =>
                  router.push({ pathname: '/pets/[id]/ailments/[ailmentId]', params: { id, ailmentId: ailment.id } })
                }>
                <ThemedText style={{ fontFamily: tokens.displayFont, fontWeight: '400', fontSize: 14 }}>{ailment.name}</ThemedText>
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
          <Button variant="secondary" label="+ Add a condition" />
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
          <Pressable accessibilityRole="button"
            key={med.id}
            style={[styles.row, { borderBottomColor: tokens.border }]}
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
            <Button variant="secondary" label="+ Add general medication" />
          </Link>
        ) : null}
      </ThemedView>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', padding: 16, gap: 8 },
  section: { gap: 4, marginTop: 16 },
  sectionTitle: { marginBottom: 2 },
  hint: { marginBottom: 4 },
  message: { textAlign: 'center', marginTop: 24 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 2,
  },
  chip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    marginBottom: 8,
  },
});
