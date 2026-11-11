# Working on Wardrobe

Read README.md and docs/HANDOFF.md before editing. Keep the handoff updated after each delivery with decisions, scope, verification, blockers and next steps. User chat instructions take precedence over the reference PRD.

Do not store credentials, session tokens, private tracker data or garment photos in the repository. Only public browser configuration belongs in VITE_ variables.

The shared Supabase tracker database is production. Automatic approval review rejected the first migration attempt. The revised SQL is pending explicit approval; do not execute it by any route before approval. Never modify tracker finance tables, existing Auth triggers or signup settings as part of Wardrobe. Membership is explicitly administered; do not bulk-enroll Auth users.

Run npm run build and npm test after meaningful behavior changes. SQL is covered by an isolated PostgreSQL/PGlite test, not a production test. Distinguish sample-mode UI verification from authenticated end-to-end verification. Never claim AI/photo capture, personalised ranking, or cloud persistence works until actually implemented and verified.

Keep the Sites project ID in .openai/hosting.json; do not create another Site. Preserve GitHub origin. Site publication stays private. Credentials for source pushes must remain in memory/stdin, never disk or shell arguments.
