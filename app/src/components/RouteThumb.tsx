import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme';

import { contourPaths } from './map/MapFallback';
import { pad, projector, type LngLat } from './map/types';

type Props = {
  /** The route as [[lng, lat], …] (route_cards.line). */
  line?: LngLat[];
  /** Or several routes at once (the atlas card): drawn without end dots. */
  lines?: LngLat[][];
  style?: StyleProp<ViewStyle>;
  /** Room to keep clear of chips and labels, in px. */
  inset?: { top?: number; right?: number; bottom?: number; left?: number };
};

/** A little drawn map of a route for cards: land, contour lines, the route, its ends. */
export function RouteThumb({ line = [], lines, style, inset }: Props) {
  const { c } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const p = pad({ top: 28, right: 24, bottom: 24, left: 24, ...inset });
  const project = projector(lines ? lines.flat() : line, size.w, size.h, p);
  const pts = line.map(project);
  return (
    <View
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[{ backgroundColor: c.land, overflow: 'hidden' }, style]}
    >
      {size.w > 0 && (
        <Svg width={size.w} height={size.h} style={{ position: 'absolute' }}>
          {contourPaths(size.w, size.h, 3).map((d, i) => (
            <Path key={i} d={d} stroke={c.cnt} strokeWidth={1.2} fill="none" />
          ))}
          {lines?.map((l, i) =>
            l.length >= 2 ? (
              <Polyline key={i} points={l.map((q) => project(q).join(',')).join(' ')} fill="none" stroke={c.rt} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
            ) : l.length === 1 ? (
              <Circle key={i} cx={project(l[0])[0]} cy={project(l[0])[1]} r={3} fill={c.rt} />
            ) : null,
          )}
          {pts.length >= 2 && (
            <Polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={c.rt} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {pts.length > 0 && <Circle cx={pts[0][0]} cy={pts[0][1]} r={5} fill={c.tx} stroke={c.ring} strokeWidth={2} />}
          {pts.length > 1 && <Circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={6} fill={c.rt} stroke={c.ring} strokeWidth={2} />}
        </Svg>
      )}
    </View>
  );
}
