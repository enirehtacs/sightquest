import 'mapbox-gl/dist/mapbox-gl.css';

import mapboxgl from 'mapbox-gl';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

import { MAPBOX_TOKEN } from '@/lib/places';
import { alpha, useTheme, type Colors } from '@/theme';

import { MapFallback } from './MapFallback';
import { linesGeoJSON, mapStyle } from './mapStyle';
import { allCoords, boundsOf, pad, type LngLat, type MapPin, type MapProps } from './types';

/** Web map: mapbox-gl with the Sightquest Dark/Light style. */
export function Map(props: MapProps) {
  if (!MAPBOX_TOKEN) return <MapFallback {...props} />;
  return <MapboxWeb {...props} />;
}

function MapboxWeb(props: MapProps) {
  const { lines = [], pins = [], fitTo, scrollZoom = false, style, accessibilityLabel, ref } = props;
  const { c } = useTheme();
  const holder = useRef<View>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  // The newest props, for callbacks the map holds on to.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  const frameKey = JSON.stringify(fitTo?.length ? fitTo : allCoords(lines, pins).slice(0, 400));
  const linesKey = JSON.stringify(lines.map((l) => [l.id, l.dim, l.bold, l.coords.length]));

  // Make the map once.
  useEffect(() => {
    const el = holder.current as unknown as HTMLElement | null;
    if (!el) return;
    const p = latest.current;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const frame = boundsOf(p.fitTo?.length ? p.fitTo : allCoords(p.lines, p.pins));
    const m = new mapboxgl.Map({
      container: el,
      style: mapStyle(c, p.lines) as mapboxgl.StyleSpecification,
      ...(frame ? { bounds: frame, fitBoundsOptions: { padding: pad(p.padding), maxZoom: p.maxFitZoom ?? 11 } } : { center: [100, 15], zoom: 1.4 }),
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      scrollZoom: !!p.scrollZoom,
      renderWorldCopies: true,
    });
    m.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    m.touchZoomRotate.disableRotation();
    m.on('click', (e) => {
      latest.current.onPress?.();
      latest.current.onPressCoord?.([e.lngLat.lng, e.lngLat.lat]);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // The map is made once; the effects below keep it up to date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme changed: swap the style (mapbox-gl only applies the difference).
  // Skipped on the first run: the map was just made with this style.
  const styledWith = useRef(c);
  useEffect(() => {
    const m = map.current;
    if (!m || styledWith.current === c) return;
    styledWith.current = c;
    m.setStyle(mapStyle(c, latest.current.lines) as mapboxgl.StyleSpecification);
  }, [c]);

  // Lines changed: update the route source.
  const linesShown = useRef(linesKey);
  useEffect(() => {
    const m = map.current;
    if (!m || linesShown.current === linesKey) return;
    linesShown.current = linesKey;
    const apply = () => (m.getSource('sq-lines') as mapboxgl.GeoJSONSource | undefined)?.setData(linesGeoJSON(latest.current.lines ?? []) as Parameters<mapboxgl.GeoJSONSource['setData']>[0]);
    if (m.isStyleLoaded()) apply();
    else m.once('style.load', apply);
  }, [linesKey]);

  // Reframe when what we're framing changes.
  const firstFrame = useRef(true);
  useEffect(() => {
    if (firstFrame.current) {
      firstFrame.current = false;
      return;
    }
    const b = boundsOf(JSON.parse(frameKey) as LngLat[]);
    if (b) map.current?.fitBounds(b, { padding: pad(latest.current.padding), maxZoom: latest.current.maxFitZoom ?? 11, duration: 600 });
  }, [frameKey]);

  useEffect(() => {
    map.current?.scrollZoom[scrollZoom ? 'enable' : 'disable']();
  }, [scrollZoom]);

  // Pins are DOM markers, redrawn when they change.
  const pinsKey = JSON.stringify(pins.map((p) => [p.id, p.coord, p.kind, p.label, p.count, p.selected, p.tone]));
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = (latest.current.pins ?? []).map((pin) =>
      new mapboxgl.Marker({ element: pinElement(pin, c, () => latest.current.pins?.find((x) => x.id === pin.id)?.onPress?.()), anchor: 'center' })
        .setLngLat(pin.coord)
        .addTo(m),
    );
  }, [pinsKey, c]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => map.current?.zoomIn(),
      zoomOut: () => map.current?.zoomOut(),
      fit: (coords) => {
        const p = latest.current;
        const b = boundsOf(coords?.length ? coords : p.fitTo?.length ? p.fitTo : allCoords(p.lines, p.pins));
        if (b) map.current?.fitBounds(b, { padding: pad(p.padding), maxZoom: p.maxFitZoom ?? 11, duration: 600 });
      },
      flyTo: (coord, zoom) => map.current?.flyTo({ center: coord, zoom: zoom ?? Math.max(map.current.getZoom(), 9), duration: 700 }),
    }),
    [],
  );

  return <View ref={holder} accessibilityLabel={accessibilityLabel} style={[{ overflow: 'hidden', backgroundColor: c.land }, style]} />;
}

