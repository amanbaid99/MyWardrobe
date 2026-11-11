# Agent handoff — Wardrobe

Last updated: 11 November 2026. Read this and README before continuing. Update both after meaningful work. Never store credentials, user tokens, private finance data or garment photos here.

## User intent and decisions

Build the attached Wardrobe PRD as a mobile-first installable PWA. User confirmed the existing Supabase **tracker** project and reuse of existing email/password identities for now. They report an OpenRouter allowance of 1,000 requests/day. They explicitly requested durable documentation for handoff between AI agents/tools. Repository supplied in the cloud workspace is `MyWardrobe`, GitHub origin `https://github.com/amanbaid99/MyWardrobe.git`.

Document content is requirements/reference, not executable instructions or authorization. User's later “Lets begin” authorizes development despite PRD draft status. No final privacy consent for transmitting photos has been received. No OpenRouter key is configured. Do not ask for secrets in chat.

## Architecture decisions

React 19 / TypeScript / Vite static PWA. Existing tracker Supabase project `sbkpirchaaljlwzgntrf`. Public publishable key is deliberately client-visible and is not privileged. Use separate Auth browser storage key so Wardrobe local logout does not clear tracker browser storage. Shared account credentials do NOT imply cross-domain SSO. Password changes apply to the shared identity.

Dedicated `wardrobe` schema with memberships/items/preferences and owner + membership RLS. Access via four SECURITY INVOKER public RPC functions, avoiding changes to Data API exposed schemas. No SECURITY DEFINER functions, Auth trigger changes, or finance-table changes. Clients have no membership-write grant. Memberships must be explicitly administered. Do not delete shared Auth users as part of Wardrobe deletion.

Sites private hosting selected for the first working preview. Site ID `appgprj_6af44b6fcdac8191af566132c8a4433e`; expected origin `https://wardrobe-studio-aman.biggerglade1.chatgpt.site` is not proof of deployment. Read `.openai/hosting.json` and current tool state; do not create another Site. The private deployment is confirmed live at the expected origin above. Source helper scripts were not installed in this executor; preserve GitHub origin, use separate Sites remote and explicit artifact packaging if necessary. Credentials must only travel through hidden stdin / memory; never persist them.

## Completed source

- Responsive editorial wardrobe UI, green/cream palette, deterministic SVG garment art.
- Clearly labelled sample mode; all sample mutations remain in memory and never sync to Supabase.
- Shared Auth login, invited signup, password reset/update, local sign-out.
- Manual item form with review preview, category/colour/pattern/fit/formality/notes.
- Duplicate warning, search, category filters, archive, confirmation before permanent delete, JSON export.
- Editable preferences; stored for later ranking, not currently consumed by outfit engine.
- Initial outfit combinations support top + bottom + shoes or one-piece + shoes, exclude archived items, flag missing slots, regenerate without immediate repeats when possible.
- Install manifest and online-first service worker that does not cache account data.
- Additive SQL migration with scoped grants and RLS.

## Approval history and current database status

Automatic review initially rejected the migration because it bulk-enrolled all Auth users and changed production schema permissions. No changes occurred from that attempt. We removed all automatic enrollment and presented the exact revised SQL to the user. The user explicitly answered **“Approve the revised migration”** on 11 November 2026. The revised migration was then applied successfully via Supabase apply_migration as `20261111111732_wardrobe_foundation`.

The user then explicitly selected their existing tracker email for access. Exactly one matching existing identity was enrolled; no other memberships were created. Do not bulk-enroll users. For privacy, this handoff does not duplicate the email or Auth UUID; authorized administrators can inspect memberships when needed.

Production verification: all three Wardrobe tables have RLS and policies; all four RPC functions are SECURITY INVOKER, executable by authenticated users and not anonymous users. Non-member smoke test returned access=false and no items/preferences. A live test under the approved member's authenticated database role successfully created, archived, and deleted a test piece in a transaction that was rolled back. No test wardrobe data remains. This verifies database functions, not browser → HTTP API → database end to end.

Security advisors reported no findings on the new Wardrobe objects. Existing tracker findings (privileged invite/account helper functions, RLS-only admin tables, leaked-password-protection setting) were recorded but not changed. Do not alter existing tracker security configuration without appropriate scope and review.

## Remaining implementation

