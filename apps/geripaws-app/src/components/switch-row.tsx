import { Platform, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  helperText?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

/** A single on/off preference row — replaces the two-button "Show/Hide" and
 * "Notify me/Don't notify me" ChoiceChips pairs used throughout Preferences.
 * A boolean setting only ever needs one control, and a native switch is
 * instantly recognizable (no reading required) and about a third of the
 * vertical space of a chip pair. */
export function SwitchRow({ label, helperText, value, onValueChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.labelCol}>
          <ThemedText type="smallBold">{label}</ThemedText>
          {helperText ? (
            <ThemedText type="small" themeColor="textSecondary">
              {helperText}
            </ThemedText>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.backgroundSelected, true: theme.tint }}
          thumbColor={Platform.OS === 'android' ? (value ? theme.tint : theme.backgroundElement) : undefined}
          ios_backgroundColor={theme.backgroundSelected}
          accessibilityRole="switch"
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  labelCol: { flex: 1, gap: 2 },
});
