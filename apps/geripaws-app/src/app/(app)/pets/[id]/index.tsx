import { QOL_FULL_MAX, habitLogInputSchema } from '@geripaws/shared';
import type { HabitLog, HabitType, Medication, Pet, PetMember, PetRole, QolResponse, QolSettings } from '@geripaws/shared';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AlertIcon, CheckIcon, FoodIcon, WalkIcon, WaterIcon, WeightIcon, type PackIconProps } from '@/components/pack-icons';
import { PetAvatar } from '@/components/pet-avatar';
import { QolRing } from '@/components/qol-ring';
import { QuickTimeChips } from '@/components/quick-time-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useNow } from '@/hooks/use-now';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { createHabitLog, fetchLatestByType } from '@/lib/habits';
import { formatAge, formatDateTime, formatRelativeTime, formatTimeOfDay, isOverdue } from '@/lib/format';
import { computeTodayDueDoses, getDayStart, groupDueDoses, type DueDose } from '@/lib/medication-schedule';
import { fetchDosesSince, fetchMedications, markDoseGiven, markDoseSkipped } from '@/lib/medications';
import { fetchMyPreferences, fetchMyRole, fetchPet } from '@/lib/pets';
import { displayNameFor, fetchProfilesForPet, type ProfileMap } from '@/lib/profiles';
import { fetchQolResponses, fetchQolSettings } from '@/lib/qol';
import { supabase } from '@/lib/supabase';

function IncidentRow({ tokens, onPress }: { tokens: Theme; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log an accident or incident"
      onPress={onPress}
      style={[styles.ewRow, { borderBottomColor: tokens.border }]}>
      <View style={[styles.ewIcon, { backgroundColor: tokens.error + '1f' }]}>
        <AlertIcon color={tokens.error} size={17} />
      </View>
      <View style={styles.flexOne}>
        <ThemedText type="smallBold" themeColor="error">
          Log an accident / incident
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Vomiting, a fall, a seizure — anything worth remembering
        </ThemedText>
      </View>
    </Pressable>
  );
}

function doseKey(due: DueDose): string {
  return `${due.medication.id}-${due.scheduledAt.toISOString()}`;
}

interface TileData {
  type: HabitType;
  label: string;
  sub: string;
  overdue: boolean;
  Icon: ComponentType<PackIconProps>;
}

const HABIT_TILES: { type: Extract<HabitType, 'walk' | 'water' | 'food'>; label: string; Icon: ComponentType<PackIconProps> }[] = [
  { type: 'food', label: 'Food', Icon: FoodIcon },
  { type: 'water', label: 'Water', Icon: WaterIcon },
  { type: 'walk', label: 'Walk', Icon: WalkIcon },
];

/** Food and water can be logged with zero detail beyond "it happened, just
 * now" — walk, weight, and incidents still open the full form. */
const QUICK_LOGGABLE: ReadonlySet<HabitType> = new Set(['food', 'water']);

