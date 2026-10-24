import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fonts, radius, useTheme } from '@/theme';
import { Icon } from './Icon';
import { MonoLabel } from './MonoLabel';
import { Sheet } from './Sheet';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** "2026-09-12" → "12 Sep 2026" */
export function prettyDate(v: string | null | undefined) {
  if (!v) return '';
  const [y, m, d] = v.split('-').map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

type Props = {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  /** "YYYY-MM-DD" limits. */
  min?: string;
  max?: string;
  placeholder?: string;
};

/** A date box that opens a month calendar in a sheet. Works the same on phone and web. */
export function DateField({ label, value, onChange, min, max, placeholder = 'Pick a date' }: Props) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const start = value ?? max ?? iso(new Date().getFullYear(), new Date().getMonth(), 1);
  const [cursor, setCursor] = useState(() => ({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 }));

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const move = (n: number) => setCursor(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <MonoLabel bold>{label}</MonoLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? prettyDate(value) : 'not set'}`}
        onPress={() => setOpen(true)}
        style={{ height: 46, borderRadius: radius.card, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: value ? c.tx : c.mu }}>{value ? prettyDate(value) : placeholder}</Text>
        <Icon name="chevronDown" size={16} color="mu" strokeWidth={2.2} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" size={20} strokeWidth={2.2} />
          </Pressable>
          <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c.tx }}>{MONTHS[cursor.m]} {cursor.y}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="next" size={20} strokeWidth={2.2} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {DOW.map((d, i) => (
            <MonoLabel key={i} style={{ flex: 1, textAlign: 'center' }}>{d}</MonoLabel>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            if (!d) return <View key={`x${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
            const v = iso(cursor.y, cursor.m, d);
            const off = (min && v < min) || (max && v > max);
            const on = v === value;
            return (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityLabel={prettyDate(v)}
                accessibilityState={{ selected: on, disabled: !!off }}
                disabled={!!off}
                onPress={() => {
                  onChange(v);
                  setOpen(false);
                }}
                style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ac : 'transparent' }}>
                  <Text style={{ fontFamily: on ? fonts.bold : fonts.regular, fontSize: 15, color: on ? c.on : off ? c.ln : c.tx }}>{d}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}
