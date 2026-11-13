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

## Vercel production deployment (11 November 2026)

Owner authorized team access. Created Vercel project `prj_VluP5OBKeh9uiLAJx9dqsNOAB39C` in `aman-projects8`, linked to `amanbaid99/MyWardrobe`, Node 24.x. Production deployment `dpl_DYcGVgPN3DCQdkQcQ24puWmVVUzH` is READY at https://my-wardrobe-wine.vercel.app from source commit `f58ff1a62e924298ba28f995273d80e6587fe49f`. HTML, JS bundle, manifest and service-worker authenticated HTTP checks return 200. See docs/DEPLOYMENT.md for full release state.

Automatic review rejected changing inherited Vercel protection to previews only; current setting remains `all_except_custom_domains`. Explicit production-access approval is still required before changing that setting. This is a separate decision from the already-approved deployment and Supabase migration. Do not bypass it. No Supabase, membership or tracker changes were made during deployment.

## Final production access state

The owner explicitly approved production access after the automatic review rejection. The approved protection update succeeded: `ssoProtection.deploymentType=preview` was verified with a fresh project read. Production is at https://my-wardrobe-wine.vercel.app and requires the app's Supabase login for private data; preview deployments retain Vercel protection. No pending deployment/access approval remains from this request.

Vercel's Git linkage to `amanbaid99/MyWardrobe` is confirmed. Default branch `wardrobe-foundation` pushes trigger production automatically; documentation push already produced a newer READY production deployment (`dpl_21K4ibnndZGPywc7Fg5FJSrC7sSe`). The final documentation push may create another deployment with unchanged app code. Keep using the stable URL. Earlier pending-state entries above are historical and superseded by this section.

Production asset HTTP checks passed via the authenticated connector (HTML, bundle, manifest, worker, PNG). A direct anonymous request was blocked by the executor's network proxy, and browser initialization still failed. Do not claim browser login, real inventory persistence through HTTP, or device installation is verified. Build logs show completion with one nonfatal npm cache-dir environment warning. Normal shared email/password login is available; email confirmation/reset redirect allowlisting remains a separate unfinished setup item.

## Shared sign-in correction (11 November 2026)

User reported invalid credentials when using finance credentials. Read-only review of finance source (`app/(auth)/login/login-form.tsx`) confirmed finance offers email-code and Google sign-in, whereas Wardrobe originally only offered password entry. Sharing Supabase identities does not make a Google password a Supabase password. This mismatch was missed in the initial foundation. The selected Wardrobe identity is email-confirmed, has membership, is not banned and has a password set; no hash was read, no password was tested or changed. This source mismatch explains a potential invalid-password path, but the exact password typed by the user is unknown.

Wardrobe now defaults to email-code sign-in (`src/EmailSignIn.tsx`, helpers in `src/auth.ts`). Existing identities only: `shouldCreateUser:false`. Email is trimmed/lowercased; numeric OTPs are verified with type=email. Code entry stays within Wardrobe and requires no callback/redirect allowlist change. Explicit UI warns the email link may open finance; shared templates/Site URL were not changed. Password login remains secondary with actionable invalid-credentials guidance. No Google sign-in button is added until Wardrobe redirect setup is verified.

No emails were sent by the agent. Code delivery and successful verification require the user's action; do not claim live OTP verification is complete until observed. Four new regression tests cover existing-account-only requests, normalized identity, OTP verification, malformed-code rejection, and password-error guidance. TypeScript/Vite production build and all 11 tests passed before pushing. Production auto-deploys the existing branch; preserve private Sites publication.

## UI/UX and functionality audit (11 November 2026)

User requested an independent review and suggested fixes, not implementation. Findings and priorities are in docs/APP_REVIEW.md. No application or database changes were made. Confirmed CSS inheritance stacks search/archive controls vertically; many essential font sizes are 8–12 px and representative small text contrast is below 4.5:1. Read-only engine harness reproduced A/B regeneration looping and casual items in formal requests. PRD comparison documents missing capture, personalisation, feedback and privacy/account features.

