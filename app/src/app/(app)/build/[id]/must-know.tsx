import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, Chip, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { useBuild } from '@/features/build/useBuild';
import { useAuth } from '@/lib/auth';
import { deleteMustKnow, saveMustKnow } from '@/lib/build';
import { MUST_KNOW } from '@/lib/routeFormat';
import type { MustKnow } from '@/lib/routes';
import { fonts, radius, useTheme } from '@/theme';

// SPEC section 7. Wildlife never suggests pepper spray or a walking stick.
const CATS: { key: string; q: string; opts: string[]; ph: string; multi?: boolean }[] = [
  { key: 'visa', q: 'How do people get in?', opts: ['Visa-free', 'e-Visa', 'On arrival', 'Get before you fly'], ph: 'How long you can stay, cost, tips' },
  { key: 'permits', q: 'Any permits or entry fees?', opts: ['None', 'Buy on the spot', 'Book ahead'], ph: 'Which permit, roughly how much' },
  { key: 'wheels', q: 'What do you need to drive or ride?', opts: ['Not needed', 'IDP', 'Local licence', 'Hire a driver'], ph: 'Checkpoints, rental tips' },
  { key: 'cash', q: 'How do people pay?', opts: ['Cash only', 'Mostly cash', 'Card ok'], ph: 'Where the ATMs are' },
  { key: 'sim', q: 'Phone signal on the route?', opts: ['Good everywhere', 'Patchy', 'None on parts'], ph: 'Best network, where to buy' },
  { key: 'book', q: 'Do stays and transport sell out?', opts: ['Walk in', 'Weekends only', 'Book everything'], ph: 'What sold out for you' },
  { key: 'roads', q: 'What are the roads or trails like?', opts: ['Smooth', 'Mixed', 'Rough', '4x4 only'], ph: 'The worst stretch' },
  { key: 'water', q: 'Can you drink the water?', opts: ['Tap is fine', 'Filter or boil', 'Bottled only'], ph: 'Nearest clinic, bugs, altitude' },
  { key: 'scams', q: 'Anything to watch out for?', opts: ['None seen', 'Watch out'], ph: 'What happened, how to avoid it' },
  { key: 'dress', q: 'What should people wear?', opts: ['Relaxed', 'Cover up at sacred places', 'Conservative'], ph: 'Shoulders, knees, shoes off indoors' },
  { key: 'wildlife', q: 'Any animals to watch for?', opts: ['Nothing to worry about', 'Stray dogs', 'Monkeys', 'Snakes', 'Leeches', 'Bears'], ph: 'What you saw and where', multi: true },
  { key: 'pack', q: 'What did you wish you had?', opts: ['Waterproof layer', 'Warm layer', 'Sun protection', 'Bug protection', 'Headtorch', 'Bring snacks', 'Bring water'], ph: 'Anything else', multi: true },
];

type Entry = { id?: string; chips: string[]; note: string };
type Custom = { id?: string; label: string; note: string };

/** Must-know editor: design/prototype/MustKnow.dc.html. */
export default function MustKnowEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useBuild(id);
  if (!data) return <Screen>{null}</Screen>;
  return <Editor routeId={data.card.id} existing={data.mustKnows} />;
}

