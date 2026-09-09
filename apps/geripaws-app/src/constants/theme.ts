/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    tint: '#208AEF',
    error: '#D33A3A',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    tint: '#4FA3F7',
    error: '#F26565',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * A "style pack" is a caregiver-facing visual identity layered on top of the base
 * light/dark theme — accent/status colors, tile backgrounds, and display/body
 * fonts. Currently scoped to the Today and Ailments screens.
 */
export type StylePackId = 'evening-walk' | 'good-days';

export interface StylePackColors {
  /** Primary interactive/accent color for this pack. */
  accent: string;
  /** Deeper accent, used for icon strokes on a tinted chip. */
  accentDeep: string;
  /** A habit/dose running late — deliberately not the same as `error`, which is reserved for incidents. */
  overdue: string;
  /** A habit/dose completed on time. */
  good: string;
  /** Background for icon chips and tinted tiles. */
  tileBg: string;
  /** Background for elevated cards (nameplate, chips). */
  panel: string;
  /** The screen's own backdrop — overrides the base theme's plain white/black. */
  background: string;
  /** Hairline dividers and card borders. */
  border: string;
}

export interface StylePack {
  id: StylePackId;
  label: string;
  displayFont: string;
  bodyFont: string;
  light: StylePackColors;
  dark: StylePackColors;
}

export const StylePacks: Record<StylePackId, StylePack> = {
  'evening-walk': {
    id: 'evening-walk',
    label: 'Evening Walk',
    displayFont: 'Domine_600SemiBold',
    bodyFont: 'Karla_400Regular',
    light: {
      accent: '#B8792B',
      accentDeep: '#8C5A1E',
      overdue: '#B8551F',
      good: '#5A6E4C',
      tileBg: '#EBE7DA',
      panel: '#FFFDF9',
      background: '#F4F2EC',
      border: '#E3DFD1',
    },
    dark: {
      accent: '#D9A45C',
      accentDeep: '#E7C08C',
      overdue: '#E08A54',
      good: '#8FA97D',
      tileBg: '#3A3728',
      panel: '#2B2820',
      background: '#100E09',
      border: '#332F24',
    },
  },
  'good-days': {
    id: 'good-days',
    label: 'Good Days',
    displayFont: 'Baloo2_600SemiBold',
    bodyFont: 'WorkSans_400Regular',
    light: {
      accent: '#DD6B4C',
      accentDeep: '#B5502F',
      overdue: '#C98A1F',
      good: '#5A6E4C',
      tileBg: '#FFFFFF',
      panel: '#FFFFFF',
      background: '#FBF4F0',
      border: '#F0DED4',
    },
    dark: {
      accent: '#E8886B',
      accentDeep: '#F0A98F',
      overdue: '#E0AC5C',
      good: '#8FA97D',
      tileBg: '#332420',
      panel: '#2A1E1A',
      background: '#120D0A',
      border: '#3A281F',
    },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
