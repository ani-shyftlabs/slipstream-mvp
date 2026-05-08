# Cycle 2 — Data Model + Skeleton Dashboards

**Time budget:** 45 min from cycle start
**Goal:** Schema in Supabase with RLS; three skeleton dashboards; role-based redirect after login.
**Gate:** Three demo accounts seeded; signing in as each role lands on the correct dashboard; an MGA cannot SELECT a deal_room they're not a party in (RLS verified).

---

## Paste the following into Claude Code

```
Starting Cycle 2 of the Slipstream MVP build. Cycle 1 is green; we have a live URL with auth + app shell.

FIRST, re-read ./CLAUDE.md and ./docs/PRD_DIGEST.md (especially section 8 Data Entities and section 9 Demo Flow). Then proceed.

CYCLE 2 GOAL: Supabase schema with RLS; three skeleton dashboards (broker, mga, insurer); role-based redirect; demo accounts seeded.

CYCLE 2 GATE (qa-senior verifies):
1. Migrations applied to Supabase; tables exist: profiles, deal_rooms, parties, quotes, activities
2. RLS enabled on all 5 tables; policies in place per CLAUDE.md invariants
3. Three demo accounts exist (broker@demo.com, mga@demo.com, insurer@demo.com — password SlipstreamDemo2026 each), each with a profiles row with the correct role
4. Signing in as broker → redirects to /broker/dashboard. Same for mga and insurer.
5. Each dashboard renders the app shell + a placeholder "Welcome, <role>" heading + role badge
6. RLS test: as MGA, attempting to SELECT * FROM deal_rooms returns zero rows (since no parties exist yet) — proves RLS is enforcing
7. Live URL deploys cleanly with the new schema

Spawn the FULL 7-agent crew this cycle. backend-2 and ui-2 join.

AGENTS TO SPAWN (all in one message, run_in_background: true):

1. name: "pm-lead", subagent_type: "hierarchical-coordinator"
   Prompt: |
     You are pm-lead, continuing the Slipstream MVP build. Cycle 2 goal: data model + role routing + skeleton dashboards. Read ./CLAUDE.md and ./docs/PRD_DIGEST.md.
     Sequence: architect designs schema + RLS → backend-1 applies migrations → backend-2 seeds demo accounts → ui-1 + ui-2 build skeleton dashboards in parallel → qa-senior verifies. Then deploy.
     First action: SendMessage architect [ASSIGN] — full schema + RLS + role-redirect contract.
     Stop rule: track elapsed time since this cycle started. At T+45 min, if the gate isn't green, defer the activities table/RLS to Cycle 3 and ship just deal_rooms + parties + quotes. Report the cut to the human.

2. name: "architect", subagent_type: "system-architect"
   Prompt: |
     You are architect. Wait for [ASSIGN] from pm-lead.
     Design (read PRD_DIGEST section 8 first):
     a) SQL migration 0001_initial_schema.sql with the 5 tables exactly as specified in CLAUDE.md / PRD_DIGEST.md (profiles, deal_rooms, parties, quotes, activities). Use uuid PKs, timestamptz timestamps, proper FKs, and the enums spelled out (status enum on deal_rooms, role enum on profiles, etc.).
     b) SQL migration 0002_rls.sql — enable RLS on all 5 tables; write policies per CLAUDE.md invariants:
        - profiles: user can SELECT own row + rows of users sharing a deal_room
        - deal_rooms: broker sees own (broker_id = auth.uid()); mga/insurer see only rooms where they are in `parties`
        - parties: visible to broker who owns the deal_room + the party themselves
        - quotes: visible to broker who owns the room + the party who submitted (NOT other parties)
        - activities: same visibility as deal_rooms; only INSERT for authenticated users (no UPDATE, no DELETE)
     c) SQL migration 0003_profile_trigger.sql — on auth.users INSERT, create a profiles row with role from raw_user_meta_data
     d) Role-based redirect contract: middleware reads profile.role and redirects /(dashboard) traffic to /<role>/dashboard if the URL doesn't match
     SendMessage backend-1 [ASSIGN] with the migration files (full SQL) and instructions to apply via Supabase dashboard or CLI.
     SendMessage backend-2 [ASSIGN] with seed.sql contract: 3 auth.users via Supabase admin API + 3 profiles + sign-up flow that respects role assignment.
     SendMessage ui-1 [ASSIGN] with: update middleware.ts to fetch profile.role and redirect; add a role badge to the topbar (gold pill, DM Sans, displays "BROKER" / "MGA" / "INSURER").
     SendMessage ui-2 [ASSIGN] with: build app/(dashboard)/{broker,mga,insurer}/dashboard/page.tsx — server components, fetch profile, render "Welcome, <full_name>" + role badge + a placeholder card per role describing what they can do.
     Pause and respond to [QUESTION].

3. name: "backend-1", subagent_type: "backend-dev"
   Prompt: |
     You are backend-1. Wait for [ASSIGN] from architect.
     Execute:
     a) Create supabase/migrations/0001_initial_schema.sql, 0002_rls.sql, 0003_profile_trigger.sql with the SQL architect provides
     b) Apply migrations to the live Supabase project. Use `npx supabase db push` if Supabase CLI is set up; otherwise use the Supabase dashboard SQL editor and copy-paste each migration. SendMessage pm-lead [BLOCK] if you need the human to paste anything in the Supabase dashboard.
     c) Update lib/actions/auth.ts signUp to accept a `role` field and pass it as user metadata so the trigger picks it up
     d) Update lib/types/database.ts (regenerate via `npx supabase gen types typescript --project-id <id>` if possible, otherwise hand-write minimal types matching the schema)
     SendMessage pm-lead [DONE] with files + a confirmation that migrations are applied.

4. name: "backend-2", subagent_type: "backend-dev"
   Prompt: |
     You are backend-2. Wait for [ASSIGN] from architect.
     Execute:
     a) Create supabase/seed.sql that inserts 3 auth users (use auth.users insert with bcrypt-hashed password — research the correct pattern) and 3 profiles rows (broker, mga, insurer) at IDs you control
     b) ALTERNATIVE if direct auth.users insert is too painful: write a Node.js script supabase/seed.ts that uses the Supabase Admin API (service_role key) to call admin.createUser for each demo account with email_confirm=true and user_metadata.role set
     c) Run the seed script. Verify in the dashboard that 3 users exist and 3 profiles rows exist with correct roles.
     d) Document the demo credentials clearly in supabase/SEED.md (broker@demo.com / mga@demo.com / insurer@demo.com — all password SlipstreamDemo2026)
     SendMessage pm-lead [DONE].

5. name: "ui-1", subagent_type: "coder"
   Prompt: |
     You are ui-1. Wait for [ASSIGN] from architect.
     Execute:
     a) Update middleware.ts: after session check, if user is on /(dashboard)/* but not on /<their_role>/*, redirect to /<their_role>/dashboard
     b) Update app/(dashboard)/layout.tsx topbar to render a role badge (gold pill, uppercase role name, DM Sans 500, ml-auto next to user chip) — fetched server-side from profiles
     c) Update sidebar nav: show different items per role. Broker sees: Dashboard, Deal Rooms (placeholder routes for now). MGA sees: Dashboard, Quotes. Insurer sees: Dashboard.
     SendMessage pm-lead [DONE].

6. name: "ui-2", subagent_type: "coder"
   Prompt: |
     You are ui-2. Wait for [ASSIGN] from architect.
     Execute:
     a) Create app/(dashboard)/broker/dashboard/page.tsx — server component, fetch profile, render: serif H1 "Broker Dashboard", DM Sans subtitle "Welcome, <full_name>", a Card with "Your deal rooms will appear here" placeholder, a Button "+ New Deal Room" (links to /broker/quotes/new — page not built yet, button can be disabled or routes to a 404 placeholder)
     b) Same pattern for mga/dashboard/page.tsx ("MGA Dashboard", "Quotes you're invited to will appear here")
     c) Same for insurer/dashboard/page.tsx ("Insurer Dashboard", "Bound deals will appear here")
     d) Use the brand: serif for H1, DM Sans for body, silver borders, navy/gold accents
     SendMessage pm-lead [DONE].

7. name: "qa-senior", subagent_type: "tester"
   Prompt: |
     You are qa-senior. Wait for [ASSIGN] from pm-lead.
     Verify Cycle 2 gate:
     1. Live deploy succeeds (pm-lead provides URL)
     2. SQL: connect to Supabase (psql or dashboard SQL editor) and confirm 5 tables exist with RLS enabled (check pg_tables and pg_policies). Report row counts.
     3. Sign in as each demo account on the live URL; verify each lands on /<role>/dashboard
     4. RLS test: while logged in as mga@demo.com, run a server action or query that selects deal_rooms — should return [] (no parties yet)
     5. Verify role badge displays correctly in topbar for each role
     6. Verify each dashboard renders with brand-true styling
     SendMessage pm-lead [QA-PASS] or [QA-FAIL] with evidence.

After all 7 agents are spawned, SendMessage pm-lead with [ASSIGN] "Begin Cycle 2 — Data Model + Role Routing".
```

---

## After Claude Code finishes Cycle 2

Sign in as each demo account on the live URL — confirm each lands on the right dashboard with the right badge. Then move to `prompts/cycle-3.md`.
