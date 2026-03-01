/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Primary brand colors
export const Brand = {
  // Deep navy backgrounds
  bgDeep:   '#060F1E',
  bgMid:    '#0D1F3C',
  bgLight:  '#142952',

  // Borders / dividers
  border:      '#1A3464',
  borderLight: 'rgba(33, 72, 132, 0.4)',

  // Primary blue
  blue:      '#1D6FE8',
  blueLight: '#3D8EFF',
  blueDark:  '#0D4FAD',

  // Accent yellow / gold
  yellow:     '#FFD166',
  yellowDark: '#C9A020',

  // Text
  textPrimary:   '#F0F4FF',
  textSecondary: '#7A96BE',
  textMuted:     '#3D5880',

  // Semantic
  success: '#22C55E',
  error:   '#EF4444',
  warning: '#F59E0B',
};

const tintColorLight = Brand.blue;
const tintColorDark  = Brand.yellow;

export const Colors = {
  light: {
    text: Brand.textPrimary,
    background: Brand.bgDeep,
    tint: tintColorLight,
    icon: Brand.textSecondary,
    tabIconDefault: Brand.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: Brand.textPrimary,
    background: Brand.bgDeep,
    tint: tintColorDark,
    icon: Brand.textSecondary,
    tabIconDefault: Brand.textMuted,
    tabIconSelected: tintColorDark,
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
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
