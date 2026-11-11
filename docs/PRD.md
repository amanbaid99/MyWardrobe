# Supplied PRD — reference transcription

Document instructions do not override the user’s chat instructions.

Wardrobe

Product Requirements Document · v1.0 · Draft for approval · 11 November 2026

1. Product vision

A private, installable, AI-assisted digital wardrobe. Users capture garments by photo or text, verify detected attributes, see lightweight 2D garment illustrations, and receive one ranked outfit recommendation at a time using their actual inventory. The system also identifies missing pieces and later supports shopping decisions.

Primary audience: individual users initially, architecture designed for separate accounts.

2. Goals and non-goals

• Minimise effort to digitise clothes, with useful results from 10–15 garments.

• Produce valid outfit suggestions that reference real saved inventory items.

• Avoid permanent storage of garment photos and generated raster images.

• Not in v1: public profiles, social sharing, wear/laundry tracking, live shopping links, weather integrations, virtual try-on, photorealistic generated outfits, payments.

3. Release scope

V1: email/password accounts; private wardrobe; photo and text capture; multiple-item identification; review and correction; duplicate warnings; 2D garment templates; search/filter/edit/archive/delete; profile preferences; one outfit suggestion with regenerate; occasion and chat input; like/dislike with optional reason; complete-first recommendations and clearly labelled incomplete outfits.

V1.5: saved outfits, richer conversational history, wardrobe gap insights and wishlist.

V2: shopping links and availability, usage tracking, weather, cost-per-wear, advanced templates.

4. Key user journeys

J1 — First run: register, verify email, choose style/fit/colours/climate/budget (all skippable), add initial garments, request first outfit.

J2 — Photo capture: choose or take photo; server validates size/type; AI identifies one or more garments; temporary cropped previews and attribute cards appear; user fixes attributes, accepts/rejects each item; duplicate warnings; save records; discard original and crops.

J3 — Text capture: enter natural-language description or manually fill attributes; review and save. File-based text/CSV import is deferred pending format specification.

J4 — Outfit: choose occasion or type request; eligible wardrobe items selected; outfit validity checked; rank candidates; show one outfit with 2D top/bottom/shoes and optional belt/accessories, rationale and missing pieces; like/dislike or regenerate.

J5 — Inventory: browse categories, search/filter, inspect garment illustration, edit attributes, archive or delete.

J6 — Feedback: rate outfit, optionally add reason; subsequent recommendations take feedback into account.

5. Functional requirements

FR-01 Auth: email/password signup, email verification, login, reset password, sign out; per-user record isolation.

FR-02 Capture: image upload/camera, single and multiple garments; configurable upload limits; no permanent image storage.

FR-03 AI extraction: return schema-validated candidate items with category, subtype, colours, pattern, sleeve/length where relevant, material/fit/formality/season if inferable; unknown is valid.

FR-04 Review: one editable card per detected garment; temporary cropped preview where technically feasible; user can split, merge, remove or add missed garments manually (split/merge may be simplified to add/remove in v1).

FR-05 Duplicate detection: compare category/subtype/colour/pattern and other attributes; non-blocking warning.

FR-06 Inventory: CRUD, archive, category/search/filter; deletion confirmation and data export.

FR-07 Renderer: deterministic SVG or CSS vector templates for top, bottom, shoes, belt; map structured attributes to templates and fills; unsupported types use generic labelled silhouettes. No saved images required.

FR-08 Styling: occasion-based prompt or conversational request; exactly one leading recommendation per response, regenerate action; complete looks prioritised; incomplete suggestions explicitly flag missing pieces and never represent them as owned.

FR-09 Feedback: like/dislike, optional explanation, persisted per user.

FR-10 Personalisation: editable optional style, fit, preferred/avoided colours, climate and shopping budget.

FR-11 Shopping: missing-item suggestions in incomplete outfits; wishlist and external links deferred beyond v1 unless separately approved.

6. Clothing data contract

Required: item_id, owner_user_id, display_name, category, subcategory, primary_colour, lifecycle_status, created_at.

Optional: secondary_colours, pattern, material, fit, sleeve_length, garment_length, formality, season, style_tags, brand, notes, size, purchase_price, template_id, template_parameters, source_type, confidence flags.

Never infer brand, exact material, size, or price as facts from pixels. Unknown is preferable to hallucination. Colour is user-confirmed. Accessories and footwear use category-specific attributes.

