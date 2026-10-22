import { Text, type TextProps } from 'react-native';

import { fonts, useTheme, type Colors } from '@/theme';

type Props = TextProps & {
  /** 10 for tight meta lines, 11 for stats and section labels. */
  size?: 10 | 11;
  bold?: boolean;
  color?: keyof Colors;
};

/** Small uppercase mono line: `VIETNAM · MAR · 9D · $$`, `DONE · TODAY 14:02`. */
export function MonoLabel({ size = 11, bold, color = 'mu', style, children, ...rest }: Props) {
  const { c } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: bold ? fonts.monoBold : fonts.mono,
          fontSize: size,
          lineHeight: size + 5,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: c[color],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}
