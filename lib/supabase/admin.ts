// SERVER-ONLY admin client. Bypasses RLS via the service role key.
// Use sparingly and only when the standard RLS policy is too tight for
// a legitimate cross-tenant query (e.g. broker-side party discovery for invites).
// Every callsite MUST verify the requesting user is authorized BEFORE invoking
// queries on this client. Never import this from a client component.

import "server-only";
import { createClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createClient> | null = null;

export function adminSupabase() {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return cached;
}