Browser attempts are explicitly limited: native Chrome reached the production URL but returned ERR_TUNNEL_CONNECTION_FAILED; browser plugin requirements failed; managed preview relay timed out. No live/mobile visual audit or account flow was claimed. Documentation-only publication does not constitute implementing the suggested fixes. Start with the audit's usability/reliability pass, then recommendation correctness, then capture features if authorized.

## Usability, functionality and coordinated-outfit delivery (11 November 2026)

User authorized implementing the audit, then steered outfit presentation to **no humanoid, no three-card grid**. Outfit Studio is now a single flat-lay composition: top or one-piece above bottoms, shoes below, optional warm layer alongside. Pieces are clickable for edits. See docs/APP_REVIEW.md implementation follow-up for completed/deferred findings.

New files: src/OutfitStudio.tsx (composition, generation and ratings), src/Icon.tsx (SVG icons), src/Privacy.tsx, src/ErrorBoundary.tsx, src/entry.tsx, UI regression tests and Vitest config. main.tsx exports App; entry.tsx mounts it. Fonts are bundled with pinned @fontsource dependencies instead of remote Google CSS. Existing main stylesheet has a final usability override section; consolidate into design tokens in a future refactor rather than adding more competing overrides.

Production migration `20261111123317_wardrobe_usability_and_feedback` is applied. The first native migration confirmation expired; the same migration was retried and succeeded, not applied twice. No user enrollment, finance-table mutation or shared Auth configuration changes occurred. Five Wardrobe tables have RLS. All eight public Wardrobe functions are SECURITY INVOKER with no anonymous execute grant; advisor output contained no Wardrobe findings. Do not reapply the migration.

The extension adds optional season/material/length/style tags, recommendations with server-generated snapshots and trigger validation (active ownership, occasion, avoided colours/known seasonal conflicts), per-user feedback, full export and typed-confirmation Wardrobe-only clearing. Clearing retains membership and all shared Auth/finance data. No clear action was run against live user data during verification. Live item/recommendation/rating tests ran inside a rolled-back transaction.

Ranking now applies formal/smart suitability, avoided colours, preferred colours/fit/style, known climate/season and ratings; candidate history avoids recycling until exhausted. Casual remains permissive. Budget is stored for future shopping and does not rank owned outfits. Candidate search considers the top 24 ranked items per slot; exact exhaustive search is not promised for very large wardrobes. Free-text outfit requests support recognised garment/colour words and no/avoid/without exclusions, not general conversational understanding.

Local description capture recognises explicit common words and proposes editable pieces; unknown attributes stay unknown. It is not AI, does not infer facts from pixels and makes no provider calls. Full photo/AI capture stays disabled pending consent/provider policy and secure credential setup. Google/email callbacks remain unfinished; keep email-code sign-in primary.

Checks: npm test (17) and npm run test:ui (5) pass; npm run build passes. UI tests cover the single canvas with clickable pieces, category empty state, bootstrap errors, OTP countdown and draft-discard protection. These are jsdom tests, not screenshots or live signed-in browser tests. Browser/network limitations from the audit remain. README and review statuses updated. Deploy through the existing Git-linked Vercel project by pushing wardrobe-foundation; preserve the old private Sites publication.

Release verification: application commit `34cba3206343d36824909e64ffac6fc4e2ab8e2d` deployed READY as `dpl_n7LeXzabfXEAV6voUvafJgc67JK8` to https://my-wardrobe-wine.vercel.app. Production HTML and its new JS/CSS assets returned HTTP 200 through the Vercel connector. Bundle checks confirmed the coordinated outfit canvas, typed-confirmation privacy action and bundled fonts are present. A fresh browser attempt still failed to read browser requirements. No visual/device verification is claimed. Documentation-only pushes after this record deploy the same application code automatically.

