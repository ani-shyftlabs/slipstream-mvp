# Slipstream MVP — Agent Roster & Coordination

Seven named agents coordinate this build. All run in background. `pm-lead` is the hub.

## Spawning rule

At the start of each cycle, the human (Ani) pastes a cycle prompt into Claude Code. That prompt instructs Claude Code to spawn the agents listed for that cycle in **one message**, all with `run_in_background: true` and a `name` matching this roster.

After spawn, the human steps back. Agents work and message back via `SendMessage`. `pm-lead` reports cycle progress to the human in chat.

---

## Roster

### `pm-lead` — Technical Project Manager (orchestrator)
- **subagent_type:** `hierarchical-coordinator`
- **Owns:** scope, sequencing, status, blocking scope creep, demo readiness, stop-rule authority
- **Reports to:** the human (Ani)
- **Inputs:** cycle goal + gate from each cycle prompt
- **Outputs:** task assignments to other agents via `SendMessage [ASSIGN]`
- **Authority:** can call a cycle done; can invoke a stop rule from `CLAUDE.md`

### `architect` — System Architect
- **subagent_type:** `system-architect`
- **Owns:** data model, RLS policies, route map, server action contracts, brand-to-Tailwind mapping, enforcement of invariants from CLAUDE.md
- **Outputs (typical):** schema SQL, RLS SQL, type definitions, route plan, contract docs in chat
- **Reports to:** `pm-lead`
- **Hands work to:** `backend-1`, `backend-2`, `ui-1`, `ui-2` via `SendMessage [ASSIGN]`

### `backend-1` — Backend Dev: Auth & Data Foundation
- **subagent_type:** `backend-dev`
- **Owns:** Supabase client setup, schema migrations, auth flows, deal_rooms server actions
- **Files:** `lib/supabase/*`, `supabase/migrations/*`, `lib/actions/auth.ts`, `lib/actions/deal-rooms.ts`, `middleware.ts`
- **Reports to:** `pm-lead`

### `backend-2` — Backend Dev: Flow & State
- **subagent_type:** `backend-dev`
- **Owns:** parties, quotes, activity log, status transitions, seed data
- **Files:** `lib/actions/parties.ts`, `lib/actions/quotes.ts`, `lib/queries/*`, `supabase/seed.sql`
- **Reports to:** `pm-lead`
- **Note:** joins from Cycle 2 onward

### `ui-1` — UI Lead: Shell & Broker
- **subagent_type:** `coder`
- **Owns:** app shell (topbar/sidebar/right panel), broker dashboard, deal room detail view, brand token integration into Tailwind, font loading
- **Files:** `app/(dashboard)/layout.tsx`, `components/shared/*`, `app/(dashboard)/broker/dashboard/page.tsx`, `app/(dashboard)/broker/quotes/[id]/page.tsx`, `tailwind.config.ts`, `app/layout.tsx`
- **Reports to:** `pm-lead`

### `ui-2` — UI Lead: Forms & Multi-Role Detail
- **subagent_type:** `coder`
- **Owns:** create deal room form, quote submission form, MGA + insurer dashboards, comparison view
- **Files:** `app/(dashboard)/broker/quotes/new/page.tsx`, `app/(dashboard)/mga/*`, `app/(dashboard)/insurer/*`, `components/quotes/*`, `components/forms/*`
- **Reports to:** `pm-lead`
- **Note:** joins from Cycle 2 onward

### `qa-senior` — Senior QA
- **subagent_type:** `tester`
- **Owns:** smoke tests on the live URL, RLS verification (cross-role data isolation), pre-demo dry run
- **Outputs:** pass/fail per cycle gate with specific evidence (URLs, console output, screenshots if relevant)
- **Authority:** can BLOCK cycle completion if gate fails; final word on whether to advance to next cycle

---

## SendMessage protocol

```
SendMessage({
  to: "agent-name",            // e.g. "architect", "backend-1"
  summary: "[TAG] one-line",   // e.g. "[ASSIGN] design schema"
  message: "structured payload"
})
```

### Standard tags

| Tag | Meaning | Sender → Receiver |
|---|---|---|
| `[ASSIGN]` | Task assignment | `pm-lead` → others; `architect` → backend/ui |
| `[DONE]` | Task complete; payload contains output paths/URLs | any → `pm-lead` |
| `[BLOCK]` | Blocker hit; payload describes blocker | any → `pm-lead` |
| `[QUESTION]` | Need clarification on a contract | usually backend/ui → `architect` |
| `[QA-FAIL]` | Gate failed; payload lists failures | `qa-senior` → `pm-lead` |
| `[QA-PASS]` | Gate passed; payload includes live URL + verification log | `qa-senior` → `pm-lead` |

### Standard payload shapes

`[ASSIGN]`:
```
Goal: <one-sentence outcome>
Deliverables: <bullet list of files / functions / endpoints>
Contracts: <inputs/outputs, types if relevant>
Dependencies: <which other agent's [DONE] you wait for, if any>
```

`[DONE]`:
```
Files: <list of files created/modified>
URLs: <Vercel URL, GitHub URL, etc.>
Notes: <gotchas for next agent>
```

`[QA-PASS]` / `[QA-FAIL]`:
```
Live URL: <vercel URL>
Tests run: <list>
Result: <PASS or list of failures>
Evidence: <quoted output, error messages>
```

---

## Cycle pipeline pattern (within one cycle)

```
human → pm-lead: cycle goal + gate (in cycle prompt)
  ↓
pm-lead → architect [ASSIGN]: design contracts
  ↓
architect → backend-1, backend-2 [ASSIGN]: schema + actions
architect → ui-1, ui-2 [ASSIGN]: route map + component contracts
  ↓ (backend and UI work in parallel)
backend-1, backend-2 → pm-lead [DONE]: server side ready
ui-1, ui-2 → pm-lead [DONE]: UI ready
  ↓
pm-lead → qa-senior [ASSIGN]: verify gate
  ↓
qa-senior → pm-lead [QA-PASS] or [QA-FAIL]
  ↓
pm-lead → human: cycle status report
```

---

## Anti-patterns (do not do)

- Polling for status (`while not done: check`). Always SendMessage and wait for the reply.
- Spawning agents one at a time across multiple messages. ONE message at cycle start, all parallel.
- Forgetting the `name` field. Without a name, agents aren't addressable.
- Editing files outside your owned area without [QUESTION] to architect.
- Adding scope from the OUT-OF-SCOPE list in CLAUDE.md without `pm-lead` approval.
- Declaring a cycle done without `qa-senior` [QA-PASS].
