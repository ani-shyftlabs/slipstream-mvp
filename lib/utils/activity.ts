import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityEvent =
  | "created"
  | "invited"
  | "quote_submitted"
  | "bound"
  | "closed"
  | "doc_updated";

export async function logActivity(
  supabase: SupabaseClient,
  args: {
    deal_room_id: string;
    actor_id: string;
    event_type: ActivityEvent;
    event_data?: Record<string, unknown>;
  },
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("activities").insert({
    deal_room_id: args.deal_room_id,
    actor_id: args.actor_id,
    event_type: args.event_type,
    event_data: args.event_data ?? {},
  });
  return { error: error?.message ?? null };
}
