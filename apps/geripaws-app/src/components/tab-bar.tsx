import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Tab<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function TabBar<T extends string>({ tabs, value, onChange }: Props<T>) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <Pressable key={tab.value} onPress={() => onChange(tab.value)} style={styles.tab}>
            <ThemedText type="smallBold" themeColor={isActive ? 'tint' : 'textSecondary'}>
              {tab.label}
            </ThemedText>
            <View style={[styles.indicator, isActive && { backgroundColor: theme.tint }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  indicator: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
});
