import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/database";

const VALID_ROLES: UserRole[] = ["broker", "mga", "insurer"];

export async function getCurrentProfile(): Promise<{
  user: { id: string; email: string | undefined };
  profile: Profile | null;
  role: UserRole;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, org_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const metaRole = user.user_metadata?.role as string | undefined;
  const role: UserRole =
    profile?.role ??
    (VALID_ROLES.includes(metaRole as UserRole) ? (metaRole as UserRole) : "broker");

  return {
    user: { id: user.id, email: user.email },
    profile: (profile as Profile | null) ?? null,
    role,
  };
}
