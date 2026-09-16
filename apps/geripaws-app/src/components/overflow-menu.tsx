import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type OverflowMenuItem = {
  label: string;
  onPress: () => void;
  /** Inserts a hairline divider above this item — used to separate the
   * page's own navigation links from an account-level action like Sign out. */
  dividerBefore?: boolean;
};

type Props = {
  items: OverflowMenuItem[];
  accessibilityLabel?: string;
};

/** A header "more" button that opens a small dropdown of links — the
 * destination for navigation that used to live in a permanent row of text
 * links above the fold on every visit (see the GeriPaws UI Review, Priority
 * 3 & 4). Rendered in a Modal rather than an absolutely-positioned sibling
 * so it always draws above the native header instead of being clipped by it. */
export function OverflowMenu({ items, accessibilityLabel = 'More options' }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        hitSlop={12}
        style={[styles.trigger, { backgroundColor: theme.tileBg }, Platform.OS === 'web' && styles.triggerWeb]}>
        <View style={[styles.dot, { backgroundColor: theme.accent }]} />
        <View style={[styles.dot, { backgroundColor: theme.accent }]} />
        <View style={[styles.dot, { backgroundColor: theme.accent }]} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} accessibilityLabel="Close menu" onPress={() => setOpen(false)}>
          <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
                style={[styles.item, item.dividerBefore && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  triggerWeb: { marginRight: 12 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  panel: {
    position: 'absolute',
    top: 56,
    right: 12,
    minWidth: 210,
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
