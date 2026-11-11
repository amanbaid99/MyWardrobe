import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ||
    "https://sbkpirchaaljlwzgntrf.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_BYIJ0_ccuxodPkW1VSD8Ug_7_hT9Gl7",
  {
    auth: {
      storageKey: "wardrobe-auth-v1",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
