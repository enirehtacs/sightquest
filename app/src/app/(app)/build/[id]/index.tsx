import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Share, Text, TextInput, View } from 'react-native';

import { Button, Chip, Icon, MonoLabel, Screen, Sheet, Txt, useToast } from '@/components';
import { prettyDate } from '@/components/DateField';
import { Map, MapButtons, type MapHandle, type MapPin } from '@/components/map';
import { AddDayForm } from '@/features/build/AddDayForm';
import { CompleteSheet, GoLiveSheet, VIS_LABEL, type CompleteAnswers, type Visibility } from '@/features/build/Sheets';
import { useBuild, type BDay } from '@/features/build/useBuild';
import { useAuth } from '@/lib/auth';
import { deleteRoute, getSowoEligible, queueUpdate, rateSowo, updateRoute } from '@/lib/build';
import { retryFailed } from '@/lib/queue';
import { LEG_MODE, MON, MUST_KNOW_ORDER, WEATHER } from '@/lib/routeFormat';
import { fonts, radius, space, useTheme } from '@/theme';

const ROUTE_URL = 'https://sightquest-app.vercel.app/route/';

/** Day-by-day builder: design/prototype/Live.dc.html (+ LiveOffline, LiveLight), SPEC section 6. */
export default function Builder() {
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
  const { uid, preview } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const map = useRef<MapHandle>(null);
  const { data, days, line, ops, offline, reload } = useBuild(id);
  const [adding, setAdding] = useState(add === '1');
  const [goLive, setGoLive] = useState<Visibility | null>(null);
  const [completing, setCompleting] = useState(false);
  const [askSowo, setAskSowo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/me'));

  if (data === undefined) return <Screen>{null}</Screen>;
  // Dev preview has no account: let it look at the snapshot's routes (saving won't work).
  if (data === null || !uid || (!preview && !data.builders.some((b) => b.user_id === uid)))
    return (
      <Screen>
        <View style={{ gap: 12, alignItems: 'center', paddingTop: 60 }}>
          <Txt variant="h2">You can’t edit this route</Txt>
          <Txt color="mu" style={{ textAlign: 'center' }}>Only the people building it can add days.</Txt>
          <Button label="Back" onPress={back} />
        </View>
      </Screen>
    );

  const r = data.card;
  const live = r.status === 'live';
  const done = r.status === 'complete';
  const last = days[days.length - 1] ?? null;
  const co = data.builders.find((b) => b.role === 'co');
  const pendingCodes = ops.flatMap((o) => (o.kind === 'update' && o.table === 'routes' && Array.isArray(o.patch.country_codes) ? [o.patch.country_codes as string[]] : []));
  const countryCodes = pendingCodes[pendingCodes.length - 1] ?? r.country_codes;
  const failed = ops.filter((o) => o.error).length;

  // Finish your route: Spots · Must-know · Trip tunes · Price & effort.
  const filled = new Set(data.mustKnows.filter((m) => m.category !== 'custom').map((m) => m.category)).size;
  const finish = [
    { key: 'spots', label: 'Spots', sub: data.spots.length ? `${data.spots.length} ${data.spots.length === 1 ? 'place' : 'places'} recommended` : 'Food, viewpoints, stays', state: data.spots.length ? 'done' : 'todo', go: () => router.push({ pathname: '/build/[id]/place', params: { id: r.id, tab: 'spots' } }) },
    { key: 'must', label: 'Must-know', sub: filled ? `${filled} of ${MUST_KNOW_ORDER.length - 1} filled` : 'Visa, cash, roads…', state: filled >= 6 ? 'done' : filled ? 'part' : 'todo', go: () => router.push({ pathname: '/build/[id]/must-know', params: { id: r.id } }) },
    { key: 'tunes', label: 'Trip tunes', sub: data.tunes ? data.tunes.title : 'Add a playlist or one song', state: data.tunes ? 'done' : 'todo', go: () => router.push({ pathname: '/build/[id]/tunes', params: { id: r.id } }) },
    { key: 'price', label: 'Price & effort', sub: r.budget && r.effort ? 'Rated' : 'Rate it when you finish', state: r.budget && r.effort ? 'done' : 'todo', go: () => openComplete() },
  ] as const;
  const doneCount = finish.filter((f) => f.state === 'done').length;

  const badge = done ? `COMPLETE · ${days.length} DAYS` : live ? (r.visibility === 'private' ? `DAY ${days.length} · PRIVATE` : `● LIVE · DAY ${days.length}`) : `PAST TRIP · ${days.length} ${days.length === 1 ? 'DAY' : 'DAYS'}`;
  const when = data.priv?.start_date ? `${MON[Number(data.priv.start_date.slice(5, 7)) - 1]} ${data.priv.start_date.slice(0, 4)}` : '';
  const subline = done
    ? `Finished in ${last?.place_name ?? '…'} · ${days.length} days`
    : live
      ? `Day ${days.length} · ${last ? `now in ${last.place_name}` : 'add your first day'}`
      : [when, `${days.length} ${days.length === 1 ? 'day' : 'days'}`, days.some((d) => !d.note) ? 'add what it was like' : null].filter(Boolean).join(' · ');

  async function setVisibility(v: Visibility, safety?: { delay: boolean; blur: boolean }) {
    if (preview) return toast('Preview mode: nothing is saved.');
    try {
      await updateRoute(r.id, { visibility: v, ...(safety ? { live_delay: safety.delay, blur_sleep: safety.blur } : {}) });
      // Blur changed: re-save the pins so the database redraws them.
      if (safety && safety.blur !== data!.blur_sleep) {
        for (const d of days.filter((x) => !x.pending && x.lat != null)) await queueUpdate(r.id, 'days', d.id, { lat: d.lat, lng: d.lng });
      }
      toast(v === 'private' ? 'Private again. Only you can see it.' : `Shared with ${v === 'public' ? 'everyone' : 'your followers'}.`);
      reload();
    } catch {
      toast('Couldn’t change that. Check your signal?');
    }
  }

  async function openComplete() {
    if (!preview) setAskSowo(!!(await getSowoEligible(uid!).catch(() => false)));
    setCompleting(true);
  }

  async function complete(a: CompleteAnswers) {
    if (preview) return toast('Preview mode: nothing is saved.');
    setBusy(true);
    try {
      await updateRoute(r.id, {
        status: 'complete',
        budget: a.budget,
        effort: a.effort,
        vibes: a.vibes,
        terrain: a.terrain,
        visibility: a.visibility,
        ...(live ? { end_date: last?.date ?? null } : {}),
      });
      if (a.sowo) await rateSowo(r.id, uid!, a.sowo).catch(() => toast('Saved the route, but not your SOWO answer.'));
      setCompleting(false);
      toast('Route complete. Nice one.');
      reload();
    } catch {
      toast('Couldn’t finish the route. Check your signal and try again.');
    } finally {
      setBusy(false);
    }
  }

  const stops: MapPin[] = days.filter((d) => d.lat != null).map((d, i, all) => ({ id: d.id, coord: [d.lng!, d.lat!], kind: i === all.length - 1 ? 'end' : 'stop' }));

  return (
    <Screen contentStyle={{ paddingTop: 0, gap: 12 }}>
      {/* Map */}
      <View style={{ height: 260, marginHorizontal: -space.gutter, backgroundColor: c.land }}>
        <Map ref={map} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 22 }} lines={[{ id: r.id, coords: line }]} pins={stops} fitTo={line} padding={{ top: 70, bottom: 40, left: 40, right: 70 }} accessibilityLabel={`Map of ${r.title}`} />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ position: 'absolute', top: 14, left: 14, width: 44, height: 44, borderRadius: 999, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={20} strokeWidth={2.2} />
        </Pressable>
        <View style={{ position: 'absolute', top: 22, right: 14, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: live && r.visibility !== 'private' ? c.ac : c.sf }}>
          <MonoLabel bold color={live && r.visibility !== 'private' ? 'on' : 'tx'}>{badge}</MonoLabel>
        </View>
        <MapButtons
          style={{ position: 'absolute', right: 14, bottom: 40 }}
          buttons={[
            { icon: 'plus', label: 'Zoom in', onPress: () => map.current?.zoomIn() },
            { icon: 'minus', label: 'Zoom out', onPress: () => map.current?.zoomOut() },
            { icon: 'fit', label: 'Fit the whole route', onPress: () => map.current?.fit(line), color: 'act' },
          ]}
        />
      </View>

      <View style={{ marginTop: -34, marginHorizontal: -space.gutter, paddingHorizontal: space.gutter, paddingTop: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.bg, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>{r.title}</Txt>
          <Txt variant="small">{subline}</Txt>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>You</Txt>
            <Txt variant="small">{last ? `Last day added: Day ${last.day_number}` : 'No days yet'}</Txt>
          </View>
          <Button label="View" variant="ghost" size="sm" onPress={() => router.push({ pathname: '/route/[id]', params: { id: r.id } })} />
          <Button
            label="Share"
            icon="share"
            variant="ghost"
            size="sm"
            onPress={() => Share.share({ message: `${r.title} on Sightquest: ${ROUTE_URL}${r.id}`, url: `${ROUTE_URL}${r.id}` }).catch(() => {})}
          />
        </View>

        {co?.username && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.cardSm, backgroundColor: c.sf }}>
            <Icon name="friends" size={16} color="act" strokeWidth={2} />
            <Txt style={{ flex: 1, fontSize: 13 }}>
              <Text style={{ fontFamily: fonts.bold }}>Built with @{co.username}</Text> · either of you can add days
            </Txt>
          </View>
        )}

        {(offline || ops.length > 0) && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.cardSm, backgroundColor: c.sf, borderWidth: 1, borderColor: offline ? c.warn : c.ln }}>
            <Icon name={offline ? 'offline' : 'clock'} size={18} color={offline ? 'warn' : 'mu'} strokeWidth={2} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 14 }}>{offline ? 'No signal, keep building' : `Sending ${ops.length} ${ops.length === 1 ? 'thing' : 'things'}…`}</Txt>
              <Txt variant="small">
                {failed
                  ? `${failed} couldn’t be sent. They’re kept on your phone.`
                  : 'Days, photos and pins save to your phone. They post by themselves when you’re back online.'}
              </Txt>
              {failed > 0 && (
                <Pressable accessibilityRole="button" onPress={() => retryFailed()} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 14 }}>Try again</Txt>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <MonoLabel bold>{days.length} {live ? 'DAYS SO FAR' : days.length === 1 ? 'DAY' : 'DAYS'}</MonoLabel>
          <MonoLabel>{new Set(days.map((d) => d.place_name)).size} PLACES</MonoLabel>
        </View>

        {live && !done && (
          <View style={{ gap: 8, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>Who can follow along live?</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.keys(VIS_LABEL) as Visibility[]).map((v) => (
                <Chip key={v} label={VIS_LABEL[v]} selected={r.visibility === v} onPress={() => (v === r.visibility ? null : v === 'private' ? setVisibility(v) : setGoLive(v))} />
              ))}
            </View>
            <Txt variant="small" style={{ lineHeight: 18 }}>
              {r.visibility === 'private'
                ? 'Private for now. Nobody sees this route until you share it or mark it complete.'
                : `${r.visibility === 'followers' ? 'People who follow you' : 'Anyone on Sightquest'} sees new days ${r.live_delay ? 'the day after you post them' : 'as soon as you post them'}${data.blur_sleep ? ', with where you sleep blurred.' : '.'}`}
            </Txt>
          </View>
        )}

        {!done &&
          (adding ? (
            <AddDayForm
              routeId={r.id}
              uid={uid}
              number={(last?.day_number ?? 0) + 1}
              prev={last}
              live={live}
              start={data.priv?.start_date ?? null}
              end={data.priv?.end_date ?? null}
              usedDates={days.flatMap((d) => (d.date ? [d.date] : []))}
              countryCodes={countryCodes}
              onDone={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button label={days.length ? 'Add next day' : 'Add day 1'} icon="plus" block onPress={() => setAdding(true)} />
          ))}

        <View style={{ gap: 10, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>Finish your route</Txt>
            <MonoLabel bold>{doneCount} OF 4 DONE</MonoLabel>
          </View>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: c.sf2, overflow: 'hidden' }}>
            <View style={{ width: `${(doneCount / 4) * 100}%`, height: '100%', backgroundColor: c.ac }} />
          </View>
          {finish.map((f) => (
            <Pressable key={f.key} accessibilityRole="button" onPress={f.go} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, opacity: pressed ? 0.75 : 1 })}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: f.state === 'done' ? c.ac : 'transparent',
                  borderWidth: f.state === 'done' ? 0 : f.state === 'part' ? 2 : 1,
                  borderStyle: f.state === 'todo' ? 'dashed' : 'solid',
                  borderColor: f.state === 'part' ? c.act : c.mu,
                }}
              >
                <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: f.state === 'done' ? c.on : f.state === 'part' ? c.act : c.mu }}>{f.state === 'done' ? '✓' : f.state === 'part' ? '◐' : '+'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 15 }}>{f.label}</Txt>
                <Txt variant="small" numberOfLines={1}>{f.sub}</Txt>
              </View>
              <Icon name="next" size={16} color="mu" strokeWidth={2.2} />
            </Pressable>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <Txt variant="h2">Day by day</Txt>
          {days.length === 0 && <Txt color="mu">Your days show up here as you add them.</Txt>}
          {[...days].reverse().map((d) => (
            <DayCard key={d.id} day={d} routeId={r.id} />
          ))}
          {days.length > 0 && (
            <Button label={`Show all ${days.length} days on the map`} variant="ghost" icon="diary" block onPress={() => router.push({ pathname: '/route/[id]/diary', params: { id: r.id } })} />
          )}
        </View>

        {!done && days.length > 0 && <Button label="Mark route complete" block onPress={openComplete} />}
        {done && (
          <View style={{ gap: 8, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.act }}>
            <MonoLabel bold color="act">ROUTE COMPLETE</MonoLabel>
            <Txt style={{ fontSize: 14, lineHeight: 20 }}>
              {r.visibility === 'private' ? 'It’s private: only you can see it.' : `${VIS_LABEL[r.visibility as Visibility]} can see it now${r.visibility === 'public' ? ', and it shows up in Search' : ''}.`}
            </Txt>
            <Button
              label="Share it"
              icon="share"
              block
              onPress={() => Share.share({ message: `${r.title} on Sightquest: ${ROUTE_URL}${r.id}`, url: `${ROUTE_URL}${r.id}` }).catch(() => {})}
            />
            <Button label="Change price, effort or who sees it" variant="ghost" block onPress={openComplete} />
          </View>
        )}

        <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={{ alignSelf: 'center', paddingVertical: 12 }}>
          <Txt color="danger" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Delete route</Txt>
        </Pressable>
      </View>

      {goLive && (
        <GoLiveSheet
          target={goLive}
          delay={r.live_delay}
          blur={data.blur_sleep}
          onClose={() => setGoLive(null)}
          onConfirm={(s) => {
            const v = goLive;
            setGoLive(null);
            setVisibility(v, s);
          }}
        />
      )}
      {completing && (
        <CompleteSheet
          visible
          busy={busy}
          askSowo={askSowo}
          initial={{ budget: r.budget ?? 0, effort: r.effort ?? 0, vibes: r.vibes, terrain: r.terrain, visibility: r.visibility }}
          onSave={complete}
          onClose={() => setCompleting(false)}
        />
      )}
      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this route?">
        <Txt color="mu">Its days, moments, photos and spots go too. This can’t be undone.</Txt>
        <Button
          label="Delete route"
          variant="danger"
          block
          onPress={async () => {
            setConfirmDelete(false);
            if (preview) return toast('Preview mode: nothing is saved.');
            try {
              await deleteRoute(r.id);
              toast('Route deleted.');
              router.replace('/me');
            } catch {
              toast('Couldn’t delete it. Check your signal?');
            }
          }}
        />
        <Button label="Keep it" variant="ghost" block onPress={() => setConfirmDelete(false)} />
      </Sheet>
    </Screen>
  );
}

