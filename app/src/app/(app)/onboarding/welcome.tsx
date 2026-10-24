import { router } from 'expo-router';
import { useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Button, MonoLabel, Txt } from '@/components';
import { alpha, fonts, useTheme, type Colors } from '@/theme';

// Welcome — design/prototype/Welcome.dc.html. Four cards, swipe or Next, Skip.
// Never mention the year recap or badges here.
const SLIDES: [string, string, string, string[]][] = [
  ['1 OF 4 · EXPLORE', 'Routes real people actually took.', 'Not ads, not listicles. Day-by-day routes from travellers, chill to epic.', ['Search by place, vibe, effort and month', 'Save the ones you love for someday', 'Remix a route and make it your own']],
  ['2 OF 4 · BUILD', 'Build your trip one day at a time.', 'Add each day live as you go, or after the trip from your photos.', ['Live sharing is off until you turn it on', 'Exact dates stay private, people only see the month', 'Works offline when there’s no signal']],
  ['3 OF 4 · HELP EACH OTHER', 'We’re all here to travel better.', 'Every route gets better when people who went pitch in.', ['Ask and answer on Campfire', 'Post updates when something changed', 'Fill in the Must-know so the next person doesn’t have to ask']],
  ['4 OF 4 · GO FURTHER', 'Take on a sidequest.', 'Every week we drop a new dare. Do it, post it, inspire someone else to go.', ['Done it before? Ages ago still counts', 'See how the whole community took on the same dare', 'The best stories get featured on Explore']],
];

