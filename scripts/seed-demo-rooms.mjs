// Cycle 5 — wipe + reseed demo data.
// Idempotent: deletes ALL deal_rooms (CASCADE wipes parties/quotes/activities)
// then inserts exactly 3 rooms with realistic backdated timestamps.
// Profiles are preserved.
//
// Service-role only. Run from project root: `node scripts/seed-demo-rooms.mjs`.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Helper: now minus N days/hours
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const ago = (ms) => new Date(NOW - ms).toISOString();

// Resolve user IDs
const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const byEmail = Object.fromEntries(usersResp.users.map((u) => [u.email, u.id]));
const BROKER = byEmail["broker@demo.com"];
const MGA = byEmail["mga@demo.com"];
const INSURER = byEmail["insurer@demo.com"];
if (!BROKER || !MGA || !INSURER) {
  console.error("missing one of broker/mga/insurer demo users; seed-demo-accounts.mjs first");
  process.exit(1);
}

// 1. Wipe everything (CASCADE clears parties, quotes, activities)
console.log("[wipe] deleting all deal_rooms (CASCADE)…");
const { count: roomsBefore } = await admin
  .from("deal_rooms")
  .select("*", { count: "exact", head: true });
console.log(`  before: ${roomsBefore} deal_rooms`);
const { error: wipeErr } = await admin
  .from("deal_rooms")
  .delete()
  .gte("created_at", "1900-01-01");
if (wipeErr) {
  console.error(`  wipe failed: ${wipeErr.message}`);
  process.exit(1);
}
const { count: roomsAfter } = await admin
  .from("deal_rooms")
  .select("*", { count: "exact", head: true });
console.log(`  after wipe: ${roomsAfter} deal_rooms`);

// =================================================================
// ROOM 1 — Westbrook Industrial Holdings (draft, no parties, no quotes)
// =================================================================
console.log("\n[room 1] Westbrook Industrial Holdings Ltd (draft)");
{
  const createdAt = ago(6 * DAY);
  const { data: room, error } = await admin
    .from("deal_rooms")
    .insert({
      broker_id: BROKER,
      insured_name: "Westbrook Industrial Holdings Ltd",
      class_of_business: "Property",
      location: "Ontario",
      coverage_type: "Property",
      coverage_amount: 25000000,
      notes:
        "Manufacturing facility, $25M TIV, looking for property + business interruption coverage. New build 2023.",
      status: "draft",
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`  insert failed: ${error.message}`);
    process.exit(1);
  }
  await admin.from("activities").insert({
    deal_room_id: room.id,
    actor_id: BROKER,
    event_type: "created",
    event_data: {
      insured_name: "Westbrook Industrial Holdings Ltd",
      class_of_business: "Property",
    },
    created_at: createdAt,
  });
  console.log(`  ✓ ${room.id} draft, no parties, 1 activity`);
}

// =================================================================
// ROOM 2 — Cresthill Industries Ltd (active, MGA invited, MGA quoted)
// =================================================================
console.log("\n[room 2] Cresthill Industries Ltd (active)");
let cresthillId = null;
{
  const createdAt = ago(3 * DAY);
  const invitedAt = ago(3 * DAY - 2 * HOUR);
  const quoteAt = ago(2 * DAY);
  const { data: room, error } = await admin
    .from("deal_rooms")
    .insert({
      broker_id: BROKER,
      insured_name: "Cresthill Industries Ltd",
      class_of_business: "Cyber",
      location: "Quebec",
      coverage_type: "Cyber",
      coverage_amount: 10000000,
      notes:
        "Mid-market manufacturer, prior cyber incident in 2024 (resolved). Seeking $10M aggregate with ransomware sub-limit.",
      status: "active",
      created_at: createdAt,
      updated_at: quoteAt,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`  insert failed: ${error.message}`);
    process.exit(1);
  }
  cresthillId = room.id;

  const { data: party, error: partyErr } = await admin
    .from("parties")
    .insert({
      deal_room_id: room.id,
      party_user_id: MGA,
      role: "mga",
      invited_at: invitedAt,
    })
    .select("id")
    .single();
  if (partyErr) {
    console.error(`  party failed: ${partyErr.message}`);
    process.exit(1);
  }

  const { error: quoteErr } = await admin.from("quotes").insert({
    deal_room_id: room.id,
    party_id: party.id,
    premium: 145000,
    deductible: 25000,
    coverage_limit: 10000000,
    terms:
      "12-month standalone Cyber, $5M ransomware sub-limit, includes BI 24-hr waiting period",
    status: "submitted",
    submitted_at: quoteAt,
  });
  if (quoteErr) {
    console.error(`  quote failed: ${quoteErr.message}`);
    process.exit(1);
  }

  await admin.from("activities").insert([
    {
      deal_room_id: room.id,
      actor_id: BROKER,
      event_type: "created",
      event_data: { insured_name: "Cresthill Industries Ltd", class_of_business: "Cyber" },
      created_at: createdAt,
    },
    {
      deal_room_id: room.id,
      actor_id: BROKER,
      event_type: "invited",
      event_data: { party_user_id: MGA, role: "mga", invited_full_name: "Demo MGA" },
      created_at: invitedAt,
    },
    {
      deal_room_id: room.id,
      actor_id: MGA,
      event_type: "quote_submitted",
      event_data: { premium: 145000, coverage_limit: 10000000 },
      created_at: quoteAt,
    },
  ]);
  console.log(`  ✓ ${room.id} active, 1 party, 1 quote, 3 activities`);
}

