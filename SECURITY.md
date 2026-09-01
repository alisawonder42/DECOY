# Security

## Secrets that must never enter a client

- OpenAI API key
- Cloudflare AI Gateway token
- Supabase secret / service-role key
- Database credentials
- Plain tablet device tokens after provisioning (they live only on the device)

Only the Supabase **publishable** key may ship in `visitor-web` or the tablet app.

Place the OpenAI key only in the Supabase Edge Function secret manager. Do not paste it into git, Cursor chat, Vite `VITE_*` variables, Capacitor config, APK resources, or QR codes.

## Data that must not be stored or logged

Do not persist or log:

- GPS latitude / longitude / accuracy
- visitor descriptions in logs
- OpenAI prompts
- generated image base64
- IP addresses as an identity mechanism
- browser fingerprints

Acceptable logs: submission IDs, tablet IDs, status transitions, sanitized error codes (`429`, `CONTENT_REJECTED`).

## Trust boundaries

- Browser UI is not a security control. `submissions.participant_id` is unique. `create_submission_once` is atomic.
- Visitors cannot insert/update `submissions`, `tablets`, or storage through RLS. They call JWT-authenticated Edge Functions.
- Tablets authenticate with `X-Tablet-ID` + `Authorization: Bearer <device-token>`. The server hashes the token and compares it in constant time. A compromised tablet is revoked with `enabled = false`.
- Generated images live in the private `generated-artworks` bucket. Tablets receive short-lived signed URLs and immediately cache bytes locally.

## CORS

Visitor functions allow `VISITOR_WEB_ORIGIN` (and its www/apex counterpart), the Cloudflare Pages project host `decoy-visitor.pages.dev` (including preview subdomains), and local development origins. Unknown origins are rejected.

## Expected limitation

Clearing site data, using a private window, or switching devices creates a new anonymous identity. That is accepted. Do not add fingerprinting or ad identifiers.

## Client bundle check

```bash
pnpm --filter visitor-web build
pnpm --filter tablet build
pnpm check:secrets
```
