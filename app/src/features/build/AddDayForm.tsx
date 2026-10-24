import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, DateField, Field, MonoLabel, Txt, useToast } from '@/components';
import { newId, queueDay, queueUpdate, todayLocal } from '@/lib/build';
import type { PlaceHit } from '@/lib/places';
import { fonts, radius, useTheme } from '@/theme';

import { PlacePicker } from './PlacePicker';
import type { BDay } from './useBuild';

export const DAY_MODES: [string, string][] = [
  ['stayed', 'Stayed put'], ['day_trip', 'Day trip'], ['walk', 'Walk'], ['bicycle', 'Bicycle'], ['moto', 'Moto'],
  ['bus', 'Bus'], ['train', 'Train'], ['plane', 'Plane'], ['boat', 'Boat'],
];
export const WEATHERS: [string, string][] = [
  ['sunny', 'Sunny'], ['cloudy', 'Cloudy'], ['rainy', 'Rainy'], ['stormy', 'Stormy'], ['misty', 'Misty'], ['hot', 'Hot'], ['cold', 'Cold'],
];

const nextDate = (d: string) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + 1);
  return x.toISOString().slice(0, 10);
};

type Props = {
  routeId: string;
  uid: string;
  number: number;
  prev: BDay | null;
  live: boolean;
  start: string | null;
  end: string | null;
  usedDates: string[];
  countryCodes: string[];
  onDone: () => void;
  onCancel: () => void;
};

/** "Add next day" (Live.dc.html): date, weather, how the day went, where to, a note. Saved on the phone first. */
export function AddDayForm({ routeId, uid, number, prev, live, start, end, usedDates, countryCodes, onDone, onCancel }: Props) {
  const { c } = useTheme();
  const toast = useToast();
  const today = todayLocal();
  const suggested = live ? today : prev?.date ? nextDate(prev.date) : start;
  const [date, setDate] = useState<string | null>(suggested && (!end || suggested <= end) ? suggested : start);
  const [weather, setWeather] = useState('sunny');
  const [mode, setMode] = useState(prev ? 'bus' : 'stayed');
  const [dest, setDest] = useState<PlaceHit | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // The first day has nowhere to stay put in, so it always asks where.
  const needsPlace = !prev || mode !== 'stayed';
  const ready = !!date && (!needsPlace || !!dest);
  const base = prev && prev.lat != null && prev.lng != null ? { lat: prev.lat, lng: prev.lng } : null;

  async function save() {
    if (!ready || !date) return;
    setBusy(true);
    const dayTrip = mode === 'day_trip';
    // Where you sleep tonight: the new place, or the same base for "stayed put" and day trips.
    const here = prev && (mode === 'stayed' || dayTrip) ? { name: prev.place_name, lat: prev.lat, lng: prev.lng } : { name: dest!.name, lat: dest!.lat, lng: dest!.lng };
    const id = newId();
    await queueDay(
      { id, route_id: routeId, day_number: number, date, place_name: here.name.slice(0, 80), lat: here.lat, lng: here.lng, weather, note: note.trim() || null, created_by: uid },
      prev || mode !== 'stayed'
        ? {
            mode,
            from_name: mode === 'stayed' ? null : prev?.place_name ?? null,
            to_name: mode === 'stayed' ? null : dest?.name ?? null,
            duration_text: null,
            note: null,
          }
        : null,
    );
    const code = dest?.countryCode;
    if (code && !countryCodes.includes(code)) await queueUpdate(routeId, 'routes', routeId, { country_codes: [...countryCodes, code] });
    setBusy(false);
    toast(`Day ${number} saved`);
    onDone();
  }

  return (
    <View style={{ gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.act }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 18 }}>Day {number}</Txt>
        {prev ? <Txt variant="small">starting in {prev.place_name}</Txt> : null}
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row' }}>
          <DateField label="WHICH DATE?" value={date} onChange={setDate} min={start ?? undefined} max={live ? today : end ?? today} />
        </View>
        <Txt variant="small">
          {date && usedDates.includes(date) ? 'You already have a day on this date. That’s fine for a two-stop day.' : `Only you see exact dates. Others see Day ${number} and the month you went.`}
        </Txt>
      </View>

      <View style={{ gap: 8 }}>
        <MonoLabel bold>WEATHER</MonoLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WEATHERS.map(([k, l]) => (
            <Chip key={k} label={l} selected={weather === k} onPress={() => setWeather(k)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <MonoLabel bold>HOW DID THE DAY GO?</MonoLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DAY_MODES.map(([k, l]) => (
            <Chip key={k} label={l} selected={mode === k} onPress={() => setMode(k)} />
          ))}
        </View>
      </View>

      {needsPlace && (
        <PlacePicker
          label={!prev ? 'WHERE ARE YOU' : mode === 'day_trip' ? 'DAY TRIP TO · BACK BY NIGHT' : 'WHERE TO'}
          value={dest}
          onChange={setDest}
          near={base}
        />
      )}

      <Field label="ONE-LINE NOTE" value={note} onChangeText={setNote} maxLength={280} placeholder={mode === 'stayed' ? 'Laundry day? Best noodles? Rain?' : 'What should the next person know?'} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" variant="ghost" block onPress={onCancel} />
        </View>
        <View style={{ flex: 2 }}>
          <Button label={`Save day ${number}`} block onPress={save} disabled={!ready} loading={busy} />
        </View>
      </View>
    </View>
  );
}
