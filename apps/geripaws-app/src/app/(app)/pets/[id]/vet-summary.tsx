import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScreenLoad } from '@/hooks/use-screen-load';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { formatDate, formatDateTime, summarizeSchedule } from '@/lib/format';
import { fetchMyRole } from '@/lib/pets';
import { createShareLink, fetchShareLinks, revokeShareLink, type PetShareLink } from '@/lib/share-links';
import { buildVetSummaryHtml, fetchVetSummaryData, type VetSummaryData } from '@/lib/vet-summary';
import { MaxContentWidth } from '@/constants/theme';
import type { PetRole } from '@geripaws/shared';

// Deployed web lives under a /GeriPaws subpath (GitHub Pages project site), so
// only a localhost dev server can safely use its own origin as-is.
function buildShareUrl(token: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return `${window.location.origin}/shared/${token}`;
  }
  return `https://gwcromwell.github.io/GeriPaws/shared/${token}`;
}

export default function VetSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tokens = useTheme();
  const [data, setData] = useState<VetSummaryData | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [role, setRole] = useState<PetRole | null>(null);
  const [shareLinks, setShareLinks] = useState<PetShareLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [summaryData, roleData] = await Promise.all([fetchVetSummaryData(id), fetchMyRole(id)]);
    setData(summaryData);
    setRole(roleData);
    if (roleData === 'owner') {
      setShareLinks(await fetchShareLinks(id));
    }
  }, [id]);

  const { isLoading, error, setError } = useScreenLoad(load, 'Failed to load summary');

  const isOwner = role === 'owner';
  const activeLinks = shareLinks.filter((l) => !l.revoked && new Date(l.expires_at) > new Date());

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

  async function handleCreateShareLink() {
    setIsCreatingLink(true);
    try {
      await createShareLink(id);
      setShareLinks(await fetchShareLinks(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setIsCreatingLink(false);
    }
  }

  async function handleCopyShareLink(link: PetShareLink) {
    const url = buildShareUrl(link.token);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 2000);
    } else {
      await Share.share({ message: url });
    }
  }

  function handleRevokeLink(linkId: string) {
    confirmDestructive(
      'Revoke share link?',
      'Anyone who still has this link will lose access to the vet summary.',
      async () => {
        await revokeShareLink(linkId);
        setShareLinks(await fetchShareLinks(id));
      },
      'Revoke'
    );
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

        {isOwner ? (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Share a link with your vet
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              A read-only link showing active conditions, medications, and QOL/weight trends. No account needed to
              view it.
            </ThemedText>
            {activeLinks.map((link) => (
              <ThemedView key={link.id} style={[styles.shareLinkRow, { borderBottomColor: tokens.border }]}>
                <ThemedText type="small">Expires {formatDate(link.expires_at)}</ThemedText>
                <ThemedView style={styles.shareLinkActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Copy share link expiring ${formatDate(link.expires_at)}`}
                    onPress={() => handleCopyShareLink(link)}
                    hitSlop={12}>
                    <ThemedText type="link" themeColor="tint">
                      {copiedId === link.id ? 'Copied!' : 'Copy link'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Revoke share link expiring ${formatDate(link.expires_at)}`}
                    onPress={() => handleRevokeLink(link.id)}
                    hitSlop={12}>
                    <ThemedText type="link" themeColor="error">
                      Revoke
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </ThemedView>
            ))}
            <Button
              variant="secondary"
              label={isCreatingLink ? 'Creating…' : '+ Create share link'}
              onPress={handleCreateShareLink}
              disabled={isCreatingLink}
            />
          </ThemedView>
        ) : null}

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
  container: { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', padding: 16, gap: 8 },
  button: { marginTop: 8, marginBottom: 8 },
  sectionTitle: { marginTop: 16, marginBottom: 4 },
  section: { gap: 4, marginTop: 8, marginBottom: 8 },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 2,
  },
  shareLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  shareLinkActions: { flexDirection: 'row', gap: 16 },
  message: { textAlign: 'center', marginTop: 24 },
});
