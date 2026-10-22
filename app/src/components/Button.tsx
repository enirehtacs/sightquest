import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';

import { fonts, radius, useTheme, type Colors } from '@/theme';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** `sm` looks 36 tall but keeps a 44px tap area. */
  size?: 'md' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the full width of its parent. */
  block?: boolean;
  accessibilityLabel?: string;
};

const LOOK: Record<Variant, { bg: keyof Colors | null; fg: keyof Colors; border: keyof Colors | null }> = {
  primary: { bg: 'ac', fg: 'on', border: null },
  ghost: { bg: null, fg: 'tx', border: 'ln' },
  danger: { bg: null, fg: 'danger', border: 'ln' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  block,
  accessibilityLabel,
}: Props) {
  const { c } = useTheme();
  const look = LOOK[variant];
  const h = size === 'md' ? 48 : 36;
  const style: ViewStyle = {
    height: h,
    paddingHorizontal: size === 'md' ? 20 : 14,
    borderRadius: radius.chip,
    backgroundColor: look.bg ? c[look.bg] : 'transparent',
    borderWidth: look.border ? 1 : 0,
    borderColor: look.border ? c[look.border] : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: block ? 'stretch' : 'flex-start',
    opacity: disabled ? 0.4 : 1,
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => [style, pressed && { opacity: 0.75 }]}
    >
      {loading ? (
        <ActivityIndicator color={c[look.fg]} />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'md' ? 20 : 16} color={look.fg} strokeWidth={2} />}
          <Text style={{ fontFamily: fonts.bold, fontSize: size === 'md' ? 15 : 13, color: c[look.fg] }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
