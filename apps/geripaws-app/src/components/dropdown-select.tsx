import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** A single-select trigger that opens a modal list of options — used in
 * place of a permanent row of tabs when the option set is long enough that
 * a tab row would wrap or force horizontal scrolling (see History). */
export function DropdownSelect<T extends string>({ options, value, onChange, accessibilityLabel = 'Filter' }: Props<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${current?.label ?? ''}`}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: theme.tileBg, borderColor: theme.border }]}>
        <ThemedText type="smallBold">{current?.label}</ThemedText>
        <ThemedText themeColor="textSecondary">▾</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} accessibilityLabel="Close" onPress={() => setOpen(false)}>
          <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    setOpen(false);
                    onChange(option.value);
                  }}
                  style={styles.item}>
                  <ThemedText type={isSelected ? 'smallBold' : 'default'} themeColor={isSelected ? 'tint' : 'text'}>
                    {isSelected ? '✓ ' : ''}
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  panel: {
    minWidth: 240,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  item: { paddingVertical: 12, paddingHorizontal: 16 },
});
