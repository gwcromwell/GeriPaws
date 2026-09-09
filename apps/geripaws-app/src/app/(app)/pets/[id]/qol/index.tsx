import type { PetRole, QolResponse, QolSettings } from '@geripaws/shared';
import { computeQolDueStatus, computeQolTrend, QOL_FULL_MAX } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { TrendChart } from '@/components/trend-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDate } from '@/lib/format';
import { fetchMyRole } from '@/lib/pets';
import { fetchQolResponses, fetchQolSettings } from '@/lib/qol';

import { useTheme } from '@/hooks/use-theme';

const DUE_LABEL: Record<string, string> = {
  never: 'No check-ins yet',
  due: 'Check-in due',
  overdue: 'Check-in overdue',
  'not-due': 'Up to date',
};

export default function QolScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [settings, setSettings] = useState<QolSettings | null>(null);
  const [responses, setResponses] = useState<QolResponse[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [settingsData, roleData] = await Promise.all([fetchQolSettings(id), fetchMyRole(id)]);
      setSettings(settingsData);
      setRole(roleData);
      if (settingsData?.enabled) {
        setResponses(await fetchQolResponses(id));
      } else {
        setResponses([]);
      }
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
  const enabled = settings?.enabled ?? false;

  if (!isLoading && !enabled) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Quality of Life tracking</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          An optional check-in — daily, weekly, or monthly — to track your dog's quality of life over time using the
          established HHHHHMM veterinary scale (or a quicker 5-question version for busy days). Scores build a trend
          line so you and your vet can see the bigger picture, not just one bad or good day.
        </ThemedText>
        {canEdit ? (
          <Link href={{ pathname: '/pets/[id]/qol/settings', params: { id } }} asChild>
            <Pressable style={StyleSheet.flatten([styles.button, { backgroundColor: theme.tint }])}>
              <ThemedText themeColor="background" type="smallBold">
                Turn on Quality of Life tracking
              </ThemedText>
            </Pressable>
          </Link>
        ) : (
          <ThemedText themeColor="textSecondary" type="small">
            Not turned on for this dog yet.
          </ThemedText>
        )}
        {error ? <ThemedText themeColor="error">{error}</ThemedText> : null}
      </ThemedView>
    );
  }

  const latest = responses[0];
  const previous = responses[1];
  const due = settings ? computeQolDueStatus(latest?.survey_date ?? null, settings.cadence) : null;
  const trend = latest ? computeQolTrend(latest.total_score, previous?.total_score ?? null) : null;

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="subtitle">Quality of Life</ThemedText>
          {canEdit ? (
            <Link href={{ pathname: '/pets/[id]/qol/settings', params: { id } }}>
              <ThemedText type="link" themeColor="tint">
                Settings
              </ThemedText>
            </Link>
          ) : null}
        </ThemedView>

        {due ? (
          <ThemedText themeColor={due.status === 'overdue' ? 'error' : 'textSecondary'} type="small">
            {DUE_LABEL[due.status]}
          </ThemedText>
        ) : null}

        {latest ? (
          <ThemedView style={styles.latestCard}>
            <ThemedText type="title" style={styles.score}>
              {Math.round(latest.total_score)}
              <ThemedText themeColor="textSecondary" type="small">
                {' '}
                / 70
              </ThemedText>
            </ThemedText>
            {trend && trend.direction !== 'none' ? (
              <ThemedText
                type="small"
                themeColor={trend.direction === 'up' ? 'tint' : trend.direction === 'down' ? 'error' : 'textSecondary'}>
                {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—'} {Math.abs(Math.round(trend.delta))}{' '}
                since last check-in
              </ThemedText>
            ) : null}
            <ThemedText themeColor="textSecondary" type="small">
              Last check-in {formatDate(latest.survey_date)}
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedText themeColor="textSecondary" type="small">
            No check-ins yet.
          </ThemedText>
        )}

        {responses.length > 1 ? (
          <TrendChart
            points={responses.map((r) => ({ id: r.id, date: r.survey_date, value: r.total_score }))}
            maxValue={QOL_FULL_MAX}
          />
        ) : null}

        {canEdit ? (
          <Link href={{ pathname: '/pets/[id]/qol/new', params: { id } }} asChild>
            <Pressable style={StyleSheet.flatten([styles.button, { backgroundColor: theme.tint }])}>
              <ThemedText themeColor="background" type="smallBold">
                New check-in
              </ThemedText>
            </Pressable>
          </Link>
        ) : null}

        {responses.length > 0 ? (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              History
            </ThemedText>
            {responses.map((response) => (
              <Pressable
                key={response.id}
                style={styles.row}
                disabled={!canEdit}
                onPress={() =>
                  router.push({ pathname: '/pets/[id]/qol/new', params: { id, responseId: response.id } })
                }>
                <ThemedText type="smallBold">{formatDate(response.survey_date)}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {Math.round(response.total_score)} / 70 · {response.scores.scale === 'full' ? 'Full' : 'Quick'}
                </ThemedText>
                {response.notes ? <ThemedText type="small">{response.notes}</ThemedText> : null}
              </Pressable>
            ))}
          </>
        ) : null}

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { lineHeight: 20 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  latestCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
    marginTop: 4,
  },
  score: { fontSize: 36 },
  sectionTitle: { marginTop: 16, marginBottom: 4 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  message: { textAlign: 'center', marginTop: 12 },
});