function DayCard({ day: d, routeId }: { day: BDay; routeId: string }) {
  const { c } = useTheme();
  const toast = useToast();
  const [note, setNote] = useState(d.note ?? '');
  const title = d.leg && d.leg.mode !== 'stayed' && d.leg.to_name ? `${d.leg.from_name ? `${d.leg.from_name} ${d.leg.mode === 'day_trip' ? '⇄' : '→'} ` : ''}${d.leg.to_name}` : `${d.place_name}${d.leg?.mode === 'stayed' ? ' · stayed' : ''}`;
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
      <View style={{ width: 44, alignItems: 'center' }}>
        <MonoLabel size={10}>DAY</MonoLabel>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 22, color: c.tx }}>{d.day_number}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Txt numberOfLines={2} style={{ flex: 1, fontFamily: fonts.bold, fontSize: 15 }}>{title}</Txt>
          {d.leg ? <MonoLabel bold color="act">{LEG_MODE[d.leg.mode] ?? d.leg.mode.toUpperCase()}</MonoLabel> : null}
        </View>
        {d.date ? <MonoLabel size={10}>{prettyDate(d.date).toUpperCase()} · ONLY YOU SEE THE DATE</MonoLabel> : null}
        {d.photos.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {d.photos.map((p) => (
              <View key={p.key} style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: c.ph1, borderWidth: p.starred ? 2 : 1, borderColor: p.starred ? c.ac : c.ln }}>
                {p.uri ? <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
              </View>
            ))}
          </View>
        )}
        {d.note ? (
          <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>{d.note}</Txt>
        ) : (
          <TextInput
            accessibilityLabel={`Describe day ${d.day_number}`}
            value={note}
            onChangeText={setNote}
            onBlur={() => {
              if (!note.trim() || note === (d.note ?? '')) return;
              if (d.pending) return toast('Give it a moment to sync, then add the note.');
              queueUpdate(routeId, 'days', d.id, { note: note.trim().slice(0, 280) });
            }}
            multiline
            placeholder="What was it like? One line is plenty."
            placeholderTextColor={c.mu}
            style={{ minHeight: 44, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: c.ln, backgroundColor: c.bg, fontFamily: fonts.regular, fontSize: 14, color: c.tx, outlineStyle: 'none' } as object}
          />
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {d.weather ? <MonoLabel>{WEATHER[d.weather]} {d.weather.toUpperCase()}</MonoLabel> : null}
          {d.failed ? (
            <MonoLabel bold color="danger">COULDN’T SYNC</MonoLabel>
          ) : d.pending ? (
            <MonoLabel bold color="warn">⟳ SAVED ON PHONE</MonoLabel>
          ) : null}
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/build/[id]/place', params: { id: routeId, tab: 'moments', day: d.id } })} hitSlop={6}>
            <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 13 }}>+ Moment</Txt>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/build/[id]/place', params: { id: routeId, tab: 'posts', day: d.id } })} hitSlop={6}>
            <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 13 }}>+ Link a post</Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
