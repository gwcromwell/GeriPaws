import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  description?: string;
  value: number | undefined;
  onChange: (value: number) => void;
};

const MIN = 0;
const MAX = 10;
const THUMB_SIZE = 22;

/** A 0-10 slider for one QOL dimension — replaces an 11-button chip row per
 * dimension (see the GeriPaws UI Review, Priority 2: a full check-in used to
 * render 7 rows of 11 chips each, most of which scrolled off-screen). Same
 * component name and props as before so qol/new.tsx didn't need to change. */
export function ScoreSelector({ label, description, value, onChange }: Props) {
  const theme = useTheme();
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const valueFromX = useCallback((x: number) => {
    const w = widthRef.current;
    if (w <= 0) return MIN;
    const ratio = Math.min(1, Math.max(0, x / w));
    return Math.round(MIN + ratio * (MAX - MIN));
  }, []);

  // Built in an effect, not useMemo — react-hooks/refs only allows reading a
  // ref outside render (effects, event handlers), and PanResponder.create's
  // callbacks close over onChangeRef. Only ever (re)built once, since
  // valueFromX's own deps are empty, so this doesn't churn the gesture
  // handler across renders — it's just constructed a render late.
  const [panResponder, setPanResponder] = useState<ReturnType<typeof PanResponder.create> | null>(null);
  useEffect(() => {
    setPanResponder(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => onChangeRef.current(valueFromX(e.nativeEvent.locationX)),
        onPanResponderMove: (e: GestureResponderEvent) => onChangeRef.current(valueFromX(e.nativeEvent.locationX)),
      })
    );
  }, [valueFromX]);

  function handleLayout(e: LayoutChangeEvent) {
    widthRef.current = e.nativeEvent.layout.width;
  }

  function adjust(direction: 1 | -1) {
    const current = value ?? MIN;
    onChange(Math.min(MAX, Math.max(MIN, current + direction)));
  }

  const hasValue = value !== undefined;
  const shown = hasValue ? (value as number) : MIN;
  const pct = hasValue ? (shown / MAX) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <View
          style={[
            styles.badge,
            { backgroundColor: hasValue ? theme.tint + '24' : theme.backgroundElement },
          ]}>
          <ThemedText type="small" style={{ color: hasValue ? theme.tint : theme.textSecondary, fontWeight: '700' }}>
            {hasValue ? `${shown}/${MAX}` : 'Not set'}
          </ThemedText>
        </View>
      </View>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      ) : null}

      <View
        accessibilityRole="adjustable"
        accessibilityLabel={description ? `${label} — ${description}` : label}
        accessibilityValue={{ min: MIN, max: MAX, now: shown }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') adjust(1);
          else if (event.nativeEvent.actionName === 'decrement') adjust(-1);
        }}
        style={styles.trackWrap}
        onLayout={handleLayout}
        {...panResponder?.panHandlers}>
        <View style={[styles.track, { backgroundColor: theme.border }]} />
        <View style={[styles.fill, { backgroundColor: theme.tint, width: `${pct}%` }]} />
        <View
          style={[
            styles.thumb,
            hasValue
              ? { backgroundColor: theme.tint, borderColor: theme.background }
              : { backgroundColor: theme.panel, borderColor: theme.border },
            { left: `${pct}%`, marginLeft: -THUMB_SIZE / 2 },
          ]}
        />
      </View>

      <View style={styles.anchorRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {MIN} · worst
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {MAX} · best
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingVertical: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 9 },
  trackWrap: { height: 32, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2 },
  fill: { height: 4, borderRadius: 2, position: 'absolute' },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
  },
  anchorRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
