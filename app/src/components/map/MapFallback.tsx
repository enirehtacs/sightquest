import { useImperativeHandle, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';

import { MonoLabel } from '@/components/MonoLabel';
import { useTheme } from '@/theme';

import { PinView } from './PinView';
import { allCoords, pad, projector, type LngLat, type MapProps } from './types';

/**
 * A drawn map: route lines and pins on the theme's land colour, no tiles.
 * Shown in Expo Go (real Mapbox needs a development build, Phase 7) and
 * whenever there's no Mapbox token.
 */
export function MapFallback({ lines = [], pins = [], fitTo, padding, onPress, style, accessibilityLabel, ref }: MapProps) {
  const { c } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<{ zoom: number; center?: LngLat; frame?: LngLat[] }>({ zoom: 1 });

  const frame = view.frame ?? (fitTo?.length ? fitTo : allCoords(lines, pins));
  const p = pad(padding);
  const project = projector(frame, size.w, size.h, p, view.zoom, view.center);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => setView((v) => ({ ...v, zoom: Math.min(v.zoom * 1.6, 40) })),
      zoomOut: () => setView((v) => ({ ...v, zoom: Math.max(v.zoom / 1.6, 0.25) })),
      fit: (coords) => setView({ zoom: 1, frame: coords?.length ? coords : undefined }),
      flyTo: (coord, zoom) => setView((v) => ({ ...v, center: coord, zoom: zoom ? Math.max(1, zoom / 4) : v.zoom * 2 })),
    }),
    [],
  );

  const contours = contourPaths(size.w, size.h);

  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ overflow: 'hidden', backgroundColor: c.land }, style]}
    >
      {size.w > 0 && (
        <>
          <Pressable onPress={onPress} disabled={!onPress} style={{ position: 'absolute', inset: 0 }} accessible={false}>
            <Svg width={size.w} height={size.h}>
              <Rect x={0} y={0} width={size.w} height={size.h} fill={c.land} />
              {contours.map((d, i) => (
                <Path key={i} d={d} stroke={c.cnt} strokeWidth={1.2} fill="none" />
              ))}
              {lines
                .filter((l) => l.coords.length >= 2)
                .map((l) => (
                  <Polyline
                    key={l.id}
                    points={l.coords.map((q) => project(q).join(',')).join(' ')}
                    fill="none"
                    stroke={c.rt}
                    strokeWidth={l.bold ? 4.5 : 3}
                    strokeOpacity={l.dim ? 0.45 : 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
            </Svg>
          </Pressable>
          {pins.map((pin) => {
            const [x, y] = project(pin.coord);
            if (x < -40 || y < -40 || x > size.w + 40 || y > size.h + 40) return null;
            return (
              <View
                key={pin.id}
                pointerEvents="box-none"
                style={{ position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: pin.selected ? 3 : 2 }}
              >
                <PinView pin={pin} />
              </View>
            );
          })}
          <View pointerEvents="none" style={{ position: 'absolute', left: 10, bottom: 8, backgroundColor: c.scrim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <MonoLabel size={10}>SIMPLE MAP</MonoLabel>
          </View>
        </>
      )}
    </View>
  );
}

/** A few soft wavy lines, like contour lines, so the land doesn't look flat. */
export function contourPaths(w: number, h: number, n = 6) {
  const out: string[] = [];
  if (!w) return out;
  for (let i = 1; i <= n; i++) {
    const y = (h / (n + 1)) * i;
    const a = 10 + (i % 3) * 6;
    out.push(`M-20 ${y} C${w * 0.2} ${y - a} ${w * 0.35} ${y + a} ${w * 0.55} ${y} S${w * 0.9} ${y - a} ${w + 20} ${y + a / 2}`);
  }
  return out;
}
