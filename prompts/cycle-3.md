# Cycle 3 — Broker Core Flow

**Time budget:** 75 min from cycle start (single-thread Path 1, same as Cycles 1 & 2)
**Goal:** Broker can create a deal room, see it in their dashboard, open the detail page, invite a party. PLUS a public marketing landing page at `/`.
**Gate:** End-to-end as broker: create → list → open detail → invite MGA → activity feed shows the events. Activities table has rows. RLS holds (MGA now sees the deal room they were invited to). Landing page renders for both anon and authed visitors (no auto-redirect from `/`).

---

## Paste the following into Claude Code

```
Starting Cycle 3 of the Slipstream MVP build. Cycle 2 is green; data model + role routing in place.

FIRST, re-read ./CLAUDE.md and ./docs/PRD_DIGEST.md (sections 8 and 9 especially).

CYCLE 3 GOAL: Broker can complete the create→invite portion of the demo flow end-to-end. PLUS a public marketing landing page at `/`.

ORCHESTRATION NOTE: SendMessage tool is not available in this Claude Code session (same as Cycles 1 & 2). Don't try to spawn coordinated named agents — run Path 1: you (Claude Code main thread) execute the work directly, parallelizing with the Task tool only where genuinely independent. Spawn `qa-senior` as a single Task subagent at the end against the live URL.

CYCLE 3 GATE (qa-senior verifies):
1. Broker dashboard shows a list of their deal rooms (empty initially, then populated after creating one)
2. "+ New Deal Room" button on broker dashboard opens a form at /broker/quotes/new
3. Form has fields: insured_name (text), class_of_business (select), location (text), coverage_type (select), coverage_amount (number), notes (textarea). Validates with zod. Submits to a server action that inserts a deal_rooms row + an activities row ("created").
4. After create, broker is redirected to /broker/quotes/<id> (detail page) showing the deal room data
5. Detail page has an "Invite Party" button → modal/form to select an mga or insurer profile and a role; submission inserts a parties row + an activities row ("invited") + transitions deal_room status from 'draft' to 'active'
6. After invite, MGA logging in sees the deal room in their dashboard list (RLS verified — MGA can SELECT this deal_room)
7. Activity feed on the detail page renders the events in reverse chronological order (DM Mono for timestamps, DM Sans for text, navy/gold accents)
8. Live deploy succeeds
9. Landing page at `/` renders for both anonymous and authenticated visitors (no auto-redirect). Hero headline "Your placement doesn't live in your inbox." displays in Libre Baskerville. All sections from Demo v2 are present (hero, problem, features, how-it-works, roles, compliance, pricing, CTA). Navigation links to /login and /signup work.
10. Topbar Slipstream wordmark in /(dashboard)/layout.tsx links to `/` (the landing page), NOT the role dashboard. Confirmed by clicking it from /broker/dashboard and landing on `/`.

LANDING PAGE TASK (additional to Cycle 3 base scope):
Build a Next.js page at `app/page.tsx` (replacing the current redirect-only stub) that ports the landing page from the source HTML.

  Source: /Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Demo/Slipstream_Demo_v2.html
  Specifically: lines 611–866 inside the <div id="pg-landing"> block.
  Sections to include, IN ORDER, with copy verbatim from source:
    a. Top nav (l-nav) — Slipstream logo (links to /), nav items linking to in-page anchors (#features, #how-it-works, #pricing), CTA buttons "Sign In" → /login and "Get Started" → /signup. If user is authenticated, show "Go to Dashboard" → /<role>/dashboard.
    b. Hero (l-hero) — headline "Your placement doesn't live in your inbox." with <em> on "your inbox". Sub copy verbatim. Two CTAs.
    c. Problem section (line 710–736) — "Complex placements involve 4 to 6 parties..." + comparison grid copy verbatim.
    d. Features section (line 737–753, id="features") — "Every tool a specialty broker needs. Nothing else." + features grid (read source to get the full list of feature cards).
    e. How It Works (line 754–780, id="how-it-works") — workflow grid + steps verbatim.
    f. Roles section (line 781–793, id="who-its-for") — role cards: Retail Broker, MGA, Wholesaler, Insurer (read source for copy).
    g. Compliance section (line 794–815) — "The compliance engine is the moat." + body verbatim.
    h. Pricing (line 816–828, id="pricing") — 3 tiers: Guest, Member, Enterprise (read source).
    i. CTA section (line 829–865) — "Your next placement deserves a deal room." + sign-up CTA.
    j. Footer with copyright + small links.

  Implementation rules:
    - Use the project's Tailwind brand tokens (navy, gold, ink, silver). DO NOT pull in the demo's CSS file. Re-style with Tailwind.
    - Libre Baskerville for all section headings (h1, h2). DM Sans for body. DM Mono for tags/labels.
    - Use shadcn Button for CTAs.
    - Server component. Fetch session via getCurrentProfile() helper.
    - Anonymous → show "Sign In" / "Get Started" CTAs.
    - Authenticated → show "Go to your <role> dashboard" CTA in the nav (gold accent).
    - DO NOT auto-redirect authenticated users away from `/`. They can visit the landing page at any time by clicking the Slipstream wordmark in the dashboard topbar.
    - Make all <em> elements use the gold accent color (text-gold).
    - Hover states: subtle, ≤200ms, no playful animations.

ALSO REQUIRED (in app/(dashboard)/layout.tsx):
  - Change the <Link> wrapping the "Slipstream" wordmark in the topbar from `href={homeHref}` (which currently goes to /<role>/dashboard) to `href="/"` so clicking the wordmark from inside the app takes the user to the landing page.

Spawn the FULL 7-agent crew. ONE message.

AGENTS TO SPAWN:

1. name: "pm-lead", subagent_type: "hierarchical-coordinator"
   Prompt: |
     You are pm-lead, continuing the Slipstream MVP build. Cycle 3 goal: broker create+invite flow. Read CLAUDE.md and docs/PRD_DIGEST.md.
     Sequence: architect designs server action contracts + invite flow → backend-1 builds deal_rooms actions + queries → backend-2 builds parties actions + activity logging → ui-1 builds broker dashboard list + detail page → ui-2 builds new-deal-room form + invite modal → qa-senior verifies. Deploy after each [DONE].
     Stop rule: track elapsed time since this cycle started. At T+75 min, if the gate isn't green, defer the invite flow to Cycle 4 and ship just create→list→detail. Report the cut to the human.

2. name: "architect", subagent_type: "system-architect"
   Prompt: |
     You are architect. Wait for [ASSIGN].
     Design contracts:
     - lib/actions/deal-rooms.ts: createDealRoom(formData) — validates with zod, inserts deal_rooms row (broker_id from session, status='draft'), inserts activities row event_type='created', returns {data: {id}, error}
     - lib/actions/parties.ts: inviteParty({deal_room_id, party_user_id, role}) — broker-only role check, inserts parties row, inserts activities row event_type='invited', transitions deal_room.status to 'active', returns {data, error}
     - lib/queries/deal-rooms.ts: getMyDealRooms() (broker view), getInvitedDealRooms() (mga/insurer view), getDealRoomDetail(id) (with parties + activities + quotes joined)
     - Form schema (zod): insured_name (1-200 chars), class_of_business (enum: 'GL'|'Property'|'Cyber'|'D&O'|'E&O'|'Casualty'), location (1-100), coverage_type (enum), coverage_amount (positive number), notes (max 2000 optional)
     - Invite modal contract: fetches profiles where role IN ('mga','insurer') AND id NOT IN existing parties for this room; form has party_user_id (select) + role (radio mga|insurer); submits to inviteParty
     SendMessage backend-1 [ASSIGN] with deal-rooms actions + queries.
     SendMessage backend-2 [ASSIGN] with parties actions + activity-logging helper.
     SendMessage ui-1 [ASSIGN] with broker dashboard list + deal room detail page spec.
     SendMessage ui-2 [ASSIGN] with new-deal-room form + invite modal spec.
     Pause; respond to [QUESTION].

3. name: "backend-1", subagent_type: "backend-dev"
   Prompt: |
     You are backend-1. Wait for [ASSIGN].
     Implement:
     a) lib/actions/deal-rooms.ts: createDealRoom server action per architect spec. Use zod for validation. Use server-side Supabase client.
     b) lib/queries/deal-rooms.ts: getMyDealRooms (broker), getInvitedDealRooms (mga/insurer), getDealRoomDetail(id) — returns nested object with parties[], activities[], quotes[]
     c) Add error handling with toast messages
     SendMessage pm-lead [DONE] with files modified.

4. name: "backend-2", subagent_type: "backend-dev"
   Prompt: |
     You are backend-2. Wait for [ASSIGN].
     Implement:
     a) lib/actions/parties.ts: inviteParty per architect spec. Verify broker role, verify ownership of deal_room, insert party, insert activity, update deal_room status to 'active'.
     b) lib/utils/activity.ts: logActivity({deal_room_id, actor_id, event_type, event_data}) — single helper used by all server actions
     c) lib/queries/profiles.ts: getInvitablePartyProfiles(deal_room_id) — returns profiles with role mga or insurer not already party in that room
     SendMessage pm-lead [DONE].

5. name: "ui-1", subagent_type: "coder"
   Prompt: |
     You are ui-1. Wait for [ASSIGN].
     Implement:
     a) app/(dashboard)/broker/dashboard/page.tsx: server-fetch getMyDealRooms, render a table or card grid. Each row: insured_name (font-serif text-lg), class_of_business + location (font-sans text-sm), status badge (color per status: silver=draft, success=active, gold=bound, ink=closed), created_at (font-mono text-xs). Click a row → /broker/quotes/<id>. Empty state: friendly message + "+ New Deal Room" CTA.
     b) app/(dashboard)/broker/quotes/[id]/page.tsx: server-fetch getDealRoomDetail. Header: insured_name in font-serif H1, status badge, deal_room id in font-mono small. Two-column body: left = deal room fields card (class, location, coverage, notes), right = right-panel-style activity feed + parties list. "+ Invite Party" button (only if status is draft or active and broker owns it).
     c) Activity feed component (components/shared/activity-feed.tsx): list of events, each row = colored dot (navy=user action, gold=system) + actor name + event description + DM Mono timestamp
     SendMessage pm-lead [DONE].

6. name: "ui-2", subagent_type: "coder"
   Prompt: |
     You are ui-2. Wait for [ASSIGN].
     Implement:
     a) app/(dashboard)/broker/quotes/new/page.tsx: shadcn Form with react-hook-form + zod. Fields per architect spec. Submit calls createDealRoom action; on success redirects via router.push('/broker/quotes/' + id). Inline validation errors in DM Sans red.
     b) components/quotes/invite-party-modal.tsx: shadcn Dialog + Form. On open, fetches getInvitablePartyProfiles(deal_room_id). User picks party + role + clicks Invite. Calls inviteParty. On success, refreshes detail page. Error: toast.
     c) Use serif for the form heading "New Deal Room", DM Sans for labels and inputs.
     d) app/page.tsx: PUBLIC LANDING PAGE — port the marketing page from the Demo v2 HTML at /Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Demo/Slipstream_Demo_v2.html (lines 611–866 inside <div id="pg-landing">). Replicate ALL sections (nav, hero, problem, features, how-it-works, roles, compliance, pricing, cta, footer) with copy VERBATIM from source. Re-style with Tailwind brand tokens — DO NOT pull in the demo's CSS. Libre Baskerville for headings (h1, h2). DM Sans body. DM Mono for tags. Gold (#C49A2C) accent on <em> elements within headings. Server component using getCurrentProfile(). If authed: show "Go to your <role> dashboard" CTA (gold) in nav and hero. If not: show "Sign In" → /login and "Get Started" → /signup. DO NOT auto-redirect authed users from `/` — they should be able to view the landing page anytime.
     e) Update app/(dashboard)/layout.tsx: change the topbar Slipstream wordmark Link href from `homeHref` (which is `/<role>/dashboard`) to `"/"` so clicking the wordmark goes to the landing page.
     SendMessage pm-lead [DONE].

7. name: "qa-senior", subagent_type: "tester"
   Prompt: |
     You are qa-senior. Wait for [ASSIGN].
     Verify Cycle 3 gate end-to-end on the live URL:
     1. Anonymous: GET / on the live URL → must render landing page (NOT redirect to /login). Verify hero headline "Your placement doesn't live in your inbox." is present. Verify "Sign In" and "Get Started" CTAs link to /login and /signup.
     2. Sign in as broker@demo.com → broker/dashboard
     3. From broker dashboard topbar, click the Slipstream wordmark → must navigate to `/` (landing page), NOT to /broker/dashboard. Verify nav now shows "Go to your broker dashboard" CTA.
     4. Navigate to /broker/dashboard. Click + New Deal Room → fill form (Acme Manufacturing, GL, Ontario, GL coverage, 5000000) → submit
     5. Verify redirect to /broker/quotes/<id>; verify all fields display
     6. Click Invite Party → modal; confirm dropdown lists at least 1 mga and 1 insurer profile; pick mga@demo.com as MGA → submit
     7. Verify activity feed shows "created" then "invited" events with correct actor/timestamp
     8. Verify deal_room status badge changed from Draft to Active
     9. Sign out, sign in as mga@demo.com → mga/dashboard. Verify the new deal room appears in the "Invited to" list (RLS allows the read).
     10. Sign out, sign in as insurer@demo.com → insurer/dashboard. Verify the deal room does NOT appear (RLS blocks since insurer wasn't invited).
     SendMessage pm-lead [QA-PASS] with full evidence, or [QA-FAIL] with specific failures.

After spawning, SendMessage pm-lead [ASSIGN] "Begin Cycle 3 — Broker Core Flow".
```

---

## After Cycle 3

You should be able to walk through steps 1–3 of the demo flow as broker. Move to `prompts/cycle-4.md`.
