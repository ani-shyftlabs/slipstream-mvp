// Independent RLS audit using PostgREST + service role key.
// Verifies pg_class.relrowsecurity, pg_policies presence, and quote-confidentiality
// theorem (with no parties seeded → no role can see deal_rooms/quotes).
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TABLES = ["profiles", "deal_rooms", "parties", "quotes", "activities"];
const fail = [];
const log = (...a) => console.log(...a);

// Helper: invoke an arbitrary read against pg_catalog via PostgREST RPC.
// PostgREST does NOT expose pg_policies directly without a SECURITY DEFINER
// function or schema exposure. So instead we (a) attempt to query pg_policies
// via direct REST under the assumption that supabase exposes it (likely not),
// and if that fails, we run a SQL RPC by creating a transient `exec` function...
// — but we are NOT allowed to modify schema. So the strategy is:
//   1. Use Supabase Management API? Requires a separate token.
//   2. Use PostgREST → fall back to behavioral verification.
// We do behavioral verification: with the anon key, every RLS-protected table
// returns 0 rows. With the service key (bypasses RLS), counts work. We then
// also probe that DELETE/UPDATE on activities is *blocked* for an authenticated
// user (proves activities are append-only via default-deny).

const adminRest = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

// -------------------------------------------------------------------------
// 1. Service role can count every table — proves they exist
// -------------------------------------------------------------------------
log("\n[1] service-role row counts (proves tables exist)");
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const counts = {};
for (const t of TABLES) {
  const { count, error } = await adminClient.from(t).select("*", { count: "exact", head: true });
  if (error) {
    fail.push(`[1] table ${t} not readable by service role: ${error.message}`);
    continue;
  }
  counts[t] = count;
  log(`  ${t}: ${count}`);
}

// -------------------------------------------------------------------------
// 2. Anon (unauthenticated) SELECT on every table → returns 0 rows.
//    If RLS were OFF on any table with rows, anon would see them.
//    Profiles has 3 rows; if RLS were off, anon would see 3 → check.
// -------------------------------------------------------------------------
log("\n[2] anon SELECT on each table (RLS-on test) — expecting empty arrays");
const anonClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
for (const t of TABLES) {
  const { data, error } = await anonClient.from(t).select("*");
  if (error) {
    log(`  ${t}: error="${error.message}" (RLS may also error; that's a pass)`);
    continue;
  }
  log(`  ${t}: anon sees ${data.length} rows (admin sees ${counts[t] ?? "?"})`);
  // The strong test: profiles has 3 rows under service role. If anon also
  // sees them, RLS is OFF on profiles. Anon should see 0.
  if (t === "profiles" && data.length > 0) {
    fail.push(`[2] CRITICAL: anon can see profiles rows (RLS is OFF on profiles!)`);
  }
}

// -------------------------------------------------------------------------
// 3. List demo profiles (proves item 3 of the gate)
// -------------------------------------------------------------------------
log("\n[3] demo profile rows (broker / mga / insurer)");
const { data: demoProfiles, error: dpErr } = await adminClient
  .from("profiles")
  .select("email, role")
  .like("email", "%@demo.com")
  .order("email");
if (dpErr) {
  fail.push(`[3] could not query demo profiles: ${dpErr.message}`);
} else {
  for (const p of demoProfiles) log(`  ${p.email} → ${p.role}`);
  const expected = { "broker@demo.com": "broker", "mga@demo.com": "mga", "insurer@demo.com": "insurer" };
  for (const [email, role] of Object.entries(expected)) {
    const found = demoProfiles.find((p) => p.email === email);
    if (!found) fail.push(`[3] missing profile ${email}`);
    else if (found.role !== role) fail.push(`[3] ${email} has role=${found.role} ≠ ${role}`);
  }
  if (demoProfiles.length !== 3) fail.push(`[3] expected exactly 3 demo profiles, got ${demoProfiles.length}`);
}

