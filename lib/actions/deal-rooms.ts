"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity";
import {
  CLASS_OF_BUSINESS,
  COVERAGE_TYPES,
} from "@/lib/constants/coverage-types";

const dealRoomSchema = z.object({
  insured_name: z.string().min(1, "Required").max(200),
  class_of_business: z.enum(CLASS_OF_BUSINESS as unknown as [string, ...string[]]),
  location: z.string().min(1, "Required").max(100),
  coverage_type: z.enum(COVERAGE_TYPES as unknown as [string, ...string[]]),
  coverage_amount: z
    .preprocess((v) => (typeof v === "string" ? Number(v) : v), z.number().positive())
    .optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type CreateDealRoomResult =
  | { data: { id: string }; error: null }
  | { data: null; error: string; fieldErrors?: Record<string, string[]> };

export async function createDealRoom(formData: FormData): Promise<CreateDealRoomResult> {
  const raw = {
    insured_name: String(formData.get("insured_name") ?? "").trim(),
    class_of_business: String(formData.get("class_of_business") ?? ""),
    location: String(formData.get("location") ?? "").trim(),
    coverage_type: String(formData.get("coverage_type") ?? ""),
    coverage_amount: formData.get("coverage_amount"),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };

  const parsed = dealRoomSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      data: null,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  // Server-side role check (defense-in-depth; RLS already enforces).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "broker") {
    return { data: null, error: "Only brokers can create deal rooms." };
  }

  const { data: room, error: insertErr } = await supabase
    .from("deal_rooms")
    .insert({
      broker_id: user.id,
      insured_name: parsed.data.insured_name,
      class_of_business: parsed.data.class_of_business,
      location: parsed.data.location,
      coverage_type: parsed.data.coverage_type,
      coverage_amount: parsed.data.coverage_amount ?? null,
      notes: parsed.data.notes ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertErr || !room) {
    return { data: null, error: insertErr?.message ?? "Could not create deal room." };
  }

  await logActivity(supabase, {
    deal_room_id: room.id,
    actor_id: user.id,
    event_type: "created",
    event_data: {
      insured_name: parsed.data.insured_name,
      class_of_business: parsed.data.class_of_business,
    },
  });

  revalidatePath("/broker/dashboard");
  revalidatePath(`/broker/quotes/${room.id}`);
  return { data: { id: room.id }, error: null };
}

export async function createDealRoomAndRedirect(formData: FormData): Promise<void> {
  const result = await createDealRoom(formData);
  if (result.error) {
    redirect(`/broker/quotes/new?error=${encodeURIComponent(result.error)}`);
  }
  redirect(`/broker/quotes/${result.data!.id}`);
}
