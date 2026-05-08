# Slipstream — Build Digest

> Synthesized from PRD v2, service architecture, deal-room lifecycle, brand book, Demo v2, and Demo v2 walkthrough. This is the canonical "what are we building" reference for all agents in this MVP.

---

## 1. Product (one paragraph)

Slipstream is a specialty / E&S insurance placement operating system. It replaces fragmented email + spreadsheet workflows with structured **deal rooms** that give brokers, MGAs, and wholesalers role-scoped access, real-time coordination, DUA-backed compliance validation, and an immutable audit trail from submission to bind. The deal room is not a feature — it is the product.

## 2. Personas

| Persona | What they do | MVP build priority |
|---|---|---|
| **Retail Broker** | Creates deal rooms, uploads submission, invites parties, gates all party-to-party action, selects winning quote, drives bind | **Primary** — full write |
| **MGA** | Quotes inside their verified DUA. System validates class / geography / line size / premium floor. Triggers referrals when out of scope | **Secondary** — write quotes only |
| **Wholesaler** | Sources Lloyd's / E&S terms when risk is beyond MGA scope. Invited on demand | **Tertiary** — read only for MVP |
| **Insurer** | (For our 3-role MVP) — read-only view of bound deals, used as the third stub role | **Tertiary** — read only |

## 3. Top 8 jobs-to-be-done (PRD priority)

1. Create deal room with risk metadata and submission docs
2. Search directories with DUA triage scores; invite parties with explicit role assignment
3. Upload new submission versions; flag stale quotes
4. Submit quote against current doc version; system validates against DUA
5. Trigger referral when DUA breached; broker approves/denies
6. Broker reviews quotes in comparison view; opens private threads
7. Select winning quote and initiate bind; deal room enters Bound (Awaiting Docs)
8. Export compliance package (JSON manifest + PDF bundle + audit trail)

**For the 4 PM MVP cut, only #1, #2 (simplified — pick from dropdown), #4 (no DUA validation), #6 (simplified comparison), #7 (state transition only), and a mocked #8 are in scope.**

---

## 4. Service architecture (full target — most is post-MVP)

The production architecture has 11 domain services. Most are **post-MVP**.

| # | Service | MVP? | What we do today |
|---|---|---|---|
| 1 | Deal Room Engine | **YES** | Lifecycle state machine, basic CRUD |
| 2 | Document Processing | NO | Cut. Replace with structured form fields. |
| 3 | DUA Compliance | NO | Cut. No validation today. |
| 4 | Directory Service | NO | Cut. Hardcode 3 demo parties. |
| 5 | Quote & Placement | **PARTIAL** | Quote submit + comparison; no tower / mud map |
| 6 | Referral Workflow | NO | Cut. |
| 7 | Communication | **PARTIAL** | Activity feed only. No private threads. |
| 8 | Audit & Compliance | **PARTIAL** | Append-only `activities` table; mocked export |
| 9 | Notification Engine | NO | Cut. |
| 10 | Search & Discovery | NO | Cut. |
| 11 | Placement Graph | NO | Cut. |

### Production stack (NOT today's stack)

The architecture spec calls for: PostgreSQL 16, S3, Neo4j 5.x, Milvus 2.4+, Redis Streams, Temporal, olmocr, LiteLLM, Python 3.11+ FastAPI + gRPC, Kubernetes (EKS), OpenTelemetry + Langfuse.

### Today's stack (MVP)

Next.js 14 (App Router) + Supabase (Postgres + Auth + RLS) + Vercel + shadcn/ui + Tailwind. Single deploy. PostgreSQL only.

---

## 5. Deal-room lifecycle (the spine)

### States
```
Draft → Active → Bound (Awaiting Docs) → Closed (Archived)
```

### Stages within Active (full PRD; MVP simplified)