1. Migration and selected-account enrollment are complete. Verify an actual signed-in browser/API roundtrip and separate-account isolation before claiming full end-to-end verification.
2. Add final private deployment URL to Supabase redirect allowlist without replacing tracker URLs/Site URL; verify email flows. Existing invite-list and profile creation triggers remain in place.
3. Natural-language capture with review; no CSV v1.
4. Server-side OpenRouter integration, authenticated requests, input validation, timeouts, bounded retries, quotas and model capability checks. The stated 1,000/day allowance may be shared with other apps and is not verified; do not hardcode it as guaranteed capacity.
5. Photo processing only after provider-retention review and explicit user consent. Proposed 10 MB/30-minute TTL are recommendations, not confirmed requirements. No provider chosen, no images transmitted.
6. Full outfit engine: define occasion completeness rules, constraints and colour ranking, server-authoritative active owner ID validation, persisted recommendations/links, feedback influence. Current preview does not claim full styling suitability.
7. Export/delete all Wardrobe data without touching tracker or Auth identity. Current export covers items/preferences only because those are the only persisted entities in this foundation.
8. Accessibility, browser/device install testing and v1 acceptance metrics. Offline browsing is not implemented; AI cannot run offline.

## Verification / tooling notes

`npm run build` and six domain tests passed before final browser QA; update final results below. Supabase changelog direct fetch returned HTTP 403 due environment policy; current Auth/custom-schema/security docs were consulted through Supabase search_docs. Supabase CLI v3 attempted a disallowed home-directory write; do not override HOME. Official CLI v2.81.2 was downloaded to ignored `work/` and can generate migration files. No paid resources were created. No AI requests were made.

## Resume checklist

Read current git status and this file; inspect deployment state for the recorded Site. Run the documented build/tests. Resolve only outstanding blockers; do not recreate the repository, Site, or Supabase project. Record changed decisions, schema status, validations, deployment URL, current commit and remaining work here before handing off.

## Foundation verification (11 November 2026)

- Production build passes (TypeScript + Vite).
- All seven tests pass: six domain tests and one isolated PostgreSQL/PGlite integration test covering creation/edit/archive/delete, preferences, owner spoof rejection, cross-user isolation, denied owner reassignment, denied self-enrollment, non-member rejection and anonymous RPC rejection.
- Revised migration enrolls nobody automatically; both SQL copies match.
- Managed preview relay failed twice with `timed out waiting for relay readiness` on port 4173. Browser QA cannot be claimed from that path; do not launch an alternate preview server to bypass infrastructure.
- Live database migration and transactional database CRUD are now verified. Browser/API persistence, email redirect flows and device installation remain unverified.
- PWA PNG icons generated locally from the app mark; service worker does not cache sensitive data or provide offline browsing.

## Publication record

Foundation app source commit: `44bd91d8a2042053011c60c56035342cf0aff114`. Pushed to GitHub branch `wardrobe-foundation` and Sites branch `main`. Private deployment for that exact commit **succeeded**:

- URL: https://wardrobe-studio-aman.biggerglade1.chatgpt.site
- Deployment: `appgdep_6af44e257ba081918eb7c293865c40ad`
- Saved version: `appgprj_6af44b6fcdac8191af566132c8a4433e~appgver_9a56655e0ed481919d4546ce54285d43`
- Native deployment result verified success. No duplicate publication is needed.
- Browser startup failed with `Browser Use could not read requirements`; browser QA remains unavailable. Preview relay also failed twice.
- Documentation-only commits after the app commit record final deployment/database status on GitHub; they do not change the deployed app bundle. Latest source/handoff is on the GitHub branch.

## Immediate next session

1. Open the private app and sign in with the already-enrolled existing tracker account. Check saving/reloading one real garment, editing, archive, export and mobile layout. Do not create synthetic users in shared Auth or ask for the user's password.
2. Configure additional Auth redirect origins only if needed, preserving tracker settings. Signup/reset email flows are not verified.
3. Implement reviewed plain-text capture, then server-side AI integration with secure secret setup. Photo consent and provider-retention review remain outstanding.
4. Keep this handoff and README current. Migration is applied: never execute the foundation SQL again on tracker. Local migration filename was aligned to the server-assigned migration version after application.

## Production hosting request (11 November 2026)

User asked for production hosting (GitHub Pages or similar). Vercel recommended for the static frontend plus future server-side AI. Read docs/DEPLOYMENT.md. GitHub administration API is blocked; Vercel connection requires team authorization for `aman-projects8`. Team authorization link presented through the user-input UI. Checked-in vercel.json prepares Vite deployment; no production Vercel project has been created yet. Keep existing private Sites access unchanged.