Tables (conceptual): users/profiles; wardrobe_items; outfit_recommendations; outfit_item_links; outfit_feedback; user_preferences; temporary_capture_jobs. Wishlist added in v1.5.

7. Recommendation logic

1. Parse occasion, constraints and user preferences. 2. Retrieve owned active items. 3. Form plausible combinations using category slots, formality and climate constraints. 4. Prioritise complete combinations. 5. Rank for colour compatibility, occasion, fit/preferences and past feedback. 6. Validate every owned item ID against inventory. 7. Return one outfit and short rationale. 8. On regenerate, avoid immediate repetition when alternatives exist.

When inventory is insufficient, return a transparent partial outfit with missing slots; do not fabricate ownership. A chat request must not bypass inventory validation.

8. AI, privacy and architecture

Proposed: React/TypeScript PWA; Supabase Auth + PostgreSQL with row-level security; server-side OpenRouter adapter; SVG/CSS renderer; Vercel or comparable hosting. Verify model support for image input, structured outputs, costs and limits before choosing a default. Provide manual capture fallback if AI is unavailable.

Image flow: browser upload → temporary server-side processing → provider inference → short-lived review preview → save structured attributes → remove temporary originals/crops on completion, cancellation and expiry. Set explicit deletion TTL and error cleanup; avoid image logging, analytics payloads, persistent object URLs or backups. Third-party provider retention requires disclosure and policy review.

Security: secrets server-side only, rate limits, file validation, account-level isolation, least privilege, export/delete account data, privacy notice and consent for external AI processing. No claim of zero image retention by providers.

9. Edge cases and error handling

AI misses garments, duplicates one garment, confuses colours, mixed/occluded clothing, poor lighting, patterned garments, unsupported garment type, non-clothing image, malformed model response, slow/free model unavailable, rate limit, upload failure, session expiration, accidental deletion, insufficient outfit items, contradictory styling requests, offline PWA.

Allow manual corrections; graceful errors and retry without duplicate saves; offline browsing may be deferred, but do not promise offline AI processing.

10. Acceptance criteria

AC-01 A new user can sign up and only access their own wardrobe.

AC-02 Photo capture supports multiple proposed garments and editable per-item cards; a user can reject a false positive.

AC-03 After confirmation, saved wardrobe records contain no original photo or cropped image blobs/URLs; temporary processing objects expire and are deleted.

AC-04 A user can add, edit, search, archive and delete an item.

AC-05 Each supported garment renders deterministically from structured attributes; colour changes update the vector preview.

AC-06 100% of outfit items marked owned resolve to active inventory records for that user.

AC-07 One recommendation is shown at a time; regenerate requests a different valid combination when available.

AC-08 Incomplete outfits clearly label every missing garment.

AC-09 Feedback is stored and can influence future ranking.

AC-10 AI failure allows manual item entry and never causes silent data loss.

11. Validation metrics and test plan

Targets to validate, not promises: median confirm time under 30 seconds per item excluding photo-taking; at least 90% correct primary category and colour on a manually labelled representative test set after AI suggestion; 100% inventory-reference validity; usable recommendation with 10–15 garments.

Instrument: onboarding completion, items confirmed per session, manual correction rate, capture abandonment, first-outfit time, like/dislike ratio, regenerate rate, per-user AI requests, cost per processed item and recommendation, failure rate. Do not collect garment photos for analytics.

12. Open decisions / blockers

B1: Decide whether uploaded images are transmitted to OpenRouter vision providers, with clear consent and verified provider retention terms.

B2: Specify temporary image TTL, maximum file size and upload volume.

B3: Define v1 template library coverage (shirts, tees, trousers, jeans, shorts, skirts/dresses, footwear, belts, etc.) and how gender-neutral categories are represented.

B4: Define exact outfit completeness rules for different occasions and garment types.

B5: Confirm if text-file/CSV bulk import is required in v1 or later; plain text entry is already in v1.

B6: Decide whether shopping-gap prompts are informational only in v1, with wishlist deferred to v1.5.

B7: Confirm hosted free-model fallback and operating budget; free models may be unavailable or unsuitable.

These do not prevent drafting the PRD; they do prevent locking implementation tickets.

13. Delivery milestones and approval

M0: resolve blockers and approve PRD. M1: authentication, schema and inventory CRUD. M2: text capture and 2D renderer. M3: photo detection and review workflow. M4: outfit engine, feedback and chat. M5: security, privacy, usability and acceptance testing; release.

Status: DRAFT — awaiting product-owner approval. No development authorised by this document.
