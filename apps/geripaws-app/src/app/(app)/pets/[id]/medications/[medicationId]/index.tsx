import type { Ailment, Medication, MedicationDose, MedicationRefill, PetRole } from '@geripaws/shared';
import { computeRefillProjection, refillSetupSchema } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { DoseRow } from '@/components/dose-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { formatDate, summarizeSchedule } from '@/lib/format';
import { fetchAilment } from '@/lib/ailments';
import {
  deleteMedication,
  fetchDosesForMedication,
  fetchMedication,
  fetchRefill,
  markDoseGiven,
  upsertRefill,
} from '@/lib/medications';
import { fetchMyRole } from '@/lib/pets';

import { useTheme } from '@/hooks/use-theme';

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function MedicationDetailScreen() {
  const theme = useTheme();
  const { id, medicationId } = useLocalSearchParams<{ id: string; medicationId: string }>();
  const router = useRouter();

  const [medication, setMedication] = useState<Medication | null>(null);
  const [ailment, setAilment] = useState<Ailment | null>(null);
  const [refill, setRefill] = useState<MedicationRefill | null>(null);
  const [doses, setDoses] = useState<MedicationDose[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [restockValue, setRestockValue] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  const load = useCallback(async () => {
    if (!medicationId) return;
    try {
      const [medData, refillData, doseData, roleData] = await Promise.all([
        fetchMedication(medicationId),
        fetchRefill(medicationId),
        fetchDosesForMedication(medicationId),
        fetchMyRole(id),
      ]);
      setMedication(medData);
      setAilment(medData.ailment_id ? await fetchAilment(medData.ailment_id) : null);
      setRefill(refillData);
      setDoses(doseData);
      setRole(roleData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medication');
    }
  }, [id, medicationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const canEdit = role === 'owner' || role === 'caregiver';

  async function handleLogNow() {
    if (!medication) return;
    try {
      await markDoseGiven(id, medication.id, new Date());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log dose');
    }
  }

  async function handleRestock() {
    if (!medication || !restockValue) return;
    const result = refillSetupSchema.safeParse({
      countOnHand: Number(restockValue),
      unitPerDose: refill?.unit_per_dose ?? 1,
      lowStockThreshold: refill?.low_stock_threshold ?? 7,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid amount');
      return;
    }
    setIsRestocking(true);
    try {
      await upsertRefill(medication.id, id, result.data);
      setRestockValue('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update refill count');
    } finally {
      setIsRestocking(false);
    }
  }

  function handleDelete() {
    if (!medication) return;
    confirm('Delete medication', 'This also removes its dose and refill history. This cannot be undone.', async () => {
      try {
        await deleteMedication(medication.id);
        if (ailment) {
          router.replace({ pathname: '/pets/[id]/ailments/[ailmentId]', params: { id, ailmentId: ailment.id } });
        } else {
          router.replace({ pathname: '/pets/[id]/ailments', params: { id } });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete');
      }
    });
  }

  if (!medication) {
    return (
      <ThemedView style={styles.container}>
        {error ? <ThemedText themeColor="error">{error}</ThemedText> : <ThemedText>Loading…</ThemedText>}
      </ThemedView>
    );
  }

  const projection = refill ? computeRefillProjection(
    { countOnHand: refill.count_on_hand, unitPerDose: refill.unit_per_dose, lowStockThreshold: refill.low_stock_threshold },
    medication.schedule
  ) : null;

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {medication.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {medication.dosage} {medication.unit}
          {medication.route ? ` · ${medication.route}` : ''}
        </ThemedText>
        <ThemedText type="small">{summarizeSchedule(medication.schedule)}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {ailment ? `For: ${ailment.name}` : 'General / Wellness'}
        </ThemedText>
        {medication.active_until ? (
          <ThemedText themeColor="textSecondary" type="small">
            Stops {formatDate(medication.active_until)}
          </ThemedText>
        ) : null}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Refills
        </ThemedText>
        {refill ? (
          <>
            <ThemedText type="small">
              {refill.count_on_hand} {medication.unit} on hand
            </ThemedText>
            {projection?.daysRemaining !== null && projection?.daysRemaining !== undefined ? (
              <ThemedText
                type="small"
                themeColor={projection.isLowStock ? 'error' : 'textSecondary'}>
                {projection.isLowStock ? 'Low supply — ' : ''}
                ~{Math.max(0, Math.round(projection.daysRemaining))} days left
                {projection.runOutDate ? ` · runs out around ${formatDate(projection.runOutDate.toISOString())}` : ''}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Can't project for an as-needed schedule
              </ThemedText>
            )}
            {canEdit ? (
              <ThemedView style={styles.restockRow}>
                <ThemedTextInput
                  placeholder={`New count (currently ${refill.count_on_hand})`}
                  keyboardType="decimal-pad"
                  value={restockValue}
                  onChangeText={setRestockValue}
                />
                <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.secondaryButton, { borderColor: theme.tint }])} onPress={handleRestock} disabled={isRestocking}>
                  <ThemedText themeColor="tint" type="smallBold">
                    {isRestocking ? 'Saving…' : 'Update count'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : null}
          </>
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Refill tracking isn't set up for this medication.
            </ThemedText>
            {canEdit ? (
              <Link href={{ pathname: '/pets/[id]/medications/new', params: { id, medicationId: medication.id } }} asChild>
                <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.secondaryButton, { borderColor: theme.tint }])}>
                  <ThemedText themeColor="tint" type="smallBold">
                    Set up refill tracking
                  </ThemedText>
                </Pressable>
              </Link>
            ) : null}
          </>
        )}

        {canEdit ? (
          <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.secondaryButton, { borderColor: theme.tint }])} onPress={handleLogNow}>
            <ThemedText themeColor="tint" type="smallBold">
              Log a dose now
            </ThemedText>
          </Pressable>
        ) : null}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recent doses
        </ThemedText>
        {doses.map((dose) => (
          <DoseRow key={dose.id} dose={dose} canEdit={canEdit} onChanged={load} />
        ))}
        {doses.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No doses logged yet.
          </ThemedText>
        ) : null}

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        {canEdit ? (
          <>
            <Link href={{ pathname: '/pets/[id]/medications/new', params: { id, medicationId: medication.id } }} asChild>
              <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.secondaryButton, { borderColor: theme.tint }])}>
                <ThemedText themeColor="tint" type="smallBold">
                  Edit medication
                </ThemedText>
              </Pressable>
            </Link>
            <Pressable accessibilityRole="button" style={styles.deleteButton} onPress={handleDelete}>
              <ThemedText themeColor="error" type="smallBold">
                Delete medication
              </ThemedText>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 8 },
  title: { fontSize: 28 },
  sectionTitle: { marginTop: 20, marginBottom: 4 },
  restockRow: { gap: 8, marginTop: 8 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center', marginTop: 12 },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#D33A3A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
});
