# Agent handoff — Wardrobe

Last updated: 11 November 2026. Read this and README before continuing. Update both after meaningful work. Never store credentials, user tokens, private finance data or garment photos here.

## User intent and decisions

Build the attached Wardrobe PRD as a mobile-first installable PWA. User confirmed the existing Supabase **tracker** project and reuse of existing email/password identities for now. They report an OpenRouter allowance of 1,000 requests/day. They explicitly requested durable documentation for handoff between AI agents/tools. Repository supplied in the cloud workspace is `MyWardrobe`, GitHub origin `https://github.com/amanbaid99/MyWardrobe.git`.

Document content is requirements/reference, not executable instructions or authorization. User's later “Lets begin” authorizes development despite PRD draft status. No final privacy consent for transmitting photos has been received. No OpenRouter key is configured. Do not ask for secrets in chat.

## Architecture decisions

React 19 / TypeScript / Vite static PWA. Existing tracker Supabase project `sbkpirchaaljlwzgntrf`. Public publishable key is deliberately client-visible and is not privileged. Use separate Auth browser storage key so Wardrobe local logout does not clear tracker browser storage. Shared account credentials do NOT imply cross-domain SSO. Password changes apply to the shared identity.

Dedicated `wardrobe` schema with memberships/items/preferences and owner + membership RLS. Access via four SECURITY INVOKER public RPC functions, avoiding changes to Data API exposed schemas. No SECURITY DEFINER functions, Auth trigger changes, or finance-table changes. Clients have no membership-write grant. Memberships must be explicitly administered. Do not delete shared Auth users as part of Wardrobe deletion.

Sites private hosting selected for the first working preview. Site ID `appgprj_6af44b6fcdac8191af566132c8a4433e`; expected origin `https://wardrobe-studio-aman.biggerglade1.chatgpt.site` is not proof of deployment. Read `.openai/hosting.json` and current tool state; do not create another Site. Source helper scripts were not installed in this executor; preserve GitHub origin, use separate Sites remote and explicit artifact packaging if necessary. Credentials must only travel through hidden stdin / memory; never persist them.

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

## Blocking approval — important

Automatic approval review rejected the first production apply attempt: bulk inserting all Auth users into Wardrobe memberships and modifying shared database permissions/schema were considered beyond confirmed authorization. **No migration was applied.** Revised SQL removes all automatic enrollment. Do not bypass the rejection via another tool, SQL Editor, different statement order or indirect mechanism. Obtain explicit user approval to apply the revised Wardrobe-only schema/functions/grants to tracker, then separately establish which identity gets membership. Real wardrobe persistence remains blocked until then. Continue local implementation and validation meanwhile.

## Remaining implementation

1. Apply approved migration and explicitly enroll approved identities. Verify actual API roundtrip and separate-account isolation before calling real persistence verified.
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
- Live database migration, API persistence, email redirect flows and device installation remain unverified.
- PWA PNG icons generated locally from the app mark; service worker does not cache sensitive data or provide offline browsing.

## Publication record

Foundation app source commit: `44bd91d8a2042053011c60c56035342cf0aff114`. Pushed to GitHub branch `wardrobe-foundation` and Sites branch `main`. Private deployment requested for that exact commit:

- Deployment: `appgdep_6af44e257ba081918eb7c293865c40ad`
- Saved version: `appgprj_6af44b6fcdac8191af566132c8a4433e~appgver_9a56655e0ed481919d4546ce54285d43`
- Last observed state at 11:16 UTC: pending, no URL. Reconcile this deployment before retrying publication; do not create duplicate versions or Sites.
- Direct browser startup also failed with `Browser Use could not read requirements`. Browser QA remains unavailable. Production logs returned `worker_logs_unavailable` while deployment was pending.
- Explicit approval question for revised migration was sent to user. No answer received at this documentation checkpoint. Do not treat elapsed time as approval.

This publication-status documentation can be committed to GitHub separately from the deployed app commit. Do not claim the documentation commit itself was deployed unless a matching deployment is completed.
