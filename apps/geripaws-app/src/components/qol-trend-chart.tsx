import type { QolResponse } from '@geripaws/shared';
import { QOL_FULL_MAX } from '@geripaws/shared';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

const CHART_HEIGHT = 100;
const MAX_POINTS = 12;

type Props = {
  responses: QolResponse[];
};

export function QolTrendChart({ responses }: Props) {
  const theme = useTheme();

  const points = [...responses]
    .sort((a, b) => a.survey_date.localeCompare(b.survey_date))
    .slice(-MAX_POINTS);

  if (points.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {points.map((point) => {
          const heightPct = Math.max(4, (point.total_score / QOL_FULL_MAX) * 100);
          return (
            <View key={point.id} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: `${heightPct}%`, backgroundColor: theme.tint },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(points[0].survey_date)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(points[points.length - 1].survey_date)}
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