## Bulk import (11 November 2026)

User corrected “bulk export” to **bulk import**; the existing JSON export is unchanged. New BulkImport dialog in My wardrobe accepts CSV and Wardrobe JSON item arrays/exports, up to 500 rows and 2 MB. CSV template download included. Parser supports BOM/CRLF, quoted commas/newlines and escaped quotes. Unknown fields, owner IDs and source item IDs are never sent to storage. This adds new garment records; preferences/outfits/feedback are not restored from a backup.

Files are parsed on-device and previews permit correction/selection. Potential duplicates against active inventory and earlier file rows start unchecked; explicit selection allows legitimate matching items. Invalid rows cannot be selected. Uses existing wardrobe_save_item RPC one row at a time; no migration or finance/Auth changes. Successful rows are disabled and not retried. Import stops at the first failed request and explicitly warns that a lost response may represent a committed save; check inventory before retrying that row. No claim of exactly-once import or atomic all-or-nothing behavior is made. Dialog prevents closing while processing; account changes prevent continuation with an old account's preview. Source files and previews are not persisted.

Tests added for quoted CSV, ownership/ID stripping, invalid rows, limits and import selection/duplicate/completed-row UI. Review input remains an explicit user action; no production garments were imported by the agent. User also asked for other UI suggestions; recommended mobile bottom navigation, garment details sheet, colour/fit chips, sticky bulk actions, expandable outfit rationale and loading skeletons. Those additional suggestions are not implemented in this import delivery.

## Capture correction and UI follow-up (11 November 2026)

User rejected CSV/JSON as the primary import and explicitly requested AI text/photo analysis followed by review/confirmation. This supersedes the earlier file-import direction. CSV UI is removed from capture; export remains. The UI now accepts a description or a photo, obtains explicit processing consent, calls authenticated /api/capture and renders editable proposed garments with all rows initially unselected. Only selected confirmations call the existing save RPC. No live photos or descriptions have been sent by the agent.

User configured the server-only Production OPENROUTER_API_KEY in Vercel; presence was verified through metadata without exposing its value. api/capture.mjs verifies Supabase identity, reserves a persistent quota and uses OpenRouter. It dynamically discovers a listed free vision model unless OPENROUTER_MODEL is provided. Provider routing denies data collection and disables fallback; no zero-provider-retention guarantee. The API does not store photos or item records; image bytes and text are transient, output is validated by the client garment contract before review/save. Photo capture resizes/re-encodes before transmission, removing original metadata.

Applied migration 20261111130415_wardrobe_capture_quota adds only usage timestamps and quotas. Public RPC is SECURITY INVOKER; private wardrobe.reserve_capture is narrowly SECURITY DEFINER because quota accounting cannot be client-writeable. It checks auth.uid and membership, serializes quota reservations with an advisory transaction lock and prunes records older than two days. Limits: 10/hour/account, 100/day/account, 900/day/project. No user enrollment or finance/Auth config changes. No images/text in quota records.

Requested UI changes are included: GarmentDetails read-only sheet before Edit, colour/fit choices in the item editor, mobile bottom navigation, selection and sticky export/archive/restore toolbar, and collapsible Why this look. Clear/selection actions do not add permanent bulk deletion. Main outfit canvas stays clothing-only with no humanoid.

Tests pass: 21 Node domain/auth/import/database checks plus 10 DOM/API tests. New tests verify consent before provider access, authentication, proposal-only API behavior, explicit selection before save, and read-only garment detail flow. Provider calls in tests are mocked. Live OpenRouter inference and signed-in browser/device flows are not yet verified. api/capture.mjs is a Vercel Node function; a static-only host cannot run it. Earlier statements that AI/photos are disabled are historical, superseded by this section.

## OpenRouter routing failure follow-up

