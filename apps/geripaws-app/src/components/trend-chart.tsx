import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

const CHART_HEIGHT = 100;
const MAX_POINTS = 12;

export type TrendPoint = { id: string; date: string; value: number };

type Props = {
  points: TrendPoint[];
  /** Fixed scale (bars relative to [0, maxValue]) — omit to auto-scale to the data's own min/max, which better highlights fluctuation for values that live in a narrow band (e.g. weight). */
  maxValue?: number;
  /** Bar color override — defaults to the theme's tint. */
  color?: string;
};

export function TrendChart({ points: rawPoints, maxValue, color }: Props) {
  const theme = useTheme();

  const points = [...rawPoints].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_POINTS);
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const min = maxValue !== undefined ? 0 : Math.min(...values);
  const max = maxValue !== undefined ? maxValue : Math.max(...values);
  const range = max - min || 1;

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {points.map((point) => {
          const heightPct = Math.max(4, ((point.value - min) / range) * 100);
          return (
            <View key={point.id} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${heightPct}%`, backgroundColor: color ?? theme.tint }]} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(points[0].date)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(points[points.length - 1].date)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  barColumn: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