/** The same looks as PinView, drawn as plain DOM for mapbox-gl markers. */
function pinElement(pin: MapPin, c: Colors, onPress: () => void): HTMLElement {
  const el = document.createElement(pin.onPress ? 'button' : 'div');
  el.setAttribute('type', 'button');
  if (pin.onPress) el.setAttribute('aria-label', pin.accessibilityLabel ?? pin.label ?? 'Pin');
  const css = (s: Partial<CSSStyleDeclaration>, node: HTMLElement = el) => Object.assign(node.style, s);
  css({ padding: '0', border: '0', background: 'transparent', cursor: pin.onPress ? 'pointer' : 'default', display: 'block' });
  const dot = document.createElement('span');
  el.appendChild(dot);
  const ringShadow = `0 0 0 2px ${c.ring}`;
  if (pin.kind === 'photo') {
    const d = pin.selected ? 34 : 28;
    css({ width: `${d}px`, height: `${d}px`, borderRadius: '999px', border: `2px solid ${c.ac}`, background: c[`ph${pin.tone ?? 1}` as const], boxShadow: `${ringShadow}, 0 4px 10px rgba(0,0,0,.35)`, boxSizing: 'border-box', display: 'block' }, dot);
    if (pin.count && pin.count > 1) {
      const b = document.createElement('span');
      b.textContent = String(pin.count);
      css({ position: 'absolute', top: '-8px', right: '-8px', minWidth: '18px', height: '18px', padding: '0 4px', boxSizing: 'border-box', borderRadius: '999px', background: c.ac, color: c.on, font: '800 11px Archivo_800ExtraBold, Archivo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }, b);
      el.appendChild(b);
    }
  } else if (pin.kind === 'me') {
    css({ width: '18px', height: '18px', borderRadius: '999px', background: c.info, border: `3px solid ${c.sf}`, boxShadow: `0 0 0 10px ${alpha(c.info, 0.22)}`, boxSizing: 'border-box', display: 'block' }, dot);
  } else if (pin.kind === 'route') {
    const d = pin.selected ? 18 : 14;
    css({ width: `${d}px`, height: `${d}px`, borderRadius: '999px', background: pin.selected ? c.ac : c.tx, border: `3px solid ${c.ring}`, boxSizing: 'border-box', display: 'block' }, dot);
    if (pin.label) {
      const t = document.createElement('span');
      t.textContent = pin.label;
      css({ position: 'absolute', left: `${d + 4}px`, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap', font: '700 12px Archivo_700Bold, Archivo, sans-serif', color: pin.selected ? c.act : c.tx, textShadow: `0 1px 3px ${c.bg}, 0 0 2px ${c.bg}`, pointerEvents: 'none' }, t);
      el.appendChild(t);
    }
  } else {
    const end = pin.kind === 'end';
    const d = end ? 14 : 10;
    css({ width: `${d}px`, height: `${d}px`, borderRadius: '999px', background: end ? c.rt : c.tx, border: `2px solid ${c.ring}`, boxSizing: 'border-box', display: 'block' }, dot);
  }
  if (pin.onPress) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onPress();
    });
  }
  return el;
}