User reported the generic provider/privacy error. Existing runtime logs had no upstream diagnostic events, and the review environment blocked direct access to OpenRouter's model catalog. Exact live upstream cause was therefore not established. Fixed two routing weaknesses: text requests no longer require a vision model; provider fallback is allowed while keeping data_collection=deny, and at most two current free models are attempted. Explicit configured model still takes precedence. Key whitespace/Bearer prefix is normalized server-side. Upstream 401/403, 402, 429, privacy-policy, availability and timeout failures now produce distinct safe messages. Sanitized logs include status/model/privacy flag only, never key, auth token, user input, image or raw provider response.

Regression tests verify text-only free models, preservation of privacy constraints on fallback, bounded retry and actionable key errors. A successful mocked API test is not proof of live provider inference. Live user retry is still needed to diagnose an account-wide policy/quota restriction if the issue persists. No provider privacy constraint was relaxed.

## Large-list completeness, fragrance and duplicates (12 November 2026)

User supplied a large structured wardrobe description and reported incomplete extraction, requesting accessories/perfume support and merge-or-separate duplicate options. Read-only inspection found 14 current records, including two manually entered bamboo tees and 12 imported items. Do not store the personal list or inventory dump in the repository. No saved names/attributes were automatically repaired, no source list was imported on the user's behalf, and no existing garment records were deleted/merged by the agent.

Capture previously limited output to 20 proposals without accounting for source lines. New captureBatches helper splits up to 160 source lines into groups of eight with section context; grouped colours/counts stay intact for the AI. API prompt requires source_line per item, explicit quantities, canonical types, usage/condition/sleeves and preservation of text-supplied brand/material details. Patterns/formality must not be assumed. API checks token truncation, permits up to 40 proposals per batch, and returns unresolved numbered lines not represented in output. UI shows batch progress and incomplete-coverage warnings, retains original text in memory and stops on a batch failure without losing prior proposals. Per-line coverage does not prove every grouped colour/count was perfectly extracted; user review remains required. Existing quota limits still apply across batches; no quotas were silently relaxed.

Applied production migration 20261112021652_wardrobe_quantities_and_fragrance: adds fragrance category, expanded colours, quantity default 1 (1–10000), usage_group, sleeve_length and condition; updates existing SECURITY INVOKER save RPC. Existing data receives default unknown metadata/quantity 1 only. No finance/Auth/enrollment changes. Live transactional fragrance/quantity save verification passed and was rolled back. Isolated tests verify persistence/RLS.

Added accessory subtypes (socks/underwear/handkerchiefs etc.), kurta/vest and footwear types, Perfumes filter/manual category and generic bottle illustration. Quantity/use/condition/sleeves visible/editable; original text facts stay in names/notes. Duplicate matching normalizes type aliases and treats unknown patterns as possible matches. AI review has Skip / Keep separate / Merge target choices. Merge preserves existing record ID, name, quantity and known fields, fills unknown fields, and combines notes. Manual new-item editor also offers a review-merge action or Save as separate. This is a reviewed merge into one selected saved record, not automatic global deduplication or record deletion; quantity is not silently increased.

Checks: 25 Node tests and 15 UI/API tests pass, production build passes. Synthetic tests cover long-list batching/grouping, source-line omissions, perfume/quantity parsing, conservative merge behavior and the explicit merge UI. API tests mock providers; the full user list was not submitted to OpenRouter by the agent and live extraction quality is not claimed. README updated.

## User-authorized inventory reconciliation (12 November 2026)

The user explicitly asked to add/update their existing inventory from the structured text supplied in chat. Reconciled only the selected member's Wardrobe items through the existing SECURITY INVOKER save RPC under that member's authenticated role and RLS. Corrected the earlier inspection count: there were 15 existing records, not 14. Updated all 15 in place and inserted 50 missing entries, yielding 65 records. Preserved existing IDs and manual fit/notes; corrected imported aliases, colours and unsupported assumptions from the source. Distinct brands/colours/usage/condition stay separate; five groups use explicit quantities. Approximate quantities remain labelled approximate, and unspecified quantities are noted rather than invented. No fragrance was invented because the supplied inventory did not name one.

