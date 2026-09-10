import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDate, formatDateTime, summarizeSchedule } from '@/lib/format';
import { buildVetSummaryHtml, fetchVetSummaryData, type VetSummaryData } from '@/lib/vet-summary';

export default function VetSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<VetSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      setData(await fetchVetSummaryData(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleExport() {
    if (!data) return;
    setIsExporting(true);
    try {
      const html = buildVetSummaryHtml(data);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          await Print.printAsync({ uri });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <ThemedView style={styles.flex}>
        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : (
          <ThemedText style={styles.message}>Loading…</ThemedText>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="subtitle">Vet visit summary</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Active conditions, current medications, recent incidents, QOL/weight trends, and vet questions — ready to
          print or share before your next appointment.
        </ThemedText>

        <Button
          label={isExporting ? 'Preparing…' : Platform.OS === 'web' ? 'Print / Save as PDF' : 'Export PDF'}
          onPress={handleExport}
          disabled={isExporting}
          style={styles.button}
        />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Active conditions
        </ThemedText>
        {data.ailments.length === 0 ? (
          <ThemedText themeColor="textSecondary" type="small">
            None recorded.
          </ThemedText>
        ) : (
          data.ailments.map((a) => (
            <ThemedView key={a.id} style={styles.row}>
              <ThemedText type="smallBold">
                {a.name} ({a.status})
              </ThemedText>
              {a.diagnosed_at ? (
                <ThemedText themeColor="textSecondary" type="small">
                  Diagnosed {formatDate(a.diagnosed_at)}
                  {a.diagnosing_vet ? ` by ${a.diagnosing_vet}` : ''}
                </ThemedText>
              ) : null}
            </ThemedView>
          ))
        )}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Current medications
        </ThemedText>
        {data.medications.length === 0 ? (
          <ThemedText themeColor="textSecondary" type="small">
            None recorded.
          </ThemedText>
        ) : (
          data.medications.map((m) => (
            <ThemedView key={m.id} style={styles.row}>
              <ThemedText type="smallBold">
                {m.name} — {m.dosage} {m.unit}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {summarizeSchedule(m.schedule)}
              </ThemedText>
            </ThemedView>
          ))
        )}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recent incidents (last 30 days)
        </ThemedText>
        {data.recentIncidents.length === 0 ? (
          <ThemedText themeColor="textSecondary" type="small">
            None.
          </ThemedText>
        ) : (
          data.recentIncidents.map((log) => (
            <ThemedView key={log.id} style={styles.row}>
              <ThemedText type="small">{formatDateTime(log.occurred_at)}</ThemedText>
            </ThemedView>
          ))
        )}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Open questions for the vet
        </ThemedText>
        {data.openQuestions.length === 0 ? (
          <ThemedText themeColor="textSecondary" type="small">
            None.
          </ThemedText>
        ) : (
          data.openQuestions.map((q) => (
            <ThemedView key={q.id} style={styles.row}>
              <ThemedText type="small">{q.question}</ThemedText>
            </ThemedView>
          ))
        )}

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
  button: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { marginTop: 16, marginBottom: 4 },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  message: { textAlign: 'center', marginTop: 24 },
});
