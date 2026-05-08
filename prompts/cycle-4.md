# Cycle 4 — Quotes + Multi-Role Views + Bind

**Time budget:** 60 min from cycle start (single-thread Path 1, same as previous cycles)
**Goal:** MGA submits a quote; broker reviews + binds; insurer sees the bound deal. End-to-end demo flow works. Plus 2 bug fixes from Cycle 3.
**Gate:** Full demo flow runs cleanly across 3 browser tabs (broker / mga / insurer). Plus the 2 bugs are gone.

**Bugs to fix (carried over from Cycle 3):**
1. Sidebar "Deal Rooms" link in broker shell points to `/broker/quotes` which 404s. Build that page as a proper deal-rooms list (broker view).
2. MGA dashboard lists invited deal rooms but rows are not clickable. Make each row a Link to `/mga/quotes/<id>` (the detail page Cycle 4 builds anyway).

---

## Paste the following into Claude Code

```
Starting Cycle 4 of the Slipstream MVP build. Cycle 3 is green; broker can create + invite end-to-end.

FIRST, re-read ./CLAUDE.md and ./docs/PRD_DIGEST.md (especially section 9 — the demo flow).

CYCLE 4 GOAL: MGA submits quote → broker reviews + binds → insurer sees bound deal. Full demo flow works. Plus 2 bug fixes carried over from Cycle 3.

ORCHESTRATION NOTE: SendMessage tool is not available in this Claude Code session (same as previous cycles). Don't try to spawn coordinated named agents — run Path 1: you (Claude Code main thread) execute the work directly, parallelizing with the Task tool only where genuinely independent. Spawn `qa-senior` as a single Task subagent at the end against the live URL.

UNATTENDED RUN: Ani is going to lunch while this cycle runs. Do NOT pause and ask for input mid-cycle unless you hit something genuinely blocking (e.g., schema migration that needs human paste). For RLS/permission issues, prefer the admin-client / SECURITY DEFINER workaround pattern already established in earlier cycles, and flag the cleanup for a future cycle in the final report.

CYCLE 4 GATE (qa-senior verifies end-to-end):
1. (BUG FIX 1) /broker/quotes renders a proper deal-rooms list page for the broker — same data as the dashboard, navigable from the sidebar nav. No 404.
2. (BUG FIX 2) MGA dashboard rows are clickable Links pointing to /mga/quotes/<id> (the new detail page below).
3. MGA dashboard lists deal rooms they were invited to (already works); each row links to /mga/quotes/<id>
4. /mga/quotes/<id> shows deal-room details (read-only) + a "Submit Quote" button (only if no quote yet from this party)
5. Submit-quote form (premium, deductible, coverage_limit, terms) → server action inserts a quotes row with status='submitted' + activity 'quote_submitted'
6. Broker /broker/quotes/<id> now has a "Quotes" section listing all quotes for this deal room (DM Mono numbers, party name, premium, status badge)
7. Each quote row has a "Bind" button (broker only, when deal room status is 'active'). Clicking it: confirmation modal → on confirm, server action transitions deal_room.status to 'bound', sets winning_quote_id, marks the bound quote status='won' and other quotes status='lost', logs 'bound' activity
8. After bind, "Export Compliance Package" button appears → downloads a JSON with deal_room + quotes + activities (mocked — just a Blob download from the browser)
9. After export, "Close Deal Room" button → status → 'closed', activity 'closed'
10. Insurer dashboard shows the bound deal room in a "Bound Deals" list (read-only); rows clickable; clicking opens /insurer/quotes/<id> with full read-only view
11. RLS still holds: mga@demo.com cannot SELECT another MGA's quotes (test by inserting a fake quote from another party_id via service role and confirming it doesn't appear in the MGA's view)

Spawn the FULL 7-agent crew. ONE message.

AGENTS TO SPAWN:

1. name: "pm-lead", subagent_type: "hierarchical-coordinator"
   Prompt: |
     You are pm-lead. Cycle 4 goal: quotes + bind + multi-role views. Read CLAUDE.md and docs/PRD_DIGEST.md.
     Sequence: architect designs quote/bind contracts → backend-1 builds quote actions + queries → backend-2 builds bind/close/export actions → ui-1 builds broker quotes section + bind UI → ui-2 builds MGA submit-quote flow + insurer view → qa-senior verifies. Deploy after each [DONE].
     Stop rule: track elapsed time since this cycle started. At T+60 min, if the gate isn't green, cut the export and close steps; demo flow ends at "bound". Report the cut to the human.

2. name: "architect", subagent_type: "system-architect"
   Prompt: |
     You are architect. Wait for [ASSIGN].
     Design:
     - lib/actions/quotes.ts: submitQuote({deal_room_id, premium, deductible, coverage_limit, terms}) — verifies caller is in parties table for that room with role='mga'; inserts quotes row status='submitted'; logs activity. Returns {data, error}.
     - lib/actions/deal-rooms.ts: bindQuote({deal_room_id, quote_id}) — verifies caller is broker who owns room; updates winning_quote_id; sets quote status='won' (others 'lost'); transitions room status='bound'; logs activity 'bound' with quote_id payload. closeDealRoom({deal_room_id}) — broker only; transitions status='closed'; logs 'closed'.
     - lib/actions/compliance.ts: getCompliancePackage(deal_room_id) — returns a JSON object {deal_room, parties, quotes, activities} for client-side download. Broker only.
     - lib/queries/quotes.ts: getQuotesForDealRoom(deal_room_id) — RLS handles visibility; returns quotes joined with party.profile.full_name.
     - Form schemas (zod): submitQuote requires premium > 0, deductible >= 0, coverage_limit > 0, terms (1-2000 chars).
     SendMessage backend-1 [ASSIGN] with quotes actions + queries.
     SendMessage backend-2 [ASSIGN] with bind/close/compliance actions.
     SendMessage ui-1 [ASSIGN] with broker quotes section, bind modal, export+close buttons.
     SendMessage ui-2 [ASSIGN] with MGA dashboard, MGA detail view, submit-quote form, insurer dashboard, insurer detail view.
     Pause.

3. name: "backend-1", subagent_type: "backend-dev"
   Prompt: |
     You are backend-1. Wait for [ASSIGN].
     Implement lib/actions/quotes.ts (submitQuote) and lib/queries/quotes.ts (getQuotesForDealRoom).
     SendMessage pm-lead [DONE].

4. name: "backend-2", subagent_type: "backend-dev"
   Prompt: |
     You are backend-2. Wait for [ASSIGN].
     Implement:
     a) bindQuote, closeDealRoom in lib/actions/deal-rooms.ts (or new file lib/actions/bind.ts)
     b) lib/actions/compliance.ts: getCompliancePackage server action that returns the full JSON
     c) Helper: ensure activity logging happens transactionally with each state change (use a single Supabase transaction or sequential inserts within one server action call)
     SendMessage pm-lead [DONE].

5. name: "ui-1", subagent_type: "coder"
   Prompt: |
     You are ui-1. Wait for [ASSIGN].
     Implement:
     a) (BUG FIX 1) app/(dashboard)/broker/quotes/page.tsx — proper deal-rooms list page (broker view). Server-fetches getMyDealRooms(). Same card/list UI as the broker dashboard but as a dedicated full-page list (h1 "Deal Rooms" in serif, table or card grid with insured_name, class, location, status badge, created_at). Each row links to /broker/quotes/<id>. This fixes the sidebar nav 404.
     b) On /broker/quotes/[id]: Quotes section — table of quotes (party name in font-sans, premium in font-mono with $ formatting, coverage_limit in font-mono, terms truncated, status badge, "Bind" button)
     c) components/quotes/bind-modal.tsx: confirmation Dialog "Bind quote from <party> at $<premium>?" → calls bindQuote
     d) After bind: replace "+ Invite Party" with "Export Compliance Package" + "Close Deal Room" buttons
     e) Export button: client-side handler that calls getCompliancePackage, creates a Blob, triggers download as `slipstream-<deal_id>-compliance.json`
     f) Close button: confirmation Dialog → calls closeDealRoom; on success, status badge updates to "Closed"
     SendMessage pm-lead [DONE].

6. name: "ui-2", subagent_type: "coder"
   Prompt: |
     You are ui-2. Wait for [ASSIGN].
     Implement:
     a) (BUG FIX 2) app/(dashboard)/mga/dashboard/page.tsx: each deal room row must be a clickable Link → /mga/quotes/<id>. Currently the rows render but are not clickable. Wrap the row in <Link> and add hover-lift styling consistent with the broker dashboard. Also update the list itself: insured_name, class_of_business, location, status badge, created_at (font-mono). Same UX pattern as broker dashboard for consistency.
     b) Same clickable-row treatment for app/(dashboard)/insurer/dashboard/page.tsx — rows link to /insurer/quotes/<id>.
     c) Also build app/(dashboard)/mga/quotes/page.tsx (list page) — same deal rooms list, full-page version. Sidebar "Quotes" link points here.
     d) app/(dashboard)/mga/quotes/[id]/page.tsx: read-only deal-room view (same data as broker's view minus other quotes — RLS handles this) + "Submit Quote" button if no quote from this party yet, OR "Quote submitted" status if already submitted
     e) components/quotes/submit-quote-form.tsx: shadcn Form + react-hook-form + zod (premium, deductible, coverage_limit, terms). Submits to submitQuote action. After success, redirect to mga/dashboard or show a "submitted" confirmation card.
     f) app/(dashboard)/insurer/dashboard/page.tsx: list bound deal rooms (status='bound' or 'closed' AND insurer is in parties). Read-only. Rows clickable (per BUG FIX 2 above).
     g) app/(dashboard)/insurer/quotes/[id]/page.tsx: read-only summary — insured info, winning quote highlighted, full activity feed. NO bind/edit controls.
     SendMessage pm-lead [DONE].

7. name: "qa-senior", subagent_type: "tester"
   Prompt: |
     You are qa-senior. Wait for [ASSIGN].
     Run the full demo flow on the live URL across 3 browser tabs (or 3 incognito sessions):
     1. (BUG FIX 1) Sign in as broker, click "Deal Rooms" in left sidebar → must land on /broker/quotes (no 404). Verify it lists the broker's deal rooms.
     2. (BUG FIX 2) Sign in as mga, on /mga/dashboard, click any deal room row → must navigate to /mga/quotes/<id>. (Same check on /insurer/dashboard for clickable rows.)
     3. broker@demo.com creates "Acme Manufacturing" deal room
     4. broker invites mga@demo.com as MGA and insurer@demo.com as insurer
     5. mga@demo.com sees the deal room in dashboard; opens detail; submits quote (premium 250000, deductible 25000, limit 5000000, terms "Standard 12-month GL")
     6. broker refreshes detail page → sees the quote in Quotes section
     7. broker clicks Bind → confirms → status transitions to Bound
     8. broker clicks Export Compliance Package → JSON file downloads; verify it contains deal_room, parties, quotes, activities
     9. broker clicks Close Deal Room → status transitions to Closed
     10. insurer@demo.com refreshes dashboard → sees the bound deal in Bound Deals list; opens it; sees read-only summary
     11. mga@demo.com refreshes detail → quote shows as 'won' status
     12. RLS check: while authenticated as mga, query a quote belonging to a different party (manually inserted via SQL) — must return zero rows
     SendMessage pm-lead [QA-PASS] with screenshots/evidence per step, or [QA-FAIL].

After spawning, SendMessage pm-lead [ASSIGN] "Begin Cycle 4 — Quotes + Bind + Multi-Role".
```

---

## After Cycle 4

You have a working demo. Move to `prompts/cycle-5.md` for polish.
