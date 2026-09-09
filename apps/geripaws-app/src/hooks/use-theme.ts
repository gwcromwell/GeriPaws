/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, StylePacks, type StylePack, type StylePackColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStylePackOptional } from '@/lib/style-pack-context';

export type Theme = Record<keyof typeof Colors.light, string> &
  StylePackColors & {
    /** Shortcuts onto the active pack, so screens don't need a second hook. */
    displayFont: string;
    bodyFont: string;
    /** The full active style pack, in case a screen needs its id. */
    pack: StylePack;
  };

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const mode = scheme === 'dark' ? 'dark' : 'light';
  const { packId } = useStylePackOptional();
  const pack = StylePacks[packId];
  const packColors = pack[mode];

  return {
    ...Colors[mode],
    ...packColors,
    // The pack's accent *is* the app's tint — every `themeColor="tint"` usage
    // and hardcoded button/link color should follow the active visual identity.
    tint: packColors.accent,
    displayFont: pack.displayFont,
    bodyFont: pack.bodyFont,
    pack,
  };
}
