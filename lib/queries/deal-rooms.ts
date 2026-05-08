import { createClient } from "@/lib/supabase/server";
import type {
  DealRoom,
  DealRoomStatus,
  Party,
  Profile,
  Quote,
  Activity,
} from "@/lib/types/database";

export type DealRoomListItem = Pick<
  DealRoom,
  "id" | "insured_name" | "class_of_business" | "location" | "status" | "created_at"
>;

export async function getMyDealRooms(): Promise<DealRoomListItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_rooms")
    .select("id, insured_name, class_of_business, location, status, created_at")
    .order("created_at", { ascending: false });
  return (data as DealRoomListItem[] | null) ?? [];
}

// MGA / insurer view — RLS scopes this to rooms where they are a party.
export async function getInvitedDealRooms(): Promise<DealRoomListItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_rooms")
    .select("id, insured_name, class_of_business, location, status, created_at")
    .order("created_at", { ascending: false });
  return (data as DealRoomListItem[] | null) ?? [];
}

// Insurer view: rooms they're a party in that have been bound or closed.
// RLS already scopes to rooms-they're-a-party-in via the standard policy.
export async function getBoundDealRooms(): Promise<DealRoomListItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("deal_rooms")
    .select("id, insured_name, class_of_business, location, status, created_at")
    .in("status", ["bound", "closed"])
    .order("created_at", { ascending: false });
  return (data as DealRoomListItem[] | null) ?? [];
}

export type DealRoomDetail = {
  room: DealRoom;
  parties: (Party & { profile: Pick<Profile, "id" | "email" | "full_name" | "org_name" | "role"> | null })[];
  quotes: Quote[];
  activities: (Activity & { actor: Pick<Profile, "id" | "full_name" | "email" | "role"> | null })[];
};

export async function getDealRoomDetail(id: string): Promise<DealRoomDetail | null> {
  const supabase = createClient();

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!room) return null;

  const [{ data: parties }, { data: quotes }, { data: activities }] = await Promise.all([
    supabase
      .from("parties")
      .select(
        "id, deal_room_id, party_user_id, role, invited_at, profile:profiles!parties_party_user_id_fkey(id, email, full_name, org_name, role)",
      )
      .eq("deal_room_id", id)
      .order("invited_at", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, deal_room_id, party_id, premium, deductible, coverage_limit, terms, status, submitted_at")
      .eq("deal_room_id", id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("activities")
      .select(
        "id, deal_room_id, actor_id, event_type, event_data, created_at, actor:profiles!activities_actor_id_fkey(id, full_name, email, role)",
      )
      .eq("deal_room_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    room: room as DealRoom,
    parties: ((parties ?? []) as unknown) as DealRoomDetail["parties"],
    quotes: ((quotes ?? []) as unknown) as Quote[],
    activities: ((activities ?? []) as unknown) as DealRoomDetail["activities"],
  };
}

export const DEAL_ROOM_STATUS_VALUES: DealRoomStatus[] = ["draft", "active", "bound", "closed"];
