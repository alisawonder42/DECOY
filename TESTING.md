# Testing

Automated tests do not call OpenAI and do not require a live gallery.

```bash
pnpm test
pnpm typecheck
pnpm --filter visitor-web build
pnpm --filter tablet build
pnpm check:secrets
```

## Covered automatically

- Haversine and location accept/reject cases (exact gallery, inside, outside, invalid, NaN, accuracy)
- No coordinate columns on `participant_sessions`
- Description length 20 / 2000 / 2001
- One-time submit, concurrent double submit, daily capacity, expired location
- Nine distinct tablets for nine jobs; 10th and 11th replace oldest displayed
- Fast tablet cannot steal an ineligible job
- Disabled tablet skipped
- Stale generation lease requeue; ready image reassigned without regenerating
- Global generation pacing
- Hidden prompt keeps the original description
- Visitor copy exists in English and Serbian and does not say “prompt”
- Client sources do not contain privileged secret assignments

## Must be verified against a live Supabase project

- Anonymous JWT → `participant-status` / `verify-location` / `submit-description`
- Direct second `submit-description` call rejected
- Anonymous client cannot `select` descriptions or tablet hashes
- Tablet token cannot read another tablet’s assigned job
- Signed URL download + local cache after reboot
- Realtime insert on `queue_signals` wakes an idle eligible tablet faster than the 20s fallback
- OpenAI 400 → `failed` + previous artwork remains
- OpenAI 429 → retry, previous artwork remains
- All tablets offline → queue grows, screens stay as they were

## Failure modes (exhibition rehearsal)

Visitor: deny location; stand outside radius; weak GPS; refresh before submit; refresh after submit; double Submit; 2001 characters; daily cap.

Tablets: unplug Wi-Fi; restore Wi-Fi; force-stop app; disable one tablet; only eight online; miss a realtime event (fallback claim).

In every tablet failure, the previous artwork must remain visible. Never replace it with an error, spinner, or logo.
