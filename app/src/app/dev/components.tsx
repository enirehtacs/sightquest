import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import {
  Avatar,
  BottomNav,
  Button,
  Card,
  Chip,
  Icon,
  ICONS,
  MonoLabel,
  Screen,
  Sheet,
  Tabs,
  Txt,
  useToast,
  type IconName,
  type NavKey,
} from '@/components';
import { fonts, palettes, ThemeScope, useTheme, type AppearancePref, type Colors } from '@/theme';

// Every base component in every state, in both themes. Dev tool, not a product screen.
export default function ComponentsPage() {
  const { preference, setPreference } = useTheme();
  const [view, setView] = useState<'current' | 'both'>('current');
  const { width } = useWindowDimensions();
  const sideBySide = width >= 900;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" />
        </Pressable>
        <Txt variant="h1">Components</Txt>
      </View>

      <Card>
        <MonoLabel>Appearance</MonoLabel>
        <Tabs<AppearancePref>
          variant="segment"
          accessibilityLabel="Appearance"
          value={preference}
          onChange={setPreference}
          tabs={[
            { key: 'system', label: 'System' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
        />
        <MonoLabel>Show</MonoLabel>
        <Tabs
          variant="segment"
          accessibilityLabel="Show"
          value={view}
          onChange={setView}
          tabs={[
            { key: 'current', label: 'Current theme' },
            { key: 'both', label: 'Light + dark' },
          ]}
        />
      </Card>

      {view === 'current' ? (
        <Gallery />
      ) : (
        <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
          {(['light', 'dark'] as const).map((s) => (
            <ThemeScope key={s} scheme={s}>
              <ThemedPanel title={s === 'light' ? 'Light' : 'Dark'} wide={sideBySide}>
                <Gallery />
              </ThemedPanel>
            </ThemeScope>
          ))}
        </View>
      )}
    </Screen>
  );
}

function ThemedPanel({ title, wide, children }: { title: string; wide: boolean; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flex: wide ? 1 : undefined,
        alignSelf: 'stretch',
        backgroundColor: c.bg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.ln,
        padding: 16,
        gap: 16,
      }}
    >
      <MonoLabel bold color="act">● {title}</MonoLabel>
      {children}
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <MonoLabel bold>{label}</MonoLabel>
      {children}
    </View>
  );
}

const Row = ({ children }: { children: ReactNode }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</View>
);

