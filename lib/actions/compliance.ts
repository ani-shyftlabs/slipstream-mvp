"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

export type CompliancePackage = {
  exported_at: string;
  exported_by: { id: string; email: string | null; full_name: string | null };
  deal_room: Record<string, unknown>;
  parties: Record<string, unknown>[];
  quotes: Record<string, unknown>[];
  activities: Record<string, unknown>[];
};

export type ComplianceResult =
  | { data: CompliancePackage; error: null }
  | { data: null; error: string };

// Broker-only export. Returns the full deal-room manifest as a single JSON
// object. The client downloads it as a Blob; we never write to disk server-side.
export async function getCompliancePackage(dealRoomId: string): Promise<ComplianceResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  const { data: room } = await supabase
    .from("deal_rooms")
    .select("*")
    .eq("id", dealRoomId)
    .maybeSingle();
  if (!room) return { data: null, error: "Deal room not found." };
  if (room.broker_id !== user.id) {
    return { data: null, error: "Only the deal room owner can export." };
  }

  // Use admin to capture the FULL audit picture for compliance purposes,
  // bypassing RLS so the export reflects what an auditor would expect to see
  // (every quote, every activity, every party, regardless of which party
  // submitted what). Authorization is broker-ownership above.
  const admin = adminSupabase();
  const [{ data: parties }, { data: quotes }, { data: activities }, { data: profile }] = await Promise.all([
    admin
      .from("parties")
      .select("id, deal_room_id, party_user_id, role, invited_at, profiles:profiles!parties_party_user_id_fkey(id, full_name, email, org_name, role)")
      .eq("deal_room_id", dealRoomId)
      .order("invited_at", { ascending: true }),
    admin
      .from("quotes")
      .select("*")
      .eq("deal_room_id", dealRoomId)
      .order("submitted_at", { ascending: true }),
    admin
      .from("activities")
      .select("id, deal_room_id, actor_id, event_type, event_data, created_at, actor:profiles!activities_actor_id_fkey(id, full_name, email, role)")
      .eq("deal_room_id", dealRoomId)
      .order("created_at", { ascending: true }),
    admin.from("profiles").select("id, email, full_name").eq("id", user.id).maybeSingle(),
  ]);

  const profileRow = profile as { id: string; email: string | null; full_name: string | null } | null;

  return {
    data: {
      exported_at: new Date().toISOString(),
      exported_by: {
        id: user.id,
        email: profileRow?.email ?? user.email ?? null,
        full_name: profileRow?.full_name ?? null,
      },
      deal_room: room as unknown as Record<string, unknown>,
      parties: ((parties ?? []) as unknown) as Record<string, unknown>[],
      quotes: ((quotes ?? []) as unknown) as Record<string, unknown>[],
      activities: ((activities ?? []) as unknown) as Record<string, unknown>[],
    },
    error: null,
  };
}