Verification: full transaction dry run rolled back successfully before applying; actual transaction used an existing-count/ID guard and a final count assertion. A separate post-commit read compared every expected field for all 65 records and found 65 full matches with 65 unique IDs. No deletes, finance-table writes, Auth changes, quota changes or model calls. This was a direct user-authorized data operation, not verification of AI extraction or signed-in browser UX. Personal source text, item payloads and user identifiers are intentionally excluded from repository artifacts; do not replay this one-off reconciliation. No code/schema change or additional test run was needed.

## Missing assignments and reviewed AI suggestions (12 November 2026)

Added category-aware missing-field detection in src/assignments.ts, card badges/borders with field lists, a Needs details filter and empty-filter state, and Assign details actions from cards/details. A new AssignmentReview dialog offers per-field manual values or external AI suggestions. Manual choices work without consent/network; external inference requires explicit consent and session. Only details for the selected piece are sent, without record/owner IDs or creation time. No full-inventory provider request occurs. Every AI suggestion is unselected initially; manual selection checks that field, and Save applies only selected, valid, currently missing fields. Existing ID, quantities, notes, known values remain intact. Account changes close the sheet; existing save RPC and owner guards handle persistence. Cancel/Escape/refresh protect selected drafts and provider/save failures retain choices.

Missing assignments cover type, colour and use for every category; occasion for wearable clothing/footwear; pattern for clothing; sleeves for relevant tops. Known generic printed/other patterns count as assigned. Fit/material/condition/season remain optional in Edit piece and are not used to flag every garment incomplete. api/capture.mjs now accepts task=assign with a dedicated single-piece recommendation prompt, preserving existing auth, quotas, free-model routing and provider data_collection=deny. Physical attributes must be grounded in supplied facts, while use/occasion are explicitly styling recommendations. Client whitelist validates suggestions and prevents updates to existing known fields; the model never writes inventory.

Verification: 25 Node/database tests plus 21 DOM/API tests pass, production build passes (existing bundle size warning). Tests cover category-aware omissions, unknown vs printed patterns, invalid/known-field rejection, no-credentials manual saving, consent and identity-free provider payloads, initial unselected AI values, selected-only saves, live app filter/action wiring, and recommendation prompt with unchanged quotas/privacy/no inventory writes. Provider tests use mocks; live signed-in inference and device screenshots are not claimed. No schema/production inventory writes were performed for this feature. README updated.

## User-authorized backend assignment audit (12 November 2026)

User asked the assistant to analyse and directly fix the saved wardrobe, asking questions when uncertain. Fresh read included intervening user edits, which were preserved. Updated 50 of 65 records, filling 55 attributes: 46 missing wearable occasion classifications, seven missing use groups, and two conditions explicitly supported by existing notes. Inferred use/occasion classifications are labelled AI styling recommendations in each changed item's notes; no external inference provider was used. Known assignments, physical attributes, names, quantities, manual fit and existing note text were preserved. No insertions, deletions, archiving, merging, schema, Auth, membership or finance changes. All items now have a use group, and all wearable items have an occasion classification.

Applied using the existing save RPC under the selected owner's authenticated role/RLS in one transaction with per-item updated_at guards. Full dry run rolled back before application. Separate post-commit verification matched all expected fields in all 65 records. No source inventory dump/IDs were stored in the repository. No code/schema changes or test-suite run needed for this data-only operation. Physical ambiguities remain unassigned pending three user questions about sleeves/plain vs patterned garments, colours of unspecified items, and footwear type; unspecified counts and perfume details also remain unverified. Do not infer physical details or replay the one-off update.

## User-confirmed physical corrections and removals (12 November 2026)

