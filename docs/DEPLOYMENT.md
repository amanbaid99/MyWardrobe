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
- GitHub Pages administration calls were blocked in this environment. The owner authorized the Vercel team connection. Production deployment is now READY; IDs and checks are below.

## Auth redirects

Normal email/password login talks directly to the existing Supabase Auth project and does not need a callback redirect. Signup confirmation and password recovery require the final production origin in Supabase's redirect allowlist. Add the exact origin; preserve all tracker URLs and the existing Site URL. This is separate from login/membership and does not justify changing invite rules or shared Auth triggers.

## Verification

After deployment, inspect its READY state, aliases and build logs. Check the HTML and static/PWA asset responses, then test browser flows if browser infrastructure is available. Real account login and CRUD require an interactive session; do not obtain the user's password or manufacture shared Auth users for tests. Keep signed-in data out of caches, traces and committed artifacts.

## Current production deployment

- URL: https://my-wardrobe-wine.vercel.app
- Additional alias: https://my-wardrobe-aman-projects8.vercel.app
- Vercel project: `prj_VluP5OBKeh9uiLAJx9dqsNOAB39C` (`my-wardrobe`).
- Team: `team_2vj8roDxluy7rbBO8Sg9O4BB` (`aman-projects8`).
- Deployment: `dpl_DYcGVgPN3DCQdkQcQ24puWmVVUzH`, target production, READY.
- Deployed source: `f58ff1a62e924298ba28f995273d80e6587fe49f`, GitHub branch `wardrobe-foundation`.
- Framework Vite; Node 24.x; no AI secrets configured.
- Native deployment response verified READY and assigned production aliases.
- Authenticated HTTP checks verified HTML, JS bundle, manifest and service worker return 200. These requests used Vercel's authenticated fetch, so they do not establish anonymous accessibility or signed-in browser operation.
- Existing private Sites publication is preserved.

## Access decision pending

Vercel's inherited `ssoProtection.deploymentType` remains `all_except_custom_domains`. Automatic approval review rejected changing this to `preview`: removing protection from production URLs needs explicit user approval beyond deploying. Do not change protection, create alternate unprotected URLs or work around the rejection. The proposed final change is to allow production visitors to reach the app without Vercel login while keeping previews protected; Supabase login, memberships and RLS remain required for account data. Ask the owner for this precise approval. No protection settings changed from the rejected attempt.

## Verification limits

Build and all seven tests passed before deployment. No browser login/CRUD or device install flow is verified. Production signup confirmation and password-recovery redirects still need the exact production URL added to Supabase's existing redirect allowlist, preserving tracker settings. Normal email/password login does not use that callback setting.
