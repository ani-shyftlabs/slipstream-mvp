import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import type { Quote } from "@/lib/types/database";

export type QuoteRow = Quote & {
  party: {
    id: string;
    role: string;
    profile: { id: string; full_name: string | null; email: string; org_name: string | null } | null;
  } | null;
};

export async function getQuotesForDealRoom(dealRoomId: string): Promise<QuoteRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("quotes")
    .select(
      `id, deal_room_id, party_id, premium, deductible, coverage_limit, terms, status, submitted_at,
       party:parties!quotes_party_id_fkey(
         id, role,
         profile:profiles!parties_party_user_id_fkey(id, full_name, email, org_name)
       )`,
    )
    .eq("deal_room_id", dealRoomId)
    .order("submitted_at", { ascending: false });
  return ((data ?? []) as unknown) as QuoteRow[];
}

// MGA-side: did *I* already submit a quote on this room?
export async function getMyQuoteForDealRoom(dealRoomId: string): Promise<Quote | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: party } = await supabase
    .from("parties")
    .select("id")
    .eq("deal_room_id", dealRoomId)
    .eq("party_user_id", user.id)
    .maybeSingle();
  if (!party) return null;
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, deal_room_id, party_id, premium, deductible, coverage_limit, terms, status, submitted_at")
    .eq("deal_room_id", dealRoomId)
    .eq("party_id", party.id)
    .maybeSingle();
  return (quote as Quote | null) ?? null;
}

// Insurer / MGA-side: get the winning quote details once a deal room is bound.
// RLS scopes quotes to broker + submitter, so non-submitters can't read post-bind
// directly. After status='bound', surface the winner to anyone party-affiliated
// with the room via the admin client. Authorization is enforced here:
// caller must be the broker, OR a party on the deal room. Returns null otherwise.
export async function getWinningQuoteForViewer(dealRoomId: string): Promise<QuoteRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Authorize: broker of the room OR party on the room.
  const { data: room } = await supabase
    .from("deal_rooms")
    .select("id, broker_id, status, winning_quote_id")
    .eq("id", dealRoomId)
    .maybeSingle();
  if (!room) return null;
  const isBroker = room.broker_id === user.id;
  let isParty = false;
  if (!isBroker) {
    const { data: pm } = await supabase
      .from("parties")
      .select("id")
      .eq("deal_room_id", dealRoomId)
      .eq("party_user_id", user.id)
      .maybeSingle();
    isParty = !!pm;
  }
  if (!isBroker && !isParty) return null;
  if (!room.winning_quote_id) return null;

  const admin = adminSupabase();
  const { data } = await admin
    .from("quotes")
    .select(
      `id, deal_room_id, party_id, premium, deductible, coverage_limit, terms, status, submitted_at,
       party:parties!quotes_party_id_fkey(
         id, role,
         profile:profiles!parties_party_user_id_fkey(id, full_name, email, org_name)
       )`,
    )
    .eq("id", room.winning_quote_id)
    .maybeSingle();
  return ((data as unknown) as QuoteRow | null) ?? null;
}
