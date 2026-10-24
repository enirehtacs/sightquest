import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Chip, Field, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { useBuild } from '@/features/build/useBuild';
import { useAuth } from '@/lib/auth';
import { saveTunes } from '@/lib/build';
import type { TripTunes } from '@/lib/routes';
import { fonts, radius, useTheme } from '@/theme';

const SPOTIFY = /^https:\/\/open\.spotify\.com\/(playlist|track|album)\/[A-Za-z0-9]+/;

/** Trip tunes (Soundtrack.dc.html). Paste a link for now; connecting Spotify comes later. */
export default function TunesEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useBuild(id);
  if (!data) return <Screen>{null}</Screen>;
  return <Editor routeId={data.card.id} tunes={data.tunes} />;
}

function Editor({ routeId, tunes }: { routeId: string; tunes: TripTunes | null }) {
  const { c } = useTheme();
  const toast = useToast();
  const { preview } = useAuth();
  const [kind, setKind] = useState<'playlist' | 'track'>(tunes?.kind ?? 'playlist');
  const [url, setUrl] = useState(tunes?.spotify_url ?? '');
  const [title, setTitle] = useState(tunes?.title ?? '');
  const [note, setNote] = useState(tunes?.note ?? '');
  const [busy, setBusy] = useState(false);
  const linkOk = SPOTIFY.test(url.trim());
  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/build/[id]', params: { id: routeId } }));

  async function save() {
    if (preview) return toast('Preview mode: nothing is saved.');
    setBusy(true);
    try {
      await saveTunes(routeId, { kind, spotify_url: url.trim(), title: title.trim().slice(0, 80), note: note.trim() || null }, !!tunes);
      toast('Trip tunes saved');
      back();
    } catch {
      toast('Couldn’t save. Check your signal and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to your route" onPress={back} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>Trip tunes</Txt>
      </View>
      <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>The soundtrack of the trip. Add a Spotify playlist or one song, and a line about why.</Txt>

      <View style={{ gap: 8 }}>
        <MonoLabel bold>WHAT IS IT</MonoLabel>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Playlist" selected={kind === 'playlist'} onPress={() => setKind('playlist')} />
          <Chip label="One song" selected={kind === 'track'} onPress={() => setKind('track')} />
        </View>
      </View>
      <Field
        label="SPOTIFY LINK"
        value={url}
        onChangeText={setUrl}
        placeholder="https://open.spotify.com/…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        hint="In Spotify: Share › Copy link."
        error={url.trim().length > 10 && !linkOk ? 'That doesn’t look like a Spotify playlist or song link.' : null}
      />
      <Field label="NAME" value={title} onChangeText={setTitle} placeholder={kind === 'playlist' ? 'Ha Giang on two wheels' : 'The song'} maxLength={80} />
      <Field label="WHY THIS ONE (OPTIONAL)" value={note} onChangeText={setNote} placeholder="On loop through every pass…" maxLength={200} multiline />
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.cardSm, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
        <Icon name="music" size={18} color="act" strokeWidth={2} />
        <Txt variant="small" style={{ flex: 1, lineHeight: 18 }}>Connecting Spotify to show the first songs automatically is coming later. For now people get the name, your note and a Play on Spotify button.</Txt>
      </View>
      <Button label="Save trip tunes" block disabled={!linkOk || !title.trim()} loading={busy} onPress={save} />
    </Screen>
  );
}
