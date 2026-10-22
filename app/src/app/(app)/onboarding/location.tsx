import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button, Txt } from '@/components';
import { fonts, useTheme } from '@/theme';

// Location permission — design/prototype/Location.dc.html.
// "Allow location" opens the real OS / browser prompt; then on to Explore either way.
const POINTS = [
  'See routes that start close to you',
  'Add today’s stop to a live route in one tap',
  'Live sharing stays off until you turn it on',
];

export default function LocationAsk() {
  const { c } = useTheme();
  const [asking, setAsking] = useState(false);

  const done = () => router.replace('/explore');

  async function allow() {
    setAsking(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Not available (e.g. an old browser): carry on without it.
    }
    done();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24 }}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
          <View style={{ alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Svg viewBox="0 0 240 240" width={240} height={240}>
              <Circle cx={120} cy={120} r={110} fill="none" stroke={c.ac} strokeOpacity={0.1} strokeWidth={1} />
              <Circle cx={120} cy={120} r={80} fill="none" stroke={c.ac} strokeOpacity={0.2} strokeWidth={1} />
              <Circle cx={120} cy={120} r={50} fill="none" stroke={c.ac} strokeOpacity={0.35} strokeWidth={1.2} />
              <Path d="M28 132 C60 110 90 150 120 128 S180 104 212 126" fill="none" stroke={c.cnt} strokeWidth={1.4} />
              <Path d="M40 96 C70 80 98 110 124 94 S176 74 200 92" fill="none" stroke={c.cnt} strokeWidth={1.4} />
              <Path d="M120 120 C150 132 160 168 196 176" fill="none" stroke={c.rt} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
              <Circle cx={196} cy={176} r={6} fill={c.tx} stroke={c.ring} strokeWidth={2} />
              <Circle cx={64} cy={70} r={5} fill={c.tx} stroke={c.ring} strokeWidth={2} />
              <Circle cx={70} cy={178} r={5} fill={c.tx} stroke={c.ring} strokeWidth={2} />
              <Circle cx={120} cy={120} r={20} fill={c.info} fillOpacity={0.25} />
              <Circle cx={120} cy={120} r={10} fill={c.info} stroke={c.sf} strokeWidth={3} />
            </Svg>
          </View>
          <View style={{ gap: 12 }}>
            <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 26, lineHeight: 30 }}>Find routes near you</Txt>
            <Txt color="mu" style={{ fontSize: 15, lineHeight: 22 }}>
              Sightquest uses your location to show nearby routes and put you on the map. Nobody else sees where you are.
            </Txt>
            <View style={{ gap: 10, marginTop: 6 }}>
              {POINTS.map((t, n) => (
                <View key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: c.act }}>{n + 1}</Text>
                  </View>
                  <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20, paddingTop: 4 }}>{t}</Txt>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={{ gap: 8, paddingBottom: 24, paddingTop: 12 }}>
          <Button label="Allow location" onPress={allow} loading={asking} block />
          <Pressable accessibilityRole="button" onPress={done} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.mu }}>Not now</Text>
          </Pressable>
          <Txt variant="small" style={{ fontSize: 12, textAlign: 'center' }}>Change this any time in Settings › Privacy & safety</Txt>
        </View>
      </View>
    </SafeAreaView>
  );
}
