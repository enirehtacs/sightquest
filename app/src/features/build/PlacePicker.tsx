import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button, Icon, MonoLabel, Txt } from '@/components';
import { Map, type LngLat } from '@/components/map';
import { placeAt, searchPlaces, type PlaceHit } from '@/lib/places';
import { fonts, radius, useTheme } from '@/theme';

type Props = {
  label: string;
  value: PlaceHit | null;
  onChange: (p: PlaceHit | null) => void;
  /** Rank suggestions near here (the previous day). */
  near?: { lat: number; lng: number } | null;
  placeholder?: string;
  pinHint?: string;
  /** Mapbox place types to search (spots add streets and addresses). */
  types?: string;
};

/** "Where to": search a place, or "Not listed? Drop a pin" on a little map. */
export function PlacePicker({ label, value, onChange, near, placeholder = 'Town, beach, trailhead…', pinHint = 'For off-the-map spots', types }: Props) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [pinning, setPinning] = useState(false);
  const [pin, setPin] = useState<LngLat | null>(null);
  const [busy, setBusy] = useState(false);

  const nLat = near?.lat;
  const nLng = near?.lng;
  useEffect(() => {
    if (value || pinning) return;
    let live = true;
    const t = setTimeout(() => searchPlaces(q, nLat != null && nLng != null ? { lat: nLat, lng: nLng } : null, types).then((h) => live && setHits(h)), 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, nLat, nLng, value, pinning, types]);

  async function usePin() {
    if (!pin) return;
    setBusy(true);
    const rev = await placeAt(pin[1], pin[0]);
    setBusy(false);
    setPinning(false);
    onChange({ name: q.trim() || rev?.name || 'Pinned spot', region: 'Pinned by you', lat: pin[1], lng: pin[0], countryCode: rev?.countryCode ?? null });
  }

  if (value)
    return (
      <View style={{ gap: 6 }}>
        <MonoLabel bold>{label}</MonoLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.act }}>
          <Icon name="pin" size={18} color="act" strokeWidth={2} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 15 }}>{value.name}</Txt>
            {value.region ? <Txt variant="small" numberOfLines={1}>{value.region}</Txt> : null}
          </View>
          <Pressable accessibilityRole="button" onPress={() => { onChange(null); setQ(''); }} hitSlop={8}>
            <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Change</Txt>
          </Pressable>
        </View>
      </View>
    );

  return (
    <View style={{ gap: 6 }}>
      <MonoLabel bold>{label}</MonoLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: radius.card, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf }}>
        <Icon name="search" size={18} color="mu" strokeWidth={2} />
        <TextInput
          accessibilityLabel={label}
          value={q}
          onChangeText={(t) => {
            setQ(t);
            setPinning(false);
          }}
          placeholder={placeholder}
          placeholderTextColor={c.mu}
          autoCorrect={false}
          style={{ flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 15, color: c.tx, outlineStyle: 'none' } as object}
        />
      </View>
      {!pinning && q.trim().length >= 2 && (
        <View accessibilityRole="list" style={{ borderRadius: radius.card, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf, overflow: 'hidden' }}>
          {hits.map((h, i) => (
            <Pressable
              key={`${h.name}-${i}`}
              accessibilityRole="button"
              onPress={() => onChange(h)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: c.ln, backgroundColor: pressed ? c.sf2 : 'transparent' })}
            >
              <Icon name="pin" size={16} color="mu" strokeWidth={2} />
              <View style={{ flex: 1, minWidth: 0, paddingVertical: 6 }}>
                <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 15 }}>{h.name}</Txt>
                <Txt variant="small" numberOfLines={1}>{h.region}</Txt>
              </View>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPinning(true);
              setPin(near ? [near.lng, near.lat] : null);
            }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, backgroundColor: pressed ? c.sf2 : 'transparent' })}
          >
            <Icon name="plus" size={16} color="act" strokeWidth={2.2} />
            <View style={{ flex: 1, paddingVertical: 6 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: c.act }}>Not listed? Drop a pin</Text>
              <Txt variant="small">{pinHint}: tap the map to place “{q.trim()}”</Txt>
            </View>
          </Pressable>
        </View>
      )}
      {pinning && (
        <View style={{ gap: 8 }}>
          <View style={{ height: 220, borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: c.act }}>
            <Map
              style={{ flex: 1 }}
              // Framed once around the previous day; tapping moves the pin, not the map.
              fitTo={nLat != null && nLng != null ? [[nLng, nLat]] : undefined}
              maxFitZoom={11}
              pins={pin ? [{ id: 'pin', coord: pin, kind: 'end' }] : []}
              onPressCoord={setPin}
              accessibilityLabel="Tap the map to place your pin"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt variant="small" style={{ flex: 1 }}>{pin ? 'Tap again to move it.' : 'Tap the map where it is.'}</Txt>
            <Button label="Pin it here" size="sm" onPress={usePin} disabled={!pin} loading={busy} />
          </View>
        </View>
      )}
    </View>
  );
}
