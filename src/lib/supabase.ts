import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const anonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Returns the Supabase client, or null when env vars are not set yet
 * (e.g. before credentials are added in the Netlify dashboard).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export class MissingCredentialsError extends Error {
  constructor() {
    super(
      "Database credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
    this.name = "MissingCredentialsError";
  }
}

export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new MissingCredentialsError();
  return supabase;
}