export default function Welcome() {
  const { c } = useTheme();
  const [i, setI] = useState(0);
  const [kicker, title, text, points] = SLIDES[i];
  const last = i === SLIDES.length - 1;

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) setI((x) => Math.min(SLIDES.length - 1, x + 1));
        else if (g.dx > 40) setI((x) => Math.max(0, x - 1));
      },
    }),
  );

  const toPledge = () => router.replace('/onboarding/pledge');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View {...pan.panHandlers} style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4 }}>
          <MonoLabel bold>{kicker}</MonoLabel>
          <Pressable accessibilityRole="button" onPress={toPledge} style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.mu }}>Skip</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28 }}>
          <View style={{ alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Illustration i={i} c={c} />
          </View>
          <View style={{ gap: 12 }}>
            <MonoLabel bold color="act" style={{ fontSize: 12 }}>{kicker.split(' · ')[1]}</MonoLabel>
            <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 30, lineHeight: 33 }}>{title}</Txt>
            <Txt color="mu" style={{ fontSize: 16, lineHeight: 24 }}>{text}</Txt>
            <View style={{ gap: 8, marginTop: 4 }}>
              {points.map((p) => (
                <View key={p} style={{ flexDirection: 'row', gap: 10 }}>
                  <Txt color="act" style={{ fontFamily: fonts.heavy }}>·</Txt>
                  <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{p}</Txt>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12, gap: 18, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Card ${i + 1} of 4`}>
            {SLIDES.map((_, j) => (
              <View key={j} style={{ height: 8, width: j === i ? 22 : 8, borderRadius: 999, backgroundColor: j === i ? c.act : c.ln }} />
            ))}
          </View>
          {last ? (
            <Button label="Begin the initiation" onPress={toPledge} block />
          ) : (
            <Button label="Next" onPress={() => setI(i + 1)} block />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/** The four little pictures, redrawn with theme tokens. */
function Illustration({ i, c }: { i: number; c: Colors }) {
  const size = { width: 300, height: 220, viewBox: '0 0 300 220' };
  if (i === 0)
    return (
      <Svg {...size}>
        <G fill="none" stroke={c.cnt} strokeWidth={1.4}>
          <Path d="M-10 60 C60 30 120 90 190 50 S300 40 320 60" />
          <Path d="M-10 120 C70 90 140 150 210 110 S300 100 320 120" />
          <Path d="M-10 180 C60 160 140 210 220 170 S300 160 320 180" />
        </G>
        <Path d="M40 180 C80 150 90 100 140 106 S180 150 210 120 S240 50 268 40" fill="none" stroke={c.rt} strokeWidth={5} strokeLinecap="round" />
        <Circle cx={40} cy={180} r={9} fill={c.tx} stroke={c.ring} strokeWidth={3} />
        <Circle cx={140} cy={106} r={7} fill={c.tx} stroke={c.ring} strokeWidth={3} />
        <Circle cx={268} cy={40} r={10} fill={c.ac} stroke={c.ring} strokeWidth={3} />
      </Svg>
    );
  if (i === 1)
    return (
      <Svg {...size}>
        <G fill={c.sf} stroke={c.ln} strokeWidth={2}>
          <Rect x={40} y={30} width={220} height={44} rx={12} />
          <Rect x={40} y={88} width={220} height={44} rx={12} />
          <Rect x={40} y={146} width={220} height={44} rx={12} stroke={c.act} strokeDasharray="6 6" />
        </G>
        <G fontFamily={fonts.monoBold} fontSize={12} fill={c.mu}>
          <SvgText x={58} y={57}>DAY 1</SvgText>
          <SvgText x={58} y={115}>DAY 2</SvgText>
          <SvgText x={58} y={173} fill={c.act}>+ NEXT DAY</SvgText>
        </G>
        <Rect x={196} y={38} width={28} height={28} rx={6} fill={c.ph1} />
        <Rect x={228} y={38} width={22} height={28} rx={6} fill={c.ph2} />
        <Rect x={210} y={96} width={40} height={28} rx={6} fill={c.ph3} />
      </Svg>
    );
  if (i === 2)
    return (
      <Svg {...size}>
        <Rect x={30} y={34} width={190} height={56} rx={16} fill={c.sf} stroke={c.ln} strokeWidth={2} />
        <Rect x={80} y={104} width={190} height={56} rx={16} fill={alpha(c.ac, 0.12)} stroke={c.act} strokeWidth={2} />
        <Circle cx={58} cy={62} r={12} fill={c.ph3} />
        <Circle cx={248} cy={132} r={12} fill={c.ph2} />
        <Rect x={80} y={54} width={120} height={7} rx={3} fill={c.mu} />
        <Rect x={80} y={68} width={80} height={7} rx={3} fill={c.ln} />
        <Rect x={100} y={124} width={120} height={7} rx={3} fill={c.tx} />
        <Rect x={100} y={138} width={90} height={7} rx={3} fill={c.mu} />
        <Path d="M150 186 l8 -8 a6 6 0 0 0 -8 -8 a6 6 0 0 0 -8 8z" fill={c.danger} />
      </Svg>
    );
  return (
    <Svg {...size}>
      <G transform="translate(150 110)">
        <Circle r={62} fill={alpha(c.ac, 0.08)} stroke={c.act} strokeWidth={4} />
        <Circle r={48} fill="none" stroke={c.act} strokeWidth={1.5} strokeDasharray="3 5" opacity={0.6} />
        <Path d="M-26 22 L-6 -18 L6 2 L14 -8 L30 22z" fill="none" stroke={c.gold} strokeWidth={5} strokeLinejoin="round" />
      </G>
      <G transform="translate(58 70) rotate(-10)">
        <Rect x={-22} y={-22} width={44} height={44} rx={10} fill={c.ac} />
        <Path d="M-8 -10 h16 v14 h-16z M-8 -2 h16 M-4 8 l-3 4 M4 8 l3 4" stroke={c.on} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </G>
      <G transform="translate(248 160) rotate(8)">
        <Rect x={-20} y={-20} width={40} height={40} rx={10} fill={c.sf2} stroke={c.ln} strokeWidth={2} />
        <Path d="M-10 6 h20 l-4 6 h-12z M0 -12 v18 M0 -10 l8 10 h-8" stroke={c.mu} strokeWidth={2.4} fill="none" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}
