import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button, Icon, MonoLabel, Txt, useToast } from '@/components';
import { useAuth } from '@/lib/auth';
import { takePledge } from '@/lib/profiles';
import { alpha, fonts, useTheme } from '@/theme';

// The initiation — design/prototype/Pledge.dc.html + PledgeDone.dc.html.
// Six promise bubbles drift and bounce; tap each one to take it. No scrolling,
// no description card. When all six are taken: ~1.3s pause, then the welcome fades in.
const PROMISES = [
  'Help people\ntravel better',
  'Be\nkind',
  'Only post\nwhat’s real',
  'Respect people\n& places',
  'Keep others\nsafe',
  'Stories, not\npro advice',
];
// Start positions and directions from the prototype (on a 390×844 frame).
const SEEDS = [
  [100, 290, 1.1, 0.7],
  [280, 300, -0.9, 0.8],
  [110, 470, 0.8, -1.0],
  [285, 480, -1.0, -0.7],
  [120, 640, 0.9, 0.9],
  [270, 650, -0.8, -1.1],
];

type Ball = { x: number; y: number; vx: number; vy: number; r: number };
type Box = { w: number; h: number; top: number };

/** Where the bubbles start, scaled from the prototype's 390×844 frame to this screen. */
function place(box: Box): Ball[] {
  const r = Math.min(60, box.w * 0.155);
  const spanY = Math.max(0, box.h - box.top - r * 2 - 24);
  return SEEDS.map(([x, y, vx, vy]) => ({
    x: r + 6 + ((x - 66) / (324 - 66)) * (box.w - 2 * (r + 6)),
    y: box.top + r + ((y - 290) / (650 - 290)) * spanY,
    vx: vx * 0.38,
    vy: vy * 0.38,
    r,
  }));
}

