import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Icon, Sheet, Txt, useToast } from '@/components';
import { useAuth } from '@/lib/auth';
import { mySaveMap, saveRoute, unsaveRoute, type SaveList } from '@/lib/routes';
import { fonts, radius, useTheme } from '@/theme';

const LISTS: { key: SaveList; label: string; sub: string }[] = [
  { key: 'next_trip', label: 'Next trip', sub: 'Planning this one soon' },
  { key: 'someday', label: 'Someday', sub: 'One day, definitely' },
];

export const LIST_LABEL: Record<SaveList, string> = { next_trip: 'Next trip', someday: 'Someday' };

/**
 * Which routes you saved, and the "Save to" sheet.
 * `ask(route)` opens the sheet; render `sheet` once on the screen.
 */
export function useSaves() {
  const { uid, preview } = useAuth();
  const toast = useToast();
  const [saved, setSaved] = useState<Map<string, SaveList>>(new Map());
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      let live = true;
      mySaveMap(uid)
        .then((m) => live && setSaved(m))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [uid]),
  );

  async function pick(list: SaveList | null) {
    const t = target;
    setTarget(null);
    if (!t || !uid) return;
    const before = saved.get(t.id);
    const next = new Map(saved);
    if (list) next.set(t.id, list);
    else next.delete(t.id);
    setSaved(next);
    if (preview) return toast(list ? 'Saved (preview mode: not stored)' : 'Removed (preview mode)');
    try {
      if (list) await saveRoute(uid, t.id, list);
      else await unsaveRoute(uid, t.id);
      toast(list ? 'Saved' : 'Removed from your saves.');
    } catch {
      const undo = new Map(next);
      if (before) undo.set(t.id, before);
      else undo.delete(t.id);
      setSaved(undo);
      toast('Couldn’t save that. Try again?');
    }
  }

  const sheet = <SaveSheet title={target?.title ?? ''} visible={!!target} current={target ? saved.get(target.id) : undefined} onPick={pick} onClose={() => setTarget(null)} />;

  return { saved, ask: setTarget, sheet };
}

function SaveSheet({ title, visible, current, onPick, onClose }: { title: string; visible: boolean; current?: SaveList; onPick: (l: SaveList | null) => void; onClose: () => void }) {
  const { c } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={current ? 'Saved' : 'Save to'}>
      <Txt variant="small" numberOfLines={1} style={{ marginTop: -6 }}>{title}</Txt>
      <View style={{ gap: 8 }}>
        {LISTS.map((l) => {
          const on = current === l.key;
          return (
            <Pressable
              key={l.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onPick(l.key)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 56,
                paddingHorizontal: 14,
                borderRadius: radius.cardSm,
                borderWidth: 1,
                borderColor: on ? c.act : c.ln,
                backgroundColor: c.sf2,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Icon name="save" size={20} color={on ? 'act' : 'mu'} filled={on} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.bold }}>{l.label}</Txt>
                <Txt variant="small">{l.sub}</Txt>
              </View>
              {on && <Icon name="check" size={20} color="act" strokeWidth={2.4} />}
            </Pressable>
          );
        })}
      </View>
      {current && <Button label="Remove from saved" variant="danger" block onPress={() => onPick(null)} />}
    </Sheet>
  );
}
