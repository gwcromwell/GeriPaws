import type { QolCadence } from '@geripaws/shared';
import { qolSettingsSchema } from '@geripaws/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { PackSwitcher } from '@/components/pack-switcher';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { fetchMyPreferences, updateMyPreferences } from '@/lib/pets';
import { fetchQolSettings, upsertQolSettings } from '@/lib/qol';

export default function PreferencesScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [showWalk, setShowWalk] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [showFood, setShowFood] = useState(true);
  const [showWeight, setShowWeight] = useState(true);
  const [hideGiven, setHideGiven] = useState(false);

  const [qolEnabled, setQolEnabled] = useState(false);
  const [qolCadence, setQolCadence] = useState<QolCadence>('weekly');
  const [qolShowOnToday, setQolShowOnToday] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [prefs, qol] = await Promise.all([fetchMyPreferences(id), fetchQolSettings(id)]);
      if (prefs) {
        setShowWalk(prefs.show_walk_tile);
        setShowWater(prefs.show_water_tile);
        setShowFood(prefs.show_food_tile);
        setShowWeight(prefs.show_weight_tile);
        setHideGiven(prefs.hide_given_doses);
      }
      if (qol) {
        setQolEnabled(qol.enabled);
        setQolCadence(qol.cadence);
        setQolShowOnToday(qol.show_on_today);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        <ChoiceChips
          label="Walk"
          options={[
            { value: 'on', label: 'Show' },
            { value: 'off', label: 'Hide' },
          ]}
          value={showWalk ? 'on' : 'off'}
          onChange={(v) => setShowWalk(v === 'on')}
        />
        <ChoiceChips
          label="Water"
          options={[
            { value: 'on', label: 'Show' },
            { value: 'off', label: 'Hide' },
          ]}
          value={showWater ? 'on' : 'off'}
          onChange={(v) => setShowWater(v === 'on')}
        />
        <ChoiceChips
          label="Food"
          options={[
            { value: 'on', label: 'Show' },
            { value: 'off', label: 'Hide' },
          ]}
          value={showFood ? 'on' : 'off'}
          onChange={(v) => setShowFood(v === 'on')}
        />
        <ChoiceChips
          label="Weight"
          options={[
            { value: 'on', label: 'Show' },
            { value: 'off', label: 'Hide' },
          ]}
          value={showWeight ? 'on' : 'off'}
          onChange={(v) => setShowWeight(v === 'on')}
        />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Medication list
        </ThemedText>
        <ChoiceChips
          label="Given doses"
          helperText="Default shows every dose today, with given ones clearly marked and moved to the bottom"
          options={[
            { value: 'show', label: 'Show them' },
            { value: 'hide', label: 'Hide for a cleaner list' },
          ]}
          value={hideGiven ? 'hide' : 'show'}
          onChange={(v) => setHideGiven(v === 'hide')}
        />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quality of life
        </ThemedText>
        <ChoiceChips
          label="Tracking"
          helperText="Optional — off by default"
          options={[
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ]}
          value={qolEnabled ? 'on' : 'off'}
          onChange={(v) => setQolEnabled(v === 'on')}
        />
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
            <ChoiceChips
              label="Show on Today screen"
              helperText="QOL can be a heavy thing to see every time you open the app — off keeps it out of sight until you go looking for it"
              options={[
                { value: 'show', label: 'Show it there' },
                { value: 'hide', label: 'Keep it off Today' },
              ]}
              value={qolShowOnToday ? 'show' : 'hide'}
              onChange={(v) => setQolShowOnToday(v === 'show')}
            />
          </>
        ) : null}

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable accessibilityRole="button" style={[styles.button, { backgroundColor: theme.tint }]} onPress={handleSave} disabled={isSubmitting}>
          <ThemedText themeColor="background" type="smallBold">
            {isSubmitting ? 'Saving…' : 'Save'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 12 },
  sectionTitle: { marginTop: 20, marginBottom: 2 },
  hint: { marginBottom: 4 },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  message: { textAlign: 'center' },
});
