import type { Ailment, Medication, MedicationSchedule } from '@geripaws/shared';
import { QOL_FULL_MAX } from '@geripaws/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrendChart } from '@/components/trend-chart';
import { formatDate, summarizeSchedule } from '@/lib/format';

type SharedPetData = {
  pet: { name: string; breed: string | null; dob: string | null; sex: string | null; weight_unit: string };
  ailments: Ailment[];
  medications: Medication[];
  qolResponses: { survey_date: string; total_score: number }[];
  weightLogs: { occurred_at: string; details: { value: number; unit: string } }[];
};

function ageFromDob(dob: string | null): string | null {
  if (!dob) return null;
  const years = (Date.now() - new Date(dob).getTime()) / (365.25 * 86_400_000);
  return years < 1 ? `${Math.round(years * 12)} months` : `${years.toFixed(1)} years`;
}

export default function SharedPetScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [data, setData] = useState<SharedPetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    fetch(`${supabaseUrl}/functions/v1/get-shared-pet?token=${token}`, {
      headers: { apikey: anonKey ?? '', Authorization: `Bearer ${anonKey}` },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load');
        setData(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'This link is invalid or has expired.'))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <ThemedView style={styles.flex}>
        <ThemedText style={styles.message}>Loading…</ThemedText>
      </ThemedView>
    );
  }

  if (error || !data) {
    return (
      <ThemedView style={styles.flex}>
        <ThemedText themeColor="error" style={styles.message}>
          {error ?? 'This link is invalid or has expired.'}
        </ThemedText>
      </ThemedView>
    );
  }

  const age = ageFromDob(data.pet.dob);

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {data.pet.name}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {[data.pet.breed, age, data.pet.sex].filter(Boolean).join(' · ')}
        </ThemedText>

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
              <ThemedText type="smallBold">{a.name}</ThemedText>
              {a.diagnosed_at ? (
                <ThemedText themeColor="textSecondary" type="small">
                  Diagnosed {formatDate(a.diagnosed_at)}
                  {a.diagnosing_vet ? ` by ${a.diagnosing_vet}` : ''}
                </ThemedText>
              ) : null}
              {a.notes ? <ThemedText type="small">{a.notes}</ThemedText> : null}
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
                {m.route ? ` (${m.route})` : ''}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {summarizeSchedule(m.schedule as MedicationSchedule)}
              </ThemedText>
            </ThemedView>
          ))
        )}

        {data.qolResponses.length > 0 ? (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Quality of Life trend
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Latest: {Math.round(data.qolResponses[0].total_score)} / {QOL_FULL_MAX}
            </ThemedText>
            {data.qolResponses.length > 1 ? (
              <TrendChart
                points={data.qolResponses.map((r) => ({ id: r.survey_date, date: r.survey_date, value: r.total_score }))}
                maxValue={QOL_FULL_MAX}
              />
            ) : null}
          </>
        ) : null}

        {data.weightLogs.length > 0 ? (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Weight trend
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Latest: {data.weightLogs[0].details.value} {data.weightLogs[0].details.unit}
            </ThemedText>
            {data.weightLogs.length > 1 ? (
              <TrendChart
                points={[...data.weightLogs]
                  .reverse()
                  .map((w) => ({ id: w.occurred_at, date: w.occurred_at, value: w.details.value }))}
              />
            ) : null}
          </>
        ) : null}

        <ThemedText themeColor="textSecondary" type="small" style={styles.disclaimer}>
          Shared read-only from GeriPaws. This is a caregiver-maintained log, not a substitute for veterinary
          records or advice.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 8, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28 },
  sectionTitle: { marginTop: 20, marginBottom: 4 },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  disclaimer: { marginTop: 24, textAlign: 'center' },
  message: { textAlign: 'center', marginTop: 40 },
});
