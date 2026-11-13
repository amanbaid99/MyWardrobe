import type { SupabaseClient } from "@supabase/supabase-js";

let client: Promise<SupabaseClient> | null = null;

/**
 * Loads the Supabase client on first use. The library is the largest part of
 * the bundle, so keeping it out of the entry chunk lets the landing page and
 * app shell paint before it has downloaded.
 */
export const db = () =>
  (client ??= import("./client").then((m) => m.supabase as SupabaseClient));
