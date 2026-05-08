import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";

export type InvitableProfile = Pick<Profile, "id" | "email" | "full_name" | "org_name" | "role">;

// Returns MGA / insurer profiles a broker can invite onto the given deal room,
// excluding any already attached as parties.
//
// Security: profiles RLS scopes visibility to "self + shared deal-room members,"
// which is correct for app-runtime data but blocks discovery before the first
// invite. We verify the caller owns the room, then bypass RLS via the service-
// role client to read MGA/insurer profiles. Non-broker callers get [].
export async function getInvitablePartyProfiles(
  dealRoomId: string,
): Promise<InvitableProfile[]> {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return [];

  // Authorisation: caller must own the deal room.
  const { data: room } = await userClient
    .from("deal_rooms")
    .select("id, broker_id")
    .eq("id", dealRoomId)
    .maybeSingle();
  if (!room || room.broker_id !== user.id) return [];

  const admin = adminSupabase();
  const { data: existing } = await admin
    .from("parties")
    .select("party_user_id")
    .eq("deal_room_id", dealRoomId);
  const exclude = new Set(
    ((existing ?? []) as { party_user_id: string }[]).map((p) => p.party_user_id),
  );

  let query = admin
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
