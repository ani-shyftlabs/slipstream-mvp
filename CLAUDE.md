# Slipstream MVP — Project Rules

> Extends the parent `/Slipstream/CLAUDE.md` (claude-flow swarm config, memory, hooks). MVP-specific overrides below take precedence within this folder.

## Mission

Ship a live, demoable insurance placement MVP by **4:00 PM Friday May 8, 2026**. Audience: Connor (domain expert), Ani (PM), Ankit (engineering). Internal progress demo, not external sales — but Connor will judge insurance accuracy and UX.

## Stack (locked — do not change)

- **Framework:** Next.js 14 App Router, TypeScript, server actions for mutations
- **DB + Auth:** Supabase (Postgres 16 + RLS + Auth)
- **Hosting:** Vercel (deploy on every cycle, never demo localhost)
- **UI:** shadcn/ui + Tailwind
- **Fonts:** Libre Baskerville (display), DM Sans (body), DM Mono (data)
- **Single project, single deploy.** No separate frontend/backend folders. Backend lives in `app/api`, `lib/actions/`, `lib/queries/`.

## Scope cut for 4 PM (NON-NEGOTIABLE)

### IN scope
- Email/password auth (no SSO, no email verification, no magic links, no OAuth)
- 3 roles: **broker** (full write), **MGA** (write quotes only), **insurer** (read only)
- Deal room: create, list, detail
- Submission as **structured form fields** (insured name, class of business, location, coverage type, coverage limit, notes) — NOT document upload, NOT OCR
- Party invitation as a "select from dropdown of seeded parties + assign role" action
- Quote submission (premium, deductible, coverage limit, terms text — manual entry, NO DUA validation)
- Quote comparison view for broker (table of quotes per deal room)
- Bind action (broker selects winning quote → deal room status transitions to `Bound`)
- Activity feed (read-only, derived from inserts to `activities` table)
- Seeded demo accounts (broker@demo.com, mga@demo.com, insurer@demo.com — all password `SlipstreamDemo2026`)
- Seeded sample data (3–5 deal rooms in various states)

### OUT of scope (NEVER add today; if tempted, ask `pm-lead` first)
- File upload, OCR, document classification, document versioning
- DUA verification logic, referral workflow, market triage scores
- Tower visualization, mud map, layer management
- Real audit export (JSON manifest + PDF bundle) — show a "Download" button that returns mock JSON
- Notifications, email, real-time updates, websockets
- Directory search, MGA profiles, capacity-provider linkage
- Neo4j, Milvus, Temporal, Redis Streams, FastAPI, gRPC
- Mobile responsive beyond basic flexbox
- Tests beyond `qa-senior`'s smoke tests on the live URL

## Critical invariants (architect MUST enforce; qa-senior MUST verify)

1. **Quote confidentiality.** A user from one party org can NEVER read another party's quotes. RLS policy: `quotes` rows are visible only to (a) the broker who owns the deal room, (b) the party that submitted the quote.
2. **Broker is the gate.** Only broker role can create deal rooms, invite parties, transition state, bind. Enforce via RLS + server-action role check.
3. **Activity log is append-only.** No UPDATE, no DELETE. RLS: only INSERT allowed for authenticated users; SELECT scoped by deal_room_id visibility.
4. **RLS on every table.** No exceptions. Default deny; explicit allow per role.
5. **Mutations only via server actions.** No `createClient()` mutations from client components. Reduces RLS bypass surface.
6. **One Vercel deploy per cycle.** Smoke test happens on the deployed URL, not localhost.

## Brand tokens (UI agents must use these)

```css
/* tailwind.config.ts → theme.extend.colors */
--color-navy: #0F2540;       /* primary */
--color-gold: #C49A2C;       /* accent */
--color-ink: #0E1920;        /* text */
--color-silver: #DDE4E9;     /* borders, surfaces */
--color-success: #0D5C3A;
--color-warning: #7A4A00;
--color-error: #6B1E1E;

/* fonts via next/font/google in app/layout.tsx */
font-serif:  Libre Baskerville (400, 700)  → H1, H2, "Slipstream" wordmark
font-sans:   DM Sans (300, 400, 500, 600)  → body, UI, buttons, labels
font-mono:   DM Mono (300, 400, 500)       → IDs, timestamps, premiums, deal-room codes
```

UI archetype: **Architect / Sage**. Precise, data-dense, restrained. No playful animations. Hover transitions ≤ 200ms. Lloyd's underwriters must trust on sight.

## App shell layout (from Demo v2 — UI agents follow this)

- **Topbar:** 52px, navy bg (`--color-navy`), serif "Slipstream" wordmark left, breadcrumb center, user chip right (DM Sans)
- **Left sidebar:** 220px, off-white bg, nav items (DM Sans), gold accent on active route
- **Main:** fluid, `#FAFAFA` bg, max-width 1280px
- **Right panel:** 300px (collapsible), tabs: Activity / Parties (only on deal-room detail pages)

## Agent roster

See `docs/AGENTS.md`. Seven named agents: `pm-lead`, `architect`, `backend-1`, `backend-2`, `ui-1`, `ui-2`, `qa-senior`.

- All agents `run_in_background: true`
- All coordinate via `SendMessage`
- `pm-lead` orchestrates and reports to the human (Ani)
- After spawning, the human steps back and watches

## File structure (target)

```
slipstream_mvp/
├── app/
│   ├── (auth)/{login,signup}/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # app shell (topbar, sidebar, right panel slot)
│   │   ├── broker/{dashboard,quotes/{page,new,[id]}}/page.tsx
│   │   ├── mga/{dashboard,quotes/[id]}/page.tsx
│   │   └── insurer/{dashboard,quotes/[id]}/page.tsx
│   ├── api/auth/callback/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/{ui,auth,quotes,shared}/...
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── actions/{auth,deal-rooms,parties,quotes}.ts
│   ├── queries/{deal-rooms,quotes,activities}.ts
│   ├── types/database.ts
│   ├── constants/coverage-types.ts
│   └── utils.ts
├── supabase/{migrations,seed.sql}
├── middleware.ts
├── tailwind.config.ts (with brand tokens)
├── components.json (shadcn)
├── .env.local (NEVER COMMIT)
├── .env.example
└── package.json
```

## Project conventions

- Keep files under 500 lines (parent CLAUDE.md rule)
- Use `cn()` helper for conditional classes
- Server components by default; mark `"use client"` only when needed
- All forms use shadcn `Form` + `react-hook-form` + `zod` validation
- All mutations are server actions, returning `{ data, error }` shape
- Errors surface as toast via shadcn `useToast`

## Stop rules (cycle-level)

| If… | Then… |
|---|---|
| Cycle 1 not green by 11:00 AM | Drop Libre Baskerville (use `serif` fallback), keep navy/gold |
| Cycle 3 not green by 1:30 PM | Cut MGA + insurer to a single read-only screen each |
| Cycle 4 not green by 3:00 PM | Freeze, demo what works. Don't keep adding. |
| Vercel deploy fails twice in a row | `pm-lead` blocks; ask Ani for guidance |

`pm-lead` has authority to call a stop rule.
