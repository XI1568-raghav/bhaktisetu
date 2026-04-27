# Google Sign-In setup

The web "Continue with Google" button uses Supabase Auth's built-in Google
provider. No OAuth code lives in our API — Supabase handles the dance,
returns an access token to the browser, and our `/auth/google/sync`
endpoint then upserts the matching `users` row.

You need to do three one-time things to make it work in production.

## 1. Run the cutover SQL on Supabase

`docs/google-auth-cutover-2026-04-28.sql` drops `NOT NULL` on `users.phone`
so Google-signed-in users (who only have an email) can be created.

- Open Supabase Dashboard → SQL Editor → paste the file → Run.
- Expected verify row: `phone_nullable = 'YES'`.

## 2. Create Google OAuth credentials

In the Google Cloud Console:

1. APIs & Services → OAuth consent screen → External → fill in app name
   "Darshya", support email, logo (`darshya.online` favicon is fine).
2. APIs & Services → Credentials → Create Credentials → OAuth Client ID
   → Application type: **Web application**, name: "Darshya Web".
3. Authorized JavaScript origins:
   - `https://darshya.online`
   - `http://localhost:3000` (for local dev)
4. Authorized redirect URIs — paste **the Supabase callback URL exactly**
   as shown in step 3 below. It looks like:
   - `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
5. Click Create — copy the Client ID and Client Secret.

## 3. Enable the Google provider in Supabase

1. Supabase Dashboard → Authentication → Providers → Google.
2. Toggle Enable.
3. Paste the Client ID and Client Secret from step 2.
4. Copy the displayed "Callback URL" — paste it into Google Console
   step 2.4 if you didn't already.
5. Save.

While you're in Authentication → URL Configuration, also add the
following to **Redirect URLs**:

- `https://darshya.online/auth/callback`
- `http://localhost:3000/auth/callback`

Without this Supabase will reject the `redirectTo` param the web app
sends.

## 4. Smoke test

- Open `https://darshya.online/auth/login` in an incognito window.
- Click **Continue with Google**.
- After consent, you should land on `/auth/callback`, see the spinner
  for ~1s, then redirect to `/dashboard` (devotee role by default).
- Log out, log back in — the upsert should not duplicate the user.

## What this does NOT do

- Does not assign non-devotee roles. Every Google user becomes a
  devotee. Provider roles still go through `/auth/signup` with the
  role select.
- Does not collect a phone number. Users can add one later by editing
  their profile (which is when phone-OTP fallback becomes available
  for them).
