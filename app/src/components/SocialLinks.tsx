import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { addedLinks, LINK_LABEL, linkUrl, type Links } from '@/lib/profiles';
import { useTheme } from '@/theme';
import { Icon } from './Icon';

/**
 * Profile social icons, one row. Only the links the person added show up.
 * On your own profile a dashed "+" opens Edit profile.
 */
export function SocialLinks({ links, owner }: { links: Links | null | undefined; owner?: boolean }) {
  const { c } = useTheme();
  const added = addedLinks(links);
  if (!added.length && !owner) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      {added.map(([key, value]) => (
        <Pressable
          key={key}
          accessibilityRole="link"
          accessibilityLabel={`${LINK_LABEL[key]} (opens outside Sightquest)`}
          onPress={() => Linking.openURL(linkUrl(key, value))}
          hitSlop={3}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.ln,
            backgroundColor: c.sf,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name={key} size={18} color="act" strokeWidth={2} />
        </Pressable>
      ))}
      {owner && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a link"
          onPress={() => router.push('/me/edit')}
          hitSlop={3}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 999,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.ln,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="plus" size={18} color="mu" strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}
