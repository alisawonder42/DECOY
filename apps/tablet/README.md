# Tablet app

Portrait exhibition screen. Visitors never interact with it.

```bash
pnpm --filter tablet dev      # browser preview
pnpm --filter tablet build
cd apps/tablet && npx cap add android && npx cap sync android
```

First launch shows a staff provisioning form (tablet ID, device token, admin PIN).

Public screen: black, or the current artwork, with a ~1.5s crossfade. Internal states (claiming, generating, offline) are not shown.

Maintenance: tap the upper-left corner seven times within five seconds, then enter the PIN.
