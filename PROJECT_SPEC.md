# Project specification (operational)

This file is the maintained engineering summary. The visitor-facing sequence is the source of truth.

## Sequence

PHYSICAL PAINTING → human observation → written description → AI interpretation → generated painting → one of nine tablets.

The image model never receives a photograph of the original painting. It receives only the visitor’s written description plus a fixed hidden instruction in `supabase/functions/_shared/prompt.ts`.

## Visitor

Anonymous Supabase session. One submission per anonymous browser identity, enforced by a unique database constraint and `create_submission_once`. Location is verified server-side with Haversine; coordinates are discarded. The visitor app starts in English, with a control to switch to Serbian. After submit, the phone only shows thank-you.

## Tablets

One APK. Each device is provisioned with `tablet-0N` + a random token whose SHA-256 is stored in Postgres. Tablets claim work only if they are the currently eligible screen: enabled, recently online, not busy, empty screens first, then oldest `last_displayed_at`, then stable ID.

## Status values

`queued` → `assigned` → `generating` → `ready` → `displayed` (or `failed`)

Ready images are not regenerated if a tablet disappears before display.

## Cost controls

- `MAX_DAILY_SUBMISSIONS`
- `GENERATION_MIN_INTERVAL_SECONDS` global slot
- `MOCK_IMAGE_GENERATION` for development
- OpenAI called only from `tablet-generate`
