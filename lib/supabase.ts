import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** True when Supabase env vars are configured. */
export const hasSupabase = () => Boolean(url && anonKey);

/**
 * Shared browser Supabase client. Persists the session in localStorage and
 * auto-refreshes tokens so a signed-in user stays signed in across reloads.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
