# DECOY — interactive gallery installation

Nine portrait tablets beside one physical painting. Visitors describe what they see. The description is interpreted once by an image model and appears on a tablet. The original painting is never sent to the model.

This repository is a pnpm workspace:

- `apps/visitor-web` — visitor phone web app (Cloudflare Pages)
- `apps/tablet` — Capacitor Android app for the nine screens
- `packages/shared` — types, constants, location math
- `packages/engine` — in-memory twin of the database claim/submit rules (tests)
- `supabase/` — migrations and Edge Functions
- `scripts/` — privileged local provisioning and seed tools

## Priorities

1. Reliability during a live exhibition
2. Protection of secret API keys
3. Extremely simple visitor experience
4. Privacy and minimal data collection
5. Zero extra infrastructure where possible
6. Simple architecture one person can maintain
7. Visual presentation suitable for a gallery
8. Recoverability rather than extra features

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm --filter visitor-web dev
pnpm --filter tablet dev
```

Visitor app: http://localhost:5173  
Tablet app (browser preview): http://localhost:5174

Default image generation is mocked (`MOCK_IMAGE_GENERATION=true`). Do not spend OpenAI credit until you intentionally turn mock mode off in Supabase secrets.

## Manual verification (local)

1. `pnpm test` — location, one-time submit, nine-tablet distribution, lease recovery, copy.
2. Open the visitor app, confirm Serbian appears above English, no language selector.
3. Confirm the continue button stays disabled until terms are accepted.
4. Confirm a completed identity cannot see the form again.
5. Provision a tablet ID and confirm the public screen is only black or artwork.

Full setup, secrets, APK, and exhibition checklist: [DEPLOYMENT.md](DEPLOYMENT.md)  
Security rules: [SECURITY.md](SECURITY.md)  
Test matrix: [TESTING.md](TESTING.md)

## What this software does not do

- No visitor accounts, email, or names
- No photo upload of the painting
- No regeneration, editing, or private result on the phone
- No analytics SDKs
- No OpenAI key in any client bundle
