import { View, StyleSheet } from 'react-native';

import { QuickTimeChips } from '@/components/quick-time-chips';
import { ThemedText } from '@/components/themed-text';
import { formatDateTime } from '@/lib/format';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
};

export function OccurredAtField({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">When</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        Defaults to now — pick how long ago it actually happened
      </ThemedText>
      <QuickTimeChips value={value} onChange={onChange} />
      <ThemedText themeColor="textSecondary" type="small">
        {formatDateTime(value.toISOString())}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
});