// =================================================================
// ROOM 3 — Northgate Group (closed — full chronology)
// =================================================================
console.log("\n[room 3] Northgate Group Inc (closed)");
{
  const t0 = ago(7 * DAY); // created
  const t1 = ago(7 * DAY - 4 * HOUR); // invite mga
  const t2 = ago(6 * DAY); // invite insurer
  const t3 = ago(4 * DAY); // quote submitted
  const t4 = ago(2 * DAY); // bound
  const t5 = ago(1 * DAY); // closed

  const { data: room, error } = await admin
    .from("deal_rooms")
    .insert({
      broker_id: BROKER,
      insured_name: "Northgate Group Inc",
      class_of_business: "D&O",
      location: "Alberta",
      coverage_type: "D&O",
      coverage_amount: 7500000,
      notes:
        "Private oil & gas services company, board of 7. First-time D&O placement.",
      status: "closed",
      created_at: t0,
      updated_at: t5,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`  insert failed: ${error.message}`);
    process.exit(1);
  }

  const { data: mgaParty } = await admin
    .from("parties")
    .insert({
      deal_room_id: room.id,
      party_user_id: MGA,
      role: "mga",
      invited_at: t1,
    })
    .select("id")
    .single();

  const { data: insurerParty } = await admin
    .from("parties")
    .insert({
      deal_room_id: room.id,
      party_user_id: INSURER,
      role: "insurer",
      invited_at: t2,
    })
    .select("id")
    .single();

  const { data: quote } = await admin
    .from("quotes")
    .insert({
      deal_room_id: room.id,
      party_id: mgaParty.id,
      premium: 95000,
      deductible: 50000,
      coverage_limit: 7500000,
      terms: "12-month Private Co D&O, includes Side A excess",
      status: "won",
      submitted_at: t3,
    })
    .select("id")
    .single();

  await admin
    .from("deal_rooms")
    .update({ winning_quote_id: quote.id, updated_at: t5 })
    .eq("id", room.id);

  await admin.from("activities").insert([
    {
      deal_room_id: room.id,
      actor_id: BROKER,
      event_type: "created",
      event_data: { insured_name: "Northgate Group Inc", class_of_business: "D&O" },
      created_at: t0,
    },
    {
      deal_room_id: room.id,
      actor_id: BROKER,
      event_type: "invited",
      event_data: { party_user_id: MGA, role: "mga", invited_full_name: "Demo MGA" },
      created_at: t1,
    },
    {
      deal_room_id: room.id,
      actor_id: BROKER,
      event_type: "invited",
      event_data: { party_user_id: INSURER, role: "insurer", invited_full_name: "Demo Insurer" },
      created_at: t2,
    },
    {
      deal_room_id: room.id,
      actor_id: MGA,
      event_type: "quote_submitted",
      event_data: { quote_id: quote.id, premium: 95000, coverage_limit: 7500000 },
      created_at: t3,
    },
    {
      deal_room_id: room.id,
      actor_id: BROKER,
      event_type: "bound",
      event_data: { quote_id: quote.id, premium: 95000 },
      created_at: t4,
    },
    {
      deal_room_id: room.id,
      actor_id: BROKER,
      event_type: "closed",
      event_data: {},
      created_at: t5,
    },
  ]);
  console.log(`  ✓ ${room.id} closed, 2 parties, 1 quote (won), 6 activities`);
}

// Final state
console.log("\n=== final state ===");
for (const t of ["deal_rooms", "parties", "quotes", "activities"]) {
  const { count } = await admin.from(t).select("*", { count: "exact", head: true });
  console.log(`  ${t}: ${count}`);
}
const { data: rooms } = await admin
  .from("deal_rooms")
  .select("insured_name, status, class_of_business")
  .order("created_at", { ascending: false });
console.table(rooms);