function Editor({ routeId, existing }: { routeId: string; existing: MustKnow[] }) {
  const { c } = useTheme();
  const toast = useToast();
  const { preview } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<Record<string, Entry>>(() =>
    Object.fromEntries(existing.filter((m) => m.category !== 'custom').map((m) => [m.category, { id: m.id, chips: m.chips, note: m.note ?? '' }])),
  );
  const [customs, setCustoms] = useState<Custom[]>(() => existing.filter((m) => m.category === 'custom').map((m) => ({ id: m.id, label: m.custom_label ?? '', note: m.note ?? '' })));
  const [removed, setRemoved] = useState<string[]>([]);

  const filled = CATS.filter((k) => (entries[k.key]?.chips.length ?? 0) > 0 || entries[k.key]?.note.trim()).length;
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/build/[id]', params: { id: routeId } }));
  const set = (key: string, e: Entry) => setEntries({ ...entries, [key]: e });

  async function save() {
    if (preview) return toast('Preview mode: nothing is saved.');
    setBusy(true);
    try {
      let sort = 0;
      for (const k of CATS) {
        const e = entries[k.key];
        const has = e && (e.chips.length || e.note.trim());
        if (has) await saveMustKnow(routeId, { id: e.id, category: k.key, chips: e.chips, note: e.note.trim() || null, sort: sort++ });
        else if (e?.id) await deleteMustKnow(e.id);
      }
      for (const u of customs) {
        if (u.label.trim()) await saveMustKnow(routeId, { id: u.id, category: 'custom', custom_label: u.label.trim().slice(0, 30), chips: [], note: u.note.trim() || null, sort: sort++ });
        else if (u.id) await deleteMustKnow(u.id);
      }
      for (const rid of removed) await deleteMustKnow(rid);
      toast('Must-know saved');
      back();
    } catch {
      toast('Couldn’t save. Must-knows need signal: try again when you’re back online.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      contentStyle={{ gap: 12, paddingBottom: 110 }}
      overlay={
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 24, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.ln }}>
          <Button label="Save must-know" block loading={busy} onPress={save} />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to your route" onPress={back} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>Must-know</Txt>
      </View>
      <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>The stuff people always ask before they go. Tap an answer, add a line if you want. Skip anything you don’t know.</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: c.sf2, overflow: 'hidden' }}>
          <View style={{ width: `${(filled / CATS.length) * 100}%`, height: '100%', backgroundColor: c.ac }} />
        </View>
        <MonoLabel bold>{filled} OF {CATS.length}</MonoLabel>
      </View>

      {CATS.map((k) => {
        const meta = MUST_KNOW[k.key];
        const e = entries[k.key] ?? { chips: [], note: '' };
        const done = e.chips.length > 0 || !!e.note.trim();
        const isOpen = open === k.key;
        return (
          <View key={k.key} style={{ borderRadius: radius.card, borderWidth: 1, borderColor: isOpen ? c.act : c.ln, backgroundColor: c.sf, overflow: 'hidden' }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? null : k.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <Icon name={meta.icon} size={20} color="act" strokeWidth={1.9} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>{meta.label}</Txt>
                <Txt variant="small" numberOfLines={1}>{done ? [e.chips.join(', '), e.note.trim()].filter(Boolean).join(' · ') : 'Not filled · tap to add'}</Txt>
              </View>
              <View style={{ width: 26, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? c.ac : 'transparent', borderWidth: done ? 0 : 1, borderColor: c.ln }}>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: done ? c.on : c.mu }}>{done ? '✓' : '+'}</Text>
              </View>
            </Pressable>
            {isOpen && (
              <View style={{ gap: 10, paddingHorizontal: 12, paddingBottom: 12 }}>
                <Txt style={{ fontSize: 14 }}>{k.q}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {k.opts.map((o) => {
                    const on = e.chips.includes(o);
                    return (
                      <Chip
                        key={o}
                        label={o}
                        selected={on}
                        onPress={() => set(k.key, { ...e, chips: on ? e.chips.filter((x) => x !== o) : k.multi ? [...e.chips, o] : [o] })}
                      />
                    );
                  })}
                </View>
                <TextInput
                  accessibilityLabel={`${meta.label} note`}
                  value={e.note}
                  onChangeText={(t) => set(k.key, { ...e, note: t })}
                  placeholder={k.ph}
                  placeholderTextColor={c.mu}
                  maxLength={280}
                  style={{ height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: c.ln, backgroundColor: c.bg, fontFamily: fonts.regular, fontSize: 14, color: c.tx, outlineStyle: 'none' } as object}
                />
              </View>
            )}
          </View>
        );
      })}

      <MonoLabel bold style={{ marginTop: 6 }}>YOUR OWN</MonoLabel>
      {customs.map((u, i) => (
        <View key={u.id ?? `n${i}`} style={{ gap: 8, padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              accessibilityLabel="Category name"
              value={u.label}
              onChangeText={(t) => setCustoms(customs.map((x, j) => (j === i ? { ...x, label: t } : x)))}
              placeholder="Category, e.g. Tet holiday"
              placeholderTextColor={c.mu}
              maxLength={30}
              style={{ flex: 1, height: 40, fontFamily: fonts.bold, fontSize: 15, color: c.tx, outlineStyle: 'none' } as object}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove this one"
              onPress={() => {
                if (u.id) setRemoved([...removed, u.id]);
                setCustoms(customs.filter((_, j) => j !== i));
              }}
              hitSlop={8}
            >
              <Icon name="close" size={18} color="mu" strokeWidth={2.2} />
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="What people should know"
            value={u.note}
            onChangeText={(t) => setCustoms(customs.map((x, j) => (j === i ? { ...x, note: t } : x)))}
            placeholder="What people should know"
            placeholderTextColor={c.mu}
            maxLength={280}
            style={{ height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: c.ln, backgroundColor: c.bg, fontFamily: fonts.regular, fontSize: 14, color: c.tx, outlineStyle: 'none' } as object}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => setCustoms([...customs, { label: '', note: '' }])}
        style={{ minHeight: 48, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: c.ln, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}
      >
        <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' }}>+ Add your own (e.g. festival closures, rainy season)</Txt>
      </Pressable>
    </Screen>
  );
}
