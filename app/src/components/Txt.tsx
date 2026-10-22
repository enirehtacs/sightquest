import { Text, type TextProps, type TextStyle } from 'react-native';

import { fonts, useTheme, type Colors } from '@/theme';

// Type scale taken from the prototype (Main, Route, Me).
const VARIANTS = {
  h1: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 28 },
  h2: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 22 },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TxtVariant = keyof typeof VARIANTS;

type Props = TextProps & {
  variant?: TxtVariant;
  /** A theme token name. Defaults to `tx` (or `mu` for small). */
  color?: keyof Colors;
};

export function Txt({ variant = 'body', color, style, ...rest }: Props) {
  const { c } = useTheme();
  const fallback = variant === 'small' ? 'mu' : 'tx';
  return (
    <Text
      accessibilityRole={variant === 'h1' || variant === 'h2' ? 'header' : undefined}
      style={[VARIANTS[variant], { color: c[color ?? fallback] }, style]}
      {...rest}
    />
  );
}
