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

const inviteByEmailSchema = z.object({
  deal_room_id: z.string().uuid(),
  email: z.string().email().max(200),
  role: z.enum(["mga", "insurer"]),
  full_name: z.string().max(120).optional().or(z.literal("")),
});

export type InviteResult =
  | { data: { id: string }; error: null }
  | { data: null; error: string };

export type InviteByEmailResult =
  | { data: { party_id: string; was_new_user: boolean }; error: null }
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

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id, broker_id, status, insured_name")
    .eq("id", parsed.data.deal_room_id)
    .maybeSingle();
  if (!room) return { data: null, error: "Deal room not found." };
  if (room.broker_id !== user.id) {
    return { data: null, error: "Only the deal room owner can invite parties." };
  }

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

// ===== Invite by email — creates the user if they don't exist =====
function randomPassword(): string {
  const bytes = new Uint8Array(16);
  // global crypto in Node 18+
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16) + "Aa1!";
}

export async function invitePartyByEmail(formData: FormData): Promise<InviteByEmailResult> {
  const parsed = inviteByEmailSchema.safeParse({
    deal_room_id: formData.get("deal_room_id"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role"),
    full_name: String(formData.get("full_name") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { data: null, error: "Email and role are required." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  // Authorisation: caller must own the deal room.
  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id, broker_id, status")
    .eq("id", parsed.data.deal_room_id)
    .maybeSingle();
  if (!room) return { data: null, error: "Deal room not found." };
  if (room.broker_id !== user.id) {
    return { data: null, error: "Only the deal room owner can invite parties." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = adminSupabase() as any;
  let was_new_user = false;
  let partyUserId: string | null = null;

  // Step 1 — look up by email.
  const { data: existingRaw } = await admin
    .from("profiles")
    .select("id, role, email")
    .eq("email", parsed.data.email)
    .maybeSingle();
  const existing = existingRaw as { id: string; role: string; email: string } | null;

  if (existing) {
    if (existing.role !== parsed.data.role) {
      return {
        data: null,
        error: `That email exists with role '${existing.role}', not '${parsed.data.role}'.`,
      };
    }
    partyUserId = existing.id;
  } else {
    // Step 2B — create the user via admin API.
    const fullName = parsed.data.full_name && parsed.data.full_name.length > 0
      ? parsed.data.full_name
      : parsed.data.email.split("@")[0];

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: { role: parsed.data.role, full_name: fullName },
    });
    if (createErr || !created.user) {
      return { data: null, error: createErr?.message ?? "Could not create user." };
    }
    was_new_user = true;
    partyUserId = created.user.id;

    // Trigger should have fired. Verify; upsert if not.
    const { data: profCheck } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", partyUserId)
      .maybeSingle();
    if (!profCheck) {
      const { error: upErr } = await admin.from("profiles").upsert({
        id: partyUserId,
        email: parsed.data.email,
        role: parsed.data.role,
        full_name: fullName,
      });
      if (upErr) {
        return { data: null, error: `Trigger missed; profile upsert failed: ${upErr.message}` };
      }
    }
  }

  // Step 3 — insert party row (handle duplicate gracefully).
  const { data: partyRaw, error: partyErr } = await admin
    .from("parties")
    .insert({
      deal_room_id: parsed.data.deal_room_id,
      party_user_id: partyUserId!,
      role: parsed.data.role,
    })
    .select("id")
    .single();
  if (partyErr) {
    if (/duplicate|unique/i.test(partyErr.message)) {
      return { data: null, error: "Already invited to this deal room." };
    }
    return { data: null, error: partyErr.message };
  }
  const party = partyRaw as { id: string };

  // Step 4 — activity log via admin (broker is the actor).
  await admin.from("activities").insert({
    deal_room_id: parsed.data.deal_room_id,
    actor_id: user.id,
    event_type: "invited_by_email",
    event_data: {
      email: parsed.data.email,
      role: parsed.data.role,
      full_name: parsed.data.full_name ?? null,
      was_new_user,
    },
  });

  if (room.status === "draft") {
    await admin
      .from("deal_rooms")
      .update({ status: "active" })
      .eq("id", parsed.data.deal_room_id);
  }

  revalidatePath(`/broker/quotes/${parsed.data.deal_room_id}`);
  revalidatePath("/broker/dashboard");
  revalidatePath("/broker/quotes");
  return { data: { party_id: party.id, was_new_user }, error: null };
}