export default function TodayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tokens = useTheme();
  // Keeps "3h ago"-style labels on the tiles below from freezing between
  // fetches — its value is fed into the tiles useMemo below specifically so
  // that memo recomputes on each tick instead of going stale.
  const now = useNow(60_000);
  const [pet, setPet] = useState<Pet | null>(null);
  const [role, setRole] = useState<PetRole | null>(null);
  const [latest, setLatest] = useState<Record<HabitType, HabitLog | null>>({
    walk: null,
    water: null,
    food: null,
    incident: null,
    weight: null,
  });
  const [dueDoses, setDueDoses] = useState<DueDose[]>([]);
  const [latestQol, setLatestQol] = useState<QolResponse | null>(null);
  const [qolSettings, setQolSettings] = useState<QolSettings | null>(null);
  const [myPreferences, setMyPreferences] = useState<PetMember | null>(null);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [givingKey, setGivingKey] = useState<string | null>(null);
  const [givenAtDraft, setGivenAtDraft] = useState<Date>(new Date());
  const [isSavingDose, setIsSavingDose] = useState(false);
  const [quickLogging, setQuickLogging] = useState<HabitType | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const petData = await fetchPet(id);
      const dayStart = getDayStart(new Date(), petData.day_boundary_hour, petData.timezone);

      // Fetched once and threaded through to fetchMyRole/fetchMyPreferences,
      // which would otherwise each make their own redundant auth.getUser()
      // round trip (a real network call, not a local read). Falls back to
      // undefined on failure — those calls then fetch it themselves — rather
      // than letting this block the core screen a caregiver actually needs.
      const userResult = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const myId = userResult.data.user?.id;

      const [roleData, latestData, medications, dosesToday, qolResponses, qolSettingsData] = await Promise.all([
        fetchMyRole(id, myId),
        fetchLatestByType(id),
        fetchMedications(id),
        fetchDosesSince(id, dayStart),
        fetchQolResponses(id, 1),
        fetchQolSettings(id),
      ]);

      setPet(petData);
      setRole(roleData);
      setLatest(latestData);
      setDueDoses(computeTodayDueDoses(petData, medications, dosesToday));
      setLatestQol(qolResponses[0] ?? null);
      setQolSettings(qolSettingsData);
      setError(null);

      // Preferences/attribution are enhancements layered on top of the core
      // screen (and depend on migrations that may not be applied to every
      // environment yet) — a failure here must never block the screen a
      // caregiver actually needs to log a dose or a walk.
      const [preferences, profileMap] = await Promise.all([
        fetchMyPreferences(id, myId).catch(() => null),
        fetchProfilesForPet(id).catch(() => ({})),
      ]);
      setMyPreferences(preferences);
      setProfiles(profileMap);
      setMyUserId(myId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dog');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Keeps this screen in sync when another caregiver's device changes
  // something — without this, a screen just sitting open (e.g. a tablet on
  // the counter) never sees a change made elsewhere, since `load()` above
  // only re-runs on this screen's own focus events. Debounced since a
  // single action (e.g. giving a dose) can touch more than one table.
  useEffect(() => {
    if (!id) return;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(load, 400);
    };
    const channel = supabase
      .channel(`today-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs', filter: `pet_id=eq.${id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_doses', filter: `pet_id=eq.${id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications', filter: `pet_id=eq.${id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qol_responses', filter: `pet_id=eq.${id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qol_settings', filter: `pet_id=eq.${id}` }, reload)
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  const canLog = role === 'owner' || role === 'caregiver';

  function startGivingDose(due: DueDose) {
    setGivingKey(doseKey(due));
    setGivenAtDraft(new Date());
  }

  async function confirmGiveDose(medication: Medication, scheduledAt: Date) {
    setIsSavingDose(true);
    try {
      await markDoseGiven(id, medication.id, scheduledAt, givenAtDraft);
      setGivingKey(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record dose');
    } finally {
      setIsSavingDose(false);
    }
  }

  async function handleSkipDose(medication: Medication, scheduledAt: Date) {
    try {
      await markDoseSkipped(id, medication.id, scheduledAt);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record dose');
    }
  }

  async function handleQuickLog(type: HabitType) {
    setQuickLogging(type);
    setError(null);
    try {
      const input = habitLogInputSchema.parse({
        type,
        petId: id,
        occurredAt: new Date().toISOString(),
        details: {},
      });
      await createHabitLog(input);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log');
    } finally {
      setQuickLogging(null);
    }
  }

  const TILE_VISIBILITY = useMemo<Record<HabitType, boolean>>(
    () => ({
      walk: myPreferences?.show_walk_tile ?? true,
      water: myPreferences?.show_water_tile ?? true,
      food: myPreferences?.show_food_tile ?? true,
      weight: myPreferences?.show_weight_tile ?? true,
      incident: true,
    }),
    [myPreferences]
  );

  // `now` is a dependency purely to force this to recompute on the useNow
  // tick above — the actual value is unused, formatRelativeTime reads
  // Date.now() itself. Without it here, memoizing would freeze "x ago" text
  // exactly the way it did before that was fixed. Kept above the `!pet`
  // early return below — hooks must run unconditionally.
  const tiles = useMemo<TileData[]>(() => {
    const weightLog = latest.weight;
    const weightDetails = weightLog?.details as { value: number; unit: string } | undefined;
    const who = (userId: string | null | undefined) => displayNameFor(profiles, userId, myUserId);

    return [
      ...HABIT_TILES.map(({ type, label, Icon }) => {
        const log = latest[type];
        const overdue = log ? isOverdue(log.occurred_at, type) : false;
        return {
          type,
          label,
          Icon,
          overdue,
          sub: log
            ? `${overdue ? 'Overdue — ' : ''}${formatRelativeTime(log.occurred_at)} · ${who(log.logged_by)}`
            : 'Not logged yet',
        };
      }),
      {
        type: 'weight' as HabitType,
        label: 'Weight',
        Icon: WeightIcon,
        overdue: false,
        sub: weightDetails
          ? `${weightDetails.value} ${weightDetails.unit} · ${formatRelativeTime(weightLog!.occurred_at)} · ${who(weightLog!.logged_by)}`
          : 'Not logged yet',
      },
    ].filter((tile) => TILE_VISIBILITY[tile.type]);
    // `now` isn't referenced directly (formatRelativeTime above calls
    // Date.now() itself), but it must stay a dependency so this recomputes
    // on every useNow tick — eslint's static analysis can't see that hidden
    // dependency, so its "unnecessary dependency" warning here is wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest, profiles, myUserId, TILE_VISIBILITY, now]);

  if (!pet) {
    return (
      <ThemedView style={styles.container}>
        {error ? <ThemedText themeColor="error">{error}</ThemedText> : <ThemedText>Loading…</ThemedText>}
      </ThemedView>
    );
  }

  const goToTile = (type: HabitType) =>
    type === 'weight'
      ? router.push({ pathname: '/pets/[id]/weight', params: { id: pet.id } })
      : router.push({ pathname: '/pets/[id]/log/[type]', params: { id: pet.id, type } });

  const doseSection = (
    <MedicationList
      // Remounts (resetting the "show completed" toggle to the new default)
      // whenever the loaded preference actually changes, rather than only once.
      key={String(myPreferences?.hide_given_doses ?? 'loading')}
      tokens={tokens}
      dueDoses={dueDoses}
      canLog={canLog}
      hideGivenByDefault={myPreferences?.hide_given_doses ?? false}
      profiles={profiles}
      myUserId={myUserId}
      givingKey={givingKey}
      givenAtDraft={givenAtDraft}
      isSavingDose={isSavingDose}
      onStartGive={startGivingDose}
      onCancelGive={() => setGivingKey(null)}
      onGivenAtChange={setGivenAtDraft}
      onConfirmGive={confirmGiveDose}
      onSkip={handleSkipDose}
    />
  );

  return (
    <ThemedView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerBar}>
          <View style={styles.headerLinks}>
            <Link href={{ pathname: '/pets/[id]/ailments', params: { id: pet.id } }}>
              <ThemedText type="link" style={{ color: tokens.accent }}>
                Ailments
              </ThemedText>
            </Link>
            <Link href={{ pathname: '/pets/[id]/qol', params: { id: pet.id } }}>
              <ThemedText type="link" style={{ color: tokens.accent }}>
                QOL
              </ThemedText>
            </Link>
            <Link href={{ pathname: '/pets/[id]/sharing', params: { id: pet.id } }}>
              <ThemedText type="link" style={{ color: tokens.accent }}>
                Sharing
              </ThemedText>
            </Link>
            <Link href={{ pathname: '/pets/[id]/preferences', params: { id: pet.id } }}>
              <ThemedText type="link" style={{ color: tokens.accent }}>
                Preferences
              </ThemedText>
            </Link>
          </View>
        </View>

        {role === 'viewer' ? (
          <ThemedText themeColor="textSecondary" type="small">
            You have view-only access to {pet.name}.
          </ThemedText>
        ) : null}

        {tokens.pack.id === 'good-days' ? (
          <GoodDaysToday
            pet={pet}
            tokens={tokens}
            tiles={tiles}
            latestQol={latestQol}
            showQol={qolSettings?.show_on_today ?? false}
            canLog={canLog}
            onTilePress={goToTile}
            quickLogging={quickLogging}
            onQuickLog={handleQuickLog}
            onIncidentPress={() => router.push({ pathname: '/pets/[id]/log/[type]', params: { id: pet.id, type: 'incident' } })}
            onEditPress={() => router.push({ pathname: '/pets/[id]/edit', params: { id: pet.id } })}
            doseSection={doseSection}
          />
        ) : (
          <EveningWalkToday
            pet={pet}
            tokens={tokens}
            tiles={tiles}
            canLog={canLog}
            onTilePress={goToTile}
            quickLogging={quickLogging}
            onQuickLog={handleQuickLog}
            onIncidentPress={() => router.push({ pathname: '/pets/[id]/log/[type]', params: { id: pet.id, type: 'incident' } })}
            onEditPress={() => router.push({ pathname: '/pets/[id]/edit', params: { id: pet.id } })}
            doseSection={doseSection}
          />
        )}

        <Link href={{ pathname: '/pets/[id]/history', params: { id: pet.id } }} style={styles.historyLink}>
          <ThemedText type="link" style={{ color: tokens.accent }}>
            View history
          </ThemedText>
        </Link>

        {error ? (
          <ThemedText themeColor="error" style={styles.message}>
            {error}
          </ThemedText>
        ) : null}
        {isLoading ? (
          <ThemedText themeColor="textSecondary" type="small" style={styles.message}>
            Refreshing…
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

/** "Evening Walk" — a quiet nameplate, then a list of low-contrast rows. */
function EveningWalkToday({
  pet,
  tokens,
  tiles,
  canLog,
  onTilePress,
  quickLogging,
  onQuickLog,
  onIncidentPress,
  onEditPress,
  doseSection,
}: {
  pet: Pet;
  tokens: Theme;
  tiles: TileData[];
  canLog: boolean;
  onTilePress: (type: HabitType) => void;
  quickLogging: HabitType | null;
  onQuickLog: (type: HabitType) => void;
  onIncidentPress: () => void;
  onEditPress: () => void;
  doseSection: ReactNode;
}) {
  const age = formatAge(pet.dob);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${pet.name}'s profile`}
        onPress={onEditPress}
        style={[styles.nameplate, { borderBottomColor: tokens.border }]}>
        <PetAvatar uri={pet.photo_url} size={44} />
        <View>
          <ThemedText style={{ fontFamily: tokens.displayFont, fontWeight: '400', fontSize: 20 }}>{pet.name}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {[age, pet.breed].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
      </Pressable>

      {tiles.map(({ type, label, sub, overdue, Icon }) => {
        const isQuickLoggable = canLog && QUICK_LOGGABLE.has(type);
        const isLogging = quickLogging === type;
        return (
          <View key={type} style={[styles.ewRow, { borderBottomColor: tokens.border }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Log ${label.toLowerCase()} in detail — ${sub}`}
              disabled={!canLog}
              onPress={() => onTilePress(type)}
              style={styles.ewRowMain}>
              <View style={[styles.ewIcon, { backgroundColor: overdue ? tokens.overdue + '22' : tokens.tileBg }]}>
                <Icon color={overdue ? tokens.overdue : tokens.accentDeep} size={17} />
              </View>
              <View style={styles.flexOne}>
                <ThemedText type="smallBold">{label}</ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: overdue ? tokens.overdue : tokens.textSecondary, fontWeight: overdue ? '700' : '400' }}>
                  {sub}
                </ThemedText>
              </View>
            </Pressable>
            {isQuickLoggable ? (
              <Pressable
                onPress={() => onQuickLog(type)}
                disabled={isLogging}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Quick log ${label.toLowerCase()} now, no details`}
                style={[styles.quickLogButton, { borderColor: tokens.accent }]}>
                <CheckIcon color={tokens.accent} size={13} />
                <ThemedText type="small" style={{ color: tokens.accent }}>
                  {isLogging ? 'Logging…' : 'Quick log'}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {canLog ? <IncidentRow tokens={tokens} onPress={onIncidentPress} /> : null}

      {doseSection}
    </>
  );
}

/** "Good Days" — a QOL ring hero, then a scannable 2×2 tile grid. */
function GoodDaysToday({
  pet,
  tokens,
  tiles,
  latestQol,
  showQol,
  canLog,
  onTilePress,
  quickLogging,
  onQuickLog,
  onIncidentPress,
  onEditPress,
  doseSection,
}: {
  pet: Pet;
  tokens: Theme;
  tiles: TileData[];
  latestQol: QolResponse | null;
  showQol: boolean;
  canLog: boolean;
  onTilePress: (type: HabitType) => void;
  quickLogging: HabitType | null;
  onQuickLog: (type: HabitType) => void;
  onIncidentPress: () => void;
  onEditPress: () => void;
  doseSection: ReactNode;
}) {
  const age = formatAge(pet.dob);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${pet.name}'s profile`}
        onPress={onEditPress}
        style={styles.gdNameplate}>
        <PetAvatar uri={pet.photo_url} size={40} />
        <View>
          <ThemedText style={{ fontFamily: tokens.displayFont, fontWeight: '400', fontSize: 21 }}>{pet.name}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {[age, pet.breed].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
      </Pressable>

      {showQol && latestQol ? (
        <View style={[styles.ringWrap, { backgroundColor: tokens.panel }]}>
          <QolRing score={latestQol.total_score} max={QOL_FULL_MAX} color={tokens.accent} trackColor={tokens.tileBg} />
          <View style={styles.flexOne}>
            <ThemedText style={{ fontFamily: tokens.displayFont, fontWeight: '400', fontSize: 14 }}>Quality of life</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {Math.round(latestQol.total_score)} / {QOL_FULL_MAX} as of last check-in
            </ThemedText>
          </View>
        </View>
      ) : null}

      <View style={styles.gdGrid}>
        {tiles.map(({ type, label, sub, overdue, Icon }) => {
          const isQuickLoggable = canLog && QUICK_LOGGABLE.has(type);
          const isLogging = quickLogging === type;
          return (
            <View
              key={type}
              style={[styles.gdTile, { backgroundColor: tokens.panel }, overdue && { borderColor: tokens.overdue, borderWidth: 1.5 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Log ${label.toLowerCase()} in detail — ${sub}`}
                disabled={!canLog}
                onPress={() => onTilePress(type)}>
                <View style={[styles.gdIcon, { backgroundColor: tokens.accent }]}>
                  <Icon color="#fff" size={15} />
                </View>
                <ThemedText style={{ fontFamily: tokens.displayFont, fontWeight: '400', fontSize: 13 }}>{label}</ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: overdue ? tokens.overdue : tokens.textSecondary, fontWeight: overdue ? '700' : '400' }}>
                  {sub}
                </ThemedText>
              </Pressable>
              {isQuickLoggable ? (
                <Pressable
                  onPress={() => onQuickLog(type)}
                  disabled={isLogging}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Quick log ${label.toLowerCase()} now, no details`}
                  style={[styles.gdQuickLogButton, { borderColor: tokens.accent }]}>
                  <CheckIcon color={tokens.accent} size={12} />
                  <ThemedText type="small" style={{ color: tokens.accent }}>
                    {isLogging ? 'Logging…' : 'Quick log'}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      {canLog ? <IncidentRow tokens={tokens} onPress={onIncidentPress} /> : null}

      {doseSection}
    </>
  );
}

function MedicationList({
  tokens,
  dueDoses,
  canLog,
  hideGivenByDefault,
  profiles,
  myUserId,
  givingKey,
  givenAtDraft,
  isSavingDose,
  onStartGive,
  onCancelGive,
  onGivenAtChange,
  onConfirmGive,
  onSkip,
}: {
  tokens: Theme;
  dueDoses: DueDose[];
  canLog: boolean;
  hideGivenByDefault: boolean;
  profiles: ProfileMap;
  myUserId: string | null;
  givingKey: string | null;
  givenAtDraft: Date;
  isSavingDose: boolean;
  onStartGive: (due: DueDose) => void;
  onCancelGive: () => void;
  onGivenAtChange: (date: Date) => void;
  onConfirmGive: (medication: Medication, scheduledAt: Date) => void;
  onSkip: (medication: Medication, scheduledAt: Date) => void;
}) {
  const [showSettled, setShowSettled] = useState(!hideGivenByDefault);
  // Kept out of the conditional return below — hooks must run unconditionally.
  const { overdue, upcoming, settled } = useMemo(() => groupDueDoses(dueDoses), [dueDoses]);

  if (dueDoses.length === 0) return null;

  function renderDose(due: DueDose, emphasize: boolean) {
    const key = doseKey(due);
    const isGiving = givingKey === key;
    const dotColor = due.status === 'given' ? tokens.good : due.status === 'overdue' ? tokens.overdue : tokens.accent;

    return (
      <View
        key={key}
        style={[
          styles.doseRow,
          emphasize
            ? { backgroundColor: 'transparent', borderColor: 'transparent', paddingHorizontal: 0 }
            : { backgroundColor: tokens.panel, borderColor: tokens.border },
        ]}>
        <View style={styles.doseRowTop}>
          {emphasize ? null : <View style={[styles.doseDot, { backgroundColor: dotColor }]} />}
          <View style={styles.flexOne}>
            <ThemedText type="smallBold" style={emphasize ? { color: tokens.overdue } : undefined}>
              {due.medication.name} — {due.medication.dosage} {due.medication.unit}
            </ThemedText>
            <ThemedText type="small" style={{ color: emphasize || due.status === 'overdue' ? tokens.overdue : tokens.textSecondary }}>
              {formatTimeOfDay(
                `${String(due.scheduledAt.getHours()).padStart(2, '0')}:${String(due.scheduledAt.getMinutes()).padStart(2, '0')}`
              )}
              {due.status === 'given' && due.dose?.given_at
                ? ` · Given ${formatTimeOfDay(
                    `${String(new Date(due.dose.given_at).getHours()).padStart(2, '0')}:${String(new Date(due.dose.given_at).getMinutes()).padStart(2, '0')}`
                  )} by ${displayNameFor(profiles, due.dose.given_by, myUserId)}`
                : due.status === 'skipped'
                  ? ` · Skipped by ${displayNameFor(profiles, due.dose?.given_by, myUserId)}`
                  : due.status === 'overdue'
                    ? ' · Overdue'
                    : ''}
            </ThemedText>
          </View>
          {canLog && due.status !== 'given' && due.status !== 'skipped' && !isGiving ? (
            <View style={styles.doseActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Give ${due.medication.name}`}
                onPress={() => onStartGive(due)}
                hitSlop={12}>
                <ThemedText type="link" style={{ color: emphasize ? tokens.overdue : tokens.accent }}>
                  Give
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Skip ${due.medication.name}`}
                onPress={() => onSkip(due.medication, due.scheduledAt)}
                hitSlop={12}>
                <ThemedText type="link" themeColor="textSecondary">
                  Skip
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>

        {isGiving ? (
          <View style={styles.giveForm}>
            <ThemedText type="small" themeColor="textSecondary">
              When was it given?
            </ThemedText>
            <QuickTimeChips value={givenAtDraft} onChange={onGivenAtChange} />
            <ThemedText type="small" themeColor="textSecondary">
              {formatDateTime(givenAtDraft.toISOString())}
            </ThemedText>
            <View style={styles.giveFormActions}>
              <Pressable accessibilityRole="button" onPress={onCancelGive} hitSlop={12}>
                <ThemedText type="link" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Confirm ${due.medication.name} given`}
                style={[styles.confirmButton, { backgroundColor: tokens.accent }]}
                hitSlop={8}
                disabled={isSavingDose}
                onPress={() => onConfirmGive(due.medication, due.scheduledAt)}>
                <ThemedText themeColor="background" type="smallBold">
                  {isSavingDose ? 'Saving…' : 'Confirm'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <>
      <ThemedText style={{ fontFamily: tokens.displayFont, fontWeight: '400', fontSize: 15, marginTop: 8 }}>Medications</ThemedText>

      {overdue.length > 0 ? (
        <View style={[styles.overdueBanner, { backgroundColor: tokens.overdue + '17', borderColor: tokens.overdue }]}>
          <View style={styles.overdueBannerHeader}>
            <AlertIcon color={tokens.overdue} size={15} />
            <ThemedText type="smallBold" style={{ color: tokens.overdue }}>
              {overdue.length} missed {overdue.length === 1 ? 'dose' : 'doses'}
            </ThemedText>
          </View>
          {overdue.map((due) => renderDose(due, true))}
        </View>
      ) : null}

      {upcoming.length > 0 ? (
        <>
          {overdue.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.upcomingLabel}>
              Up next
            </ThemedText>
          ) : null}
          {upcoming.map((due) => renderDose(due, false))}
        </>
      ) : null}

      {settled.length > 0 ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => setShowSettled((v) => !v)} style={styles.settledToggle} hitSlop={12}>
            <ThemedText type="link" style={{ color: tokens.accent }}>
              {showSettled ? 'Hide' : 'Show'} {settled.length} completed
            </ThemedText>
          </Pressable>
          {showSettled ? settled.map((due) => renderDose(due, false)) : null}
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexOne: { flex: 1 },
  container: { padding: 16, gap: 12 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLinks: { flexDirection: 'row', gap: 16 },

  nameplate: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottomWidth: 1, marginBottom: 4 },
  gdNameplate: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },

  ewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  ewRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  ewIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  quickLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },

  ringWrap: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14, marginTop: 4 },

  gdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gdTile: { flexGrow: 1, flexBasis: '45%', borderRadius: 14, padding: 12, gap: 6 },
  gdIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  gdQuickLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 2,
  },

  overdueBanner: { borderRadius: 12, borderWidth: 1.5, padding: 12, gap: 4 },
  overdueBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  upcomingLabel: { marginTop: 4 },
  settledToggle: { marginTop: 4, alignSelf: 'flex-start' },
  doseRow: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  doseRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  doseDot: { width: 8, height: 8, borderRadius: 4 },
  doseActions: { flexDirection: 'row', gap: 16 },
  giveForm: { gap: 8, marginTop: 4 },
  giveFormActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  confirmButton: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  historyLink: { alignSelf: 'center', marginTop: 12 },
  message: { textAlign: 'center', marginTop: 12 },
});
