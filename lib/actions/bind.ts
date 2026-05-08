"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity";

const bindSchema = z.object({
  deal_room_id: z.string().uuid(),
  quote_id: z.string().uuid(),
});

const closeSchema = z.object({
  deal_room_id: z.string().uuid(),
});

export type BindResult = { error: string | null };

export async function bindQuote(formData: FormData): Promise<BindResult> {
  const parsed = bindSchema.safeParse({
    deal_room_id: formData.get("deal_room_id"),
    quote_id: formData.get("quote_id"),
  });
  if (!parsed.success) return { error: "Invalid bind payload." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id, broker_id, status")
    .eq("id", parsed.data.deal_room_id)
    .maybeSingle();
  if (!room) return { error: "Deal room not found." };
  if (room.broker_id !== user.id) return { error: "Only the deal room owner can bind." };
  if (room.status !== "active") {
    return { error: `Cannot bind from status '${room.status}'. Room must be 'active'.` };
  }

  const { data: winningQuote } = await supabase
    .from("quotes")
    .select("id, deal_room_id, party_id, premium")
    .eq("id", parsed.data.quote_id)
    .eq("deal_room_id", parsed.data.deal_room_id)
    .maybeSingle();
  if (!winningQuote) return { error: "Quote not found in this deal room." };

  // Mark winner.
  const { error: winErr } = await supabase
    .from("quotes")
    .update({ status: "won" })
    .eq("id", parsed.data.quote_id);
  if (winErr) return { error: winErr.message };

  // Mark all other quotes on this room as lost.
  const { error: loseErr } = await supabase
    .from("quotes")
    .update({ status: "lost" })
    .eq("deal_room_id", parsed.data.deal_room_id)
    .neq("id", parsed.data.quote_id);
  if (loseErr) return { error: loseErr.message };

  // Transition the room.
  const { error: roomErr } = await supabase
    .from("deal_rooms")
    .update({ status: "bound", winning_quote_id: parsed.data.quote_id })
    .eq("id", parsed.data.deal_room_id);
  if (roomErr) return { error: roomErr.message };

  await logActivity(supabase, {
    deal_room_id: parsed.data.deal_room_id,
    actor_id: user.id,
    event_type: "bound",
    event_data: {
      quote_id: parsed.data.quote_id,
      premium: winningQuote.premium,
    },
  });

  revalidatePath(`/broker/quotes/${parsed.data.deal_room_id}`);
  revalidatePath(`/mga/quotes/${parsed.data.deal_room_id}`);
  revalidatePath(`/insurer/quotes/${parsed.data.deal_room_id}`);
  revalidatePath("/broker/dashboard");
  revalidatePath("/broker/quotes");
  revalidatePath("/mga/dashboard");
  revalidatePath("/insurer/dashboard");
  return { error: null };
}

export async function closeDealRoom(formData: FormData): Promise<BindResult> {
  const parsed = closeSchema.safeParse({ deal_room_id: formData.get("deal_room_id") });
  if (!parsed.success) return { error: "Invalid payload." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id, broker_id, status")
    .eq("id", parsed.data.deal_room_id)
    .maybeSingle();
  if (!room) return { error: "Deal room not found." };
  if (room.broker_id !== user.id) return { error: "Only the deal room owner can close." };
  if (room.status !== "bound") {
    return { error: `Can only close a bound room. Current status: '${room.status}'.` };
  }

  const { error: updErr } = await supabase
    .from("deal_rooms")
    .update({ status: "closed" })
    .eq("id", parsed.data.deal_room_id);
  if (updErr) return { error: updErr.message };

  await logActivity(supabase, {
    deal_room_id: parsed.data.deal_room_id,
    actor_id: user.id,
    event_type: "closed",
    event_data: {},
  });

  revalidatePath(`/broker/quotes/${parsed.data.deal_room_id}`);
  revalidatePath(`/mga/quotes/${parsed.data.deal_room_id}`);
  revalidatePath(`/insurer/quotes/${parsed.data.deal_room_id}`);
  revalidatePath("/broker/dashboard");
  revalidatePath("/broker/quotes");
  return { error: null };
}