| Stage | State | Trigger | Actor | MVP build |
|---|---|---|---|---|
| 1. Creation | Draft | Broker creates DR | Broker | YES — form |
| 2. Party Engagement | Active | Broker invites parties | Broker | YES — dropdown of seeded parties |
| 3. Doc Versioning | Active | New doc version uploaded | Broker | NO — cut |
| 4. Quoting | Active | MGA/Wholesaler submits quote | MGA/Wholesaler | YES — manual entry |
| 5. Referral | Active | DUA breach | MGA → Broker | NO — cut |
| 6. Quote Review | Active | Broker compares quotes | Broker | YES — read-only table |
| 7. Bind & Close | Bound → Closed | Broker selects winner | Broker | YES — state transition |

### Quote status lifecycle

`Submitted → (Stale → Reaffirmed | Withdrawn)`. **MVP: only `Submitted` and `Won`/`Lost` after bind.**

### Non-negotiable invariants (production AND MVP)

1. Quote confidentiality — competing parties never see each other's quotes
2. Audit trail from day one — append-only, immutable
3. Broker is the gate — all party-to-party action goes through broker
4. RLS first — permission model designed before features
5. Document versioning as events — never delete (MVP: skip versioning entirely)

---

## 6. Brand

### Colors (use exactly these hex values)

| Role | Hex | Use |
|---|---|---|
| Primary navy | `#0F2540` | Topbar, primary buttons, brand mark |
| Gold accent | `#C49A2C` | Active nav state, highlights, "premium" CTAs |
| Ink | `#0E1920` | Body text |
| Silver | `#DDE4E9` | Borders, dividers, surface backgrounds |
| Success green | `#0D5C3A` | Bound, compliant |
| Warning amber | `#7A4A00` | Stale, partial-match |
| Error red | `#6B1E1E` | Out-of-scope, validation errors |

### Typography

- **Libre Baskerville** (400, 700) — H1, H2, "Slipstream" wordmark
- **DM Sans** (300, 400, 500, 600) — body, UI, buttons, labels
- **DM Mono** (300, 400, 500) — IDs, timestamps, deal codes, premiums

### Voice & tone

Archetype: **The Architect** + **The Sage**. Precise, data-dense, structured, evidence-based. Insider knowledge. NOT playful, NOT gamified, NOT hype-forward, NOT condescending.

In product UI: precise, data-dense, zero decoration.

---

## 7. Demo v2 — UI patterns

### App shell (3-column)
- **Topbar:** 52px, navy bg, "Slipstream" wordmark in serif, breadcrumb, user chip
- **Left sidebar:** 220px, nav items (gold accent on active), user role badge
- **Main:** fluid, off-white bg
- **Right panel:** 300px, collapsible, tabs (Activity / Parties)

### Notable patterns
- Color-coded status badges (Draft / Active / Bound / Closed)
- Inline status indicators (green checkmarks for compliance pass, amber warn, red fail)
- Hover transitions ≤ 200ms
- Monospace fonts for IDs, timestamps, premiums
- Serif for display values (insured name, big numbers)
- Cards lift slightly on hover (subtle shadow)

### Components implied
- Cards, badges, tables, progress bars, activity dots, modals/drawers, forms

### What "good UI" means here
Senior underwriters and brokers must trust the tool on sight. **Data density beats decoration. Clarity beats delight.** Every layout decision must be defensible.

---

## 8. Data entities (MVP — concrete)

### Tables

```sql
profiles
  id (uuid, FK to auth.users)
  email (text)
  full_name (text)
  org_name (text)
  role (enum: 'broker' | 'mga' | 'insurer')
  created_at

deal_rooms
  id (uuid)
  broker_id (uuid, FK profiles)
  insured_name (text)
  class_of_business (text)        -- 'GL', 'Property', 'Cyber', 'D&O', 'E&O', 'Casualty'
  location (text)                  -- province/state, simple string for MVP
  coverage_type (text)             -- enum or free text
  coverage_amount (numeric)
  notes (text)
  status (enum: 'draft' | 'active' | 'bound' | 'closed')
  winning_quote_id (uuid, FK quotes, nullable)
  created_at, updated_at

parties
  id (uuid)
  deal_room_id (uuid, FK)
  party_user_id (uuid, FK profiles)  -- the MGA/insurer user
  role (enum: 'mga' | 'insurer')
  invited_at
  -- composite unique (deal_room_id, party_user_id)

quotes
  id (uuid)
  deal_room_id (uuid, FK)
  party_id (uuid, FK parties)
  premium (numeric)
  deductible (numeric)
  coverage_limit (numeric)
  terms (text)                     -- free text for MVP
  status (enum: 'submitted' | 'won' | 'lost')
  submitted_at

activities
  id (uuid)
  deal_room_id (uuid, FK)
  actor_id (uuid, FK profiles)
  event_type (text)                -- 'created' | 'invited' | 'quote_submitted' | 'bound' | 'closed'
  event_data (jsonb)
  created_at
  -- INSERT only via RLS
```

