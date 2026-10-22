// Phase 0 placeholder. Phase 5 adds login, role check and the real pages.
export default function Home() {
  return (
    <main style={{ maxWidth: 1440, margin: "0 auto", padding: "48px 64px", display: "flex", flexDirection: "column", gap: 16 }}>
      <span className="mono" style={{ color: "var(--act)", fontWeight: 600 }}>● Sightquest admin</span>
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, fontStretch: "85%" }}>Nothing to moderate yet.</h1>
      <p style={{ margin: 0, color: "var(--mu)", fontSize: 15, maxWidth: 560 }}>
        Sign-in, sidequests, moderation and badges arrive in Phase 5. This page proves the admin shares the
        app&rsquo;s colours and fonts.
      </p>
    </main>
  );
}
