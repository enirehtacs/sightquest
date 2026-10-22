import { View } from 'react-native';

import { useTheme } from '@/theme';

/** The Settings switch: 46×28 track, yellow when on. Purely visual; the row is the button. */
export function Toggle({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        padding: 3,
        flexDirection: 'row',
        justifyContent: on ? 'flex-end' : 'flex-start',
        backgroundColor: on ? c.ac : c.sf2,
        borderWidth: on ? 0 : 1,
        borderColor: c.ln,
      }}
    >
      <View style={{ width: on ? 22 : 20, height: on ? 22 : 20, borderRadius: 999, backgroundColor: on ? c.on : c.mu }} />
    </View>
  );
}
