import type { QolCadence } from '@geripaws/shared';
import { qolSettingsSchema } from '@geripaws/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchQolSettings, upsertQolSettings } from '@/lib/qol';


import { useTheme } from '@/hooks/use-theme';
export default function QolSettingsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [enabled, setEnabled] = useState(false);
  const [cadence, setCadence] = useState<QolCadence>('weekly');
  const [showOnToday, setShowOnToday] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const settings = await fetchQolSettings(id);
      if (settings) {
        setEnabled(settings.enabled);
        setCadence(settings.cadence);
        setShowOnToday(settings.show_on_today);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSave() {
    const result = qolSettingsSchema.safeParse({ enabled, cadence, showOnToday });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid settings');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await upsertQolSettings(id, result.data);
      router.replace({ pathname: '/pets/[id]/qol', params: { id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Quality of Life settings</ThemedText>

      <ChoiceChips
        label="Tracking"
        helperText="Optional — off by default"
        options={[
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ]}
        value={enabled ? 'on' : 'off'}
        onChange={(v) => setEnabled(v === 'on')}
      />

      {enabled ? (
        <>
          <ChoiceChips
            label="Check-in cadence"
            helperText="How often you'd like to be prompted for a check-in"
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={cadence}
            onChange={(v) => v && setCadence(v)}
          />

          <ChoiceChips
            label="Today screen"
            helperText="QOL can be a heavy thing to see every time you open the app — off keeps it out of sight until you go looking for it"
            options={[
              { value: 'show', label: 'Show it there' },
              { value: 'hide', label: "Keep it off Today" },
            ]}
            value={showOnToday ? 'show' : 'hide'}
            onChange={(v) => setShowOnToday(v === 'show')}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  message: { textAlign: 'center' },
});
