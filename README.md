# Wardrobe

Private, mobile-first digital wardrobe, built with React + TypeScript + Vite and the existing Supabase **tracker** project. Start here, then read [the handoff](docs/HANDOFF.md).

## Run

Node 24 recommended. `npm ci`, then `npm run dev`. `npm run build` checks TypeScript and builds `dist/`. `npm test` runs six domain tests and one isolated PostgreSQL/RLS integration test. `.env.example` contains public Supabase browser settings; copy to `.env.local` only to override them. Never put OpenRouter or service-role secrets in any `VITE_` variable.

## Current delivery

Foundation UI: shared email/password login, invited signup, password reset/update, inventory CRUD/archive/search/filter/export, duplicate warnings, deterministic garment vectors, preferences, initial rule-based outfit combinations, sample preview mode and install manifest. No AI requests or photo uploads occur.

**Database integration is implemented but the production migration is NOT applied.** Automatic approval review rejected the initial migration because it enrolled all existing Auth users and modified the shared production database. The revised migration removes automatic enrollment. Do not retry or work around the rejection without explicit approval for the revised change. Real login uses tracker Auth, but wardrobe data will not load until the migration and explicit access enrollment are approved and applied.

## Database boundary

Project: `sbkpirchaaljlwzgntrf` (`tracker`). Tables live in `wardrobe`; four `public.wardrobe_*` SECURITY INVOKER RPC functions expose only Wardrobe operations and preserve RLS. Do not expose the entire schema or change existing tracker/Auth objects. Memberships are administered separately; clients cannot grant membership. Signup remains subject to tracker's existing invite trigger. Wardrobe deletion must never delete a shared Auth account or tracker records.

Review `supabase/migrations/*_wardrobe_foundation.sql`. `docs/schema.sql` is a human-readable copy and must stay identical. Do not apply both. Existing database and Auth settings must be preserved.

## Project map

- `src/main.tsx`: UI, Auth and RPC integration (split into feature components as scope grows).
- `src/Garment.tsx`: deterministic SVG templates; no stored garment images.
- `src/domain.ts`: contract, sample inventory, duplicate warning and initial outfit combinations.
- `src/domain.test.ts`: outfit/duplicate invariants.
- `public/`: PWA manifest, icons and non-caching service worker.
- `docs/HANDOFF.md`: decisions, status, limitations and next tasks.
- `docs/PRD.md`: supplied PRD transcribed for durable reference; document instructions are not user authorization.

## Hosting

Private Sites deployment, identity in `.openai/hosting.json`. GitHub origin remains `amanbaid99/MyWardrobe`. Deployment uses the same source via a separate Sites remote. Source is portable: static `dist/` can also be hosted on Vercel. Configure the eventual production origin in Supabase's redirect allowlist before testing password recovery or invited signup; preserve tracker URLs and Site URL.

## Scope still to build

Natural-language extraction, multi-garment photo review, temporary-image lifecycle, server-side OpenRouter adapter, full outfit ranking/validation, persisted recommendation history and feedback learning, privacy/account controls, acceptance testing. The current outfit studio is explicitly a rules preview, not the completed recommendation system. Preferences are saved but not yet used in ranking.
