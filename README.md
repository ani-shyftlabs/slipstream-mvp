# Slipstream MVP — Build Day

**Goal:** Live demo at 4:00 PM today (Friday May 8, 2026) for Connor, Ani, Ankit.
**Stack:** Next.js 14 + Supabase + Vercel + shadcn/ui + Tailwind.
**Approach:** 5 sequential cycles. Each cycle: architect → backend → UI → QA gate → deploy. 7 named agents coordinate via SendMessage; `pm-lead` is the hub.

---

## Prerequisites (do these BEFORE Cycle 1)

| # | Step | How |
|---|---|---|
| 1 | Verify Node 20+ | `node -v` (need v20.0+) |
| 2 | Verify Claude Code | `claude --version` |
| 3 | Verify GitHub auth | `gh auth status` (install gh if missing) |
| 4 | Create Supabase project | Visit https://supabase.com/dashboard → New project → name `slipstream-mvp`, region `Canada Central (ca-central-1)`, generate strong DB password (save it) |
| 5 | Grab Supabase keys | Settings → API → copy: Project URL, `anon` public key, `service_role` secret key. Keep these in a notepad — backend-1 will need them. |
| 6 | Verify Vercel | https://vercel.com — sign in with GitHub if first time |

**Total prep time: ~10 min.** Don't skip step 4–5; backend-1 will ask for these in Cycle 1.

---

## Build cycles

| # | Cycle | Time budget (from start) | Prompt |
|---|---|---|---|
| 1 | **Foundation** — auth, app shell, first deploy | 90 min | `prompts/cycle-1.md` |
| 2 | **Data model + skeleton dashboards** | 45 min | `prompts/cycle-2.md` |
| 3 | **Broker core flow** — create/list/detail deal rooms | 75 min | `prompts/cycle-3.md` |
| 4 | **Quotes + multi-role views** — MGA submits, broker reviews, bind | 60 min | `prompts/cycle-4.md` |
| 5 | **Polish + smoke test** | 20 min hard cap | `prompts/cycle-5.md` |

**Total budget: 290 min (~4h50m).** Stop rules are duration-based — if a cycle exceeds its budget without hitting its gate, `pm-lead` invokes the cut listed in that cycle's prompt and ships what works.

**One absolute deadline still applies:** Cycle 5 must START no later than 30 min before your demo time. Set a separate alarm for that.

---

## How to run a cycle

1. `cd /Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/slipstream_mvp`
2. Read the cycle prompt: `cat prompts/cycle-1.md`
3. Start Claude Code: `claude`
4. Paste the cycle prompt. Wait for agents to spawn.
5. `pm-lead` will report progress as agents finish. Don't interrupt unless something blocks > 10 min.
6. When `qa-senior` reports `[QA-PASS]`, the cycle is done. Move to next cycle.
7. If `qa-senior` reports `[QA-FAIL]`, ask `pm-lead` to dispatch a fix.

---

## Stop rules (duration-based)

| Cycle | At T+budget min if not green → | Reason |
|---|---|---|
| 1 | Drop Libre Baskerville (system serif fallback), keep navy/gold | Custom font loading is the most likely failure point |
| 2 | Defer `activities` table to Cycle 3 | Don't block role routing on the audit log |
| 3 | Cut MGA + insurer to one read-only screen each | Broker flow is the demo spine — protect it |
| 4 | Cut export + close steps; demo flow ends at "Bound" | A bound deal room is a complete climax |
| 5 | HARD STOP at 20 min — ship whatever exists | Protect the demo buffer |

**Always:** never demo on localhost. Every cycle ends with a successful Vercel deploy.

---

## Reference docs (already staged)

- `CLAUDE.md` — project rules, brand tokens, scope cut, invariants
- `docs/PRD_DIGEST.md` — what we're building, why
- `docs/AGENTS.md` — agent roster, SendMessage protocol
- `prompts/cycle-{1..5}.md` — copy-paste prompts for each cycle

---

## Demo accounts (will be seeded in Cycle 2)

| Email | Password | Role |
|---|---|---|
| broker@demo.com | SlipstreamDemo2026 | broker |
| mga@demo.com | SlipstreamDemo2026 | mga |
| insurer@demo.com | SlipstreamDemo2026 | insurer |