export default function Pledge() {
  const { c } = useTheme();
  const toast = useToast();
  const { uid, preview, setPledged } = useAuth();
  const [box, setBox] = useState<Box | null>(null);
  const [on, setOn] = useState<boolean[]>(() => PROMISES.map(() => false));
  // Bubble positions, and the space they were laid out for.
  const [sim, setSim] = useState<{ box: Box; balls: Ball[] } | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  const count = on.filter(Boolean).length;
  const balls = sim && box && sim.box === box ? sim.balls : box ? place(box) : [];

  // The animation loop reads which bubbles are taken (they drift slower).
  const onNow = useRef(on);
  useEffect(() => {
    onNow.current = on;
  }, [on]);

  // Drift and bounce (still when "Reduce motion" is on).
  useEffect(() => {
    if (!box) return;
    let raf = 0;
    let last = 0;
    let stopped = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce || stopped) return;
        const tick = (now: number) => {
          const dt = last ? Math.min(now - last, 40) / 16 : 0;
          last = now;
          if (dt > 0)
            setSim((prev) => ({ box, balls: step(prev && prev.box === box ? prev.balls : place(box), onNow.current, dt, box) }));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [box]);


  // All six: pause, then fade in the welcome.
  useEffect(() => {
    if (count < PROMISES.length) return;
    const t = setTimeout(() => {
      setDone(true);
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 1300);
    return () => clearTimeout(t);
  }, [count, fade]);

  function tap(i: number) {
    if (on[i]) return;
    // A little kick when you catch one.
    setSim((prev) =>
      prev ? { ...prev, balls: prev.balls.map((b, j) => (j === i ? { ...b, vx: b.vx * 1.25, vy: b.vy * 1.25 } : b)) } : prev,
    );
    setOn((o) => o.map((v, j) => (j === i ? true : v)));
  }

  async function letsGo() {
    if (!uid) return;
    setSaving(true);
    try {
      if (!preview) await takePledge(uid);
      setPledged(true);
      router.replace('/onboarding/about');
    } catch {
      toast('Couldn’t save that. Check your connection and try again.');
      setSaving(false);
    }
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b && b.w === width && b.h === height ? b : { w: width, h: height, top: b?.top ?? 200 }));
  };
  const onHeader = (e: LayoutChangeEvent) => {
    const bottom = e.nativeEvent.layout.y + e.nativeEvent.layout.height + 16;
    setBox((b) => (b ? (Math.abs(b.top - bottom) < 1 ? b : { ...b, top: bottom }) : null));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }} onLayout={onLayout}>
        {/* Soft glow from the top and faint rings behind the bubbles. */}
        <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="0%" rx="70%" ry="45%">
              <Stop offset="0" stopColor={c.ac} stopOpacity={0.12} />
              <Stop offset="1" stopColor={c.ac} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
          {box &&
            [120, 190, 260, 330].map((r) => (
              <Circle key={r} cx={box.w / 2} cy={box.top + (box.h - box.top) / 2} r={r} fill="none" stroke={c.act} strokeOpacity={0.07} strokeWidth={1.2} />
            ))}
        </Svg>

        <View onLayout={onHeader} style={{ paddingHorizontal: 20, paddingTop: 8, gap: 8, zIndex: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="logo" size={22} color="act" strokeWidth={1.6} />
              <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: c.tx }}>Sightquest</Text>
            </View>
            <MonoLabel bold color="act" style={{ fontSize: 12, letterSpacing: 1 }} accessibilityLabel={`${count} of 6 promises taken`}>
              {count} / {PROMISES.length}
            </MonoLabel>
          </View>
          <MonoLabel bold color="act" style={{ letterSpacing: 2, marginTop: 6 }}>THE INITIATION · RITE 1 OF 1</MonoLabel>
          <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 30, lineHeight: 31, textTransform: 'uppercase' }}>
            Catch the six{'\n'}promises
          </Txt>
          <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>Tap every bubble to take the oath.</Txt>
        </View>

        {balls.map((b, i) => {
          const taken = on[i];
          return (
            <Pressable
              key={i}
              onPress={() => tap(i)}
              accessibilityRole="button"
              accessibilityLabel={PROMISES[i].replace('\n', ' ')}
              accessibilityState={{ checked: taken }}
              style={{
                position: 'absolute',
                left: b.x - b.r,
                top: b.y - b.r,
                width: b.r * 2,
                height: b.r * 2,
                borderRadius: 999,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                borderWidth: taken ? 2.5 : 1.5,
                borderStyle: taken ? 'solid' : 'dashed',
                borderColor: taken ? c.act : alpha(c.mu, 0.55),
                backgroundColor: taken ? alpha(c.ac, 0.14) : alpha(c.tx, 0.05),
                boxShadow: taken ? [{ offsetX: 0, offsetY: 0, blurRadius: 24, color: alpha(c.ac, 0.35) }] : undefined,
              }}
            >
              <Text style={{ fontFamily: fonts.heavy, fontSize: 14, lineHeight: 14, color: taken ? c.act : c.mu }}>{taken ? '✓' : '○'}</Text>
              <Text
                style={{
                  fontFamily: fonts.heavy,
                  fontSize: b.r < 59 ? 12 : 13.5,
                  lineHeight: b.r < 59 ? 14 : 15.5,
                  letterSpacing: b.r < 59 ? 0 : 0.3,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  color: taken ? c.act : c.mu,
                }}
              >
                {PROMISES[i]}
              </Text>
            </Pressable>
          );
        })}

        {done && (
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              zIndex: 10,
              opacity: fade,
              backgroundColor: alpha(c.bg, 0.97),
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 28,
              gap: 16,
            }}
          >
            <Svg style={{ position: 'absolute', left: 0, top: 0 }} width="100%" height="100%" pointerEvents="none">
              <Defs>
                <RadialGradient id="done" cx="50%" cy="38%" rx="90%" ry="60%">
                  <Stop offset="0" stopColor={c.ac} stopOpacity={0.18} />
                  <Stop offset="0.6" stopColor={c.ac} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#done)" />
            </Svg>
            <View style={{ marginTop: -40, boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 40, color: alpha(c.ac, 0.3) }], borderRadius: 999 }}>
              <Icon name="logo" size={150} color="act" strokeWidth={0.9} />
            </View>
            <MonoLabel bold color="act" style={{ fontSize: 12, letterSpacing: 3 }}>OATH TAKEN · 6 OF 6</MonoLabel>
            <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 44, lineHeight: 44, textAlign: 'center', textTransform: 'uppercase' }}>
              Welcome to{'\n'}Sightquest
            </Txt>
            <Txt color="mu" style={{ fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
              You’re officially one of us. Now go get lost, on purpose, and leave the trail a little better than you found it.
            </Txt>
            <View style={{ alignSelf: 'stretch', marginTop: 10, borderRadius: 999, boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 30, color: alpha(c.ac, 0.35) }] }}>
              <Button label="Let’s go" onPress={letsGo} loading={saving} block />
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: c.mu, textAlign: 'center' }}>
              By continuing you agree to the{' '}
              <Text accessibilityRole="link" onPress={() => toast('The full Terms are on their way.')} style={{ fontFamily: fonts.bold, color: c.act }}>
                Terms
              </Text>{' '}
              and{' '}
              <Text accessibilityRole="link" onPress={() => toast('The full Privacy policy is on its way.')} style={{ fontFamily: fonts.bold, color: c.act }}>
                Privacy policy
              </Text>
              .
            </Text>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

/** One physics step: drift, bounce off the edges, bounce off each other. */
function step(prev: Ball[], on: boolean[], dt: number, box: Box): Ball[] {
  const B = prev.map((b) => ({ ...b }));
  const BOT = box.h - 16;
  for (let i = 0; i < B.length; i++) {
    const b = B[i];
    const slow = on[i] ? 0.6 : 1;
    b.x += b.vx * dt * slow;
    b.y += b.vy * dt * slow;
    if (b.x - b.r < 6) { b.x = 6 + b.r; b.vx = Math.abs(b.vx); }
    if (b.x + b.r > box.w - 6) { b.x = box.w - 6 - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < box.top) { b.y = box.top + b.r; b.vy = Math.abs(b.vy); }
    if (b.y + b.r > BOT) { b.y = BOT - b.r; b.vy = -Math.abs(b.vy); }
  }
  for (let a = 0; a < B.length; a++)
    for (let k = a + 1; k < B.length; k++) {
      const p = B[a];
      const q = B[k];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const min = p.r + q.r;
      if (d < min && d > 0) {
        const nx = dx / d;
        const ny = dy / d;
        const ov = (min - d) / 2;
        p.x -= nx * ov; p.y -= ny * ov; q.x += nx * ov; q.y += ny * ov;
        const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (rel < 0) { p.vx += rel * nx; p.vy += rel * ny; q.vx -= rel * nx; q.vy -= rel * ny; }
      }
    }
  return B;
}