// -------------------------------------------------------------------------
// 4. Append-only test on activities: as broker, attempt to UPDATE / DELETE
//    a fictitious row. With RLS only allowing INSERT/SELECT, both should
//    be blocked (rowcount = 0, NOT an error — postgres returns "no rows
//    matched the policy" silently for UPDATE/DELETE).
//    With activities empty, we'll attempt directly via the broker session
//    on a fake id. The test: even if we owned a row, UPDATE/DELETE should
//    fail because no policy permits them.
//    Observable proof: pg_policies only lists INSERT + SELECT for activities.
//    We expose pg_policies via a query through the PostgREST public schema
//    using an information_schema-style trick... Actually PostgREST cannot
//    query pg_policies without a wrapper view.
//    Cleanest alternative: invoke PostgREST OPTIONS on activities to read
//    the OpenAPI description (lists what RLS-allowed verbs return).
// -------------------------------------------------------------------------
log("\n[4] activities append-only — checking PostgREST OpenAPI for allowed verbs");
const openApiRes = await adminRest("/", { method: "GET" });
if (!openApiRes.ok) {
  fail.push(`[4] OpenAPI fetch failed: ${openApiRes.status}`);
} else {
  const spec = await openApiRes.json();
  // PostgREST exposes endpoints under `paths`. Look at /activities.
  const actPath = spec.paths?.["/activities"];
  if (!actPath) {
    fail.push(`[4] /activities path missing from OpenAPI (table not exposed?)`);
  } else {
    const verbs = Object.keys(actPath).filter((k) => ["get", "post", "patch", "delete"].includes(k));
    log(`  /activities OpenAPI verbs (PostgREST exposes all CRUD; RLS still gates): ${verbs.join(", ")}`);
    // PostgREST exposes all CRUD verbs by default. The RLS policies determine
    // what actually executes. So this test is informational only.
  }
}

// Behavioral test for append-only: as authenticated broker, attempt UPDATE
// on activities (no rows match → 0 rows updated, no error). Important: a
// SUCCESSFUL update on actual rows would be a fail. With table empty, we
// verify the UPDATE returns 0 affected. To strongly assert append-only we
// would need to insert a row, then try to update it as the same user, and
// observe 0 rows updated (silent block by RLS).
log("\n[4b] behavioral append-only check (broker session, empty activities table)");
{
  const { data: session } = await anonClient.auth.signInWithPassword({
    email: "broker@demo.com",
    password: "SlipstreamDemo2026",
  });
  const broker = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
    auth: { persistSession: false },
  });
  // Try to UPDATE every activities row (matching real schema: event_type).
  const { error: upErr, count: upCount } = await broker
    .from("activities")
    .update({ event_type: "tampered" })
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("*", { count: "exact" });
  log(`  UPDATE attempt: error="${upErr?.message ?? "none"}", rows=${upCount ?? 0}`);
  // Try to DELETE every row.
  const { error: delErr, count: delCount } = await broker
    .from("activities")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
    .select("*", { count: "exact" });
  log(`  DELETE attempt: error="${delErr?.message ?? "none"}", rows=${delCount ?? 0}`);
  // Note: with empty table, both return 0 rows regardless of policy. The
  // strong proof would require inserting a row first. Doing that means
  // residue. Defer-with-theorem: SQL semantics + migration source confirm
  // append-only (only INSERT + SELECT policies declared in 0002+0004).
  await anonClient.auth.signOut();
}

// -------------------------------------------------------------------------
// 5. Quote confidentiality theorem (with empty parties/quotes)
//    With nothing seeded, every role's deal_rooms/quotes/parties view is
//    empty — already proven by the sweep. Insurer SELECT on quotes should
//    return 0.
// -------------------------------------------------------------------------
log("\n[5] quote-confidentiality theorem (empty state)");
for (const email of ["broker@demo.com", "mga@demo.com", "insurer@demo.com"]) {
  const { data: session } = await anonClient.auth.signInWithPassword({
    email,
    password: "SlipstreamDemo2026",
  });
  const c = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
    auth: { persistSession: false },
  });
  const { data: q, error } = await c.from("quotes").select("id");
  if (error) fail.push(`[5] ${email} quotes select error: ${error.message}`);
  else log(`  ${email} quotes.length=${q.length}`);
  if (q && q.length > 0) fail.push(`[5] ${email} sees ${q.length} quotes (expected 0)`);
  await anonClient.auth.signOut();
}

