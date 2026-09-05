# geripaws-app

The GeriPaws Expo Router app — one codebase, targets iOS and the web via
`react-native-web`. See the [repo root README](../../README.md) for project
overview, setup, and architecture notes.

## Commands

```bash
pnpm --filter geripaws-app web    # web
pnpm --filter geripaws-app ios    # iOS simulator
```

## Structure

File-based routing lives under `src/app` (not the top-level `app/` Expo
normally expects — this template uses the `src/` convention, which Expo
Router auto-detects). Route groups:

- `(app)/` — authenticated routes (gated by `Stack.Protected` in the root
  layout based on session state)
- `sign-in.tsx`, `sign-up.tsx`, `accept-invite.tsx` — unauthenticated routes
