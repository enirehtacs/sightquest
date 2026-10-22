import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

// The Splash globe: contour-line "journeys" on a slowly turning sphere.
// The geometry is the same as design/prototype/Splash.dc.html.

type Pt = [number, number]; // [lat, lon] in radians
const D = Math.PI / 180;

function buildGeometry() {
  const journeys = [
    [-170, 20, 170, 14, 2.2, 0.3],
    [-60, -22, 160, 12, 2.8, 1.1],
    [40, 38, 150, 9, 2.4, 2.4],
    [120, -36, 170, 15, 1.8, 0.7],
    [-125, 56, 130, 7, 3.2, 1.9],
  ];
  const lines: Pt[][] = [];
  const cores: Pt[][] = [];
  const rough = (u: number, k: number, ph: number) =>
    0.9 * Math.sin(23 * u * Math.PI + ph + k) +
    0.6 * Math.sin(41 * u * Math.PI + ph * 3 + k * 2) +
    0.35 * Math.sin(67 * u * Math.PI + k * 5);

  for (const j of journeys) {
    const N = 120;
    const cl = (u: number): [number, number] => [
      j[1] + j[3] * Math.sin(j[4] * u * Math.PI + j[5]) + 3.5 * Math.sin(6 * u * Math.PI + j[5] * 2) + 1.2 * Math.sin(15 * u * Math.PI + j[5]),
      j[0] + j[2] * u,
    ];
    const core: Pt[] = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const c = cl(u);
      core.push([(c[0] + 0.5 * rough(u, 9, j[5])) * D, c[1] * D]);
    }
    cores.push(core);

    [3, 6, 9, 12].forEach((r, ri) => {
      const w = (u: number) => r * (0.55 + 0.45 * Math.sin(Math.PI * u)) * (1 + 0.25 * Math.sin(4 * u * Math.PI + ri + j[5]));
      const loop: Pt[] = [];
      for (let k = 0; k <= N; k++) {
        const u = k / N;
        const c = cl(u);
        loop.push([(c[0] + w(u) + 0.55 * rough(u, ri, j[5])) * D, c[1] * D]);
      }
      const ce = cl(1);
      const we = w(1);
      for (let a = 1; a < 12; a++) {
        const th = Math.PI / 2 - (a * Math.PI) / 12;
        loop.push([(ce[0] + we * Math.sin(th)) * D, (ce[1] + we * 0.9 * Math.cos(th)) * D]);
      }
      for (let k = N; k >= 0; k--) {
        const u = k / N;
        const c = cl(u);
        loop.push([(c[0] - w(u) + 0.55 * rough(u, ri + 3, j[5])) * D, c[1] * D]);
      }
      const cs = cl(0);
      const ws = w(0);
      for (let b = 1; b <= 12; b++) {
        const th = -Math.PI / 2 - (b * Math.PI) / 12;
        loop.push([(cs[0] + ws * Math.sin(th)) * D, (cs[1] + ws * 0.9 * Math.cos(th)) * D]);
      }
      lines.push(loop);
    });
  }

  const grat: Pt[][] = [];
  for (let la = -60; la <= 60; la += 30) {
    const p: Pt[] = [];
    for (let lo = 0; lo <= 360; lo += 6) p.push([la * D, lo * D]);
    grat.push(p);
  }
  for (let lo = 0; lo < 180; lo += 30) {
    const q: Pt[] = [];
    for (let la = 0; la <= 360; la += 6) {
      q.push([Math.asin(Math.sin(la * D)), lo * D + (Math.cos(la * D) < 0 ? Math.PI : 0)]);
    }
    grat.push(q);
  }
  return { lines, cores, grat };
}

function project(lines: Pt[][], a: number) {
  const tilt = 0.38;
  const R = 130;
  const c = 150;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  let out = '';
  for (const pts of lines) {
    let pen = false;
    for (const p of pts) {
      const lam = p[1] + a;
      const x = Math.cos(p[0]) * Math.sin(lam);
      const y0 = Math.sin(p[0]);
      const z0 = Math.cos(p[0]) * Math.cos(lam);
      const y = y0 * ct - z0 * st;
      const z = y0 * st + z0 * ct;
      if (z > 0) {
        out += (pen ? 'L' : 'M') + (c + R * x).toFixed(1) + ' ' + (c - R * y).toFixed(1);
        pen = true;
      } else pen = false;
    }
  }
  return out || 'M0 0';
}

export function Globe({ size = 340 }: { size?: number }) {
  const { c, scheme } = useTheme();
  // Light mode's map land is almost the page colour, so the globe uses the nested surface there.
  const globeFill = scheme === 'dark' ? c.land : c.sf2;
  const gratColor = scheme === 'dark' ? c.cnt : c.ln;
  const geo = useMemo(() => buildGeometry(), []);
  const [angle, setAngle] = useState(0.6);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let stopped = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce || stopped) return;
        const tick = (now: number) => {
          if (now - last > 33) {
            const dt = last ? Math.min(now - last, 100) : 33;
            last = now;
            setAngle((x) => (x + dt * 0.00022) % (Math.PI * 2));
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const grat = project(geo.grat, angle);
  const contours = project(geo.lines, angle);
  const cores = project(geo.cores, angle);

  return (
    <Svg viewBox="-20 -20 340 340" width={size} height={size} accessibilityLabel="Spinning globe covered in contour lines">
      <Circle cx={150} cy={150} r={146} fill="none" strokeWidth={22} stroke={c.rt} strokeOpacity={0.07} />
      <Circle cx={150} cy={150} r={130} fill={globeFill} />
      <Path d={grat} fill="none" strokeWidth={0.8} stroke={gratColor} />
      <Path d={contours} fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" stroke={c.rt} strokeOpacity={0.08} />
      <Path d={contours} fill="none" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" stroke={c.rt} strokeOpacity={0.55} />
      <Path d={cores} fill="none" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" stroke={c.rt} strokeOpacity={0.18} />
      <Path d={cores} fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" stroke={c.rt} />
      <Circle cx={150} cy={150} r={130} fill="none" strokeWidth={1.5} stroke={c.rt} strokeOpacity={0.45} />
    </Svg>
  );
}
