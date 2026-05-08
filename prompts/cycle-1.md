# Cycle 1 — Foundation

**Time budget:** 90 min from cycle start
**Goal:** Live Vercel URL with email/password auth and brand-true app shell.
**Gate:** Live URL works → sign up → log out → log in roundtrip succeeds → app shell renders with navy topbar + serif "Slipstream" wordmark.

## Prerequisites (verify before pasting prompt)

- [ ] In `slipstream_mvp/` in terminal
- [ ] `node -v` returns v20+
- [ ] `claude --version` works
- [ ] `gh auth status` clean
- [ ] Supabase project created; have URL + anon key + service_role key in clipboard

---

## Paste the following into Claude Code

```
I'm starting Cycle 1 of the Slipstream MVP build. We're using a 7-agent crew that coordinates via SendMessage. The plan is in this directory.

FIRST, read these files to load context:
- ./CLAUDE.md
- ./docs/PRD_DIGEST.md
- ./docs/AGENTS.md

CYCLE 1 GOAL: A live Vercel URL with email/password auth working and a brand-true app shell.

CYCLE 1 GATE (qa-senior must verify before declaring cycle done):
1. Vercel deploy succeeds on the production branch
2. Live URL is accessible and returns 200
3. Visitor can: sign up → log out → log in (roundtrip works on the live URL)
4. After login, app shell renders with: 52px navy topbar (#0F2540), serif "Slipstream" wordmark (Libre Baskerville), 220px left sidebar, off-white main bg
5. shadcn/ui components installed and working (Button, Input, Card, Form, Label)
6. Tailwind config has Slipstream brand color tokens
7. Print the live Vercel URL in chat

Spawn the following 5 named agents in ONE message, all run_in_background: true. Use the Task tool with name + subagent_type + prompt + run_in_background. The agents below cover Cycle 1 only — backend-2 and ui-2 join in Cycle 2.

AGENTS TO SPAWN (all in one message):

1. name: "pm-lead", subagent_type: "hierarchical-coordinator"
   Prompt: |
     You are pm-lead for the Slipstream MVP build. Read ./CLAUDE.md, ./docs/PRD_DIGEST.md, ./docs/AGENTS.md.
     Your job for Cycle 1: orchestrate the foundation cycle. Sequence: architect designs → backend-1 + ui-1 build in parallel → qa-senior verifies the gate.
     Cycle 1 goal: live Vercel URL with auth + brand-true app shell.
     First action: SendMessage to "architect" with [ASSIGN] — design the auth flow, env var structure, route map (auth group + dashboard group), Tailwind brand config, and font loading strategy. Hand contracts to backend-1 (auth + Supabase plumbing) and ui-1 (app shell + brand tokens + shadcn).
     After architect responds, monitor backend-1 and ui-1 for [DONE]. When both report done, send [ASSIGN] to qa-senior to verify the gate.
     When qa-senior reports [QA-PASS], post the live URL in chat for the human. If [QA-FAIL], dispatch a fix.
     Stop rule: track elapsed time since this cycle started. At T+90 min, if the gate isn't green, instruct ui-1 to drop Libre Baskerville (use serif fallback) and ship. Report the cut to the human.

2. name: "architect", subagent_type: "system-architect"
   Prompt: |
     You are architect. Read ./CLAUDE.md and ./docs/PRD_DIGEST.md. Wait for [ASSIGN] from pm-lead.
     For Cycle 1, design:
     - Auth flow: Supabase email/password, server actions for signIn/signUp/signOut, middleware-based session refresh on every request
     - Env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
     - Route structure: app/(auth)/{login,signup}/page.tsx; app/(dashboard)/layout.tsx as the shell; app/page.tsx redirects to dashboard or login based on session
     - Tailwind theme: extend colors with navy/gold/ink/silver/success/warning/error per CLAUDE.md
     - Font loading: next/font/google for Libre Baskerville (400, 700), DM Sans (300-600), DM Mono (300-500); apply via CSS variables in app/layout.tsx
     - Middleware route protection: redirect unauthenticated users from /(dashboard)/* to /login
     SendMessage [ASSIGN] to backend-1 with: env structure, lib/supabase/{client,server,middleware}.ts contracts, lib/actions/auth.ts contract (signIn, signUp, signOut), middleware.ts requirements.
     SendMessage [ASSIGN] to ui-1 with: tailwind.config.ts brand tokens, app/layout.tsx font setup, app/(dashboard)/layout.tsx shell spec (52px navy topbar with wordmark, 220px sidebar placeholder, fluid main, no right panel yet), shadcn init + components to add (button, input, card, form, label), styling for /login and /signup pages.
     Then pause. Respond to [QUESTION] messages from backend-1 or ui-1. Do NOT write code yourself.

3. name: "backend-1", subagent_type: "backend-dev"
   Prompt: |
     You are backend-1. Read ./CLAUDE.md. Wait for [ASSIGN] from architect.
     Then execute:
     a) Run `npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-eslint` (answer Yes to overwrite if prompted; this directory is empty)
     b) Install: @supabase/supabase-js @supabase/ssr
     c) Create lib/supabase/client.ts (browser client), lib/supabase/server.ts (server client with cookies), lib/supabase/middleware.ts (session refresh helper) per @supabase/ssr docs
     d) Create middleware.ts at root that calls the session-refresh helper and redirects unauthenticated requests for /broker/*, /mga/*, /insurer/* to /login
     e) Create lib/actions/auth.ts with server actions: signIn(formData), signUp(formData), signOut() — all returning {data, error}
     f) Create app/(auth)/login/page.tsx and app/(auth)/signup/page.tsx — wire to the server actions; will be styled by ui-1
     g) Create .env.example with Supabase placeholders. Do NOT create .env.local — the human will paste keys after.
     h) git init; commit; create GitHub repo via `gh repo create slipstream-mvp --public --source=. --push`
     i) Deploy to Vercel: `npx vercel --yes` (link to GitHub repo); set env vars via `npx vercel env add ...` for the three Supabase vars (you'll need to ASK THE HUMAN for the values via SendMessage to pm-lead with [BLOCK]: "need Supabase URL + anon key + service_role key from human")
     j) Trigger production deploy with `npx vercel --prod`
     STOP RULE: if Vercel deploy fails twice, SendMessage pm-lead [BLOCK].
     When live URL works: SendMessage pm-lead [DONE] with the Vercel URL, GitHub URL, and a list of files created.

4. name: "ui-1", subagent_type: "coder"
   Prompt: |
     You are ui-1. Read ./CLAUDE.md (especially brand tokens + shell layout). Wait for [ASSIGN] from architect.
     Then execute (work in parallel with backend-1; both edit different files):
     a) Update tailwind.config.ts: extend theme.colors with { navy, gold, ink, silver, success, warning, error } using hex codes from CLAUDE.md; extend theme.fontFamily with { serif: ['var(--font-serif)'], sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] }
     b) Update app/layout.tsx: import Libre Baskerville (weights 400, 700, variable: '--font-serif'), DM Sans (weights 300-600, variable: '--font-sans'), DM Mono (weights 300-500, variable: '--font-mono') from next/font/google. Apply variables to <html className>. Default body font: sans.
     c) Initialize shadcn/ui: `npx shadcn@latest init` (style: default, base color: slate, CSS variables: yes). Add components: button, input, card, form, label, toast.
     d) Create app/(dashboard)/layout.tsx: 3-section layout. Topbar (52px h, bg-navy, text-white, "Slipstream" in font-serif text-2xl, breadcrumb in font-sans, user-chip with sign-out button). Sidebar (220px w, bg-white, border-r border-silver, nav placeholder list with Dashboard / Deal Rooms — gold accent on active route via aria-current). Main (flex-1, bg-[#FAFAFA], p-6).
     e) Style app/(auth)/login/page.tsx and signup/page.tsx: centered card, "Slipstream" wordmark above the form in font-serif text-3xl, shadcn Form + Input + Button. Card has border-silver, subtle shadow.
     f) Style app/page.tsx as a server component: redirect to /broker/dashboard if session exists, /login otherwise (until role-based redirect lands in Cycle 2, hardcode broker).
     g) Create components/shared/sign-out-button.tsx using shadcn Button + the signOut server action.
     If you have a [QUESTION] for architect, send it. Otherwise execute.
     When done: SendMessage pm-lead [DONE] with files modified. Do NOT trigger deploy — backend-1 owns deploy.

5. name: "qa-senior", subagent_type: "tester"
   Prompt: |
     You are qa-senior. Read ./CLAUDE.md. Wait for [ASSIGN] from pm-lead (which comes after backend-1 and ui-1 both report [DONE]).
     Verify the Cycle 1 gate using the live URL pm-lead provides:
     1. curl -I <url> — must return 200 (or 307 redirect to /login)
     2. curl <url>/login — must return HTML containing "Slipstream"
     3. Use browser automation (e.g., curl + cookie file, or describe manual steps for Ani if no browser tool) to: navigate to /signup, submit test+cycle1@slipstream.test / SlipstreamDemo2026, verify redirect to /broker/dashboard, click sign-out, confirm redirect to /login, sign back in
     4. Inspect the deployed HTML/CSS: confirm topbar bg color includes #0F2540 (or hsl/rgb equivalent), font-family includes "Libre Baskerville" for headings
     5. Verify shadcn Button has rounded corners (border-radius applied)
     If all 5 pass: SendMessage pm-lead [QA-PASS] with payload { live_url, tests_run, evidence }
     If any fail: SendMessage pm-lead [QA-FAIL] with specific failure list and quoted evidence (HTML snippets, error messages, console output)

After spawning all 5 agents, SendMessage pm-lead with summary "[ASSIGN] Begin Cycle 1 — Foundation" and message containing the goal + gate above. Then report to me (the human) when pm-lead reports [QA-PASS] or [QA-FAIL].
```

---

## After Claude Code finishes Cycle 1

You'll see the live URL in chat. Open it in your browser, do a quick personal sanity check (sign up with a real test email, click around). Then move to `prompts/cycle-2.md`.

If `qa-senior` blocks, ask `pm-lead` to dispatch a fix. Don't move on with a red gate.
