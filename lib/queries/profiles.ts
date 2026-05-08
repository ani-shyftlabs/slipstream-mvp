import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export type InvitableProfile = Pick<Profile, "id" | "email" | "full_name" | "org_name" | "role">;

export async function getInvitablePartyProfiles(
  dealRoomId: string,
): Promise<InvitableProfile[]> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("parties")
    .select("party_user_id")
    .eq("deal_room_id", dealRoomId);
  const exclude = new Set((existing ?? []).map((p) => p.party_user_id as string));

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, org_name, role")
    .in("role", ["mga", "insurer"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  if (exclude.size > 0) {
    query = query.not("id", "in", `(${Array.from(exclude).join(",")})`);
  }

  const { data } = await query;
  return ((data ?? []) as unknown) as InvitableProfile[];
}
