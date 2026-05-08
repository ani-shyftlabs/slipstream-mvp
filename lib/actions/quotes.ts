"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/utils/activity";

const quoteSchema = z.object({
  deal_room_id: z.string().uuid(),
  premium: z.preprocess((v) => Number(v), z.number().positive()),
  deductible: z.preprocess((v) => (v === "" || v === null ? 0 : Number(v)), z.number().nonnegative().default(0)),
  coverage_limit: z.preprocess((v) => Number(v), z.number().positive()),
  terms: z.string().min(1, "Required").max(2000),
});

export type SubmitQuoteResult =
  | { data: { id: string }; error: null }
  | { data: null; error: string };

export async function submitQuote(formData: FormData): Promise<SubmitQuoteResult> {
  const parsed = quoteSchema.safeParse({
    deal_room_id: formData.get("deal_room_id"),
    premium: formData.get("premium"),
    deductible: formData.get("deductible"),
    coverage_limit: formData.get("coverage_limit"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const first =
      flat.premium?.[0] ||
      flat.deductible?.[0] ||
      flat.coverage_limit?.[0] ||
      flat.terms?.[0] ||
      "Please correct the highlighted fields.";
    return { data: null, error: first };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated." };

  // Caller must be an MGA party on this deal room. RLS would also enforce this on
  // the quotes insert, but verifying here returns a useful error string.
  const { data: party } = await supabase
    .from("parties")
    .select("id, role, party_user_id")
    .eq("deal_room_id", parsed.data.deal_room_id)
    .eq("party_user_id", user.id)
    .maybeSingle();
  if (!party) {
    return { data: null, error: "You aren't a party on this deal room." };
  }
  if (party.role !== "mga") {
    return { data: null, error: "Only MGA parties can submit quotes in this MVP." };
  }

  // One quote per party per room — if a quote already exists, refuse.
  const { data: existing } = await supabase
    .from("quotes")
    .select("id")
    .eq("deal_room_id", parsed.data.deal_room_id)
    .eq("party_id", party.id);
  if (existing && existing.length > 0) {
    return { data: null, error: "You've already submitted a quote on this deal room." };
  }

  const { data: quote, error: insertErr } = await supabase
    .from("quotes")
    .insert({
      deal_room_id: parsed.data.deal_room_id,
      party_id: party.id,
      premium: parsed.data.premium,
      deductible: parsed.data.deductible,
      coverage_limit: parsed.data.coverage_limit,
      terms: parsed.data.terms,
      status: "submitted",
    })
    .select("id")
    .single();
  if (insertErr || !quote) {
    return { data: null, error: insertErr?.message ?? "Could not submit quote." };
  }

  await logActivity(supabase, {
    deal_room_id: parsed.data.deal_room_id,
    actor_id: user.id,
    event_type: "quote_submitted",
    event_data: {
      quote_id: quote.id,
      premium: parsed.data.premium,
      coverage_limit: parsed.data.coverage_limit,
    },
  });

  revalidatePath(`/broker/quotes/${parsed.data.deal_room_id}`);
  revalidatePath(`/mga/quotes/${parsed.data.deal_room_id}`);
  revalidatePath("/mga/dashboard");
  revalidatePath("/mga/quotes");
  return { data: { id: quote.id }, error: null };
}
