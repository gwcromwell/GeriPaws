import type { Ailment, AilmentStatus, Medication, PetRole } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { fetchAilments } from '@/lib/ailments';
import { formatDate, summarizeSchedule } from '@/lib/format';
import { fetchMedications } from '@/lib/medications';
import { fetchMyRole } from '@/lib/pets';
import { createShareLink, fetchShareLinks, revokeShareLink, type PetShareLink } from '@/lib/share-links';

// Deployed web lives under a /GeriPaws subpath (GitHub Pages project site), so
// only a localhost dev server can safely use its own origin as-is.
function buildShareUrl(token: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return `${window.location.origin}/shared/${token}`;
  }
  return `https://gwcromwell.github.io/GeriPaws/shared/${token}`;
}

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
  const [shareLinks, setShareLinks] = useState<PetShareLink[]>([]);
  const [role, setRole] = useState<PetRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

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
      if (roleData === 'owner') {
        setShareLinks(await fetchShareLinks(id));
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
  const isOwner = role === 'owner';

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

  async function handleShareLink(link: PetShareLink) {
    const url = buildShareUrl(link.token);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 2000);
    } else {
      await Share.share({ message: url });
    }
  }

  async function handleRevokeLink(id_: string) {
    await revokeShareLink(id_);
    setShareLinks(await fetchShareLinks(id));
  }

  const activeLinks = shareLinks.filter((l) => !l.revoked && new Date(l.expires_at) > new Date());

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
              <Pressable
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
          <Pressable style={StyleSheet.flatten([styles.secondaryButton, { borderColor: tokens.accent }])}>
            <ThemedText style={{ color: tokens.accent }} type="smallBold">
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
            <Pressable style={StyleSheet.flatten([styles.secondaryButton, { borderColor: tokens.accent }])}>
              <ThemedText style={{ color: tokens.accent }} type="smallBold">
                + Add general medication
              </ThemedText>
            </Pressable>
          </Link>
        ) : null}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Vet visit summary
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
          A printable/shareable summary of conditions, medications, recent incidents, and QOL/weight trends.
        </ThemedText>
        <Link href={{ pathname: '/pets/[id]/vet-summary', params: { id } }} asChild>
          <Pressable style={StyleSheet.flatten([styles.secondaryButton, { borderColor: tokens.accent }])}>
            <ThemedText style={{ color: tokens.accent }} type="smallBold">
              View / export summary
            </ThemedText>
          </Pressable>
        </Link>
      </ThemedView>

      {isOwner ? (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Share with your vet
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small" style={styles.hint}>
            A read-only link showing active conditions, medications, and QOL/weight trends. No account needed to
            view it.
          </ThemedText>
          {activeLinks.map((link) => (
            <ThemedView key={link.id} style={styles.shareLinkRow}>
              <ThemedText type="small">Expires {formatDate(link.expires_at)}</ThemedText>
              <ThemedView style={styles.shareLinkActions}>
                <Pressable onPress={() => handleShareLink(link)} hitSlop={8}>
                  <ThemedText type="link" themeColor="tint">
                    {copiedId === link.id ? 'Copied!' : 'Copy link'}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => handleRevokeLink(link.id)} hitSlop={8}>
                  <ThemedText type="link" themeColor="error">
                    Revoke
                  </ThemedText>
                </Pressable>
              </ThemedView>
            </ThemedView>
          ))}
          <Pressable style={StyleSheet.flatten([styles.secondaryButton, { borderColor: tokens.accent }])} onPress={handleCreateShareLink} disabled={isCreatingLink}>
            <ThemedText style={{ color: tokens.accent }} type="smallBold">
              {isCreatingLink ? 'Creating…' : '+ Create share link'}
            </ThemedText>
          </Pressable>
        </ThemedView>
      ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 8 },
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
  chip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    marginBottom: 8,
  },
  shareLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  shareLinkActions: { flexDirection: 'row', gap: 16 },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});
