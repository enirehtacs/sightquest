import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, DateField, Field, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { useAuth } from '@/lib/auth';
import { createRoute, todayLocal } from '@/lib/build';
import { fonts, radius, useTheme } from '@/theme';

type Mode = 'live' | 'past';

/** New route: design/prototype/Create.dc.html, SPEC section 6. */
export default function NewRoute() {
  const { c } = useTheme();
  const toast = useToast();
  const { uid, profile, preview } = useAuth();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<Mode>('past');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [imp, setImp] = useState<'photos' | 'blank'>('photos');
  const [busy, setBusy] = useState(false);
  const today = todayLocal();

  const photos = mode === 'past' && imp === 'photos';
  const named = title.trim().length > 0;
  const ready = named && (mode === 'live' || photos || (!!from && !!to && from <= to));
  const cta = mode === 'live' ? 'Start Day 1' : photos ? 'Choose photos' : 'Open the day builder';

  const close = () => (router.canGoBack() ? router.back() : router.replace('/explore'));

  async function go() {
    if (!ready || !uid) return;
    if (photos) {
      router.push({ pathname: '/build/photos', params: { title: title.trim() } });
      return;
    }
    if (preview) return toast('Preview mode: sign in to build a route.');
    setBusy(true);
    try {
      const id = await createRoute({
        ownerId: uid,
        title,
        live: mode === 'live',
        startDate: mode === 'live' ? today : from,
        endDate: mode === 'live' ? null : to,
        blur: profile?.blur_sleep ?? true,
        delay: profile?.live_delay ?? true,
      });
      router.replace({ pathname: '/build/[id]', params: { id, add: '1' } });
    } catch {
      toast('Couldn’t start the route. Check your signal and try again.');
      setBusy(false);
    }
  }

  return (
    <Screen
      overlay={
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 24, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.ln }}>
          <Button label={cta} onPress={go} disabled={!ready} loading={busy} block />
        </View>
      }
      contentStyle={{ paddingBottom: 120 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>New route</Txt>
      </View>

      <Field label="NAME IT" value={title} onChangeText={setTitle} placeholder="Bac Ha loop, the scenic way" maxLength={80} />

      <View style={{ gap: 8 }}>
        <MonoLabel bold>WHEN ARE YOU ADDING IT</MonoLabel>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {(
            [
              ['live', 'I’m travelling now', 'Add each day as you go. Share it live if you want.'],
              ['past', 'A trip I’ve done', 'Add the days from memory, or let your photos fill them in.'],
            ] as const
          ).map(([k, t, s]) => {
            const on = mode === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setMode(k)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingVertical: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: on ? 2 : 1, borderColor: on ? c.act : c.ln }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 999, borderWidth: on ? 6 : 2, borderColor: on ? c.act : c.mu }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t}</Txt>
                  <Txt variant="small">{s}</Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {mode === 'past' ? (
        <>
          <View style={{ gap: 8 }}>
            <MonoLabel bold>HOW DO YOU WANT TO ADD THE DAYS</MonoLabel>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  ['photos', 'Upload photos'],
                  ['blank', 'Start blank'],
                ] as const
              ).map(([k, l]) => {
                const on = imp === k;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setImp(k)}
                    style={{ flex: 1, height: 46, borderRadius: radius.card, borderWidth: 1, borderColor: on ? c.ac : c.ln, backgroundColor: on ? c.ac : c.sf, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? c.on : c.tx }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {photos ? (
            <View style={{ gap: 10, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>Too busy to post on the trip? Do it now.</Txt>
              {[
                'Pick photos from the trip. A few from each day is enough.',
                'We sort them into days using the date and place your phone saved in each photo.',
                'Check the days, star the ones that become moments, then add notes.',
              ].map((t, i) => (
                <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.heavy, fontSize: 12, color: c.act }}>{i + 1}</Text>
                  </View>
                  <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{t}</Txt>
                </View>
              ))}
              <Txt variant="small">Photos stay private. Only the ones you turn into moments get posted.</Txt>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <MonoLabel bold>WHEN DID YOU GO</MonoLabel>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <DateField label="FROM" value={from} onChange={(v) => { setFrom(v); if (!to || to < v) setTo(v); }} max={today} />
                <DateField label="TO" value={to} onChange={setTo} min={from ?? undefined} max={today} />
              </View>
              <Txt variant="small">Only you see the exact dates. Everyone else sees the month you went.</Txt>
              <Txt variant="small">Add each day yourself, in any order. You can add photos to any day later.</Txt>
            </View>
          )}
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
          <Icon name="shield" size={20} color="act" strokeWidth={2} />
          <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
            Starts private. You choose later if followers can see it, with a delay and where you sleep blurred.
          </Txt>
        </View>
      )}

      <View style={{ gap: 4, padding: 14, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: c.ln }}>
        <MonoLabel bold>NEXT</MonoLabel>
        <Txt variant="small" style={{ lineHeight: 19 }}>
          Both open the same day-by-day builder. Add where you went, how you got there, the weather, moments and spots. When you finish, rate the effort and budget.
        </Txt>
      </View>
    </Screen>
  );
}
