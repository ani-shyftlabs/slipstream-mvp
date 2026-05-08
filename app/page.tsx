import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/queries/profile";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types/database";

const ROLE_LABEL: Record<UserRole, string> = {
  broker: "broker",
  mga: "MGA",
  insurer: "insurer",
};

export default async function LandingPage() {
  const ctx = await getCurrentProfile();
  const dashboardHref = ctx ? `/${ctx.role}/dashboard` : null;
  const dashboardLabel = ctx ? `Go to your ${ROLE_LABEL[ctx.role]} dashboard` : null;

  return (
    <div className="min-h-screen bg-white text-ink font-sans">
      <LandingNav dashboardHref={dashboardHref} dashboardLabel={dashboardLabel} />
      <Hero dashboardHref={dashboardHref} />
      <LogosStrip />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <RolesSection />
      <ComplianceSection />
      <PricingSection />
      <CtaSection dashboardHref={dashboardHref} dashboardLabel={dashboardLabel} />
      <Footer />
    </div>
  );
}

function BrandMark({ className, primary = "#0F2540", accent = "#A87C1A" }: {
  className?: string;
  primary?: string;
  accent?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M6 24 L16 8 L26 24" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 24 L16 14 L22 24" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LandingNav({
  dashboardHref,
  dashboardLabel,
}: {
  dashboardHref: string | null;
  dashboardLabel: string | null;
}) {
  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between gap-6 px-6 py-3 border-b border-silver/60 bg-white/95 backdrop-blur">
      <Link href="/" className="flex items-center gap-2">
        <BrandMark className="h-7 w-7" />
        <span className="font-serif text-xl text-navy">Slipstream</span>
      </Link>
      <ul className="hidden md:flex items-center gap-8 text-sm text-ink/80">
        <li><a href="#how-it-works" className="hover:text-navy transition-colors">How It Works</a></li>
        <li><a href="#features" className="hover:text-navy transition-colors">Features</a></li>
        <li><a href="#who-its-for" className="hover:text-navy transition-colors">Who It&rsquo;s For</a></li>
        <li><a href="#pricing" className="hover:text-navy transition-colors">Pricing</a></li>
      </ul>
      <div className="flex items-center gap-2">
        {dashboardHref ? (
          <Button asChild className="bg-gold text-navy hover:bg-gold/90">
            <Link href={dashboardHref}>{dashboardLabel}</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get Started</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}

function Hero({ dashboardHref }: { dashboardHref: string | null }) {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-[1080px] mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-silver text-[11px] font-mono uppercase tracking-wider text-ink/70">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Specialty Insurance Placement Operating System
        </div>
        <h1 className="font-serif text-5xl md:text-6xl text-navy leading-[1.1] mt-6">
          Your placement doesn&rsquo;t live<br />in <em className="text-gold not-italic">your inbox.</em>
        </h1>
        <p className="font-sans text-lg text-ink/75 mt-6 max-w-2xl mx-auto">
          Slipstream replaces the email chains and spreadsheets that run complex insurance placements with structured deal rooms — one coordinated workspace for every party, every document, every quote.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {dashboardHref ? (
            <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold/90">
              <Link href={dashboardHref}>Continue to dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/signup">Request Design Partner Access</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <a href="#how-it-works">See How It Works</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function LogosStrip() {
  const markets = [
    "Lloyd's of London",
    "E&S Markets",
    "London Market",
    "Canadian Specialty",
    "Brokerslink Network",
    "WBN",
  ];
  return (
    <div className="border-y border-silver/60 bg-silver/20">
      <div className="max-w-[1080px] mx-auto px-6 py-8 flex flex-col gap-4 items-center">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink/60">
          Built for brokers who place in these markets
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {markets.map((m) => (
            <span
              key={m}
              className="px-3 py-1 rounded-full border border-silver bg-white text-xs font-sans text-ink/80"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  id,
  eyebrow,
  heading,
  body,
  className,
  children,
}: {
  id?: string;
  eyebrow: string;
  heading: React.ReactNode;
  body?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("border-b border-silver/40", className)}>
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="font-mono text-[11px] uppercase tracking-wider text-gold">{eyebrow}</div>
        <h2 className="font-serif text-3xl md:text-4xl text-navy leading-tight mt-3">{heading}</h2>
        {body && <p className="font-sans text-base text-ink/75 mt-4 max-w-2xl">{body}</p>}
        {children}
      </div>
    </section>
  );
}

function ProblemSection() {
  const before = [
    "Submission documents versioned by whoever remembers to rename the file",
    "Competing quotes land in the same inbox thread — confidentiality depends on broker discipline",
    "MGA DUA limits tracked informally — nobody verifies authority before quoting",
    "No audit trail — if it goes wrong, nobody can prove what each party was shown",
    "Tower structure lives on a whiteboard or in someone's head",
  ];
  const after = [
    "Document versioning is a first-class event — updates notify all parties and flag stale quotes",
    "Quote confidentiality enforced structurally — competing parties only see their own submissions",
    "MGA DUA parameters verified at onboarding, enforced at every quote submission",
    "Immutable audit trail captures every action, every party, every timestamp",
    "Real-time mud map visualization shows tower completion across all layers",
  ];
  return (
    <SectionShell
      eyebrow="The Problem"
      heading={
        <>
          Complex placements involve<br />4 to 6 parties. None of them<br />see the <em className="text-gold not-italic">same picture.</em>
        </>
      }
      body="Today, a specialty placement lives in email threads, shared drives, and manually updated spreadsheets. There is no audit trail, no version control, and no single source of truth."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        <ComparisonColumn
          tone="error"
          label="Today — Email & Spreadsheets"
          items={before}
          glyph="✕"
        />
        <ComparisonColumn
          tone="success"
          label="Slipstream — Structured Deal Room"
          items={after}
          glyph="✓"
        />
      </div>
    </SectionShell>
  );
}

function ComparisonColumn({
  tone,
  label,
  items,
  glyph,
}: {
  tone: "error" | "success";
  label: string;
  items: string[];
  glyph: string;
}) {
  return (
    <div
      className={cn(
        "border rounded-lg p-6",
        tone === "error" ? "border-error/30 bg-error/5" : "border-success/30 bg-success/5",
      )}
    >
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider mb-4">
        <span className={cn("h-1.5 w-1.5 rounded-full", tone === "error" ? "bg-error" : "bg-success")} />
        <span className={tone === "error" ? "text-error" : "text-success"}>{label}</span>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3 text-sm font-sans text-ink/85">
            <span
              className={cn(
                "shrink-0 mt-0.5 h-5 w-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold",
                tone === "error" ? "bg-error/15 text-error" : "bg-success/15 text-success",
              )}
            >
              {glyph}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeaturesSection() {
  const features = [
    { name: "Structured Deal Rooms", desc: "One workspace per placement. Submission documents, quotes, communications, and the full audit trail — all in one place." },
    { name: "DUA Compliance Engine", desc: "MGA delegated authority verified at onboarding and enforced at every quote submission. Class, geography, line size — all checked." },
    { name: "Tower Mud Map", desc: "Real-time visual representation of your coverage tower. See which layers are open, quoted, competing, or bound — at a glance." },
    { name: "Document Versioning", desc: "Every document update is a logged event. Previous versions preserved, all parties notified, affected quotes flagged stale." },
    { name: "Role-Scoped Access", desc: "Every party sees exactly what their role permits. Competing parties never see each other's quotes. The retail broker sees everything." },
    { name: "Immutable Audit Trail", desc: "Every action, every party, every timestamp — permanently recorded. Full E&O defensibility for every placement." },
  ];
  return (
    <SectionShell
      id="features"
      eyebrow="Platform Features"
      heading={
        <>
          Every tool a specialty<br />broker needs. <em className="text-gold not-italic">Nothing else.</em>
        </>
      }
      body="Built from the ground up for how complex placements actually work — not adapted from generic project management software."
      className="bg-silver/20"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
        {features.map((f) => (
          <div key={f.name} className="border border-silver bg-white rounded-lg p-6 hover:border-navy/40 transition-colors">
            <div className="font-serif text-lg text-navy">{f.name}</div>
            <p className="text-sm font-sans text-ink/75 mt-2">{f.desc}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function HowItWorksSection() {
  const steps = [
    { n: "01", title: "Create the deal room", desc: "Retail broker opens a new deal room, uploads the submission package, and selects placement mode." },
    { n: "02", title: "Invite and assign roles", desc: "Search the MGA or wholesaler directory and invite parties. Every party gets an explicit role assignment." },
    { n: "03", title: "Receive competing quotes", desc: "MGAs quote within their verified DUA. Wholesalers source from Lloyd's. Only the retail broker sees all submissions." },
    { n: "04", title: "Select and bind", desc: "Select the winning quote per layer, notify losing parties, close the deal room with the full audit trail preserved." },
  ];
  return (
    <SectionShell
      id="how-it-works"
      eyebrow="How It Works"
      heading={<>From submission to bind.<br /><em className="text-gold not-italic">Fully documented.</em></>}
    >
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        {steps.map((s) => (
          <li key={s.n} className="border border-silver rounded-lg p-6 bg-white flex gap-4">
            <span className="font-mono text-2xl text-gold leading-none mt-1">{s.n}</span>
            <div>
              <div className="font-serif text-lg text-navy">{s.title}</div>
              <p className="text-sm font-sans text-ink/75 mt-1">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

function RolesSection() {
  const roles = [
    {
      tag: "Retail Broker",
      name: "Full visibility. Full control.",
      desc: "You create the deal room, invite the parties, and own the placement from first submission to bind.",
      benefits: [
        "Complete quote visibility across all invited parties",
        "Private clarification threads with each market",
        "Real-time tower mud map for layered placements",
        "Full audit trail for every placement",
      ],
    },
    {
      tag: "MGA",
      name: "Credentialed. Discoverable.",
      desc: "Your DUA parameters are verified by Slipstream. Quote with confidence within your authority.",
      benefits: [
        "Slipstream-verified DUA profile in MGA directory",
        "Discoverable to retail brokers by class and geography",
        "Structured referral workflow when risk exceeds DUA",
        "Quote submission via PDF upload or manual entry",
      ],
    },
    {
      tag: "Wholesaler",
      name: "Structured deals. Clear roles.",
      desc: "Receive clean, structured deal room invitations instead of chaotic email threads.",
      benefits: [
        "Structured submissions — no more chasing documents",
        "Profile and market relationships visible in directory",
        "Quote submission for specific tower layers",
        "Clean separation from MGA via role assignment",
      ],
    },
  ];
  return (
    <SectionShell
      id="who-its-for"
      eyebrow="Who It's For"
      heading={<>Built for every party<br />in the placement chain.</>}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
        {roles.map((r) => (
          <div key={r.tag} className="border border-silver bg-white rounded-lg p-6">
            <div className="font-mono text-[11px] uppercase tracking-wider text-gold">{r.tag}</div>
            <div className="font-serif text-xl text-navy mt-2">{r.name}</div>
            <p className="text-sm font-sans text-ink/75 mt-2">{r.desc}</p>
            <ul className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-silver/60">
              {r.benefits.map((b) => (
                <li key={b} className="text-xs font-sans text-ink/80 flex gap-2">
                  <span className="text-gold">✓</span> {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function ComplianceSection() {
  return (
    <SectionShell
      eyebrow="Placement Integrity"
      heading={<>The compliance engine<br />is the <em className="text-gold not-italic">moat.</em></>}
      body="Workflow efficiency is a feature. Placement integrity is the value proposition. Slipstream creates a verified, tamper-proof record of every decision."
    >
      <div className="border border-silver rounded-lg bg-white mt-10 max-w-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-silver/60">
          <span className="font-mono text-xs text-ink/70">Placement Audit Trail — PLT-2024-0847</span>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/15 text-warning border border-gold/30">
            Immutable
          </span>
        </div>
        <ul className="divide-y divide-silver/60">
          {[
            { dot: "bg-success", title: "Primary layer bound.", desc: "Navacord MGA quote selected by retail broker.", time: "14:22:08 UTC", actor: "Connor M. · Retail Broker" },
            { dot: "bg-gold", title: "Referral approved.", desc: "Navacord MGA referral to capacity provider approved.", time: "11:04:51 UTC", actor: "Connor M. · Retail Broker" },
            { dot: "bg-navy", title: "Loss runs updated", desc: "(v2 → v3). All active quotes flagged stale.", time: "09:37:22 UTC", actor: "Connor M. · Retail Broker" },
            { dot: "bg-navy", title: "Deal room created.", desc: "ABC Manufacturing — Commercial Property. $50M TIV.", time: "08:55:00 UTC", actor: "Connor M. · Retail Broker" },
          ].map((it) => (
            <li key={it.title + it.time} className="flex items-start gap-3 px-5 py-3">
              <span className={cn("mt-1.5 inline-block h-2 w-2 rounded-full shrink-0", it.dot)} />
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-sans text-ink"><strong className="font-medium">{it.title}</strong> {it.desc}</p>
                <p className="text-[11px] font-mono text-ink/60">{it.time} · {it.actor}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

function PricingSection() {
  const tiers = [
    {
      tier: "Tier 01",
      name: "Guest",
      desc: "For parties invited into a single deal room. No account required.",
      features: [
        ["yes", "Single deal room access"],
        ["yes", "View submission documents"],
        ["yes", "Submit quotes and respond"],
        ["no", "No directory access"],
      ],
      cta: "Join via Invite",
      featured: false,
    },
    {
      tier: "Tier 02",
      name: "Full Account",
      desc: "For retail brokers, MGAs, and wholesalers with full platform access.",
      features: [
        ["yes", "Unlimited deal rooms"],
        ["yes", "Full directory access"],
        ["yes", "Profile visible in directory"],
        ["yes", "Complete audit trail"],
      ],
      cta: "Request Access",
      featured: true,
    },
    {
      tier: "Tier 03",
      name: "Enterprise",
      desc: "For brokerages managing high-volume specialty placement across teams.",
      features: [
        ["yes", "Everything in Full Account"],
        ["yes", "Multi-user team management"],
        ["yes", "Deal metrics dashboard"],
        ["yes", "Priority support"],
      ],
      cta: "Contact Us",
      featured: false,
    },
  ] as const;
  return (
    <SectionShell
      id="pricing"
      eyebrow="Access"
      heading={<>Simple, transparent<br />access tiers.</>}
      className="bg-silver/20"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={cn(
              "border rounded-lg p-6 bg-white flex flex-col",
              t.featured ? "border-gold shadow-md" : "border-silver",
            )}
          >
            <div className="font-mono text-[11px] uppercase tracking-wider text-gold">{t.tier}</div>
            <div className="font-serif text-2xl text-navy mt-2">{t.name}</div>
            <p className="text-sm font-sans text-ink/75 mt-2">{t.desc}</p>
            <hr className="my-4 border-silver/60" />
            <ul className="flex flex-col gap-2 flex-1">
              {t.features.map(([state, label]) => (
                <li key={label} className="text-sm font-sans text-ink/80 flex items-center gap-2">
                  <span className={cn("text-xs", state === "yes" ? "text-success" : "text-ink/40")}>
                    {state === "yes" ? "✓" : "—"}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
            <Button
              asChild
              className={cn(
                "mt-6",
                t.featured ? "bg-gold text-navy hover:bg-gold/90" : "",
              )}
              variant={t.featured ? "default" : "outline"}
            >
              <Link href="/signup">{t.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function CtaSection({
  dashboardHref,
  dashboardLabel,
}: {
  dashboardHref: string | null;
  dashboardLabel: string | null;
}) {
  return (
    <section className="bg-navy text-white">
      <div className="max-w-[1080px] mx-auto px-6 py-20 text-center">
        <div className="font-mono text-[11px] uppercase tracking-wider text-gold">
          Early Access — Now Open
        </div>
        <h2 className="font-serif text-4xl md:text-5xl leading-tight mt-3">
          Your next placement<br />deserves a <em className="text-gold not-italic">deal room.</em>
        </h2>
        <p className="font-sans text-base text-white/75 mt-4 max-w-2xl mx-auto">
          Join a small cohort of design partners helping shape Slipstream before public launch.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {dashboardHref ? (
            <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold/90">
              <Link href={dashboardHref}>{dashboardLabel}</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-gold text-navy hover:bg-gold/90">
                <Link href="/signup">Request Design Partner Access</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10"
              >
                <Link href="/login">Talk to the Team</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <BrandMark className="h-6 w-6" primary="rgba(255,255,255,0.5)" accent="#C49A2C" />
              <span className="font-serif text-lg text-white/85">Slipstream</span>
            </div>
            <p className="text-xs font-sans text-white/55">
              The specialty placement operating system. Built by brokers, for the market.
            </p>
          </div>
          <FooterCol title="Platform" items={["Deal Rooms", "MGA Directory", "Wholesaler Directory", "Compliance Engine"]} />
          <FooterCol title="Company" items={["About", "Blog", "Careers", "Contact"]} />
          <FooterCol title="Legal" items={["Privacy Policy", "Terms of Service", "Security"]} />
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row justify-between gap-3 text-xs font-sans text-white/50">
          <span>&copy; 2026 Slipstream Technologies Inc. All rights reserved.</span>
          <span className="font-mono">Placement integrity, by design.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[11px] uppercase tracking-wider text-white/85">{title}</div>
      <ul className="flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it}>
            <a href="#" className="text-xs font-sans text-white/60 hover:text-white transition-colors">{it}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
