import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface Props {
  /** Current score, 0..max. */
  score: number;
  max: number;
  color: string;
  trackColor: string;
  size?: number;
}

const STROKE_WIDTH = 7;

export function QolRing({ score, max, color, trackColor, size = 56 }: Props) {
  const radius = size / 2 - STROKE_WIDTH / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, score / max));
  const dashOffset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={STROKE_WIDTH} />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText type="smallBold">{Math.round(pct * 100)}%</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