function Gallery() {
  const { c } = useTheme();
  const toast = useToast();
  const [sheet, setSheet] = useState(false);
  const [chips, setChips] = useState<Record<string, boolean>>({ 'SOWO approved': true });
  const [routeTab, setRouteTab] = useState('legs');
  const [meTab, setMeTab] = useState('routes');
  const [nav, setNav] = useState<NavKey>('explore');

  return (
    <View style={{ gap: 24 }}>
      <Section label="Type">
        <Txt variant="h1">For you, Vivi</Txt>
        <Txt variant="h2">Recommended for you</Txt>
        <Txt variant="title">Ha Giang, the long way</Txt>
        <Txt>Picked from the routes you’ve saved and the ones you’ve done.</Txt>
        <Txt variant="small">With @maya.goes · Day 2 · she added Pak Beng</Txt>
        <MonoLabel>Vietnam · Mar · 9D · $$</MonoLabel>
        <MonoLabel size={10} bold color="act">● Building now</MonoLabel>
        <Txt variant="smallStrong" color="act">See all</Txt>
      </Section>

      <Section label="Buttons">
        <Row>
          <Button label="Save route" icon="save" onPress={() => toast('Saved to your routes')} />
          <Button label="Remix this route" variant="ghost" icon="remix" onPress={() => toast('Copied to your drafts')} />
          <Button label="Delete" variant="danger" onPress={() => toast('Nothing deleted, it’s a demo')} />
        </Row>
        <Row>
          <Button label="+ Add day" size="sm" />
          <Button label="Join" size="sm" variant="ghost" />
          <Button label="Posting…" size="sm" loading />
          <Button label="Disabled" size="sm" disabled />
        </Row>
      </Section>

      <Section label="Chips">
        <Row>
          {['Continent', 'SOWO approved', 'Effort', 'Budget'].map((l) => (
            <Chip
              key={l}
              label={l}
              selected={!!chips[l]}
              count={l === 'Effort' ? 2 : undefined}
              onPress={() => setChips((s) => ({ ...s, [l]: !s[l] }))}
            />
          ))}
          <Chip label="Visa & entry" icon="mkVisa" />
        </Row>
      </Section>

      <Section label="Tabs">
        <Tabs
          accessibilityLabel="Route sections"
          value={routeTab}
          onChange={setRouteTab}
          tabs={[
            { key: 'legs', label: 'Itinerary' },
            { key: 'must', label: 'Must-know' },
            { key: 'recs', label: 'Spots' },
            { key: 'moments', label: 'Moments' },
            { key: 'posts', label: 'Posts' },
          ]}
        />
        <Tabs
          variant="pill"
          accessibilityLabel="Profile sections"
          value={meTab}
          onChange={setMeTab}
          tabs={[
            { key: 'routes', label: 'Routes' },
            { key: 'saved', label: 'Saved' },
            { key: 'badges', label: 'Achievements' },
          ]}
        />
      </Section>

      <Section label="Card">
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <MonoLabel size={10} bold color="act">● Building now</MonoLabel>
            <View style={{ flexDirection: 'row' }}>
              <Avatar size={22} tone={1} />
              <View style={{ marginLeft: -7 }}>
                <Avatar size={22} tone={2} />
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="title" style={{ fontSize: 17, fontFamily: fonts.heavy }} numberOfLines={1}>
                Laos by slow boat
              </Txt>
              <Txt variant="small">With @maya.goes · Day 2 · she added Pak Beng</Txt>
            </View>
            <Button label="+ Add day" size="sm" />
          </View>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: c.sf2, overflow: 'hidden' }}>
            <View style={{ width: '25%', height: '100%', backgroundColor: c.ac }} />
          </View>
        </Card>
      </Section>

      <Section label="Avatars">
        <Row>
          <Avatar size={64} name="Vivi" ring="you" />
          <Avatar size={44} name="@maya.goes" tone={1} />
          <Avatar size={44} name="@terracetara" tone={3} ring="ring" />
          <Avatar size={32} tone={4} />
        </Row>
      </Section>

      <Section label="Sheet + toast">
        <Row>
          <Button label="Open a sheet" variant="ghost" onPress={() => setSheet(true)} />
          <Button label="Show a toast" variant="ghost" onPress={() => toast('Link copied')} />
        </Row>
        <Sheet visible={sheet} onClose={() => setSheet(false)} title="Before you go live">
          <Txt color="mu">
            Turn on a delay so people see yesterday, never today. You can also blur where you sleep.
          </Txt>
          <Button label="Go live with a delay" block onPress={() => setSheet(false)} />
          <Button label="Not now" variant="ghost" block onPress={() => setSheet(false)} />
        </Sheet>
      </Section>

      <Section label="Bottom nav">
        <BottomNav inline active={nav} onNavigate={(k) => (k === 'create' ? toast('New route comes in Phase 3') : setNav(k))} />
      </Section>

      <Section label="Icons">
        <IconGrid />
      </Section>

      <Section label="Colour tokens">
        <Swatches />
      </Section>
    </View>
  );
}

function IconGrid() {
  const names = Object.keys(ICONS) as IconName[];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {names.map((n) => (
        <View key={n} style={{ width: 72, alignItems: 'center', gap: 4, paddingVertical: 6 }}>
          {/* Must-know category icons are always green. */}
          <Icon name={n} color={n.startsWith('mk') || n === 'logo' ? 'act' : 'tx'} />
          <MonoLabel size={10} numberOfLines={1} style={{ textTransform: 'none' }}>
            {n}
          </MonoLabel>
        </View>
      ))}
    </View>
  );
}

function Swatches() {
  const { c, scheme } = useTheme();
  const keys = Object.keys(palettes[scheme]).filter((k) => k !== 'shadow' && k !== 'fabShadow') as (keyof Colors)[];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {keys.map((k) => (
        <View key={k} style={{ width: 72, gap: 4 }}>
          <View style={{ height: 36, borderRadius: 10, backgroundColor: c[k], borderWidth: 1, borderColor: c.ln }} />
          <MonoLabel size={10} style={{ textTransform: 'none' }}>
            {k}
          </MonoLabel>
        </View>
      ))}
    </View>
  );
}