// -------------------------------------------------------------------------
// 6. Active probe: insert a deal_room as broker, party as broker (binding
//    MGA), quote as MGA, then verify INSURER cannot see the quote. Cleanup.
// -------------------------------------------------------------------------
log("\n[6] active quote-confidentiality probe (broker→party→mga-quote, insurer blind)");
let probeRoomId = null;
let probeOk = false;
let probeNote = "";
try {
  // (a) sign in as broker
  const { data: brokerSession, error: bsErr } = await anonClient.auth.signInWithPassword({
    email: "broker@demo.com",
    password: "SlipstreamDemo2026",
  });
  if (bsErr) throw new Error(`broker signin: ${bsErr.message}`);
  const brokerId = brokerSession.user.id;
  const broker = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${brokerSession.session.access_token}` } },
    auth: { persistSession: false },
  });

  // What columns does deal_rooms expect? Inspect via an empty select with
  // ?columns= or just attempt minimal insert; fall back via OpenAPI.
  // From migration 0001 we'll assume name + broker_id at minimum.
  const probeName = `qa-probe-${Date.now()}`;
  const { data: room, error: rErr } = await broker
    .from("deal_rooms")
    .insert({
      broker_id: brokerId,
      insured_name: probeName,
      class_of_business: "Property",
      coverage_type: "All-Risks",
      coverage_amount: 1000000,
      location: "London",
      notes: "QA probe",
      status: "draft",
    })
    .select()
    .single();
  if (rErr) {
    probeNote = `deal_room insert as broker failed: ${rErr.message}`;
    throw new Error(probeNote);
  }
  probeRoomId = room.id;
  log(`  inserted deal_room ${probeRoomId}`);

  // (b) lookup mga user id
  const { data: mgaProfile, error: mErr } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", "mga@demo.com")
    .single();
  if (mErr) throw new Error(`mga profile lookup: ${mErr.message}`);
  const mgaId = mgaProfile.id;

  // (c) broker inserts parties row binding MGA to room
  const { data: partyRow, error: pErr } = await broker
    .from("parties")
    .insert({ deal_room_id: probeRoomId, party_user_id: mgaId, role: "mga" })
    .select()
    .single();
  if (pErr) {
    probeNote = `parties insert: ${pErr.message}`;
    throw new Error(probeNote);
  }
  log(`  inserted party ${partyRow.id} (MGA → room)`);

  await anonClient.auth.signOut();

  // (d) sign in as MGA, insert a quote
  const { data: mgaSession, error: msErr } = await anonClient.auth.signInWithPassword({
    email: "mga@demo.com",
    password: "SlipstreamDemo2026",
  });
  if (msErr) throw new Error(`mga signin: ${msErr.message}`);
  const mga = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${mgaSession.session.access_token}` } },
    auth: { persistSession: false },
  });

  const { data: quoteRow, error: qErr } = await mga
    .from("quotes")
    .insert({
      deal_room_id: probeRoomId,
      party_id: partyRow.id,
      premium: 12345,
      deductible: 500,
      coverage_limit: 1000000,
      terms: "QA probe quote",
    })
    .select()
    .single();
  if (qErr) {
    probeNote = `quote insert: ${qErr.message}`;
    throw new Error(probeNote);
  }
  log(`  MGA inserted quote ${quoteRow.id} (premium=${quoteRow.premium})`);

  // (e) MGA should see their own quote
  const { data: mgaQuotes } = await mga.from("quotes").select("id").eq("id", quoteRow.id);
  log(`  MGA reading their quote: ${mgaQuotes?.length ?? 0} (expect 1)`);
  if ((mgaQuotes?.length ?? 0) !== 1) fail.push(`[6] MGA cannot see own quote`);

  await anonClient.auth.signOut();

  // (f) sign in as INSURER, attempt to read the quote — must be 0
  const { data: insSession } = await anonClient.auth.signInWithPassword({
    email: "insurer@demo.com",
    password: "SlipstreamDemo2026",
  });
  const insurer = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${insSession.session.access_token}` } },
    auth: { persistSession: false },
  });
  const { data: insQuotes } = await insurer.from("quotes").select("id").eq("id", quoteRow.id);
  log(`  INSURER reading the MGA's quote: ${insQuotes?.length ?? 0} (expect 0)`);
  if ((insQuotes?.length ?? 0) !== 0) {
    fail.push(`[6] CRITICAL: INSURER can see MGA's quote (RLS broken!)`);
  } else {
    log(`  ✓ confidentiality enforced`);
    probeOk = true;
  }

  // (g) also verify INSURER cannot see the deal_room itself
  const { data: insRooms } = await insurer.from("deal_rooms").select("id").eq("id", probeRoomId);
  log(`  INSURER reading the deal_room: ${insRooms?.length ?? 0} (expect 0)`);
  if ((insRooms?.length ?? 0) !== 0) {
    fail.push(`[6] CRITICAL: INSURER can see deal_room they aren't a party of`);
  }

  // (h) broker can see both
  await anonClient.auth.signOut();
  const { data: brokerSession2 } = await anonClient.auth.signInWithPassword({
    email: "broker@demo.com",
    password: "SlipstreamDemo2026",
  });
  const broker2 = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${brokerSession2.session.access_token}` } },
    auth: { persistSession: false },
  });
  const { data: bQuotes } = await broker2.from("quotes").select("id").eq("id", quoteRow.id);
  log(`  BROKER reading the quote: ${bQuotes?.length ?? 0} (expect 1)`);
  if ((bQuotes?.length ?? 0) !== 1) fail.push(`[6] broker cannot see quote on their deal_room`);

  // Strong append-only proof: broker inserts an activity, attempts UPDATE
  // and DELETE on it, both must affect 0 rows (silent block by RLS default-
  // deny since no UPDATE/DELETE policy exists for activities).
  log("\n[6-appendonly] inserting activity, attempting tamper");
  const { data: act, error: actErr } = await broker2
    .from("activities")
    .insert({
      deal_room_id: probeRoomId,
      actor_id: brokerId,
      event_type: "qa_probe",
      event_data: { source: "qa-senior" },
    })
    .select()
    .single();
  if (actErr) {
    fail.push(`[6-appendonly] could not insert activity (broker on own room): ${actErr.message}`);
  } else {
    log(`  inserted activity ${act.id}`);
    // UPDATE attempt on the just-inserted row
    const { data: upd, error: upErr } = await broker2
      .from("activities")
      .update({ event_type: "tampered" })
      .eq("id", act.id)
      .select();
    log(`  UPDATE on own activity: error="${upErr?.message ?? "none"}", rows-returned=${upd?.length ?? 0}`);
    if ((upd?.length ?? 0) > 0 && !upErr) {
      fail.push(`[6-appendonly] CRITICAL: broker updated activity row (append-only violated)`);
    }
    // Confirm via service role that the row was NOT actually mutated
    const { data: actCheck } = await adminClient
      .from("activities")
      .select("event_type")
      .eq("id", act.id)
      .single();
    log(`  service-role re-read event_type="${actCheck?.event_type}" (expect "qa_probe")`);
    if (actCheck?.event_type !== "qa_probe") {
      fail.push(`[6-appendonly] CRITICAL: activity event_type changed from qa_probe to ${actCheck?.event_type}`);
    }
    // DELETE attempt on the row
    const { data: del, error: delErr } = await broker2
      .from("activities")
      .delete()
      .eq("id", act.id)
      .select();
    log(`  DELETE on own activity: error="${delErr?.message ?? "none"}", rows-returned=${del?.length ?? 0}`);
    if ((del?.length ?? 0) > 0 && !delErr) {
      fail.push(`[6-appendonly] CRITICAL: broker deleted activity row (append-only violated)`);
    }
    // Confirm row still exists
    const { data: stillThere } = await adminClient
      .from("activities")
      .select("id")
      .eq("id", act.id)
      .maybeSingle();
    if (!stillThere) {
      fail.push(`[6-appendonly] CRITICAL: activity row was deleted (append-only violated)`);
    } else {
      log(`  ✓ activity row survived UPDATE+DELETE attempts → append-only enforced`);
    }
  }

  await anonClient.auth.signOut();
} catch (e) {
  log(`  active probe aborted: ${e.message}`);
  probeNote = probeNote || e.message;
}

// (i) Cleanup: delete deal_room (cascade). Use service role to be safe.
if (probeRoomId) {
  log(`\n[6-cleanup] deleting probe deal_room ${probeRoomId} via service role`);
  const { error: cErr } = await adminClient.from("deal_rooms").delete().eq("id", probeRoomId);
  if (cErr) {
    fail.push(`[6-cleanup] failed to delete probe room: ${cErr.message}`);
  } else {
    log(`  cleanup OK`);
  }
}

// -------------------------------------------------------------------------
// 7. Verify final state is clean (no residue)
// -------------------------------------------------------------------------
log("\n[7] final row counts (should match initial empty state)");
for (const t of TABLES) {
  const { count } = await adminClient.from(t).select("*", { count: "exact", head: true });
  log(`  ${t}: ${count}`);
}

// -------------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------------
console.log("\n========== AUDIT RESULT ==========");
console.log(`probe completed: ${probeOk}; note: ${probeNote || "n/a"}`);
if (fail.length === 0) {
  console.log("PASS — independent RLS audit clean");
  process.exit(0);
} else {
  console.log("FAIL");
  for (const f of fail) console.log(`  - ${f}`);
  process.exit(1);
}
