import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { fonts, useTheme } from '@/theme';

type Props = {
  uri?: string | null;
  /** Used for the initial and the accessibility label. */
  name?: string;
  size?: number;
  /** `you` = your own avatar (green ring), `ring` = outline when avatars overlap. */
  ring?: 'none' | 'ring' | 'you';
  /** Placeholder colour while there's no photo, 1–4. */
  tone?: 1 | 2 | 3 | 4;
};

export function Avatar({ uri, name, size = 40, ring = 'none', tone = 2 }: Props) {
  const { c } = useTheme();
  const bg = c[`ph${tone}` as const];
  const border = ring === 'you' ? c.act : ring === 'ring' ? c.ring : 'transparent';
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s photo` : 'Profile photo'}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: ring === 'none' ? 0 : 2,
        borderColor: border,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      ) : name ? (
        <Text style={{ fontFamily: fonts.heavy, fontSize: size * 0.4, color: c.tx }}>
          {name.replace(/^@/, '').charAt(0).toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}
