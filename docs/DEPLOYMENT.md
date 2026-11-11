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

## Production access — approved and applied

The owner explicitly answered **“Approve production access”** on 11 November 2026 after automatic review rejected the initial protection change. The approved change was applied successfully and verified by a fresh project read: `ssoProtection.deploymentType=preview`. Production visitors do not need Vercel login; previews remain protected. Supabase authentication, explicit Wardrobe membership and row-level security are unchanged. The private Sites deployment is unchanged.

Git integration is confirmed linked to `amanbaid99/MyWardrobe`. Pushing the repository's default/production branch `wardrobe-foundation` automatically builds and deploys production. Documentation-only follow-up pushes can create new deployment IDs while serving the same application bundle. Do not create a second Vercel project or manually redeploy each documentation update.

Latest verified Git-triggered deployment before this final documentation update: `dpl_21K4ibnndZGPywc7Fg5FJSrC7sSe`, READY, production. The stable URL remains https://my-wardrobe-wine.vercel.app.

## Verification limits

Build and all seven tests passed before deployment. No browser login/CRUD or device install flow is verified. Production signup confirmation and password-recovery redirects still need the exact production URL added to Supabase's existing redirect allowlist, preserving tracker settings. Normal email/password login does not use that callback setting.

Unauthenticated HTTP verification from this executor was blocked by the environment proxy (`CONNECT tunnel failed, response 403`, server `envoy`), not an application response. Browser startup also failed with `Browser Use could not read requirements`. Authenticated connector HTTP checks passed; public production access is established by the approved Vercel configuration, not by a successful anonymous browser test.

## Coordinated outfit release

Usability/functionality update adds the flat-lay outfit canvas (no humanoid), local text proposals, preference-aware ranking, persisted ratings and scoped privacy controls. Database extension `20261111123317_wardrobe_usability_and_feedback` is already applied; no deployment-time migration command is required. Build uses bundled fonts and the new src/entry.tsx entrypoint. Validation commands: npm test (17 tests), npm run test:ui (five DOM tests), npm run build. Do not equate DOM tests with real device/visual verification.
