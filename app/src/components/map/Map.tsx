import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useImperativeHandle, useRef, type ComponentType } from 'react';

import { MAPBOX_TOKEN } from '@/lib/places';
import { useTheme } from '@/theme';

import { MapFallback } from './MapFallback';
import { linesGeoJSON, mapStyle } from './mapStyle';
import { PinView } from './PinView';
import { allCoords, boundsOf, pad, type LngLat, type MapProps } from './types';

// Native map: @rnmapbox/maps with the same Sightquest style as the web.
// It's native code, so it only exists in a development or store build
// (Phase 7). In Expo Go, or without a token, we draw the simple map instead.

type CameraRef = {
  fitBounds: (ne: LngLat, sw: LngLat, padding?: number[], duration?: number) => void;
  flyTo: (c: LngLat, duration?: number) => void;
  zoomTo: (z: number, duration?: number) => void;
};
type MapViewRef = { getZoom: () => Promise<number> };
type Rnmb = {
  setAccessToken: (t: string) => void;
  MapView: ComponentType<Record<string, unknown>>;
  Camera: ComponentType<Record<string, unknown>>;
  ShapeSource: ComponentType<Record<string, unknown>>;
  LineLayer: ComponentType<Record<string, unknown>>;
  MarkerView: ComponentType<Record<string, unknown>>;
};

const MB: Rnmb | null = (() => {
  if (!MAPBOX_TOKEN || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // Loaded lazily: the module crashes on import where its native code is missing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@rnmapbox/maps').default as Rnmb;
    m.setAccessToken(MAPBOX_TOKEN);
    return m;
  } catch {
    return null;
  }
})();

export function Map(props: MapProps) {
  if (!MB) return <MapFallback {...props} />;
  return <NativeMap mb={MB} {...props} />;
}

function NativeMap({ mb, lines = [], pins = [], fitTo, padding, onPress, onPressCoord, style, accessibilityLabel, ref }: MapProps & { mb: Rnmb }) {
  const { c } = useTheme();
  const camera = useRef<CameraRef>(null);
  const view = useRef<MapViewRef>(null);
  const p = pad(padding);
  const frame = boundsOf(fitTo?.length ? fitTo : allCoords(lines, pins));
  const { MapView, Camera, ShapeSource, LineLayer, MarkerView } = mb;

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => view.current?.getZoom().then((z) => camera.current?.zoomTo(z + 1, 300)),
      zoomOut: () => view.current?.getZoom().then((z) => camera.current?.zoomTo(z - 1, 300)),
      fit: (coords) => {
        const b = boundsOf(coords?.length ? coords : fitTo?.length ? fitTo : allCoords(lines, pins));
        if (b) camera.current?.fitBounds(b[1], b[0], [p.top, p.right, p.bottom, p.left], 600);
      },
      flyTo: (coord, zoom) => {
        camera.current?.flyTo(coord, 700);
        if (zoom) camera.current?.zoomTo(zoom, 700);
      },
    }),
    [fitTo, lines, pins, p.top, p.right, p.bottom, p.left],
  );

  // The route layer is part of our own style JSON, but rnmapbox wants live
  // data as a ShapeSource, so the style below has no lines in it.
  const styleJSON = JSON.stringify(mapStyle(c, []));

  return (
    <MapView
      ref={view}
      style={style}
      styleJSON={styleJSON}
      accessibilityLabel={accessibilityLabel}
      scaleBarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      attributionPosition={{ bottom: 8, right: 8 }}
      logoPosition={{ bottom: 8, left: 8 }}
      onPress={(f: { geometry?: { coordinates?: LngLat } }) => {
        onPress?.();
        if (f?.geometry?.coordinates) onPressCoord?.(f.geometry.coordinates);
      }}
    >
      <Camera
        ref={camera}
        maxZoomLevel={18}
        defaultSettings={
          frame
            ? { bounds: { ne: frame[1], sw: frame[0], paddingTop: p.top, paddingRight: p.right, paddingBottom: p.bottom, paddingLeft: p.left } }
            : { centerCoordinate: [100, 15], zoomLevel: 1.4 }
        }
        animationDuration={0}
      />
      <ShapeSource id="sq-route-lines" shape={linesGeoJSON(lines)}>
        <LineLayer
          id="sq-route-line"
          style={{
            lineColor: c.rt,
            lineCap: 'round',
            lineJoin: 'round',
            lineWidth: ['case', ['get', 'bold'], 4.5, 3],
            lineOpacity: ['case', ['get', 'dim'], 0.45, 1],
          }}
        />
      </ShapeSource>
      {pins.map((pin) => (
        <MarkerView key={pin.id} coordinate={pin.coord} anchor={{ x: 0.5, y: 0.5 }} allowOverlap>
          <PinView pin={pin} />
        </MarkerView>
      ))}
    </MapView>
  );
}
