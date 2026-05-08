"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/utils/activity";

const inviteSchema = z.object({
  deal_room_id: z.string().uuid(),
  party_user_id: z.string().uuid(),
  role: z.enum(["mga", "insurer"]),
});

export type InviteResult =
  | { data: { id: string }; error: null }
  | { data: null; error: string };

export async function inviteParty(formData: FormData): Promise<InviteResult> {
  const parsed = inviteSchema.safeParse({
    deal_room_id: formData.get("deal_room_id"),
    party_user_id: formData.get("party_user_id"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { data: null, error: "Invalid invite payload." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  // Verify acting user is the broker of this deal room.
  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id, broker_id, status, insured_name")
    .eq("id", parsed.data.deal_room_id)
    .maybeSingle();
  if (!room) return { data: null, error: "Deal room not found." };
  if (room.broker_id !== user.id) {
    return { data: null, error: "Only the deal room owner can invite parties." };
  }

  // Verify the invited user has a profile + a compatible role.
  // Use admin client because profiles RLS scopes the broker to "self + shared
  // members" — the invitee is not yet a shared member, so a standard read returns null.
  // Authorisation already enforced above (caller owns the room).
  const { data: invitedRaw } = await adminSupabase()
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", parsed.data.party_user_id)
    .maybeSingle();
  const invited = invitedRaw as
    | { id: string; role: string; full_name: string | null; email: string }
    | null;
  if (!invited) return { data: null, error: "That user does not exist." };
  if (invited.role !== parsed.data.role) {
    return {
      data: null,
      error: `User's profile role (${invited.role}) does not match the invited role (${parsed.data.role}).`,
    };
  }

  const { data: party, error: insertErr } = await supabase
    .from("parties")
    .insert({
      deal_room_id: parsed.data.deal_room_id,
      party_user_id: parsed.data.party_user_id,
      role: parsed.data.role,
    })
    .select("id")
    .single();

  if (insertErr || !party) {
    return { data: null, error: insertErr?.message ?? "Could not create party." };
  }

  await logActivity(supabase, {
    deal_room_id: parsed.data.deal_room_id,
    actor_id: user.id,
    event_type: "invited",
    event_data: {
      party_user_id: parsed.data.party_user_id,
      role: parsed.data.role,
      invited_full_name: invited.full_name ?? invited.email,
    },
  });

  if (room.status === "draft") {
    await supabase
      .from("deal_rooms")
      .update({ status: "active" })
      .eq("id", parsed.data.deal_room_id);
  }

  revalidatePath(`/broker/quotes/${parsed.data.deal_room_id}`);
  revalidatePath("/broker/dashboard");
  revalidatePath("/mga/dashboard");
  revalidatePath("/insurer/dashboard");
  return { data: { id: party.id }, error: null };
}
