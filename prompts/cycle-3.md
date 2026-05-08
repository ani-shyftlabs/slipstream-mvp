# Cycle 3 — Broker Core Flow

**Time budget:** 75 min from cycle start
**Goal:** Broker can create a deal room, see it in their dashboard, open the detail page, invite a party.
**Gate:** End-to-end as broker: create → list → open detail → invite MGA → activity feed shows the events. Activities table has rows. RLS holds (MGA now sees the deal room they were invited to).

---

## Paste the following into Claude Code

```
Starting Cycle 3 of the Slipstream MVP build. Cycle 2 is green; data model + role routing in place.

FIRST, re-read ./CLAUDE.md and ./docs/PRD_DIGEST.md (sections 8 and 9 especially).

CYCLE 3 GOAL: Broker can complete the create→invite portion of the demo flow end-to-end.

CYCLE 3 GATE (qa-senior verifies):
1. Broker dashboard shows a list of their deal rooms (empty initially, then populated after creating one)
2. "+ New Deal Room" button on broker dashboard opens a form at /broker/quotes/new
3. Form has fields: insured_name (text), class_of_business (select), location (text), coverage_type (select), coverage_amount (number), notes (textarea). Validates with zod. Submits to a server action that inserts a deal_rooms row + an activities row ("created").
4. After create, broker is redirected to /broker/quotes/<id> (detail page) showing the deal room data
5. Detail page has an "Invite Party" button → modal/form to select an mga or insurer profile and a role; submission inserts a parties row + an activities row ("invited") + transitions deal_room status from 'draft' to 'active'
6. After invite, MGA logging in sees the deal room in their dashboard list (RLS verified — MGA can SELECT this deal_room)
7. Activity feed on the detail page renders the events in reverse chronological order (DM Mono for timestamps, DM Sans for text, navy/gold accents)
8. Live deploy succeeds

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
     SendMessage pm-lead [DONE].

7. name: "qa-senior", subagent_type: "tester"
   Prompt: |
     You are qa-senior. Wait for [ASSIGN].
     Verify Cycle 3 gate end-to-end on the live URL:
     1. Sign in as broker@demo.com → broker/dashboard
     2. Click + New Deal Room → fill form (Acme Manufacturing, GL, Ontario, GL coverage, 5000000) → submit
     3. Verify redirect to /broker/quotes/<id>; verify all fields display
     4. Click Invite Party → modal; confirm dropdown lists at least 1 mga and 1 insurer profile; pick mga@demo.com as MGA → submit
     5. Verify activity feed shows "created" then "invited" events with correct actor/timestamp
     6. Verify deal_room status badge changed from Draft to Active
     7. Sign out, sign in as mga@demo.com → mga/dashboard. Verify the new deal room appears in the "Invited to" list (RLS allows the read).
     8. Sign out, sign in as insurer@demo.com → insurer/dashboard. Verify the deal room does NOT appear (RLS blocks since insurer wasn't invited).
     SendMessage pm-lead [QA-PASS] with full evidence, or [QA-FAIL] with specific failures.

After spawning, SendMessage pm-lead [ASSIGN] "Begin Cycle 3 — Broker Core Flow".
```

---

## After Cycle 3

You should be able to walk through steps 1–3 of the demo flow as broker. Move to `prompts/cycle-4.md`.