Applied the user's replies to the physical-detail questions. Updated 35 retained records with confirmed sleeve lengths, solid patterns and an explicitly supplied colour; retained named logo/graphic designs and the existing printed kurta pattern. Archived 10 user-requested items (including interpreting underwear to encompass boxers/briefs/banyans) rather than permanently deleting them. Archive scope was explained before the operation. There are now 55 active records and 10 recoverable archived records. Other unspecified physical details remain unknown.

Used the existing owner-scoped authenticated save RPC/RLS, an atomic transaction, per-record updated_at guards and count assertions. Dry run rolled back successfully; post-commit verification matched every expected field for all 65 records. Existing IDs, quantities, notes and other details were preserved. No schema, Auth, membership, finance or application-code changes. No personal source text or item dump committed. This is a one-off user-authorized data operation and must not be replayed.

## UX overhaul (13 November 2026)

User asked to run the app, review it and overhaul it to be "much much better and friendly to use". Answers to scoping questions: restructure UX + restyle (no new features, no database changes); better illustrations (not real photos); fresh modern app look; ship to production when build and tests pass.

Review findings that drove the changes: app navigation shown before sign-in; desktop sidebar background stopped at the viewport height; the wardrobe page put a hero, stats card, starter checklist, three different add buttons, filters and checkboxes before any clothes (clothes started about 1,400px down on a phone); every sample card carried a large "Assign details" button; the editor used dropdowns with raw values ("unknown", "t-shirt"); outfit results sat below a paragraph of technical rules; copy leaked internals (tracker, OpenRouter, finance); all garment types of a category shared one silhouette.

What changed (presentation only; RPC calls, domain logic, AI endpoint, quotas and consent flows are unchanged):

- `main.tsx` reduced to shell, session, routing and data calls. New components: Landing, WardrobePage, ItemEditor, AddSheet, SettingsPage, AuthDialog, theme.ts.
- New token-based `style.css` replacing the old stylesheet and its stacked overrides. Light/dark themes follow the device, with a Settings override stored in localStorage (try/catch; convenience only). Libre Caslon is no longer imported (the dependency remains in package.json, unused).
- Wardrobe: compact header, sticky search, overflow menu (Select pieces, Show archived, Export), category chips, a single needs-details nudge ("Review pieces") that switches into the assignment view, colour-tinted cards, mobile tab bar and floating add button.
- Add flow: "Add a piece" opens a sheet with "Snap or describe" (AI capture; disabled in sample mode with a sign-in prompt) and "Add manually".
- Editor: chips for category, type, colour, occasion, pattern, fit, sleeves and use; less common fields under More details; archive/delete in the footer. Dialogs render as bottom sheets on phones.
- Outfits: occasion chips, rules moved into "How suggestions work", two-column flat-lay (top, bottoms, shoes, optional layer; one-piece layout), rating with optional reason, explanation collapsible.
- Settings: account card with sign in/out, compact colour swatch pickers for preferred/avoided colours, appearance, data export/clear, privacy link.
- Illustrations: distinct SVG per subtype (shirt, polo, blouse, sweater, hoodie, kurta, vest, trousers, jeans, shorts, skirt, dress, jumpsuit, jacket, blazer, coat, cardigan, nine shoe types, belt, bag, scarf, hat, watch, socks, underwear, handkerchief, eyewear, fragrance bottles), with pattern and sleeve-length support.
- Sample mode now shows `demoWardrobe` (14 pieces, two intentionally missing details). `samples` (first six) remains the test fixture.

Verification: `npm run build` passes; `npm test` 25/25; `npm run test:ui` 22/22 (two tests updated for the add sheet and the nudge, one added for sample-mode add options). Sample-mode UI was checked with Playwright screenshots at 390px and 1366px in light and dark themes. Not verified: signed-in flows against production Supabase, live AI capture, real-device install. The bundle is still about 538 kB (Supabase client); code-splitting remains a possible follow-up.

Next ideas, not started: code-split the Supabase client and dialogs; saved outfits and a wear log (would need a reviewed migration); swipe-to-dismiss sheets.
