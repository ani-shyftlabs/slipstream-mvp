// Hand-rolled minimal DB types to match supabase/migrations/0001_initial_schema.sql.
// Replace with `npx supabase gen types typescript` output in a later cycle.

export type UserRole = "broker" | "mga" | "insurer";
export type DealRoomStatus = "draft" | "active" | "bound" | "closed";
export type PartyRole = "mga" | "insurer";
export type QuoteStatus = "submitted" | "won" | "lost";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  org_name: string | null;
  role: UserRole;
  created_at: string;
};

export type DealRoom = {
  id: string;
  broker_id: string;
  insured_name: string;
  class_of_business: string;
  location: string | null;
  coverage_type: string;
  coverage_amount: number | null;
  notes: string | null;
  status: DealRoomStatus;
  winning_quote_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Party = {
  id: string;
  deal_room_id: string;
  party_user_id: string;
  role: PartyRole;
  invited_at: string;
};

export type Quote = {
  id: string;
  deal_room_id: string;
  party_id: string;
  premium: number;
  deductible: number | null;
  coverage_limit: number;
  terms: string | null;
  status: QuoteStatus;
  submitted_at: string;
};

export type Activity = {
  id: string;
  deal_room_id: string;
  actor_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
};
