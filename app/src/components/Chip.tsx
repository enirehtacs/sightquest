import { Pressable, Text, View } from 'react-native';

import { fonts, radius, useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Filter chips show how many options are on. */
  count?: number;
  icon?: IconName;
};

export function Chip({ label, selected, onPress, count, icon }: Props) {
  const { c } = useTheme();
  const fg = selected ? 'on' : 'tx';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={2}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: radius.chip,
        borderWidth: 1,
        borderColor: selected ? c.ac : c.ln,
        backgroundColor: selected ? c.ac : c.sf,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {icon && <Icon name={icon} size={16} color={selected ? 'on' : 'act'} />}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c[fg] }}>{label}</Text>
      {!!count && (
        <View
          style={{
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 999,
            backgroundColor: selected ? c.on : c.ac,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: selected ? c.ac : c.on }}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}
