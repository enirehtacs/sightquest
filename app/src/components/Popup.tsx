import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { fonts, space, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Read out by screen readers. */
  label: string;
  children: ReactNode;
};

/** A card in the middle of the screen over a scrim (SOWO score, Trip tunes). */
export function Popup({ visible, onClose, label, children }: Props) {
  const { c } = useTheme();
  if (!visible) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'center', padding: space.gutter }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: c.scrim }} />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={{ width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: 20, padding: 14, gap: 12 }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** The ✕ in a popup's corner. */
export function CloseX({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      hitSlop={6}
      style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: c.tx }}>✕</Text>
    </Pressable>
  );
}
