import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Chip, MonoLabel, Sheet, Toggle, Txt } from '@/components';
import type { SowoAnswer } from '@/lib/build';
import { BUDGET_NAMES, EFFORT_NAMES, TERRAIN, VIBES } from '@/lib/routeFormat';
import { fonts, radius, useTheme } from '@/theme';

export type Visibility = 'private' | 'followers' | 'public';
export const VIS_LABEL: Record<Visibility, string> = { private: 'Only me', followers: 'Followers', public: 'Everyone' };

function SwitchRow({ label, hint, on, onPress }: { label: string; hint: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.cardSm, backgroundColor: c.sf2 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>{label}</Txt>
        <Txt variant="small">{hint}</Txt>
      </View>
      <Toggle on={on} />
    </Pressable>
  );
}

/** "Before you go live" (Live.dc.html): recommends the delay and blurring where you sleep. */
export function GoLiveSheet({
  target,
  delay,
  blur,
  onConfirm,
  onClose,
}: {
  target: Visibility | null;
  delay: boolean;
  blur: boolean;
  onConfirm: (v: { delay: boolean; blur: boolean }) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(delay);
  const [b, setB] = useState(blur);
  return (
    <Sheet visible={!!target} onClose={onClose} title="Before you go live">
      <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>
        Live routes show where you are as you travel. Someone could use that to work out where you’re staying or where you’re heading next. Most solo travellers share with a delay.
      </Txt>
      <SwitchRow label="Post with a 24h delay" hint="People see yesterday, never today" on={d} onPress={() => setD(!d)} />
      <SwitchRow label="Blur where I sleep" hint="Overnight stops show as a 2 km area" on={b} onPress={() => setB(!b)} />
      <Txt variant="small" style={{ lineHeight: 18 }}>Never post your hostel name, room number or tomorrow’s plan. You can switch back to private any time.</Txt>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="Keep private" variant="ghost" block onPress={onClose} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button label={target === 'public' ? 'Share with everyone' : 'Share with followers'} block onPress={() => onConfirm({ delay: d, blur: b })} />
        </View>
      </View>
    </Sheet>
  );
}

export type CompleteAnswers = {
  budget: number;
  effort: number;
  vibes: string[];
  terrain: string[];
  visibility: Visibility;
  sowo: SowoAnswer | null;
};

const SOLO: [SowoAnswer, string][] = [
  ['comfortable', 'Felt comfortable'],
  ['stay_alert', 'Fine, stay alert'],
  ['wouldnt_solo', 'Wouldn’t go solo'],
  ['didnt_solo', 'Didn’t go solo'],
];

/** Mark route complete: price level, effort, tags, who sees it, and (only for women) the SOWO question. */
export function CompleteSheet({
  visible,
  initial,
  askSowo,
  busy,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: Partial<CompleteAnswers>;
  askSowo: boolean;
  busy: boolean;
  onSave: (a: CompleteAnswers) => void;
  onClose: () => void;
}) {
  const { c } = useTheme();
  const [budget, setBudget] = useState(initial.budget ?? 0);
  const [effort, setEffort] = useState(initial.effort ?? 0);
  const [vibes, setVibes] = useState<string[]>(initial.vibes ?? []);
  const [terrain, setTerrain] = useState<string[]>(initial.terrain ?? []);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility && initial.visibility !== 'private' ? initial.visibility : 'public');
  const [sowo, setSowo] = useState<SowoAnswer | null>(null);
  const toggle = (list: string[], set: (l: string[]) => void, k: string) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  const levels = (n: number, value: number, set: (v: number) => void, label: (i: number) => string, names: string[]) => (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: n }, (_, i) => {
        const on = i + 1 <= value;
        return (
          <Pressable
            key={i}
            accessibilityRole="radio"
            accessibilityLabel={names[i]}
            accessibilityState={{ checked: i + 1 === value }}
            onPress={() => set(i + 1)}
            style={{ flex: 1, height: 44, borderRadius: 14, borderWidth: 1, borderColor: on ? c.ac : c.ln, backgroundColor: on ? c.ac : c.bg, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: fonts.monoBold, fontSize: 13, color: on ? c.on : c.tx }}>{label(i)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Route complete">
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 16, paddingBottom: 4 }}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>How pricey was the trip?</Txt>
            <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{budget ? BUDGET_NAMES[budget - 1] : ''}</Txt>
          </View>
          {levels(4, budget, setBudget, (i) => '$'.repeat(i + 1), BUDGET_NAMES)}
          <Txt variant="small">Shown as a price level, never what you actually spent.</Txt>
        </View>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>How much effort was it?</Txt>
            <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{effort ? EFFORT_NAMES[effort - 1] : ''}</Txt>
          </View>
          {levels(5, effort, setEffort, (i) => String(i + 1), EFFORT_NAMES)}
        </View>
        <View style={{ gap: 8 }}>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>What was the vibe?</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {VIBES.map(([k, l]) => (
              <Chip key={k} label={l} selected={vibes.includes(k)} onPress={() => toggle(vibes, setVibes, k)} />
            ))}
          </View>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 15, marginTop: 4 }}>Terrain</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TERRAIN.map(([k, l]) => (
              <Chip key={k} label={l} selected={terrain.includes(k)} onPress={() => toggle(terrain, setTerrain, k)} />
            ))}
          </View>
          <Txt variant="small">These help people find your route in Search.</Txt>
        </View>
        {askSowo && (
          <View style={{ gap: 8, padding: 12, borderRadius: radius.cardSm, backgroundColor: c.sf2 }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>Did this solo as a woman?</Txt>
            <Txt variant="small">Optional. Adds to the route’s SOWO score. Your answer is never shown on its own.</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SOLO.map(([k, l]) => (
                <Chip key={k} label={l} selected={sowo === k} onPress={() => setSowo(sowo === k ? null : k)} />
              ))}
            </View>
          </View>
        )}
        <View style={{ gap: 8 }}>
          <MonoLabel bold>WHO CAN SEE IT</MonoLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(Object.keys(VIS_LABEL) as Visibility[]).map((v) => (
              <Chip key={v} label={VIS_LABEL[v]} selected={visibility === v} onPress={() => setVisibility(v)} />
            ))}
          </View>
          <Txt variant="small">
            {visibility === 'private' ? 'Only you see it, and it stays out of Search.' : visibility === 'followers' ? 'People who follow you can find it.' : 'It shows up in Explore and Search.'}
          </Txt>
        </View>
      </ScrollView>
      <Button
        label="Mark route complete"
        block
        loading={busy}
        disabled={!budget || !effort}
        onPress={() => onSave({ budget, effort, vibes, terrain, visibility, sowo })}
      />
      {(!budget || !effort) && <Txt variant="small" style={{ textAlign: 'center', marginTop: -6 }}>Pick a price level and an effort first.</Txt>}
    </Sheet>
  );
}
