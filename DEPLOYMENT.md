# Deployment

## Agent-driven bootstrap (preferred)

You do not need to click through the Supabase or Cloudflare dashboards to create the project, push the schema, deploy functions, or publish the visitor site.

You do not paste tokens into a dashboard form. Put them in a gitignored file at the repo root:

1. Copy `.env.bootstrap.example` to `.env.bootstrap`
2. Put `SUPABASE_ACCESS_TOKEN` there (from https://supabase.com/dashboard/account/tokens)
3. Optionally put `SUPABASE_DB_PASSWORD` and `CLOUDFLARE_API_TOKEN` there too
4. Run `pnpm bootstrap:hosted`

The script reads `.env.bootstrap` automatically. Do not put these values in git, in client apps, or back into chat.

```bash
cp .env.bootstrap.example .env.bootstrap
# edit .env.bootstrap
pnpm bootstrap:hosted
```

That script will:

1. Reuse the existing Decoy project `fjnuzhwefsdwnnovtjou` (it will not create a second project)
2. Enable anonymous sign-ins and disable email signup
3. Push the database migration
4. Set Edge Function secrets
5. Deploy all Edge Functions
6. Build the visitor app with the publishable key only
7. Create a Cloudflare Pages project and deploy `apps/visitor-web/dist`
8. Attach `VISITOR_CUSTOM_DOMAIN` and create a proxied CNAME when that domain’s zone is already on the same Cloudflare account

Privileged values are written only to gitignored `.hosted-bootstrap.local.json`. They are never committed.

Required tokens (create once, then the agent does the rest):

- `SUPABASE_ACCESS_TOKEN` from https://supabase.com/dashboard/account/tokens
- `CLOUDFLARE_API_TOKEN` from https://dash.cloudflare.com/profile/api-tokens  
  Create a **custom token** (not an empty/user-only token) with:
  - Account → Cloudflare Pages → Edit
  - Account → Account Settings → Read
  - Zone → Zone → Read
  - Zone → DNS → Edit  
  Zone resources: include `decoyexhibit.download`  
  Put it in `.env.bootstrap` as `CLOUDFLARE_API_TOKEN=...`. Do not paste it into chat.

Optional:

- `VISITOR_CUSTOM_DOMAIN` — defaults to `decoyexhibit.download`
- `GALLERY_LATITUDE` / `GALLERY_LONGITUDE`
- `OPENAI_API_KEY` (omit to keep mock generation)
- `ARTIST_OR_ORGANIZER_NAME`, `EXHIBITION_NAME`, `CONTACT_EMAIL`, `DATA_RETENTION_DESCRIPTION`

## 1. Supabase (manual fallback)


1. Create a dedicated project.
2. Authentication → enable **Anonymous sign-ins**. Disable email signup.
3. `supabase db push` or run `supabase/migrations/20260301000000_init.sql` in the SQL editor.
4. Confirm RLS is enabled on all public tables.
5. Confirm bucket `generated-artworks` is **private**.
6. Confirm Realtime publication includes `queue_signals`.
7. Deploy Edge Functions:

```bash
supabase functions deploy participant-status
supabase functions deploy verify-location
supabase functions deploy submit-description
supabase functions deploy tablet-state
supabase functions deploy tablet-heartbeat
supabase functions deploy tablet-claim
supabase functions deploy tablet-generate
supabase functions deploy tablet-displayed
```

8. Set secrets in the Supabase dashboard (do not paste them into this repository or into chat):

- `OPENAI_API_KEY`
- `GALLERY_LATITUDE` / `GALLERY_LONGITUDE`
- `GALLERY_RADIUS_METERS=200`
- `MAX_LOCATION_ACCURACY_METERS=500`
- `LOCATION_VERIFICATION_TTL_MINUTES=60`
- `TERMS_VERSION=1.0`
- `MAX_DAILY_SUBMISSIONS=200`
- `MAX_GENERATION_ATTEMPTS=3`
- `GENERATION_LEASE_MINUTES=5`
- `READY_DISPLAY_LEASE_MINUTES=2`
- `GENERATION_MIN_INTERVAL_SECONDS=13`
- `TABLET_ONLINE_THRESHOLD_SECONDS=90`
- `OPENAI_IMAGE_MODEL=gpt-image-2`
- `OPENAI_IMAGE_QUALITY=low` (raise to `medium` only after visual approval)
- `OPENAI_IMAGE_SIZE=1024x1536`
- `OPENAI_IMAGE_FORMAT=webp`
- `MOCK_IMAGE_GENERATION=true` for rehearsal, `false` for the exhibition
- `VISITOR_WEB_ORIGIN=https://your-visitor-host`
- `DEV_SKIP_LOCATION_VERIFICATION=false`

`DATA_RETENTION_DESCRIPTION` is **required before public launch**. Do not invent a legal retention commitment.

## 2. OpenAI

1. Create a dedicated OpenAI project for this installation.
2. Create an API key used only by Supabase Edge Functions.
3. Set billing limits appropriate for the exhibition duration and `MAX_DAILY_SUBMISSIONS`.
4. Test with `MOCK_IMAGE_GENERATION=true`, then a single low-quality live generation, then medium after looking at a physical tablet.

## 3. Visitor web (Cloudflare Pages)

Build output: `apps/visitor-web/dist`

Environment for the static build (publishable values only):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_ARTIST_OR_ORGANIZER_NAME=
VITE_EXHIBITION_NAME=
VITE_CONTACT_EMAIL=
VITE_TERMS_VERSION=1.0
VITE_DATA_RETENTION_DESCRIPTION=
```

Attach a subdomain such as `installation.example.com` if a domain already exists. Point the wall QR code at the HTTPS URL.

## 4. Provision nine tablets

From a privileged local shell (service role in env, never in the app):

```bash
pnpm provision-tablet tablet-01
# repeat tablet-02 … tablet-09
# or: pnpm seed:tablets
```

The plain token prints once. Enter it on that tablet’s provisioning screen with a local admin PIN.

## 5. Android APK (sideload, no Play Store)

```bash
pnpm --filter tablet build
cd apps/tablet
npx cap add android   # first time only
npx cap sync android
```

Then open `apps/tablet/android` in Android Studio and build a **release** APK. Keep the signing keystore off git (`*.jks`, `*.keystore` are ignored).

Configure portrait, immersive fullscreen, keep-screen-on. Optional later: lock-task / kiosk and boot autostart. Do not delay the exhibition for those extras.

Confirm actual tablet aspect ratio before freeze; `VITE_IMAGE_FIT=cover` is the default.

## 6. Developer seeds (never in the public UI)

```bash
pnpm seed:submissions 15
pnpm seed:reset
```

## Production pre-flight

- [ ] gallery coordinates configured
- [ ] gallery radius tested physically
- [ ] privacy/terms placeholders replaced
- [ ] organizer contact configured
- [ ] retention statement finalized
- [ ] OpenAI key configured server-side
- [ ] OpenAI key absent from client builds (`pnpm check:secrets`)
- [ ] OpenAI billing controls reviewed
- [ ] Supabase project active
- [ ] all nine tablet tokens provisioned
- [ ] all nine tablets enabled
- [ ] all nine tablets charge correctly
- [ ] keep-awake verified
- [ ] portrait mode verified
- [ ] kiosk/fullscreen verified
- [ ] gallery Wi-Fi tested
- [ ] QR code tested on iPhone
- [ ] QR code tested on Android
- [ ] GPS tested inside gallery
- [ ] GPS tested outside allowed area
- [ ] one-time behaviour tested
- [ ] 9-screen distribution tested
- [ ] OpenAI low-quality test successful
- [ ] OpenAI medium-quality test visually approved
- [ ] storage signed URL tested
- [ ] tablet reboot recovery tested
- [ ] Wi-Fi outage recovery tested
- [ ] 429 retry behaviour tested
- [ ] mock generation disabled in production
- [ ] `DEV_SKIP_LOCATION_VERIFICATION` is false
