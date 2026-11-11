# Production hosting

The owner requested production hosting on 11 November 2026, mentioning GitHub Pages or another provider. Vercel is recommended: the current static Vite frontend works there, and future server-side AI endpoints can live alongside it. GitHub Pages would require a separate AI backend and project-subpath changes to asset, manifest, service-worker and Auth redirect paths.

## Reproducible release

- Repository: `amanbaid99/MyWardrobe`, branch `wardrobe-foundation`.
- Framework: Vite, Node 24.x.
- Install: `npm ci`; check: `npm test`; build: `npm run build`; output: `dist`.
- Checked-in configuration: `vercel.json`.
- Use the approved Vercel team `aman-projects8` (`team_2vj8roDxluy7rbBO8Sg9O4BB`). Do not deploy into another account to work around authorization failure.
- Preserve the private Sites deployment and `.openai/hosting.json`.
- Client uses only the public Supabase URL and publishable key. Never set an OpenRouter/service-role secret with a `VITE_` prefix.
- GitHub Pages administration calls were blocked in this environment. Vercel returned a 403 requiring team authorization; a one-time consent link was presented to the owner. Do not claim production deployment before a READY result and known URL.

## Auth redirects

Normal email/password login talks directly to the existing Supabase Auth project and does not need a callback redirect. Signup confirmation and password recovery require the final production origin in Supabase's redirect allowlist. Add the exact origin; preserve all tracker URLs and the existing Site URL. This is separate from login/membership and does not justify changing invite rules or shared Auth triggers.

## Verification

After deployment, inspect its READY state, aliases and build logs. Check the HTML and static/PWA asset responses, then test browser flows if browser infrastructure is available. Real account login and CRUD require an interactive session; do not obtain the user's password or manufacture shared Auth users for tests. Keep signed-in data out of caches, traces and committed artifacts.

## Current status

Prepared for Vercel. Team authorization is pending. Project/deployment IDs and the verified final URL will be recorded here after creation. No Vercel project has been created by this production-hosting step yet.