### RLS summary (architect designs full policies)
- `profiles`: a user can SELECT their own row + rows of users in deal rooms they share
- `deal_rooms`: broker sees their own; mga/insurer see only deal rooms they're a party in
- `parties`: visible to broker who owns the room + the party themselves
- `quotes`: visible to broker who owns the room + the party who submitted (not other parties)
- `activities`: same visibility as `deal_rooms`; INSERT only

---

## 9. The 4 PM demo flow (~4 minutes)

**Setup:** 3 demo accounts pre-logged into 3 browser tabs.

1. **[Broker tab]** Create deal room — fill form (Acme Manufacturing, GL, Ontario, $5M). Click Create. DR appears in list, status `Draft`.
2. **[Broker tab]** Open the DR detail page. Click "Invite Party" → dropdown shows seeded MGA + insurer accounts → select MGA, role MGA → Confirm. Activity feed shows "MGA invited." DR auto-transitions to `Active`.
3. **[MGA tab]** Refresh dashboard. New deal room appears in "Invited to" list. Open it.
4. **[MGA tab]** Click "Submit Quote." Fill form (premium $250K, deductible $25K, limit $5M, terms "Standard GL terms 12mo"). Submit. Activity feed updates.
5. **[Broker tab]** Refresh DR detail. "Quotes" tab shows MGA's quote. Show that other-MGA quote would not be visible if there were one.
6. **[Broker tab]** Click "Bind" on the MGA's quote. Confirmation modal. Confirm. DR status → `Bound`. Activity feed shows "Bound."
7. **[Broker tab]** Click "Export Compliance Package." Download a JSON file with deal room + quotes + activity log (mocked but real JSON). DR status → `Closed`.
8. **[Insurer tab]** Refresh dashboard. Bound deal appears in their read-only view.

Remaining demo time: roadmap & Q&A.

---

## 10. Risks & explicit deferrals

| Risk | Mitigation |
|---|---|
| Architecture spec is FastAPI + Neo4j + Milvus + Temporal | Use Next.js + Supabase for MVP; production architecture is a v2 concern |
| Document upload + OCR is core to PRD but a 4-hour sub-project | Cut. Replace with structured form fields. |
| Tower visualization is "most technically complex UI component" | Cut. Phase 3 only. Single-coverage placement only today. |
| RLS misconfiguration → quote leak | `architect` designs RLS first; `qa-senior` verifies cross-role data isolation in every cycle |
| DUA verification process not specified for v1 | Skip entirely today; DUA is post-MVP |
| Multi-role demo logistics (3 tabs, 3 roles) | Seed 3 demo accounts; have all 3 logged in pre-demo |

---

## 11. Source files (in case agents need to re-read)

- PRD: `/Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Shared/Shyftlabs/Slipstream_ PRD v2.pdf`
- Architecture: `/Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Shared/Shyftlabs/slipstream-service-architecture.html`
- Lifecycle: `/Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Shared/Shyftlabs/slipstream-deal-room-lifecycle.html`
- Brand book: `/Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Shared/From Connor/Org Branding/slipstream-brand-book (3).html`
- Demo v2: `/Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Demo/Slipstream_Demo_v2.html`
- Demo v2 walkthrough: `/Users/anirudhkapoor/Documents/Claude/Projects/Slipstream/Demo/Slipstream_Demo_v2_Walkthrough.pdf`
