# Sign-in setup (Phase 1) — what Vivi does

The app code for Apple, Google and email sign-in is done. These steps switch them on.
Do them in order. Each one is a few minutes except Apple, which needs the paid Apple Developer account.

Your Supabase project: **safjiohaflsqvdbscplo** (Singapore).
Its sign-in callback address, which Google and Apple both ask for, is:

```
https://safjiohaflsqvdbscplo.supabase.co/auth/v1/callback
```

---

## 1. Tell Supabase where the app lives (do this first, 2 minutes)
Without this, the "confirm your email" link sends people to a dead page.

1. Open supabase.com → your project → **Authentication** → **URL Configuration**.
2. **Site URL**: `https://sightquest-app.vercel.app`
3. **Redirect URLs** → **Add URL**, one at a time:
   - `https://sightquest-app.vercel.app/**`
   - `http://localhost:8081/**`
   - `sightquest://**`
   - `exp://**`
4. Save.

Email sign-up now works end to end. (Supabase's built-in email sender only sends a few emails an hour. That's fine for testing; before the beta we'll plug in a real sender, which needs the domain from the open questions.)

## 2. Google (about 10 minutes, free)
1. Go to console.cloud.google.com. Create a project called **Sightquest** (top bar → project picker → New project).
2. **APIs & Services** → **OAuth consent screen**:
   - User type: **External**. App name: Sightquest. Support email: yours.
   - Save through the steps. You can leave it in "Testing" for now and add your own Google account under **Test users**.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**:
   - Application type: **Web application**. Name: Sightquest Supabase.
   - **Authorised redirect URIs** → Add: `https://safjiohaflsqvdbscplo.supabase.co/auth/v1/callback`
   - Create. Copy the **Client ID** and **Client secret**.
4. Supabase → **Authentication** → **Sign In / Providers** → **Google** → turn on, paste the Client ID and Client secret → Save.

Don't paste the secret into chat or into `.env`; it only lives in Supabase.

## 3. Apple (about 20 minutes, needs the Apple Developer Program, US$99/year)
If you haven't joined yet: developer.apple.com/programs → Enroll. Approval can take a day or two.

Then, in developer.apple.com → **Certificates, Identifiers & Profiles**:
1. **Identifiers** → **+** → **App IDs** → App → Description "Sightquest", Bundle ID `app.sightquest` (or whatever you want the app's ID to be; tell me which) → tick **Sign in with Apple** → Register.
2. **Identifiers** → **+** → **Services IDs** → Description "Sightquest web sign-in", Identifier `app.sightquest.signin` → Register. Open it, tick **Sign in with Apple** → **Configure**:
   - Primary App ID: the one from step 1.
   - Domains: `safjiohaflsqvdbscplo.supabase.co`
   - Return URLs: `https://safjiohaflsqvdbscplo.supabase.co/auth/v1/callback`
   - Save, then Continue → Save.
3. **Keys** → **+** → name "Sightquest Sign in with Apple" → tick **Sign in with Apple** → Configure → pick the App ID → Save → Continue → Register. **Download the .p8 file** (Apple only lets you download it once) and note the **Key ID**. Your **Team ID** is in the top-right of the developer site.
4. Supabase → **Authentication** → **Sign In / Providers** → **Apple** → turn on:
   - Client IDs: `app.sightquest.signin`
   - Secret key: Supabase has a "generate secret" helper on that page: give it the Team ID, Key ID, Services ID and the contents of the .p8 file. Paste the result and Save.
   - Apple's secret expires every 6 months; put a reminder in your calendar to regenerate it.

## 4. Try it
Open https://sightquest-app.vercel.app on your phone (or `npx expo start` from `app/` for Expo Go):
Splash → sign up → Welcome → catch the six promises → Let's go → Location → Explore.

Until a provider is switched on, its button shows "…sign-in isn't switched on yet. Try email for now."
