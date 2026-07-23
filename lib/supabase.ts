import { createClient } from "@supabase/supabase-js";

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** True when real Supabase env vars are configured. */
export const hasSupabase = () => Boolean(configuredUrl && configuredAnonKey);

// createClient() throws synchronously if the URL is empty, which would take
// down the whole app (AuthProvider sits at the root layout) whenever
// NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY aren't set. Fall back to a harmless
// placeholder so the client always constructs; callers that care whether
// Supabase is actually reachable should check hasSupabase().
const url = configuredUrl || "https://placeholder.supabase.co";
const anonKey = configuredAnonKey || "placeholder-anon-key";

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
