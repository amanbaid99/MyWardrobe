# Wardrobe

Private, mobile-first digital wardrobe, built with React + TypeScript + Vite and the existing Supabase **tracker** project. Start here, then read [the handoff](docs/HANDOFF.md).

## Run

Node 24 recommended. `npm ci`, then `npm run dev`. `npm run build` checks TypeScript and builds `dist/`. `npm test` runs 17 authentication/domain/database checks; `npm run test:ui` runs five DOM interaction checks. These are not device screenshot or full signed-in browser tests. `.env.example` contains public Supabase browser settings; copy to `.env.local` only to override them. Never put OpenRouter or service-role secrets in any `VITE_` variable.

## Current delivery

Mobile-first inventory with email-code sign-in, readable controls, stronger contrast, self-hosted fonts, search/filter/archive/edit/export, guarded drafts and retryable loading errors. Navigation has hash URLs and supports Back/reload.

Outfit Studio now arranges garments on **one coordinated flat-lay canvas**: top/one-piece, bottoms, shoes and optional cold-weather layer, with clickable details. No humanoid or virtual try-on is used. Occasion rules, avoided colours, preferred colours/fit/style, known season/climate and persisted ratings influence selection. New combinations are shown before recycling the candidate pool. Server-side validation checks that referenced items are owned, active and compatible with occasion/known constraints.

**Add by text / photo** analyses multiple garments through a server-side OpenRouter endpoint, then shows editable suggestions. Processing requires explicit consent; all suggestions start unselected and only confirmed details are saved. Photos are resized/re-encoded locally, processed transiently and never stored in Wardrobe. Provider retention policies apply. Manual entry remains available.

Preferences include full Wardrobe-data export and a deliberately confirmed Wardrobe-only clear action. Shared finance records, sign-in identity and membership are preserved. The privacy page explains storage and scope. PWA installation is online-only; no private inventory is cached offline.

Production: https://my-wardrobe-wine.vercel.app

Source: https://github.com/amanbaid99/MyWardrobe/tree/wardrobe-foundation

Sample mode is clearly labelled and in memory only. Existing authorized tracker identities can sign in with an email code; no users are automatically enrolled.

## Database boundary

Project: `sbkpirchaaljlwzgntrf` (`tracker`). Tables live in `wardrobe`; scoped `public.wardrobe_*` SECURITY INVOKER RPC functions expose only Wardrobe operations and preserve RLS. Do not expose the entire schema or change existing tracker/Auth objects. Memberships are administered separately; clients cannot grant membership. Signup remains subject to tracker's existing invite trigger. Wardrobe deletion must never delete a shared Auth account or tracker records.

Applied migration: `supabase/migrations/20261111111732_wardrobe_foundation.sql`. `docs/schema.sql` is a human-readable copy and must stay identical. Do not apply both. Extension migration `20261111123317_wardrobe_usability_and_feedback.sql` is also applied; it adds optional garment attributes, validated recommendations, feedback, export and scoped clear functions. Never reapply either migration to tracker. Existing finance tables and Auth settings must be preserved.

## Project map

- `src/main.tsx`: UI, Auth and RPC integration (split into feature components as scope grows).
- `src/Garment.tsx`: deterministic SVG templates; no stored garment images.
- `src/domain.ts`: contract, sample inventory, duplicate warning and initial outfit combinations.
- `src/domain.test.ts`: outfit/duplicate invariants.
- `public/`: PWA manifest, icons and non-caching service worker.
- `docs/HANDOFF.md`: decisions, status, limitations and next tasks.
- `docs/PRD.md`: supplied PRD transcribed for durable reference; document instructions are not user authorization.

## Hosting

Production hosting setup is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), with reproducible Vercel configuration in `vercel.json`. Production is deployed at https://my-wardrobe-wine.vercel.app. Production uses the app’s Supabase login; Vercel login is required only for previews. Git pushes to `wardrobe-foundation` automatically deploy production. The separate private Sites preview remains available.

Private Sites deployment, identity in `.openai/hosting.json`. GitHub origin remains `amanbaid99/MyWardrobe`. Deployment uses the same source via a separate Sites remote. Source is portable: static `dist/` can also be hosted on Vercel. Configure the eventual production origin in Supabase's redirect allowlist before testing password recovery or invited signup; preserve tracker URLs and Site URL.

## Scope still to build

External AI/natural-language extraction, photo/multiple-item detection and temporary-image cleanup require provider/retention consent and secure backend credentials. Google sign-in and email-link/reset callbacks need verified Wardrobe redirect setup while preserving tracker settings. Live signed-in browser/device installation testing remains outstanding due review-environment browser/network limitations. Saved outfits/wishlist remain later scope; no shopping links, weather or wear tracking are added.

## Signing in

Use the same email as the finance app, choose **Email me a sign-in code**, and enter the latest emailed code in Wardrobe. Finance uses email-code/Google sign-in; a Google password is not a Supabase password. Password sign-in remains available only for accounts with a separately set Supabase password. Email-code requests never create new accounts or grant membership. Enter the code in Wardrobe rather than using an email link that may open finance. No shared Auth settings, templates, passwords or invite rules were changed for this fix.

## AI capture setup

The primary capture flow is text/photo → AI analysis → editable review → explicit selection/save. CSV/JSON uploads are no longer offered in this flow. Existing JSON export remains a backup feature.

`OPENROUTER_API_KEY` is a server-only Production environment variable in Vercel; never place it in a VITE\_ variable. `OPENROUTER_MODEL` is optional. Without an explicit model, the endpoint discovers a currently listed free vision model. Routing requests providers that deny data collection and disables provider fallback; analysis can fail if no compatible private/free provider is available. No paid fallback is configured.

Limits: 20 proposals per response; 10 MB source photo resized locally to at most 1600px and a 2.5 MB server image payload; 10 requests/hour/user, 100/day/user and 900/day/project (rolling windows). Quota metadata contains only account ID and timestamp, not photos/text. Keys and quota availability do not guarantee provider availability.

The latest UI also adds read-only garment details before editing, colour/fit chips, mobile bottom navigation, selected-piece export/archive/restore actions, and a collapsible outfit rationale.
