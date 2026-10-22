import type { Colors } from '@/theme';

import type { MapLine } from './types';

// "Sightquest Dark" and "Sightquest Light" (docs/THEME.md → Maps), built in
// code from the theme tokens so they always match the app: `land`, `sea`,
// `bd` (borders), `cnt` (contours and roads) and `rt` (the route line).
// Uses Mapbox's own vector tiles, so it only needs the public token.

const FONT = ['DIN Pro Medium', 'Arial Unicode MS Regular'];
// One "worldview" for borders, so disputed ones aren't drawn twice.
const WORLDVIEW = ['match', ['get', 'worldview'], ['all', 'US'], true, false];
const NAME = ['coalesce', ['get', 'name_en'], ['get', 'name']];

export function mapStyle(c: Colors, lines: MapLine[] = []) {
  return {
    version: 8,
    name: 'Sightquest',
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
    sources: {
      streets: { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' },
      terrain: { type: 'vector', url: 'mapbox://mapbox.mapbox-terrain-v2' },
      'sq-lines': { type: 'geojson', data: linesGeoJSON(lines) },
    },
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': c.land } },
      { id: 'water', type: 'fill', source: 'streets', 'source-layer': 'water', paint: { 'fill-color': c.sea } },
      {
        id: 'waterway', type: 'line', source: 'streets', 'source-layer': 'waterway', minzoom: 8,
        paint: { 'line-color': c.sea, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 3] },
      },
      {
        id: 'contour', type: 'line', source: 'terrain', 'source-layer': 'contour', minzoom: 9,
        paint: { 'line-color': c.cnt, 'line-width': ['match', ['get', 'index'], [5, 10], 1, 0.5] },
      },
      {
        id: 'roads', type: 'line', source: 'streets', 'source-layer': 'road', minzoom: 5,
        filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street', 'path', 'ferry'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': c.bd,
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.25, 12, 0.6],
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 10, 1, 16, 4],
          'line-dasharray': ['match', ['get', 'class'], ['path', 'ferry'], ['literal', [2, 2]], ['literal', [1, 0]]],
        },
      },
      {
        id: 'admin-1', type: 'line', source: 'streets', 'source-layer': 'admin', minzoom: 4,
        filter: ['all', ['==', ['get', 'admin_level'], 1], ['!=', ['to-string', ['get', 'maritime']], 'true'], WORLDVIEW],
        paint: { 'line-color': c.bd, 'line-opacity': 0.5, 'line-width': 0.6, 'line-dasharray': [2, 2] },
      },
      {
        id: 'admin-0', type: 'line', source: 'streets', 'source-layer': 'admin',
        filter: ['all', ['==', ['get', 'admin_level'], 0], ['!=', ['to-string', ['get', 'maritime']], 'true'], WORLDVIEW],
        paint: { 'line-color': c.bd, 'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 1.4] },
      },
      {
        id: 'route-lines', type: 'line', source: 'sq-lines',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': c.rt,
          'line-width': ['case', ['get', 'bold'], 4.5, 3],
          'line-opacity': ['case', ['get', 'dim'], 0.45, 1],
        },
      },
      {
        id: 'cities', type: 'symbol', source: 'streets', 'source-layer': 'place_label', minzoom: 4,
        filter: ['all', ['==', ['get', 'class'], 'settlement'], ['==', ['get', 'type'], 'city']],
        layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 12, 14], 'text-max-width': 8 },
        paint: { 'text-color': c.mu, 'text-halo-color': c.land, 'text-halo-width': 1.2 },
      },
      {
        id: 'places', type: 'symbol', source: 'streets', 'source-layer': 'place_label', minzoom: 7,
        filter: ['all', ['==', ['get', 'class'], 'settlement'], ['!=', ['get', 'type'], 'city']],
        layout: { 'text-field': NAME, 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 13], 'text-max-width': 8 },
        paint: { 'text-color': c.mu, 'text-halo-color': c.land, 'text-halo-width': 1.2 },
      },
      {
        id: 'countries', type: 'symbol', source: 'streets', 'source-layer': 'place_label', maxzoom: 8,
        filter: ['==', ['get', 'class'], 'country'],
        layout: {
          'text-field': NAME, 'text-font': FONT, 'text-transform': 'uppercase',
          'text-letter-spacing': 0.2, 'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9, 6, 12], 'text-max-width': 7,
        },
        paint: { 'text-color': c.mu, 'text-opacity': 0.8, 'text-halo-color': c.land, 'text-halo-width': 1 },
      },
    ],
  };
}

export function linesGeoJSON(lines: MapLine[]) {
  return {
    type: 'FeatureCollection',
    features: lines
      .filter((l) => l.coords.length >= 2)
      .map((l) => ({
        type: 'Feature',
        properties: { id: l.id, dim: !!l.dim, bold: !!l.bold },
        geometry: { type: 'LineString', coordinates: l.coords },
      })),
  };
}
