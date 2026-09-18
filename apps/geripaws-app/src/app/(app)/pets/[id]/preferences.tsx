import type { IncidentCategory, QolCadence } from '@geripaws/shared';
import { INCIDENT_CATEGORIES, qolSettingsSchema } from '@geripaws/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { MultiChoiceChips } from '@/components/multi-choice-chips';
import { PackSwitcher } from '@/components/pack-switcher';
import { SwitchRow } from '@/components/switch-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScreenLoad } from '@/hooks/use-screen-load';
import { fetchMyPreferences, updateMyPreferences } from '@/lib/pets';
import { fetchQolSettings, upsertQolSettings } from '@/lib/qol';

const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  urine: 'Urine',
  stool: 'Stool',
  vomit: 'Vomit',
  fall: 'Fall',
  seizure: 'Seizure',
  disorientation: 'Disorientation',
  other: 'Other',
};
const INCIDENT_CATEGORY_OPTIONS = INCIDENT_CATEGORIES.map((value) => ({
  value,
  label: INCIDENT_CATEGORY_LABEL[value],
}));

export default function PreferencesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [showWalk, setShowWalk] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [showFood, setShowFood] = useState(true);
  const [showWeight, setShowWeight] = useState(true);
  const [hideGiven, setHideGiven] = useState(false);

  const [notifyMedicationDue, setNotifyMedicationDue] = useState(true);
  const [notifyWalkDue, setNotifyWalkDue] = useState(true);
  const [notifyFoodDue, setNotifyFoodDue] = useState(true);
  const [notifyWaterDue, setNotifyWaterDue] = useState(true);
  const [notifyCompletedByOthers, setNotifyCompletedByOthers] = useState(true);
  const [notifyIncidentCategories, setNotifyIncidentCategories] = useState<IncidentCategory[]>(INCIDENT_CATEGORIES);

  const [qolEnabled, setQolEnabled] = useState(false);
  const [qolCadence, setQolCadence] = useState<QolCadence>('weekly');
  const [qolShowOnToday, setQolShowOnToday] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [prefs, qol] = await Promise.all([fetchMyPreferences(id), fetchQolSettings(id)]);
    if (prefs) {
      setShowWalk(prefs.show_walk_tile);
      setShowWater(prefs.show_water_tile);
      setShowFood(prefs.show_food_tile);
      setShowWeight(prefs.show_weight_tile);
      setHideGiven(prefs.hide_given_doses);
      setNotifyMedicationDue(prefs.notify_medication_due);
      setNotifyWalkDue(prefs.notify_walk_due);
      setNotifyFoodDue(prefs.notify_food_due);
      setNotifyWaterDue(prefs.notify_water_due);
      setNotifyCompletedByOthers(prefs.notify_completed_by_others);
      setNotifyIncidentCategories(prefs.notify_incident_categories as IncidentCategory[]);
    }
    if (qol) {
      setQolEnabled(qol.enabled);
      setQolCadence(qol.cadence);
      setQolShowOnToday(qol.show_on_today);
    }
  }, [id]);

  const { error, setError } = useScreenLoad(load, 'Failed to load preferences');

  async function handleSave() {
    const qolResult = qolSettingsSchema.safeParse({ enabled: qolEnabled, cadence: qolCadence, showOnToday: qolShowOnToday });
    if (!qolResult.success) {
      setError(qolResult.error.issues[0]?.message ?? 'Invalid settings');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await Promise.all([
        updateMyPreferences(id, {
          showWalkTile: showWalk,
          showWaterTile: showWater,
          showFoodTile: showFood,
          showWeightTile: showWeight,
          hideGivenDoses: hideGiven,
          notifyMedicationDue,
          notifyWalkDue,
          notifyFoodDue,
          notifyWaterDue,
          notifyCompletedByOthers,
          notifyIncidentCategories,
        }),
        upsertQolSettings(id, qolResult.data),
      ]);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">Today screen preferences</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          These are personal to you — other caregivers can set their own.
        </ThemedText>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Appearance
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
          Saved on this device, across every dog you view here
        </ThemedText>
        <PackSwitcher />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick-glance tiles
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
          Shown on Today are on by default
        </ThemedText>
        <SwitchRow label="Walk" value={showWalk} onValueChange={setShowWalk} />
        <SwitchRow label="Water" value={showWater} onValueChange={setShowWater} />
        <SwitchRow label="Food" value={showFood} onValueChange={setShowFood} />
        <SwitchRow label="Weight" value={showWeight} onValueChange={setShowWeight} />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Medication list
        </ThemedText>
        <SwitchRow
          label="Hide given doses"
          helperText="Default shows every dose today, with given ones clearly marked and moved to the bottom"
          value={hideGiven}
          onValueChange={setHideGiven}
        />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quality of life
        </ThemedText>
        <SwitchRow label="Tracking" helperText="Optional — off by default" value={qolEnabled} onValueChange={setQolEnabled} />
        {qolEnabled ? (
          <>
            <ChoiceChips
              label="Check-in cadence"
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              value={qolCadence}
              onChange={(v) => v && setQolCadence(v)}
            />
            <SwitchRow
              label="Show on Today screen"
              helperText="QOL can be a heavy thing to see every time you open the app — off keeps it out of sight until you go looking for it"
              value={qolShowOnToday}
              onValueChange={setQolShowOnToday}
            />
          </>
        ) : null}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Notifications
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
          Personal to you — other caregivers set their own for this dog
        </ThemedText>
        <SwitchRow label="Medication due" value={notifyMedicationDue} onValueChange={setNotifyMedicationDue} />
        <SwitchRow label="Walk due" value={notifyWalkDue} onValueChange={setNotifyWalkDue} />
        <SwitchRow label="Food due" value={notifyFoodDue} onValueChange={setNotifyFoodDue} />
        <SwitchRow label="Water due" value={notifyWaterDue} onValueChange={setNotifyWaterDue} />
        <SwitchRow
          label="Completed by someone else"
          helperText="e.g. Amanda gave Kenobi's 8pm Keppra"
          value={notifyCompletedByOthers}
          onValueChange={setNotifyCompletedByOthers}
        />
        <MultiChoiceChips
          label="Incidents logged by someone else"
          helperText="Choose which kinds — e.g. seizures, but not house-soiling accidents"
          options={INCIDENT_CATEGORY_OPTIONS}
          values={notifyIncidentCategories}
          onChange={setNotifyIncidentCategories}
        />

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Button label={isSubmitting ? 'Saving…' : 'Save'} onPress={handleSave} disabled={isSubmitting} style={styles.button} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 12 },
  sectionTitle: { marginTop: 20, marginBottom: 2 },
  hint: { marginBottom: 4 },
  button: { marginTop: 16 },
  message: { textAlign: 'center' },
});
